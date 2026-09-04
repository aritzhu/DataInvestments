import prisma from '../infrastructure/prisma/client';
import { computeAll, weightedAverage, getSectorConfigs, getRecommendedFairValue } from './valuationService';

async function recomputeRecommendedFairValue(company: { id: string; sector: string | null; industry: string | null }): Promise<number | null> {
  const [financials, balanceSheets, stock] = await Promise.all([
    prisma.financialData.findMany({ where: { companyId: company.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
    prisma.balanceSheet.findMany({ where: { companyId: company.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
    prisma.stockMetric.findFirst({ where: { companyId: company.id }, orderBy: { date: 'desc' } }),
  ]);
  if (!stock || financials.length === 0) return null;
  const configs = getSectorConfigs(company.sector, company.industry);
  const valInput = { financials: financials as any, balanceSheets: balanceSheets as any, stock: stock as any };
  const results = computeAll(valInput, configs, company.sector, company.industry);
  const recommended = getRecommendedFairValue(results, valInput, company.sector, company.industry);
  return recommended.fairValue ?? weightedAverage(results);
}

// Records one daily PortfolioSnapshot per portfolio: market value (Σ qty×price)
// vs target value (Σ qty×recommended fair value, with weighted-average fallback).
export async function recordPortfolioSnapshots(): Promise<{ portfolios: number; snapshots: number }> {
  const portfolios = await prisma.portfolio.findMany({
    include: {
      holdings: {
        include: { company: { select: { id: true, ticker: true, sector: true, industry: true } } },
      },
    },
  });

  const companyCache = new Map<string, number | null>();
  let withHoldings = 0;
  let snapshots = 0;

  for (const portfolio of portfolios) {
    if (portfolio.holdings.length === 0) continue;
    withHoldings++;
    const now = new Date();
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let marketValue = 0;
    let targetValue = 0;
    let undervalued = 0;
    const holdings: Array<{ ticker: string; marketValue: number; targetValue: number; price: number }> = [];

    for (const h of portfolio.holdings) {
      const qty = Number(h.quantity);
      if (qty <= 0) continue;
      const stock = await prisma.stockMetric.findFirst({ where: { companyId: h.company.id }, orderBy: { date: 'desc' } });
      if (!stock || (stock.currentPrice ?? 0) <= 0) continue;
      const price = stock.currentPrice;
      const mv = qty * price;
      marketValue += mv;

      let fv = companyCache.get(h.company.id);
      if (fv === undefined) {
        fv = await recomputeRecommendedFairValue(h.company);
        companyCache.set(h.company.id, fv);
      }
      let tv = 0;
      if (fv != null && fv > 0) {
        tv = qty * fv;
        targetValue += tv;
        if (fv > price * 1.15) undervalued++;
      }
      holdings.push({ ticker: h.company.ticker, marketValue: mv, targetValue: tv, price });
    }

    if (marketValue <= 0) continue;
    await prisma.portfolioSnapshot.upsert({
      where: { portfolioId_date: { portfolioId: portfolio.id, date } },
      update: { marketValue, targetValue, undervaluedCount: undervalued, holdings },
      create: { portfolioId: portfolio.id, date, marketValue, targetValue, undervaluedCount: undervalued, holdings },
    });
    snapshots++;
  }

  return { portfolios: withHoldings, snapshots };
}
