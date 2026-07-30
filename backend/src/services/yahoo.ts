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
      name: meta.longName || meta.shortName || ticker.toUpperCase(),
      currentPrice: meta.regularMarketPrice || 0,
      marketCap: meta.marketCap || 0,
      sharesOutstanding: meta.sharesOutstanding ?? 0,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || '',
    };

    if (quote.currentPrice > 0 && (quote.marketCap > 0 || quote.sharesOutstanding > 0)) {
      return quote;
    }

    if (quote.currentPrice > 0) {
      const fallback = await fetchYahooQuoteFallback(ticker);
      if (fallback) {
        quote.marketCap = fallback.marketCap;
        quote.sharesOutstanding = fallback.sharesOutstanding;
        quote.name = fallback.name;
      }
    }

    return quote.currentPrice > 0 ? quote : null;
  } catch {
    return null;
  }
}

async function fetchYahooQuoteFallback(ticker: string): Promise<YahooQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}`;
    const response = await axios.get(url, {
      params: { modules: 'defaultKeyStatistics,summaryDetail,assetProfile' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const result = response.data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const defaultStats = result.defaultKeyStatistics;
    const summaryDetail = result.summaryDetail;
    const assetProfile = result.assetProfile;

    const sharesOutstanding =
      defaultStats?.sharesOutstanding?.raw ??
      defaultStats?.sharesShort ?? 0;

    const marketCap =
      defaultStats?.marketCap?.raw ??
      summaryDetail?.marketCap?.raw ?? 0;

    const name = assetProfile?.shortName || summaryDetail?.shortName?.raw || ticker;

    return {
      symbol: ticker.toUpperCase(),
      name,
      currentPrice: 0,
      marketCap,
      sharesOutstanding,
      currency: 'USD',
      exchange: '',
    };
  } catch {
    return null;
  }
}

export interface YahooProfile {
  sector: string | null;
  industry: string | null;
  employees: number | null;
  website: string | null;
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
      website: profile.website || null,
    };
  } catch {
    return null;
  }
}
