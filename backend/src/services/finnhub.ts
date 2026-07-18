import axios from 'axios';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY || '';

export interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

export interface FinnhubMetric {
  peBasicExclExtraTTM: number;
  peTTM: number;
  pbQuarterly: number;
  psTTM: number;
  dividendPerShareQuarterly: number;
  dividendYieldIndicatedAnnual: number;
  debtPerShareQuarterly: number;
  ROETTM: number;
  ROATTM: number;
  netProfitMarginTTM: number;
  operatingMarginTTM: number;
  grossMarginTTM: number;
  bookValuePerShareQuarterly: number;
  cashPerSharePerShareQuarterly: number;
  freeCashFlowTTM: number;
  revenueGrowthTTMYoy: number;
  earningsGrowthTTMYoy: number;
  receivablesTurnoverTTM: number;
  totalDebtToTotalEquityQuarterly: number;
  currentRatioQuarterly: number;
  quickRatioQuarterly: number;
  totalRevenueTTM: number;
  enterpriseValueTTM: number;
  [key: string]: number;
}

async function finnhubFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = `${FINNHUB_BASE}${endpoint}`;
  const response = await axios.get(url, {
    params: { ...params, token: API_KEY },
    timeout: 30000,
  });
  return response.data;
}

export async function fetchFinnhubProfile(ticker: string): Promise<FinnhubProfile | null> {
  try {
    const data = await finnhubFetch<FinnhubProfile>('/stock/profile2', { symbol: ticker });
    return data?.ticker ? data : null;
  } catch {
    return null;
  }
}

export async function fetchFinnhubMetrics(ticker: string): Promise<FinnhubMetric | null> {
  try {
    const data = await finnhubFetch<{ metric: FinnhubMetric }>('/stock/metric', {
      symbol: ticker,
      metric: 'all',
    });
    return data?.metric ? data.metric : null;
  } catch {
    return null;
  }
}

export async function fetchFinnhubPeers(ticker: string): Promise<string[]> {
  try {
    return await finnhubFetch<string[]>('/stock/peers', { symbol: ticker });
  } catch {
    return [];
  }
}
