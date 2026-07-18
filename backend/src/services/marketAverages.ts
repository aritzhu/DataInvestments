import axios from 'axios';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

interface SectorPE {
  sector: string;
  peRatio: number;
  date: string;
}

interface MarketAverages {
  pe: number;
  pb: number;
  ps: number;
  evEbitda: number;
  fcfYield: number;
  sector: string;
  source: string;
}

// Cache: 1 hour TTL
let cache: { data: MarketAverages; ticker: string; timestamp: number } | null = null;
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
  'Basic Materials':          { pe: 18.0, pb: 2.5,  ps: 1.8,  evEbitda: 10.0, fcfYield: 4.0 },
};

// S&P 500 broad market averages
const MARKET_DEFAULTS = { pe: 22.0, pb: 4.5, ps: 2.8, evEbitda: 16.0, fcfYield: 3.5 };

async function fetchSectorPE(sector: string, apiKey: string): Promise<number | null> {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const url = `${FMP_BASE}/sector-pe-snapshot`;
    const response = await axios.get<SectorPE[]>(url, {
      params: { date: dateStr, apikey: apiKey },
      timeout: 15000,
    });

    const match = response.data?.find(
      (s) => s.sector?.toLowerCase() === sector.toLowerCase()
    );
    return match?.peRatio ?? null;
  } catch {
    return null;
  }
}

export async function getMarketAverages(
  sector: string,
  apiKey: string
): Promise<MarketAverages> {
  const now = Date.now();

  // Return cache if valid
  if (cache && cache.ticker === sector && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const defaults = SECTOR_DEFAULTS[sector] || SECTOR_DEFAULTS.Technology;

  // Try to get live sector PE from FMP
  const livePE = await fetchSectorPE(sector, apiKey);

  const result: MarketAverages = {
    pe: livePE ?? defaults.pe,
    pb: defaults.pb,
    ps: defaults.ps,
    evEbitda: defaults.evEbitda,
    fcfYield: defaults.fcfYield,
    sector,
    source: livePE ? 'FMP (sector PE) + histórico (otros)' : 'Promedios históricos S&P 500 por sector',
  };

  cache = { data: result, ticker: sector, timestamp: now };
  return result;
}
