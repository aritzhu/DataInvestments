import { Router, type Router as ExpressRouter } from 'express';
import prisma from '../infrastructure/prisma/client';
import { requireAuth, type AuthRequest } from '../middleware/jwt';
import * as planService from '../services/planService';
import * as stripeService from '../services/stripeService';

const router: ExpressRouter = Router();

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Public: list all active plans (for PlanSelectionPage) ──
router.get('/plans', async (_req, res) => {
  try {
    const plans = await planService.getAllActivePlans();
    res.json({
      paymentsEnabled: !!process.env.STRIPE_SECRET_KEY,
      plans: plans.map((p) => ({
      slug: p.slug,
      name: p.name,
      priceMonthly: p.priceMonthly,
      companyViews: p.companyViews,
      favorites: p.favorites,
      portfolios: p.portfolios,
      screening: p.screening,
      compare: p.compare,
      exportData: p.exportData,
      })),
    });
  } catch (error) {
    console.error('[Subscription] Plans error:', error);
    res.status(500).json({ error: 'Error fetching plans' });
  }
});

// ── Auth: combined plan info + usage (replaces /usage) ──
router.get('/plan-info', requireAuth, async (req: AuthRequest, res) => {
  try {
    const info = await planService.getPlanInfo(req.user!.id);
    res.json(info);
  } catch (error) {
    console.error('[Subscription] Plan-info error:', error);
    res.status(500).json({ error: 'Error fetching plan info' });
  }
});

router.get('/visited', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const rows = await prisma.visitedCompany.findMany({
      where: { userId },
      orderBy: { visitedAt: 'desc' },
      select: { ticker: true, visitedAt: true },
    });

    const companies = await Promise.all(
      rows.map(async (r) => {
        const company = await prisma.company.findUnique({
          where: { ticker: r.ticker },
          select: {
            id: true, ticker: true, name: true, sector: true, industry: true,
            website: true, logoUrl: true,
            stockMetrics: { orderBy: { date: 'desc' }, take: 1 },
            financialData: { orderBy: [{ year: 'desc' }, { quarter: 'desc' }], take: 1 },
          },
        });
        return company ? { ...company, visitedAt: r.visitedAt } : null;
      })
    );

    res.json(companies.filter(Boolean));
  } catch (error) {
    console.error('[Subscription] Visited error:', error);
    res.status(500).json({ error: 'Error fetching visited companies' });
  }
});

router.post('/track-view', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { ticker } = req.body;
    const userId = req.user!.id;
    const month = currentMonth();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Already visited → free revisit, no count
    const alreadyVisited = await planService.isTickerVisited(userId, ticker);
    if (alreadyVisited) {
      const counter = await prisma.usageCounter.findUnique({
        where: { userId_month: { userId, month } },
      });
      const currentViews = counter?.companyViews ?? 0;
      const plan = await planService.getUserPlan(user.subscriptionTier);
      const isUnlimited = plan.companyViews === -1;
      res.json({
        canView: true,
        views: currentViews,
        limit: isUnlimited ? -1 : plan.companyViews,
        remaining: isUnlimited ? -1 : Math.max(0, plan.companyViews - currentViews),
        tier: user.subscriptionTier,
        visited: true,
      });
      return;
    }

    // New company → check limit, then count + mark visited
    const plan = await planService.getUserPlan(user.subscriptionTier);
    const isUnlimited = plan.companyViews === -1;

    if (!isUnlimited) {
      const counter = await prisma.usageCounter.findUnique({
        where: { userId_month: { userId, month } },
      });

      const currentViews = counter?.companyViews ?? 0;

      if (currentViews >= plan.companyViews) {
        res.json({ canView: false, views: currentViews, limit: plan.companyViews, remaining: 0, tier: user.subscriptionTier });
        return;
      }
    }

    const updated = await prisma.usageCounter.upsert({
      where: { userId_month: { userId, month } },
      update: { companyViews: { increment: 1 } },
      create: { userId, month, companyViews: 1 },
    });

    await planService.markTickerVisited(userId, ticker);

    res.json({
      canView: true,
      views: updated.companyViews,
      limit: isUnlimited ? -1 : plan.companyViews,
      remaining: isUnlimited ? -1 : Math.max(0, plan.companyViews - updated.companyViews),
      tier: user.subscriptionTier,
      visited: false,
    });
  } catch (error) {
    console.error('[Subscription] Track view error:', error);
    res.status(500).json({ error: 'Error tracking view' });
  }
});

router.get('/usage', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const info = await planService.getPlanInfo(userId);
    res.json({
      views: info.usage.companyViews,
      limit: info.limits.companyViews === -1 ? -1 : info.limits.companyViews,
      remaining: info.limits.companyViews === -1 ? -1 : Math.max(0, info.limits.companyViews - info.usage.companyViews),
      tier: info.tier,
      canView: info.canViewCompany,
    });
  } catch (error) {
    console.error('[Subscription] Usage error:', error);
    res.status(500).json({ error: 'Error fetching usage' });
  }
});

router.get('/can-view', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const info = await planService.getPlanInfo(userId);
    res.json({
      canView: info.canViewCompany,
      remaining: info.limits.companyViews === -1 ? -1 : Math.max(0, info.limits.companyViews - info.usage.companyViews),
    });
  } catch (error) {
    console.error('[Subscription] Can-view error:', error);
    res.status(500).json({ error: 'Error checking view permission' });
  }
});

router.post('/select-plan', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { plan } = req.body;

    if (plan !== 'free' && plan !== 'pro' && plan !== 'premium') {
      res.status(400).json({ error: 'Invalid plan. Must be free, pro, or premium' });
      return;
    }

    // Paid tiers can only be activated through Stripe Checkout — unless payments
    // are not configured yet (beta: everything free until Stripe keys exist)
    if ((plan === 'pro' || plan === 'premium') && !!process.env.STRIPE_SECRET_KEY) {
      res.status(400).json({ error: 'Este plan requiere pago. Usa el proceso de checkout.' });
      return;
    }

    // Downgrading to free while a Stripe subscription is active → must cancel via portal
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.stripeSubscriptionId && ['active', 'trialing', 'past_due', 'unpaid'].includes(user.subscriptionStatus || '')) {
      res.status(400).json({ error: 'Tienes una suscripción activa. Cancela primero desde Gestionar suscripción.' });
      return;
    }

    await prisma.planSelection.create({
      data: { userId, plan },
    });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: plan,
        subscriptionStart: new Date(),
      },
      select: { id: true, subscriptionTier: true },
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('[Subscription] Select plan error:', error);
    res.status(500).json({ error: 'Error selecting plan' });
  }
});

// ── Stripe Checkout ──

router.post('/create-checkout-session', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { plan } = req.body;

    if (plan !== 'pro' && plan !== 'premium') {
      res.status(400).json({ error: 'Invalid plan for checkout' });
      return;
    }

    const url = await stripeService.createCheckoutSession(userId, plan);
    res.json({ url });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ALREADY_SUBSCRIBED') {
        res.status(409).json({ error: 'Ya tienes una suscripción activa. Gestiónala desde el portal.' });
        return;
      }
      if (error.message === 'Plan has no Stripe price configured') {
        res.status(503).json({ error: 'El pago no está configurado para este plan todavía' });
        return;
      }
      if (error.message === 'STRIPE_SECRET_KEY is not configured') {
        res.status(503).json({ error: 'Pagos no disponibles temporalmente' });
        return;
      }
    }
    console.error('[Subscription] Checkout session error:', error);
    res.status(500).json({ error: 'Error creating checkout session' });
  }
});

// ── Stripe Customer Portal ──

router.post('/create-portal-session', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const url = await stripeService.createPortalSession(userId);
    res.json({ url });
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_CUSTOMER') {
      res.status(400).json({ error: 'No tienes ninguna suscripción que gestionar' });
      return;
    }
    console.error('[Subscription] Portal session error:', error);
    res.status(500).json({ error: 'Error creating portal session' });
  }
});

// ── Cancel / resume subscription ──

router.post('/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    await stripeService.cancelSubscription(req.user!.id);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_SUBSCRIPTION') {
      res.status(400).json({ error: 'No tienes ninguna suscripción activa' });
      return;
    }
    console.error('[Subscription] Cancel error:', error);
    res.status(500).json({ error: 'Error cancelling subscription' });
  }
});

router.post('/resume', requireAuth, async (req: AuthRequest, res) => {
  try {
    await stripeService.resumeSubscription(req.user!.id);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_SUBSCRIPTION') {
      res.status(400).json({ error: 'No tienes ninguna suscripción activa' });
      return;
    }
    console.error('[Subscription] Resume error:', error);
    res.status(500).json({ error: 'Error resuming subscription' });
  }
});

router.put('/upgrade', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { tier } = req.body;

    if (tier !== 'free' && tier !== 'pro' && tier !== 'premium') {
      res.status(400).json({ error: 'Invalid tier' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionStart: new Date(),
      },
      select: { id: true, email: true, name: true, role: true, theme: true, subscriptionTier: true, trialUsed: true },
    });

    res.json(user);
  } catch (error) {
    console.error('[Subscription] Upgrade error:', error);
    res.status(500).json({ error: 'Error upgrading tier' });
  }
});

export default router;
