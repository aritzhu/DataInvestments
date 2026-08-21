import { Router, type Request, type Response, type Router as ExpressRouter } from 'express';
import type Stripe from 'stripe';
import prisma from '../infrastructure/prisma/client';
import { getStripe, syncSubscription, downgradeToFree, handleInvoicePaymentFailed } from '../services/stripeService';

const router: ExpressRouter = Router();

// Webhook payloads may arrive as full snapshots or as summaries depending on the
// Stripe event destination configuration. Resolve the primary object ID from
// whichever depth it lives at, then re-fetch the authoritative object via API.
function extractObjectId(event: Stripe.Event): string | null {
  const obj = (event.data as { object?: { id?: unknown } } | undefined)?.object;
  if (obj && typeof obj.id === 'string' && obj.id.length > 0) return obj.id;
  const related = (event as { related_object?: { id?: unknown } }).related_object;
  if (related && typeof related.id === 'string' && related.id.length > 0) return related.id;
  return null;
}

// Mounted with express.raw() BEFORE the global express.json() parser.
router.post('/', (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(400).json({ error: 'Missing signature or webhook secret' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[StripeWebhook] Signature verification failed:', err instanceof Error ? err.message : err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  // Handle async without blocking the response; Stripe retries on non-2xx.
  void (async () => {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          let session = event.data.object as Stripe.Checkout.Session | undefined;
          const sessionId = session?.id ?? extractObjectId(event);
          if (!sessionId) {
            console.warn('[StripeWebhook] checkout.session.completed: no session id in payload');
            break;
          }
          if (!session || !('mode' in session)) {
            session = await getStripe().checkout.sessions.retrieve(sessionId);
          }
          if (session.mode === 'subscription' && typeof session.subscription === 'string') {
            const sub = await getStripe().subscriptions.retrieve(session.subscription);
            await syncSubscription(sub, { fromCheckout: true });
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.created': {
          let sub = event.data.object as Stripe.Subscription | undefined;
          const subId = sub?.id ?? extractObjectId(event);
          if (!subId) {
            console.warn(`[StripeWebhook] ${event.type}: no subscription id in payload`);
            break;
          }
          if (!sub || !('status' in sub)) {
            sub = await getStripe().subscriptions.retrieve(subId);
          }
          await syncSubscription(sub, { fromCheckout: false });
          break;
        }
        case 'customer.subscription.deleted': {
          let sub = event.data.object as Stripe.Subscription | undefined;
          const subId = sub?.id ?? extractObjectId(event);
          if (!subId) {
            console.warn('[StripeWebhook] customer.subscription.deleted: no subscription id in payload');
            break;
          }
          if (!sub || !('metadata' in sub)) {
            sub = await getStripe().subscriptions.retrieve(subId);
          }
          if (sub.metadata?.userId) {
            await downgradeToFree(sub.metadata.userId, 'canceled');
          } else if (typeof sub.customer === 'string') {
            const user = await prisma.user.findUnique({ where: { stripeCustomerId: sub.customer } });
            if (user) await downgradeToFree(user.id, 'canceled');
          }
          break;
        }
        case 'invoice.payment_failed': {
          let invoice = event.data.object as Stripe.Invoice | undefined;
          const invoiceId = invoice?.id ?? extractObjectId(event);
          if (!invoiceId) {
            console.warn('[StripeWebhook] invoice.payment_failed: no invoice id in payload');
            break;
          }
          if (!invoice || !('customer' in invoice)) {
            invoice = await getStripe().invoices.retrieve(invoiceId);
          }
          await handleInvoicePaymentFailed(invoice);
          break;
        }
        default:
          break;
      }
      console.log(`[StripeWebhook] Handled ${event.type}`);
    } catch (error) {
      console.error(`[StripeWebhook] Error handling ${event.type}:`, error);
    }
  })();

  res.json({ received: true });
});

export default router;
