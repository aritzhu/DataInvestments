import prisma from '../infrastructure/prisma/client';
import { fetchYahooChartSeries } from './yahoo';

export type MacroRegion = 'us' | 'europe' | 'asia' | 'americas';
export type MacroPeriod = '1d' | '1w' | '1m' | '3m' | '6m' | 'ytd' | '1y' | '5y';

interface MacroIndexDefinition {
  symbol: string;
  name: string;
  region: MacroRegion;
  country: string;
}

interface PeriodConfig {
  range: string;
  interval: string;
}

export interface MacroPoint {
  t: number;
  c: number;
}

export interface MacroIndex {
  symbol: string;
  name: string;
  region: MacroRegion;
  country: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  points: MacroPoint[];
  available: boolean;
}

export interface MacroResponse {
  period: MacroPeriod;
  updatedAt: string;
  source: string;
  stale?: boolean;
  indices: MacroIndex[];
}

export const MACRO_INDICES: MacroIndexDefinition[] = [
  { symbol: '^GSPC', name: 'S&P 500', region: 'us', country: 'EE. UU.' },
  { symbol: '^IXIC', name: 'Nasdaq Composite', region: 'us', country: 'EE. UU.' },
  { symbol: '^DJI', name: 'Dow Jones', region: 'us', country: 'EE. UU.' },
  { symbol: '^RUT', name: 'Russell 2000', region: 'us', country: 'EE. UU.' },
  { symbol: '^STOXX50E', name: 'Euro Stoxx 50', region: 'europe', country: 'Europa' },
  { symbol: '^GDAXI', name: 'DAX', region: 'europe', country: 'Alemania' },
  { symbol: '^FCHI', name: 'CAC 40', region: 'europe', country: 'Francia' },
  { symbol: '^FTSE', name: 'FTSE 100', region: 'europe', country: 'Reino Unido' },
  { symbol: '^IBEX', name: 'IBEX 35', region: 'europe', country: 'España' },
  { symbol: 'FTSEMIB.MI', name: 'FTSE MIB', region: 'europe', country: 'Italia' },
  { symbol: '^N225', name: 'Nikkei 225', region: 'asia', country: 'Japón' },
  { symbol: '^HSI', name: 'Hang Seng', region: 'asia', country: 'Hong Kong' },
  { symbol: '000001.SS', name: 'Shanghai Composite', region: 'asia', country: 'China' },
  { symbol: '^KS11', name: 'KOSPI', region: 'asia', country: 'Corea del Sur' },
  { symbol: '^AXJO', name: 'S&P/ASX 200', region: 'asia', country: 'Australia' },
  { symbol: '^GSPTSE', name: 'S&P/TSX', region: 'americas', country: 'Canadá' },
  { symbol: '^BVSP', name: 'Bovespa', region: 'americas', country: 'Brasil' },
];

export const MACRO_PERIODS: Record<MacroPeriod, PeriodConfig> = {
  '1d': { range: '1d', interval: '5m' },
  '1w': { range: '5d', interval: '30m' },
  '1m': { range: '1mo', interval: '1d' },
  '3m': { range: '3mo', interval: '1d' },
  '6m': { range: '6mo', interval: '1d' },
  ytd: { range: 'ytd', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
  '5y': { range: '5y', interval: '1wk' },
};

const CACHE_TTL_MS = 3 * 60 * 1000;
const STALE_TTL_MS = 15 * 60 * 1000;
const MAX_CHART_POINTS = 48;
const FETCH_CONCURRENCY = 4;

const cache = new Map<MacroPeriod, { at: number; data: MacroResponse }>();

export function isMacroPeriod(value: unknown): value is MacroPeriod {
  return typeof value === 'string' && value in MACRO_PERIODS;
}

export async function canAccessMacro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, role: true },
  });
  if (!user) return false;
  return user.subscriptionTier === 'premium' || user.role === 'admin';
}

function downsample(points: MacroPoint[], max: number): MacroPoint[] {
  if (points.length <= max) return points;
  const result: MacroPoint[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}

function finite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

async function loadIndex(
  index: MacroIndexDefinition,
  period: MacroPeriod,
): Promise<MacroIndex> {
  const config = MACRO_PERIODS[period];
  const series = await fetchYahooChartSeries(index.symbol, config.range, config.interval);

  if (!series || series.points.length === 0) {
    return {
      ...index,
      price: null,
      change: null,
      changePercent: null,
      high: null,
      low: null,
      points: [],
      available: false,
    };
  }

  const closes = series.points.map((point) => point.close);
  const lastClose = closes[closes.length - 1];
  const firstClose = closes[0];
  const metaPrice = finite(series.meta.regularMarketPrice);
  const previousClose = finite(series.meta.chartPreviousClose);
  const price = metaPrice ?? lastClose;
  const base = period === '1d' && previousClose != null ? previousClose : firstClose;
  const change = base !== 0 ? price - base : null;
  const changePercent = base !== 0 ? (change! / base) * 100 : null;

  return {
    ...index,
    price,
    change,
    changePercent,
    high: Math.max(...closes),
    low: Math.min(...closes),
    points: downsample(
      series.points.map((point) => ({ t: point.time, c: point.close })),
      MAX_CHART_POINTS,
    ),
    available: true,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

export async function getMacroIndices(period: MacroPeriod): Promise<MacroResponse> {
  const cached = cache.get(period);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const indices = await mapWithConcurrency(
      MACRO_INDICES,
      FETCH_CONCURRENCY,
      (index) => loadIndex(index, period),
    );

    if (indices.every((index) => !index.available)) {
      throw new Error('No macro data available');
    }

    const data: MacroResponse = {
      period,
      updatedAt: new Date().toISOString(),
      source: 'Yahoo Finance',
      indices,
    };

    cache.set(period, { at: Date.now(), data });
    return data;
  } catch (error) {
    if (cached && Date.now() - cached.at < STALE_TTL_MS) {
      return { ...cached.data, stale: true };
    }
    throw error;
  }
}
