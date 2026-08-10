import prisma from '../infrastructure/prisma/client';
import { computeAll, getRecommendedFairValue, getSectorConfigs } from '../services/valuationService';

const YFINANCE_URL = process.env.YFINANCE_URL || 'http://yfinance-service:8000';
const YEARS_BACK = Number(process.env.HISTORY_YEARS || 2);

interface PricePoint {
  date: string;
  close: number;
}

interface TargetEntry {
  date: Date;
  fairValue: number | null;
}

async function fetchHistory(ticker: string): Promise<PricePoint[]> {
  const p1 = Math.floor(Date.now() / 1000) - YEARS_BACK * 365 * 86400;
  try {
    const res = await fetch(`${YFINANCE_URL}/api/yfinance/${encodeURIComponent(ticker)}/history?period1=${p1}`);
    if (!res.ok) {
      console.log(`[BackfillHistory] ${ticker}: HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as { history?: PricePoint[] };
    return data?.history ?? [];
  } catch (err) {
    console.log(`[BackfillHistory] ${ticker}: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

function periodEnd(year: number, quarter: number | null): Date {
  if (!quarter || quarter <= 0) return new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  return new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59));
}

function priceAt(pts: PricePoint[], date: Date): number | null {
  let last: number | null = null;
  for (const p of pts) {
    const d = new Date(`${p.date}T00:00:00Z`);
    if (d.getTime() <= date.getTime()) last = p.close;
    else break;
  }
  return last;
}

function fairValueAt(entries: TargetEntry[], date: Date): number | null {
  let fv: number | null = null;
  for (const e of entries) {
    if (e.date.getTime() <= date.getTime()) fv = e.fairValue;
    else break;
  }
  return fv;
}

async function buildCompanyTarget(companyId: string, ticker: string, sector: string | null, industry: string | null): Promise<TargetEntry[]> {
  const [financials, balanceSheets, stockRows] = await Promise.all([
    prisma.financialData.findMany({ where: { companyId }, orderBy: [{ year: 'asc' }, { quarter: 'asc' }] }),
    prisma.balanceSheet.findMany({ where: { companyId }, orderBy: [{ year: 'asc' }, { quarter: 'asc' }] }),
    prisma.stockMetric.findMany({ where: { companyId }, orderBy: { date: 'desc' }, take: 1 }),
  ]);

  const stock = stockRows[0];
  if (!stock || financials.length === 0) return [];
  const price = stock.currentPrice ?? 0;
  const shares = stock.sharesOutstanding && stock.sharesOutstanding > 0
    ? stock.sharesOutstanding
    : price > 0 && (stock.marketCap ?? 0) > 0
      ? (stock.marketCap ?? 0) / price
      : 0;
  if (shares <= 0) return [];

  const configs = getSectorConfigs(sector, industry);
  const baseStock: any = {
    currentPrice: price > 0 ? price : 1,
    sharesOutstanding: shares,
    marketCap: (stock.marketCap ?? 0) > 0 ? stock.marketCap : price * shares,
    peRatio: null, pbRatio: null, psRatio: null, dividendYield: null,
    enterpriseValue: null, beta: null, forwardPE: null, targetMeanPrice: null,
    targetHighPrice: null, targetLowPrice: null, recommendationKey: null,
    recommendationMean: null, numberOfAnalystOpinions: null, payoutRatio: null,
    dividendRate: null, roe: null, roa: null,
  };

  const periodSet = new Set<string>();
  for (const f of financials) periodSet.add(`${f.year}-${f.quarter ?? 0}`);
  for (const b of balanceSheets) periodSet.add(`${b.year}-${b.quarter ?? 0}`);
  const sortedPeriods = [...periodSet]
    .map((key) => {
      const [year, quarter] = key.split('-').map(Number);
      return { key, year, quarter, end: periodEnd(year, quarter) };
    })
    .sort((a, b) => a.end.getTime() - b.end.getTime());

  const entries: TargetEntry[] = [];
  for (const p of sortedPeriods) {
    const finAsOf = financials.filter((f) => f.year < p.year || (f.year === p.year && (f.quarter ?? 0) <= p.quarter));
    const bsAsOf = balanceSheets.filter((b) => b.year < p.year || (b.year === p.year && (b.quarter ?? 0) <= p.quarter));
    if (finAsOf.length === 0) continue;
    const results = computeAll({ financials: finAsOf as any, balanceSheets: bsAsOf as any, stock: baseStock }, configs);
    const recommended = getRecommendedFairValue(results, sector, industry);
    entries.push({ date: p.end, fairValue: recommended.fairValue });
  }
  return entries;
}

export async function backfillAllPortfolioHistory(): Promise<{ portfolios: number; snapshots: number }> {
  const portfolios = await prisma.portfolio.findMany({
    include: {
      holdings: {
        include: { company: { select: { id: true, ticker: true, sector: true, industry: true } } },
      },
    },
  });

  let snapshots = 0;
  for (const portfolio of portfolios) {
    if (portfolio.holdings.length === 0) continue;

    const histories = new Map<string, PricePoint[]>();
    const targets = new Map<string, TargetEntry[]>();

    for (const h of portfolio.holdings) {
      const history = await fetchHistory(h.company.ticker);
      if (history.length > 0) histories.set(h.company.ticker, history);
      const target = await buildCompanyTarget(h.company.id, h.company.ticker, h.company.sector, h.company.industry);
      if (target.length > 0) targets.set(h.company.ticker, target);
      console.log(`[BackfillHistory] ${h.company.ticker}: ${history.length} precios, ${target.length} periodos de valoracion`);
    }

    const dateSet = new Set<string>();
    for (const pts of histories.values()) for (const p of pts) dateSet.add(p.date);
    const dates = [...dateSet].sort();
    if (dates.length === 0) continue;

    let written = 0;
    for (const dateStr of dates) {
      const date = new Date(`${dateStr}T00:00:00Z`);
      let marketValue = 0;
      let targetValue = 0;
      let undervalued = 0;
      let any = false;
      const holdings: Array<{ ticker: string; marketValue: number; targetValue: number; price: number }> = [];
      for (const h of portfolio.holdings) {
        const qty = Number(h.quantity);
        if (qty <= 0) continue;
        const price = priceAt(histories.get(h.company.ticker) ?? [], date);
        if (price == null) continue;
        any = true;
        const mv = qty * price;
        marketValue += mv;
        const fv = fairValueAt(targets.get(h.company.ticker) ?? [], date);
        let tv = 0;
        if (fv != null && fv > 0) {
          tv = qty * fv;
          targetValue += tv;
          if (fv > price * 1.15) undervalued++;
        }
        holdings.push({ ticker: h.company.ticker, marketValue: mv, targetValue: tv, price });
      }
      if (!any || marketValue <= 0) continue;

      await prisma.portfolioSnapshot.upsert({
        where: { portfolioId_date: { portfolioId: portfolio.id, date } },
        update: { marketValue, targetValue, undervaluedCount: undervalued, holdings },
        create: { portfolioId: portfolio.id, date, marketValue, targetValue, undervaluedCount: undervalued, holdings },
      });
      written++;
    }

    console.log(`[BackfillHistory] portfolio ${portfolio.id} (${portfolio.name}): ${written} snapshots`);
    snapshots += written;
  }

  return { portfolios: portfolios.filter((p) => p.holdings.length > 0).length, snapshots };
}

if (require.main === module) {
  backfillAllPortfolioHistory()
    .then((r) => {
      console.log(`[BackfillHistory] fin: ${r.portfolios} carteras, ${r.snapshots} snapshots`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[BackfillHistory] ERROR: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    });
}
