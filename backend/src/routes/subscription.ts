import { Router, type Router as ExpressRouter } from 'express';
import prisma from '../infrastructure/prisma/client';
import { requireAuth, type AuthRequest } from '../middleware/jwt';

const router: ExpressRouter = Router();

const FREE_LIMIT = 3;
const PRO_LIMIT = 20;
const PREMIUM_LIMIT = Infinity;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function tierLimit(tier: string): number {
  switch (tier) {
    case 'premium': return PREMIUM_LIMIT;
    case 'pro': return PRO_LIMIT;
    default: return FREE_LIMIT;
  }
}

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

    const limit = tierLimit(user.subscriptionTier);

    if (user.subscriptionTier !== 'premium') {
      const counter = await prisma.usageCounter.findUnique({
        where: { userId_month: { userId, month } },
      });

      const currentViews = counter?.companyViews ?? 0;
      const remaining = Math.max(0, limit - currentViews);

      if (remaining === 0) {
        res.json({ canView: false, views: currentViews, limit, remaining: 0, tier: user.subscriptionTier });
        return;
      }

      const updated = await prisma.usageCounter.upsert({
        where: { userId_month: { userId, month } },
        update: { companyViews: { increment: 1 } },
        create: { userId, month, companyViews: 1 },
      });

      res.json({
        canView: true,
        views: updated.companyViews,
        limit,
        remaining: Math.max(0, limit - updated.companyViews),
        tier: user.subscriptionTier,
      });
    } else {
      const counter = await prisma.usageCounter.upsert({
        where: { userId_month: { userId, month } },
        update: { companyViews: { increment: 1 } },
        create: { userId, month, companyViews: 1 },
      });

      res.json({
        canView: true,
        views: counter.companyViews,
        limit: -1,
        remaining: -1,
        tier: 'premium',
      });
    }
  } catch (error) {
    console.error('[Subscription] Track view error:', error);
    res.status(500).json({ error: 'Error tracking view' });
  }
});

router.get('/usage', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const month = currentMonth();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const counter = await prisma.usageCounter.findUnique({
      where: { userId_month: { userId, month } },
    });

    const views = counter?.companyViews ?? 0;
    const limit = tierLimit(user.subscriptionTier);

    res.json({
      views,
      limit: user.subscriptionTier === 'premium' ? -1 : limit,
      remaining: user.subscriptionTier === 'premium' ? -1 : Math.max(0, limit - views),
      tier: user.subscriptionTier,
      canView: user.subscriptionTier === 'premium' ? true : views < limit,
    });
  } catch (error) {
    console.error('[Subscription] Usage error:', error);
    res.status(500).json({ error: 'Error fetching usage' });
  }
});

router.get('/can-view', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const month = currentMonth();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.subscriptionTier === 'premium') {
      res.json({ canView: true, remaining: -1 });
      return;
    }

    const counter = await prisma.usageCounter.findUnique({
      where: { userId_month: { userId, month } },
    });

    const views = counter?.companyViews ?? 0;
    const limit = tierLimit(user.subscriptionTier);

    res.json({
      canView: views < limit,
      remaining: Math.max(0, limit - views),
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
