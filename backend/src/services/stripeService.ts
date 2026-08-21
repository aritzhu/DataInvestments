import Stripe from 'stripe';
import prisma from '../infrastructure/prisma/client';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function clientUrl(): string {
  return process.env.CLIENT_URL || 'http://localhost:5173';
}

const PAID_TIERS = ['pro', 'premium'];

async function getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (user.stripeCustomerId) {
    const customer = await getStripe().customers.retrieve(user.stripeCustomerId);
    if (!customer.deleted) return customer as Stripe.Customer;
  }

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer;
}

export async function createCheckoutSession(userId: string, planSlug: string): Promise<string> {
  if (!PAID_TIERS.includes(planSlug)) {
    throw new Error('Invalid plan for checkout');
  }

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan || !plan.active) throw new Error('Plan not found or inactive');
  if (!plan.stripePriceId) throw new Error('Plan has no Stripe price configured');
  if (plan.priceMonthly <= 0) throw new Error('Plan is not a paid plan');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Already has an active subscription → send to portal instead
  if (
    user.stripeSubscriptionId &&
    ['active', 'trialing', 'past_due', 'unpaid'].includes(user.subscriptionStatus || '')
  ) {
    throw new Error('ALREADY_SUBSCRIBED');
  }

  const customer = await getOrCreateCustomer(userId);

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { userId, planSlug },
    },
    metadata: { userId, planSlug },
    success_url: `${clientUrl()}/subscription/result?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl()}/subscription/result?status=cancel`,
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}

export async function createPortalSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (!user.stripeCustomerId) throw new Error('NO_CUSTOMER');

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${clientUrl()}/plans`,
  });

  return session.url;
}

export async function cancelSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeSubscriptionId) throw new Error('NO_SUBSCRIPTION');

  await getStripe().subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function resumeSubscription(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeSubscriptionId) throw new Error('NO_SUBSCRIPTION');

  await getStripe().subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
}

// Stripe moved current_period_end to subscription items in newer API versions;
// support both shapes defensively.
function periodEnd(sub: Stripe.Subscription): Date | null {
  const itemEnd = sub.items?.data?.[0]?.current_period_end;
  const topEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
  const seconds = itemEnd ?? topEnd;
  return seconds ? new Date(seconds * 1000) : null;
}

function tierFromSubscription(sub: Stripe.Subscription, fallbackSlug: string | null): string | null {
  const meta = sub.metadata?.planSlug ? sub.metadata.planSlug : fallbackSlug;
  return meta && PAID_TIERS.includes(meta) ? meta : null;
}

async function findUserForSubscription(sub: Stripe.Subscription): Promise<{ id: string; subscriptionTier: string } | null> {
  if (sub.metadata?.userId) {
    const u = await prisma.user.findUnique({ where: { id: sub.metadata.userId } });
    if (u) return u;
  }
  if (typeof sub.customer === 'string') {
    return prisma.user.findUnique({ where: { stripeCustomerId: sub.customer } });
  }
  return null;
}

export async function syncSubscription(sub: Stripe.Subscription, options?: { fromCheckout?: boolean }): Promise<void> {
  const user = await findUserForSubscription(sub);
  if (!user) {
    console.warn('[Stripe] Could not resolve user for subscription', sub.id);
    return;
  }

  const status = sub.status;

  // Admin manual tier changes win over webhook syncs, except on a fresh checkout
  const skipTier = !!(user as { manualTierOverride?: boolean }).manualTierOverride && !options?.fromCheckout;

  if (status === 'active' || status === 'trialing') {
    const tier = tierFromSubscription(sub, user.subscriptionTier);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        stripeSubscriptionId: sub.id,
        subscriptionStatus: status,
        currentPeriodEnd: periodEnd(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        ...(options?.fromCheckout && { manualTierOverride: false }),
        ...(tier && !skipTier && { subscriptionTier: tier, subscriptionStart: new Date() }),
      },
    });
    return;
  }

  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: status,
        currentPeriodEnd: periodEnd(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
    return;
  }

  // canceled, incomplete_expired, unpaid past grace → downgrade
  await downgradeToFree(user.id, status);
}

export async function downgradeToFree(userId: string, status: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'free',
      subscriptionStatus: status,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: 'past_due' },
  });
}
