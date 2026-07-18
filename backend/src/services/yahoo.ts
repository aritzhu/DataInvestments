import axios from 'axios';

export interface YahooQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  sharesOutstanding: number;
  currency: string;
  exchange: string;
}

export async function fetchYahooQuote(ticker: string): Promise<YahooQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const response = await axios.get(url, {
      params: {
        interval: '1d',
        range: '1d',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const data = response.data;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const quote: YahooQuote = {
      symbol: meta.symbol || ticker.toUpperCase(),
      name: meta.shortName || meta.longName || ticker.toUpperCase(),
      currentPrice: meta.regularMarketPrice || 0,
      marketCap: meta.marketCap || 0,
      sharesOutstanding: meta.sharesOutstanding || 0,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || '',
    };

    return quote.currentPrice > 0 ? quote : null;
  } catch {
    return null;
  }
}

export interface YahooProfile {
  sector: string | null;
  industry: string | null;
  employees: number | null;
}

export async function fetchYahooProfile(ticker: string): Promise<YahooProfile | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}`;
    const response = await axios.get(url, {
      params: { modules: 'assetProfile' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const profile = response.data?.quoteSummary?.result?.[0]?.assetProfile;
    if (!profile) return null;

    return {
      sector: profile.sector || null,
      industry: profile.industry || null,
      employees: profile.fullTimeEmployees || null,
    };
  } catch {
    return null;
  }
}
