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
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roa: number | null;
  roic: number | null;
  totalDebt: number | null;
  quickRatio: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
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

function safeDiv(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
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

  type Candidate = {
    year: number; quarter: number; end: Date;
    netIncome: number; equity: number;
    revenue: number | null; grossProfit: number | null; ebit: number | null;
    taxExpense: number | null;
    totalAssets: number | null;
    totalCurrentAssets: number | null; totalCurrentLiabilities: number | null;
    inventory: number | null;
    shortTermDebt: number | null; longTermDebt: number | null;
    cash: number;
  };

  const candidates: Candidate[] = [];
  let earliestEnd: Date = new Date();
  let hasEarliest = false;

  for (const f of financials) {
    if (f.year < minYear || f.year > maxYear) continue;
    const bs = bsByKey.get(`${f.year}-${f.quarter ?? 0}`);
    const equity = bs?.totalStockholdersEquity ?? f.totalEquity ?? null;
    const netIncome = f.netIncome ?? null;
    if (netIncome == null || equity == null) continue;
    const end = periodEnd(f.year, f.quarter ?? 0);
    candidates.push({
      year: f.year, quarter: f.quarter ?? 0, end,
      netIncome, equity,
      revenue: f.revenue ?? null,
      grossProfit: f.grossProfit ?? null,
      ebit: f.ebit ?? null,
      taxExpense: f.taxExpense ?? null,
      totalAssets: bs?.totalAssets ?? f.totalAssets ?? null,
      totalCurrentAssets: bs?.totalCurrentAssets ?? null,
      totalCurrentLiabilities: bs?.totalCurrentLiabilities ?? null,
      inventory: bs?.inventory ?? null,
      shortTermDebt: bs?.shortTermDebt ?? null,
      longTermDebt: bs?.longTermDebt ?? null,
      cash: (bs?.cashAndCashEquivalents ?? 0) + (bs?.shortTermInvestments ?? 0),
    });
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
    const roe = safeDiv(c.netIncome, c.equity);
    let pbRatio: number | null = null;
    if (shares != null && prices.length > 0 && c.equity > 0) {
      const price = priceAt(prices, c.end);
      if (price != null && price > 0) {
        const mcap = price * shares;
        pbRatio = mcap / c.equity;
      }
    }

    // Margins
    const grossMargin = safeDiv(c.grossProfit, c.revenue);
    const operatingMargin = safeDiv(c.ebit, c.revenue);
    const netMargin = safeDiv(c.netIncome, c.revenue);

    // Return ratios
    const roa = safeDiv(c.netIncome, c.totalAssets);

    // ROIC = NOPAT / Invested Capital
    let roic: number | null = null;
    if (c.ebit != null && c.ebit > 0) {
      const taxRate = c.taxExpense != null && c.taxExpense > 0
        ? Math.min(Math.max(c.taxExpense / c.ebit, 0), 0.6)
        : 0.21;
      const nopat = c.ebit * (1 - taxRate);
      const investedCapital = c.equity + (c.shortTermDebt ?? 0) + (c.longTermDebt ?? 0) - c.cash;
      if (nopat > 0 && investedCapital > 0) {
        roic = nopat / investedCapital;
      }
    }

    // Financial health
    const totalDebt = (c.shortTermDebt ?? 0) + (c.longTermDebt ?? 0);
    const quickRatio = c.totalCurrentAssets != null && c.totalCurrentLiabilities != null && c.totalCurrentLiabilities > 0
      ? (c.totalCurrentAssets - (c.inventory ?? 0)) / c.totalCurrentLiabilities
      : null;
    const currentRatio = c.totalCurrentAssets != null && c.totalCurrentLiabilities != null && c.totalCurrentLiabilities > 0
      ? c.totalCurrentAssets / c.totalCurrentLiabilities
      : null;
    const debtToEquity = c.equity > 0 ? totalDebt / c.equity : null;

    out.push({
      year: c.year,
      quarter: c.quarter,
      periodLabel: periodLabel(c.year, c.quarter),
      periodEnd: c.end.toISOString().slice(0, 10),
      roe, pbRatio,
      grossMargin, operatingMargin, netMargin,
      roa, roic,
      totalDebt: totalDebt > 0 ? totalDebt : null,
      quickRatio, currentRatio, debtToEquity,
    });
  }

  return out;
}
