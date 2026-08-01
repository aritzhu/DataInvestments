import { fetchYFinanceInfo } from './yfinanceSidecar';
import { STOXX600_UNIQUE_TICKERS } from '../data/europeanTickers/stoxx600';
import { TICKER_SECTORS } from '../data/sectors';
import { SP500_SECTORS } from '../data/sp500';

export function buildLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!domain) return null;
  return `https://logos.hunter.io/${domain}`;
}

export const STOXX_SECTOR_INDUSTRY: Record<string, string> = {
  'Financial Services': 'Banks - Diversified',
  'Technology': 'Software - Infrastructure',
  'Industrials': 'Aerospace & Defense',
  'Consumer Cyclical': 'Auto Manufacturers',
  'Consumer Defensive': 'Consumer Staples',
  'Healthcare': 'Drug Manufacturers',
  'Energy': 'Oil & Gas Integrated',
  'Utilities': 'Utilities - Regulated Electric',
  'Real Estate': 'REIT - Diversified',
  'Communication Services': 'Telecom Services',
  'Basic Materials': 'Specialty Chemicals',
};

export const EUROPEAN_SUFFIXES = [
  'DE', 'F', 'D', 'PA', 'L', 'MC', 'AS', 'BR', 'HE', 'ST', 'CO', 'MI', 'LS', 'VI', 'SW', 'OL', 'IR', 'LU',
];

export function isEuropeanTicker(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  const suffix = upper.includes('.') ? upper.split('.').pop() : '';
  return !!suffix && EUROPEAN_SUFFIXES.includes(suffix);
}

export interface ResolvedCompanyMeta {
  name?: string;
  sector?: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
}

export async function resolveCompanyMeta(ticker: string): Promise<ResolvedCompanyMeta> {
  const upper = ticker.toUpperCase();
  const meta: ResolvedCompanyMeta = {};

  // Primary source: yfinance sidecar
  try {
    const yf = await fetchYFinanceInfo(upper);
    const info = yf?.info;
    if (info) {
      if (info.sector) meta.sector = info.sector;
      if (info.industry) meta.industry = info.industry;
      if (info.website) meta.website = info.website;
      if (info.longName) meta.name = info.longName;
      else if (info.shortName) meta.name = info.shortName;
    }
  } catch {
    // yfinance unreachable, fall through to static sources
  }

  // Static sources (fill only what yfinance did not provide)
  const stoxxEntry = STOXX600_UNIQUE_TICKERS.find(t => t.ticker === upper);
  const known = TICKER_SECTORS[upper];
  const sp500 = SP500_SECTORS[upper];

  if (stoxxEntry?.sector && !meta.sector) {
    meta.sector = stoxxEntry.sector;
  }
  if (stoxxEntry?.sector && !meta.industry) {
    const industry = STOXX_SECTOR_INDUSTRY[stoxxEntry.sector];
    if (industry) meta.industry = industry;
  }
  if (known?.sector && !meta.sector) meta.sector = known.sector;
  if (known?.industry && !meta.industry) meta.industry = known.industry;
  if (sp500 && !meta.sector) meta.sector = sp500;

  if (meta.website && !meta.logoUrl) {
    meta.logoUrl = buildLogoUrl(meta.website) || undefined;
  }

  return meta;
}
