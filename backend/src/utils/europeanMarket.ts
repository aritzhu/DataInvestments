import {
  STOXX600_TICKERS,
  STOXX600_UNIQUE_TICKERS,
  STOXX600_COUNTRIES,
  EUROPEAN_INDICES,
  DAX_TICKERS,
  CAC40_TICKERS,
  FTSE100_TICKERS,
  IBEX35_TICKERS,
  AEX_TICKERS,
  FTSEMIB_TICKERS,
  SMI_TICKERS,
} from '../data/europeanTickers';
import type { EuropeanTicker, EuropeanIndex } from '../data/europeanTickers';

export type { EuropeanTicker, EuropeanIndex };

// Exchange suffix mapping by country code
export const EXCHANGE_SUFFIXES: Record<string, string> = {
  DE: '.DE',
  FR: '.PA',
  GB: '.L',
  ES: '.MC',
  NL: '.AS',
  IT: '.MI',
  CH: '.SW',
  BE: '.BR',
  AT: '.VI',
  SE: '.ST',
  NO: '.OL',
  DK: '.CO',
  FI: '.HE',
  PT: '.LS',
  IE: '.IR',
  LU: '.LS',
};

// Currency mapping by country code
export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  DE: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  ES: 'EUR',
  NL: 'EUR',
  IT: 'EUR',
  CH: 'CHF',
  BE: 'EUR',
  AT: 'EUR',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  FI: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  LU: 'EUR',
};

// Exchange names by country code
export const EXCHANGE_NAMES: Record<string, string> = {
  DE: 'XETRA',
  FR: 'Euronext Paris',
  GB: 'LSE',
  ES: 'BME',
  NL: 'Euronext Amsterdam',
  IT: 'Borsa Italiana',
  CH: 'SIX Swiss Exchange',
  BE: 'Euronext Brussels',
  AT: 'Wiener Börse',
  SE: 'Nasdaq Stockholm',
  NO: 'Oslo Børs',
  DK: 'Nasdaq Copenhagen',
  FI: 'Nasdaq Helsinki',
  PT: 'Euronext Lisbon',
  IE: 'Euronext Dublin',
  LU: 'Luxembourg Stock Exchange',
};

/**
 * Get tickers for a specific European index
 */
export function getEuropeanTickersForIndex(indexId: string): EuropeanTicker[] {
  switch (indexId) {
    case 'stoxx600': return STOXX600_UNIQUE_TICKERS;
    case 'dax': return DAX_TICKERS;
    case 'cac40': return CAC40_TICKERS;
    case 'ftse100': return FTSE100_TICKERS;
    case 'ibex35': return IBEX35_TICKERS;
    case 'aex': return AEX_TICKERS;
    case 'ftsemib': return FTSEMIB_TICKERS;
    case 'smi': return SMI_TICKERS;
    default: return [];
  }
}

/**
 * Get all available European countries
 */
export function getAvailableCountries() {
  return STOXX600_COUNTRIES;
}

/**
 * Get all available European indices
 */
export function getAvailableIndices(): EuropeanIndex[] {
  return EUROPEAN_INDICES;
}

/**
 * Filter tickers by country code(s)
 */
export function filterTickersByCountry(
  tickers: EuropeanTicker[],
  countryCodes: string[]
): EuropeanTicker[] {
  return tickers.filter(t => countryCodes.includes(t.countryCode));
}

/**
 * Get tickers by multiple indices (union)
 */
export function getTickersByIndices(indexIds: string[]): EuropeanTicker[] {
  const allTickers = new Map<string, EuropeanTicker>();
  for (const indexId of indexIds) {
    const tickers = getEuropeanTickersForIndex(indexId);
    for (const ticker of tickers) {
      allTickers.set(ticker.ticker, ticker);
    }
  }
  return Array.from(allTickers.values());
}

/**
 * Search tickers by name or ticker symbol
 */
export function searchEuropeanTickers(
  query: string,
  tickers: EuropeanTicker[] = STOXX600_UNIQUE_TICKERS
): EuropeanTicker[] {
  const q = query.toLowerCase();
  return tickers.filter(
    t => t.ticker.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
  );
}

/**
 * Get country statistics for a set of tickers
 */
export function getCountryStats(tickers: EuropeanTicker[]) {
  const stats: Record<string, { count: number; country: string; countryCode: string }> = {};
  for (const t of tickers) {
    if (!stats[t.countryCode]) {
      stats[t.countryCode] = { count: 0, country: t.country, countryCode: t.countryCode };
    }
    stats[t.countryCode].count++;
  }
  return Object.values(stats).sort((a, b) => b.count - a.count);
}
