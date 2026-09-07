import prisma from '../infrastructure/prisma/client';
import { trailing12Months } from './valuationService';

export interface MarketAverages {
  pe: number;
  pb: number;
  ps: number;
  evEbitda: number;
  fcfYield: number;
  sector: string;
  source: string;
  market: {
    pe: number;
    pb: number;
    ps: number;
    evEbitda: number;
    fcfYield: number;
  };
}

// Cache: 1 hour TTL
let cache: { data: MarketAverages; sector: string; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

// S&P 500 sector averages (updated quarterly from historical data)
const SECTOR_DEFAULTS: Record<string, { pe: number; pb: number; ps: number; evEbitda: number; fcfYield: number }> = {
  Technology:                { pe: 30.0, pb: 10.5, ps: 7.5,  evEbitda: 22.0, fcfYield: 3.5 },
  Healthcare:                { pe: 22.0, pb: 4.5,  ps: 4.0,  evEbitda: 16.0, fcfYield: 3.0 },
  'Consumer Cyclical':       { pe: 25.0, pb: 6.0,  ps: 2.0,  evEbitda: 14.0, fcfYield: 4.0 },
  'Consumer Defensive':      { pe: 23.0, pb: 5.0,  ps: 2.5,  evEbitda: 15.0, fcfYield: 3.5 },
  Industrials:               { pe: 22.0, pb: 5.5,  ps: 2.5,  evEbitda: 15.0, fcfYield: 3.5 },
  'Financial Services':      { pe: 15.0, pb: 1.8,  ps: 3.0,  evEbitda: 12.0, fcfYield: 4.5 },
  Energy:                    { pe: 12.0, pb: 2.0,  ps: 1.5,  evEbitda: 8.0,  fcfYield: 5.0 },
  'Real Estate':             { pe: 35.0, pb: 1.2,  ps: 8.0,  evEbitda: 25.0, fcfYield: 3.0 },
  Utilities:                 { pe: 18.0, pb: 1.8,  ps: 2.5,  evEbitda: 12.0, fcfYield: 3.5 },
  'Communication Services':  { pe: 25.0, pb: 4.0,  ps: 5.0,  evEbitda: 16.0, fcfYield: 3.5 },
  'Basic Materials':         { pe: 18.0, pb: 2.5,  ps: 1.8,  evEbitda: 10.0, fcfYield: 4.0 },
};

// S&P 500 broad market averages
const MARKET_DEFAULTS = { pe: 22.0, pb: 4.5, ps: 2.8, evEbitda: 16.0, fcfYield: 3.5 };

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Median with outliers capped at the 95th percentile and non-positive values excluded
function robustMedian(values: number[]): number | null {
  const positive = values.filter((v) => Number.isFinite(v) && v > 0);
  if (positive.length === 0) return null;
  const sorted = [...positive].sort((a, b) => a - b);
  const capIndex = Math.max(1, Math.floor(sorted.length * 0.95));
  return median(sorted.slice(0, capIndex));
}

export async function getMarketAverages(sector: string): Promise<MarketAverages> {
  const now = Date.now();

  // Return cache if valid
  if (cache && cache.sector === sector && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const defaults = SECTOR_DEFAULTS[sector] || MARKET_DEFAULTS;

  // Real averages from companies in the same sector in our own database
  let pe: number | null = null;
  let pb: number | null = null;
  let ps: number | null = null;
  let evEbitda: number | null = null;
  let fcfYield: number | null = null;
  let peerCount = 0;

  try {
    const peers = await prisma.company.findMany({
      where: { sector },
      select: { id: true },
    });

    if (peers.length > 0) {
      const peArr: number[] = [];
      const pbArr: number[] = [];
      const psArr: number[] = [];
      const evArr: number[] = [];
      const fcfArr: number[] = [];

      for (const { id } of peers) {
        const stock = await prisma.stockMetric.findFirst({
          where: { companyId: id },
          orderBy: { date: 'desc' },
        });
        if (!stock) continue;

        if (stock.peRatio) peArr.push(stock.peRatio);
        if (stock.pbRatio) pbArr.push(stock.pbRatio);
        if (stock.psRatio) psArr.push(stock.psRatio);

        const fin = await prisma.financialData.findMany({
          where: { companyId: id },
        });
        const bsFin = await prisma.balanceSheet.findMany({
          where: { companyId: id },
        });
        const ttm = trailing12Months(fin, bsFin);
        if (stock.enterpriseValue && ttm?.ebitda != null && ttm.ebitda > 0) evArr.push(stock.enterpriseValue / ttm.ebitda);
        if (ttm?.freeCashFlow != null && stock.marketCap && stock.marketCap > 0) fcfArr.push(ttm.freeCashFlow / stock.marketCap);
      }

      pe = robustMedian(peArr);
      pb = robustMedian(pbArr);
      ps = robustMedian(psArr);
      evEbitda = robustMedian(evArr);
      fcfYield = robustMedian(fcfArr);
      peerCount = peers.length;
    }
  } catch {
    // DB unavailable — fall back to historical defaults below
  }

  const result: MarketAverages = {
    pe: pe ?? defaults.pe,
    pb: pb ?? defaults.pb,
    ps: ps ?? defaults.ps,
    evEbitda: evEbitda ?? defaults.evEbitda,
    fcfYield: fcfYield ?? defaults.fcfYield,
    sector,
    source: pe != null
      ? `Mediana de ${peerCount} empresas del sector en la base de datos`
      : 'Promedios históricos S&P 500 por sector',
    market: {
      pe: MARKET_DEFAULTS.pe,
      pb: MARKET_DEFAULTS.pb,
      ps: MARKET_DEFAULTS.ps,
      evEbitda: MARKET_DEFAULTS.evEbitda,
      fcfYield: MARKET_DEFAULTS.fcfYield,
    },
  };

  cache = { data: result, sector, timestamp: now };
  return result;
}
