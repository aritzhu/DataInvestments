import { PrismaClient } from '@prisma/client';
import { computeAll, weightedAverage, getVerdict, getSectorConfigs } from './valuationService';

const prisma = new PrismaClient();

export async function createPortfolio(userId: string, data: { name: string; description?: string; currency?: string }) {
  return prisma.portfolio.create({
    data: { ...data, userId },
    include: { holdings: { include: { company: { select: { id: true, ticker: true, name: true } } } } },
  });
}

export async function listPortfolios(userId: string) {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: {
      _count: { select: { holdings: true } },
      holdings: {
        include: { company: { select: { ticker: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return portfolios.map((p) => ({
    ...p,
    totalInvested: p.holdings.reduce((sum, h) => sum + Number(h.quantity) * Number(h.averageCost), 0),
  }));
}

export async function getPortfolio(portfolioId: string, userId: string) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: {
      holdings: {
        include: {
          company: {
            select: {
              id: true, ticker: true, name: true, sector: true, industry: true,
              stockMetrics: { orderBy: { date: 'desc' }, take: 1 },
              financialData: { orderBy: [{ year: 'desc' }, { quarter: 'desc' }], take: 1 },
            },
          },
        },
      },
    },
  });
  return portfolio;
}

export async function updatePortfolio(portfolioId: string, userId: string, data: { name?: string; description?: string }) {
  const existing = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!existing) return null;
  return prisma.portfolio.update({
    where: { id: portfolioId },
    data,
    include: { holdings: true },
  });
}

export async function deletePortfolio(portfolioId: string, userId: string) {
  const existing = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!existing) return false;
  await prisma.portfolio.delete({ where: { id: portfolioId } });
  return true;
}

export async function addHolding(portfolioId: string, userId: string, data: { companyId: string; quantity: number; averageCost: number }) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) return null;

  const company = await prisma.company.findUnique({ where: { id: data.companyId } });
  if (!company) return null;

  return prisma.holding.create({
    data: {
      portfolioId,
      companyId: data.companyId,
      quantity: data.quantity,
      averageCost: data.averageCost,
    },
    include: {
      company: { select: { id: true, ticker: true, name: true, sector: true, industry: true } },
    },
  });
}

export async function updateHolding(holdingId: string, portfolioId: string, userId: string, data: { quantity?: number; averageCost?: number }) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) return null;

  return prisma.holding.update({
    where: { id: holdingId },
    data,
    include: {
      company: { select: { id: true, ticker: true, name: true, sector: true, industry: true } },
    },
  });
}

export async function removeHolding(holdingId: string, portfolioId: string, userId: string) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) return false;

  await prisma.holding.delete({ where: { id: holdingId } });
  return true;
}

export async function getPortfolioValuation(portfolioId: string, userId: string) {
  const portfolio = await getPortfolio(portfolioId, userId);
  if (!portfolio) return null;

  const valuationsCache = new Map<string, { fairValue: number | null; verdict: string; methods: any[] }>();

  const holdingsWithVal = await Promise.all(
    portfolio.holdings.map(async (h) => {
      const ticker = h.company.ticker;
      let cached = valuationsCache.get(ticker);

      if (!cached) {
        const stock = h.company.stockMetrics?.[0] ?? null;
        const financialData = h.company.financialData ?? [];

        if (stock && financialData.length > 0) {
          const balanceSheets = await prisma.balanceSheet.findMany({
            where: { companyId: h.company.id },
            orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
          });

          const configs = getSectorConfigs(h.company.sector, h.company.industry);
          const results = computeAll({ financials: financialData as any, balanceSheets, stock }, configs);
          const fairValue = weightedAverage(results);
          const currentPrice = stock.currentPrice;
          const verdict = getVerdict(fairValue, currentPrice);

          cached = { fairValue, verdict, methods: results };
        } else {
          cached = { fairValue: null, verdict: 'na', methods: [] };
        }

        valuationsCache.set(ticker, cached);
      }

      const currentPrice = h.company.stockMetrics?.[0]?.currentPrice ?? null;
      const totalInvested = Number(h.quantity) * Number(h.averageCost);
      const totalValue = currentPrice != null ? Number(h.quantity) * currentPrice : null;
      const pl = totalValue != null ? totalValue - totalInvested : null;
      const plPercent = totalInvested > 0 && pl != null ? pl / totalInvested : null;
      const mos = cached.fairValue != null && currentPrice != null ? (cached.fairValue - currentPrice) / currentPrice : null;

      return {
        holdingId: h.id,
        ticker,
        companyName: h.company.name,
        sector: h.company.sector,
        quantity: Number(h.quantity),
        averageCost: Number(h.averageCost),
        currentPrice,
        totalInvested,
        totalValue,
        pl,
        plPercent,
        fairValue: cached.fairValue,
        marginOfSafety: mos,
        verdict: cached.verdict,
        valuationMethods: cached.methods,
      };
    })
  );

  const totalInvested = holdingsWithVal.reduce((s, h) => s + h.totalInvested, 0);
  const totalValue = holdingsWithVal.reduce((s, h) => s + (h.totalValue ?? 0), 0);
  const totalPL = holdingsWithVal.reduce((s, h) => s + (h.pl ?? 0), 0);
  const totalPLPercent = totalInvested > 0 ? totalPL / totalInvested : null;

  return {
    portfolioId: portfolio.id,
    portfolioName: portfolio.name,
    currency: portfolio.currency,
    summary: {
      totalInvested,
      totalValue,
      totalPL,
      totalPLPercent,
      holdingCount: holdingsWithVal.length,
    },
    holdings: holdingsWithVal,
  };
}
