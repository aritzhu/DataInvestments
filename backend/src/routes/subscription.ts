import { Router, type Router as ExpressRouter } from 'express';
import prisma from '../infrastructure/prisma/client';
import { requireAuth, type AuthRequest } from '../middleware/jwt';
import * as planService from '../services/planService';

const router: ExpressRouter = Router();

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Public: list all active plans (for PlanSelectionPage) ──
router.get('/plans', async (_req, res) => {
  try {
    const plans = await planService.getAllActivePlans();
    res.json(plans.map((p) => ({
      slug: p.slug,
      name: p.name,
      priceMonthly: p.priceMonthly,
      companyViews: p.companyViews,
      favorites: p.favorites,
      portfolios: p.portfolios,
      screening: p.screening,
      compare: p.compare,
      exportData: p.exportData,
    })));
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

    res.json({
      canView: true,
      views: updated.companyViews,
      limit: isUnlimited ? -1 : plan.companyViews,
      remaining: isUnlimited ? -1 : Math.max(0, plan.companyViews - updated.companyViews),
      tier: user.subscriptionTier,
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

    await prisma.planSelection.create({
      data: { userId, plan },
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: plan,
        subscriptionStart: new Date(),
      },
      select: { id: true, subscriptionTier: true },
    });

    res.json({ user });
  } catch (error) {
    console.error('[Subscription] Select plan error:', error);
    res.status(500).json({ error: 'Error selecting plan' });
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
