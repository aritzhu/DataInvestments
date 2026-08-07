import prisma from '../infrastructure/prisma/client';
import { fetchYahooQuote } from './yahoo';
import { fetchYFinanceInfo } from './yfinanceSidecar';
import { resolveShares } from './dataAggregator';
import { computeAll, getRecommendedFairValue, getSectorConfigs } from './valuationService';
import { applyCompanyOverrides } from './overrides';

const REFRESH_DELAY_MS = Number(process.env.REFRESH_DELAY_MS || 150);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry<T>(fetchFn: () => Promise<T>, isOk: (v: T) => boolean, attempts = 3): Promise<T> {
  let last: T | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await fetchFn();
      if (isOk(value)) return value;
      last = value;
    } catch (err) {
      console.log(`[QuoteRefresh] intento ${i + 1}/${attempts}: ${err instanceof Error ? err.message : err}`);
    }
    if (i < attempts - 1) await sleep(2000 * (i + 1));
  }
  return last as T;
}

async function recomputeIntrinsic(companyId: string, ticker: string, sector: string | null, industry: string | null) {
  const [financials, balanceSheets, stockMetrics] = await Promise.all([
    prisma.financialData.findMany({ where: { companyId }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
    prisma.balanceSheet.findMany({ where: { companyId }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
    prisma.stockMetric.findMany({ where: { companyId }, orderBy: { date: 'desc' }, take: 1 }),
  ]);

  const stock = stockMetrics[0];
  if (!stock || financials.length === 0) return;

  const configs = getSectorConfigs(sector, industry);
  const results = computeAll({ financials: financials as any, balanceSheets: balanceSheets as any, stock }, configs);
  const { fairValue } = getRecommendedFairValue(results, sector, industry);

  const intrinsicValue = fairValue != null && fairValue > 0 ? fairValue : null;
  const marginOfSafety =
    intrinsicValue != null && stock.currentPrice > 0
      ? (intrinsicValue - stock.currentPrice) / stock.currentPrice
      : null;

  await prisma.stockMetric.update({
    where: { id: stock.id },
    data: { intrinsicValue, marginOfSafety },
  });

  console.log(`[QuoteRefresh] ${ticker} price=${stock.currentPrice?.toFixed(2)} fair=${intrinsicValue?.toFixed(2) ?? 'null'} mos=${marginOfSafety != null ? (marginOfSafety * 100).toFixed(0) + '%' : 'null'}`);
}

// Refreshes the latest StockMetric of every company with a fresh quote + ratios
// (no full financial re-sync), then recomputes stored valuations.
export async function refreshAllQuotes(): Promise<{ refreshed: number; skipped: number }> {
  const companies = await prisma.company.findMany({
    select: { id: true, ticker: true, sector: true, industry: true },
    orderBy: { ticker: 'asc' },
  });

  let refreshed = 0;
  let skipped = 0;

  for (const c of companies) {
    try {
      const yahooQuote = await fetchWithRetry(() => fetchYahooQuote(c.ticker), (v) => !!v && v.currentPrice > 0);
      const yfInfo = await fetchWithRetry(() => fetchYFinanceInfo(c.ticker), (v) => !!v);
      if (!yahooQuote || yahooQuote.currentPrice <= 0) {
        skipped++;
        continue;
      }

      const info = yfInfo?.info;
      const shares = resolveShares(c.ticker, info?.sharesOutstanding, yahooQuote.sharesOutstanding, yahooQuote.marketCap, yahooQuote.currentPrice, 0);
      const mcap = shares > 0 && yahooQuote.currentPrice > 0 ? yahooQuote.currentPrice * shares : yahooQuote.marketCap > 0 ? yahooQuote.marketCap : null;

      const existing = await prisma.stockMetric.findFirst({
        where: { companyId: c.id },
        orderBy: { date: 'desc' },
      });

      const isGbPence = (info?.currency ?? yahooQuote.currency ?? '').toUpperCase() === 'GBP';
      const currentPrice = yahooQuote.currentPrice > 0 && isGbPence ? yahooQuote.currentPrice / 100 : yahooQuote.currentPrice;

      const stockData = {
        date: new Date(),
        currentPrice,
        sharesOutstanding: shares,
        marketCap: mcap,
        peRatio: info?.trailingPE ?? existing?.peRatio ?? null,
        pbRatio: info?.priceToBook ?? existing?.pbRatio ?? null,
        psRatio: info?.priceToSalesTrailing12Months ?? existing?.psRatio ?? null,
        dividendYield: info?.dividendYield ?? existing?.dividendYield ?? null,
        enterpriseValue: info?.enterpriseValue ?? existing?.enterpriseValue ?? null,
        roe: info?.returnOnEquity != null ? info.returnOnEquity * 100 : existing?.roe ?? null,
        roa: info?.returnOnAssets != null ? info.returnOnAssets * 100 : existing?.roa ?? null,
      };

      if (existing) {
        await prisma.stockMetric.update({ where: { id: existing.id }, data: stockData });
      } else {
        await prisma.stockMetric.create({
          data: {
            companyId: c.id,
            ...stockData,
            currentRatio: null,
            debtToEquity: null,
            roic: null,
            altmanZ: null,
            piotroskiScore: null,
            intrinsicValue: null,
            marginOfSafety: null,
          },
        });
      }

      await applyCompanyOverrides(c.ticker, c.id);
      await recomputeIntrinsic(c.id, c.ticker, c.sector, c.industry);
      refreshed++;
    } catch (err) {
      console.error(`[QuoteRefresh] ${c.ticker} FAILED: ${err instanceof Error ? err.message : err}`);
      skipped++;
    } finally {
      await sleep(REFRESH_DELAY_MS);
    }
  }

  return { refreshed, skipped };
}
