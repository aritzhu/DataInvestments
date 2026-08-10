import { computeAll, weightedAverage, getVerdict, getSectorConfigs, getRecommendedFairValue } from './valuationService';
import prisma from '../infrastructure/prisma/client';

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
              id: true, ticker: true, name: true, sector: true, industry: true, country: true,
              stockMetrics: { orderBy: { date: 'desc' }, take: 1 },
              segments: { orderBy: [{ year: 'desc' }, { quarter: 'desc' }], take: 60 },
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

  const valuationsCache = new Map<string, { fairValue: number | null; recommendedFairValue: number | null; recommendedModel: string; verdict: string; methods: any[] }>();

  const holdingsWithVal = await Promise.all(
    portfolio.holdings.map(async (h) => {
      const ticker = h.company.ticker;
      let cached = valuationsCache.get(ticker);

      if (!cached) {
        const stock = h.company.stockMetrics?.[0] ?? null;

        if (stock) {
          const [financialData, balanceSheets] = await Promise.all([
            prisma.financialData.findMany({
              where: { companyId: h.company.id },
              orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
            }),
            prisma.balanceSheet.findMany({
              where: { companyId: h.company.id },
              orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
            }),
          ]);

          if (financialData.length > 0) {
            const configs = getSectorConfigs(h.company.sector, h.company.industry);
            const results = computeAll({ financials: financialData as any, balanceSheets, stock }, configs);
            const fairValue = weightedAverage(results);
            const recommended = getRecommendedFairValue(results, h.company.sector, h.company.industry);
            const recommendedFairValue = recommended.fairValue ?? fairValue;
            const currentPrice = stock.currentPrice;
            const verdict = getVerdict(recommendedFairValue, currentPrice);

            cached = { fairValue, recommendedFairValue, recommendedModel: recommended.model, verdict, methods: results };
          } else {
            cached = { fairValue: null, recommendedFairValue: null, recommendedModel: 'default', verdict: 'na', methods: [] };
          }
        } else {
          cached = { fairValue: null, recommendedFairValue: null, recommendedModel: 'default', verdict: 'na', methods: [] };
        }
      }

      valuationsCache.set(ticker, cached);

      const currentPrice = h.company.stockMetrics?.[0]?.currentPrice ?? null;
      const totalInvested = Number(h.quantity) * Number(h.averageCost);
      const totalValue = currentPrice != null ? Number(h.quantity) * currentPrice : null;
      const pl = totalValue != null ? totalValue - totalInvested : null;
      const plPercent = totalInvested > 0 && pl != null ? pl / totalInvested : null;
      const mos = cached.recommendedFairValue != null && currentPrice != null ? (cached.recommendedFairValue - currentPrice) / currentPrice : null;

      return {
        holdingId: h.id,
        ticker,
        companyName: h.company.name,
        sector: h.company.sector,
        country: h.company.country,
        segments: h.company.segments ?? [],
        quantity: Number(h.quantity),
        averageCost: Number(h.averageCost),
        currentPrice,
        totalInvested,
        totalValue,
        pl,
        plPercent,
        fairValue: cached.fairValue,
        recommendedFairValue: cached.recommendedFairValue,
        recommendedModel: cached.recommendedModel,
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

  const fairValueTotal = holdingsWithVal.reduce(
    (s, h) => s + (h.recommendedFairValue != null ? h.recommendedFairValue * h.quantity : 0),
    0,
  );
  const undervaluedCount = holdingsWithVal.filter((h) => h.verdict === 'buy').length;
  const valuationGapPct = totalValue > 0 && fairValueTotal > 0 ? (fairValueTotal - totalValue) / totalValue : null;

  const verdictCounts = { buy: 0, hold: 0, sell: 0, na: 0 };
  for (const h of holdingsWithVal) {
    const key = h.verdict as 'buy' | 'hold' | 'sell' | 'na';
    if (key in verdictCounts) verdictCounts[key]++;
  }

  const tally = (keyOf: (h: (typeof holdingsWithVal)[number]) => string) => {
    const map = new Map<string, { name: string; count: number; value: number }>();
    for (const h of holdingsWithVal) {
      const key = keyOf(h);
      const value = h.totalValue ?? 0;
      const cur = map.get(key);
      if (cur) {
        cur.count++;
        cur.value += value;
      } else {
        map.set(key, { name: key, count: 1, value });
      }
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  };
  const bySector = tally((h) => h.sector ?? 'Sin sector');
  const byCountry = tally((h) => h.country ?? 'Sin país');

  const segmentTally = (type: 'product' | 'geography') => {
    const map = new Map<string, { name: string; value: number }>();
    for (const h of holdingsWithVal) {
      if (h.totalValue == null) continue;
      const segs = (h.segments ?? []) as Array<{ year: number; segmentName: string; segmentType: string; revenue: number; percentage: number | null }>;
      const latestYear = segs.reduce((m, s) => Math.max(m, s.year), 0);
      const list = segs.filter((s) => s.year === latestYear && s.segmentType === type);
      const totalRev = list.reduce((acc, s) => acc + s.revenue, 0);
      for (const s of list) {
        const pct = s.percentage ?? (totalRev > 0 ? s.revenue / totalRev : 0);
        const contrib = h.totalValue * pct;
        const cur = map.get(s.segmentName);
        if (cur) cur.value += contrib;
        else map.set(s.segmentName, { name: s.segmentName, value: contrib });
      }
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  };

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
      undervaluedCount,
      fairValueTotal,
      valuationGapPct,
    },
    stats: {
      verdictCounts,
      bySector,
      byCountry,
      bySegment: segmentTally('product'),
      byGeography: segmentTally('geography'),
    },
    holdings: holdingsWithVal,
  };
}
