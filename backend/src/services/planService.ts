import prisma from '../infrastructure/prisma/client';
import type { Plan } from '@prisma/client';

const planCache = new Map<string, Plan>();

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const cached = planCache.get(slug);
  if (cached) return cached;

  const plan = await prisma.plan.findUnique({ where: { slug } });
  if (plan && plan.active) {
    planCache.set(slug, plan);
  }
  return plan;
}

export async function getUserPlan(tier: string): Promise<Plan> {
  const plan = await getPlanBySlug(tier);
  if (!plan) {
    const fallback = await getPlanBySlug('free');
    if (!fallback) throw new Error('Free plan not found in database');
    return fallback;
  }
  return plan;
}

export async function getUserUsage(userId: string) {
  const month = currentMonth();

  const [favoriteCount, portfolioCount, usageCounter] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.portfolio.count({ where: { userId } }),
    prisma.usageCounter.findUnique({ where: { userId_month: { userId, month } } }),
  ]);

  return {
    companyViews: usageCounter?.companyViews ?? 0,
    favorites: favoriteCount,
    portfolios: portfolioCount,
  };
}

export async function getPlanInfo(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const plan = await getUserPlan(user.subscriptionTier);
  const [usage, visitedTickers] = await Promise.all([
    getUserUsage(userId),
    getVisitedTickers(userId),
  ]);

  const isUnlimited = (val: number) => val === -1;

  return {
    tier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    limits: {
      companyViews: plan.companyViews,
      favorites: plan.favorites,
      portfolios: plan.portfolios,
      screening: plan.screening,
      compare: plan.compare,
      exportData: plan.exportData,
      priceMonthly: plan.priceMonthly,
      name: plan.name,
    },
    usage: {
      companyViews: usage.companyViews,
      favorites: usage.favorites,
      portfolios: usage.portfolios,
    },
    canViewCompany: isUnlimited(plan.companyViews) || usage.companyViews < plan.companyViews,
    canAddFavorite: isUnlimited(plan.favorites) || usage.favorites < plan.favorites,
    canCreatePortfolio: isUnlimited(plan.portfolios) || usage.portfolios < plan.portfolios,
    visitedTickers,
  };
}

export async function canAddFavorite(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  const plan = await getUserPlan(user.subscriptionTier);
  if (plan.favorites === -1) return true;

  const count = await prisma.favorite.count({ where: { userId } });
  return count < plan.favorites;
}

export async function canCreatePortfolio(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  const plan = await getUserPlan(user.subscriptionTier);
  if (plan.portfolios === -1) return true;

  const count = await prisma.portfolio.count({ where: { userId } });
  return count < plan.portfolios;
}

export function invalidateCache() {
  planCache.clear();
}

export async function getAllActivePlans(): Promise<Plan[]> {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { priceMonthly: 'asc' } });
  planCache.clear();
  plans.forEach((p) => planCache.set(p.slug, p));
  return plans;
}

export async function getVisitedTickers(userId: string): Promise<string[]> {
  const rows = await prisma.visitedCompany.findMany({
    where: { userId },
    orderBy: { visitedAt: 'desc' },
    select: { ticker: true },
  });
  return rows.map((r) => r.ticker);
}

export async function isTickerVisited(userId: string, ticker: string): Promise<boolean> {
  const row = await prisma.visitedCompany.findUnique({
    where: { userId_ticker: { userId, ticker } },
  });
  return row !== null;
}

export async function markTickerVisited(userId: string, ticker: string): Promise<void> {
  await prisma.visitedCompany.upsert({
    where: { userId_ticker: { userId, ticker } },
    create: { userId, ticker },
    update: { visitedAt: new Date() },
  });
}
