import prisma from '../infrastructure/prisma/client';
import { fetchYFinanceHistory, type YFinanceHistoryPoint } from './yfinanceSidecar';

const YEARS_BACK = 5;

export interface MetricVariationPoint {
  year: number;
  quarter: number;
  periodLabel: string;
  periodEnd: string;
  roe: number | null;
  pbRatio: number | null;
}

function periodEnd(year: number, quarter: number | null): Date {
  if (!quarter || quarter <= 0) return new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  return new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59));
}

function periodLabel(year: number, quarter: number | null): string {
  if (!quarter || quarter <= 0) return `FY ${year}`;
  return `Q${quarter} ${String(year).slice(2)}`;
}

function priceAt(pts: YFinanceHistoryPoint[], date: Date): number | null {
  let last: number | null = null;
  for (const p of pts) {
    const d = new Date(`${p.date}T00:00:00Z`);
    if (d.getTime() <= date.getTime()) last = p.close;
    else break;
  }
  return last;
}

export async function getMetricVariations(companyId: string, ticker: string): Promise<MetricVariationPoint[]> {
  const [financials, balanceSheets, latestStock] = await Promise.all([
    prisma.financialData.findMany({
      where: { companyId },
      orderBy: [{ year: 'asc' }, { quarter: 'asc' }],
    }),
    prisma.balanceSheet.findMany({
      where: { companyId },
      orderBy: [{ year: 'asc' }, { quarter: 'asc' }],
    }),
    prisma.stockMetric.findFirst({ where: { companyId }, orderBy: { date: 'desc' } }),
  ]);

  const shares = latestStock?.sharesOutstanding ?? null;
  const maxYear = new Date().getFullYear();
  const minYear = maxYear - YEARS_BACK;

  const bsByKey = new Map<string, (typeof balanceSheets)[number]>();
  for (const bs of balanceSheets) bsByKey.set(`${bs.year}-${bs.quarter ?? 0}`, bs);

  const candidates: { year: number; quarter: number; netIncome: number; equity: number; end: Date }[] = [];
  let earliestEnd: Date = new Date();
  let hasEarliest = false;

  for (const f of financials) {
    if (f.year < minYear || f.year > maxYear) continue;
    const bs = bsByKey.get(`${f.year}-${f.quarter ?? 0}`);
    const equity = bs?.totalStockholdersEquity ?? f.totalEquity ?? null;
    const netIncome = f.netIncome ?? null;
    if (netIncome == null || equity == null) continue;
    const end = periodEnd(f.year, f.quarter ?? 0);
    candidates.push({ year: f.year, quarter: f.quarter ?? 0, netIncome, equity, end });
    if (!hasEarliest || end.getTime() < earliestEnd.getTime()) {
      earliestEnd = end;
      hasEarliest = true;
    }
  }

  // Exclude annual aggregates (quarter 0) when real quarterly rows exist,
  // because an annual cumulative ROE is not comparable with quarterly ROE.
  // Fall back to annual-only when there are no quarterly rows at all.
  const trimmed = candidates.filter((c) => c.quarter !== 0);
  const selected = trimmed.length > 0 ? trimmed : candidates;

  if (selected.length === 0) return [];

  const period1 = Math.floor(earliestEnd.getTime() / 1000) - 30 * 86400;
  const prices = shares != null ? await fetchYFinanceHistory(ticker, period1) : [];

  const out: MetricVariationPoint[] = [];
  for (const c of selected) {
    const roe = c.equity > 0 ? c.netIncome / c.equity : null;
    let pbRatio: number | null = null;
    if (shares != null && prices.length > 0 && c.equity > 0) {
      const price = priceAt(prices, c.end);
      if (price != null && price > 0) {
        const mcap = price * shares;
        pbRatio = mcap / c.equity;
      }
    }
    out.push({
      year: c.year,
      quarter: c.quarter,
      periodLabel: periodLabel(c.year, c.quarter),
      periodEnd: c.end.toISOString().slice(0, 10),
      roe,
      pbRatio,
    });
  }

  return out;
}
