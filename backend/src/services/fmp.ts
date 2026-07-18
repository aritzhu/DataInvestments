import axios from 'axios';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

export interface FMPIncomeStatement {
  date: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  researchAndDevelopmentExpenses: number;
  interestExpense: number;
  taxExpense: number;
  netIncome: number;
  ebitda: number;
  ebit: number;
  depreciationAndAmortization: number;
}

export interface FMPBalanceSheet {
  date: string;
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  cashAndCashEquivalents: number;
  totalDebt: number;
  shortTermInvestments: number;
  receivables: number;
  inventory: number;
  totalCurrentAssets: number;
  propertyPlantEquipmentNet: number;
  goodwill: number;
  intangibleAssets: number;
  totalNonCurrentAssets: number;
  accountsPayable: number;
  shortTermDebt: number;
  currentLongTermDebt: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  totalNonCurrentLiabilities: number;
  retainedEarnings: number;
  treasuryStock: number;
}

export interface FMPCashFlow {
  date: string;
  period: string;
  capitalExpenditure: number;
  depreciationAndAmortization: number;
  freeCashFlow: number;
  operatingCashFlow: number;
  netCashUsedForInvestingActivites: number;
  netCashUsedProvidedByFinancingActivities: number;
  dividendsPaid: number;
  commonStockRepurchased: number;
  stockBasedCompensation: number;
  debtRepayment: number;
  commonStockIssued: number;
  acquisitions: number;
  netChangeInCash: number;
}

export interface FMPQuote {
  symbol: string;
  price: number;
  marketCap: number;
  yearHigh: number;
  yearLow: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  name: string;
}

export interface FMPKeyMetrics {
  peRatio: number;
  pbRatio: number;
  psRatio: number;
  dividendYield: number;
  enterpriseValueOverEBITDA: number;
  debtToEquity: number;
  returnOnEquity: number;
  returnOnAssets: number;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  bookValuePerShare: number;
  tangilbeBookValuePerShare: number;
  shareholdersEquityPerShare: number;
  interestDebtPerShare: number;
  currentPrice: number;
  targetPrice: number;
  numberOfShares: number;
}

export interface FMPEnterpriseValue {
  symbol: string;
  date: string;
  stockPrice: number;
  numberOfShares: number;
  marketCapitalization: number;
  minusCashAndCashEquivalents: number;
  addTotalDebt: number;
  enterpriseValue: number;
}

export interface FMPFinancialRatio {
  symbol: string;
  date: string;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  netProfitMargin: number;
  returnOnEquity: number;
  returnOnAssets: number;
  returnOnCapitalEmployed: number;
  debtToEquity: number;
  debtToAssets: number;
  assetTurnover: number;
  receivablesTurnover: number;
  inventoryTurnover: number;
}

export interface FMPFinancialScore {
  symbol: string;
  date: string;
  piotroskiScore: number;
  altmanZScore: number;
}

export interface FMPRevenueSegment {
  date: string;
  revenue: number;
  segment: string;
}

interface FMPSegmentationResponse {
  symbol: string;
  date: string;
  fiscalYear: number;
  period: string;
  data: Record<string, number>;
}

function flattenSegmentation(data: FMPSegmentationResponse[]): FMPRevenueSegment[] {
  const result: FMPRevenueSegment[] = [];
  for (const item of data) {
    if (!item.data || !item.date) continue;
    for (const [segment, revenue] of Object.entries(item.data)) {
      if (revenue != null && revenue > 0) {
        result.push({ date: item.date, revenue, segment });
      }
    }
  }
  return result;
}

export interface FMPProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  cik: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  ceo: string;
  fullTimeEmployees: number;
  country: string;
  exchangeShortName: string;
}

async function fmpFetch<T>(endpoint: string, apiKey: string, params: Record<string, string> = {}): Promise<T> {
  const url = `${FMP_BASE}${endpoint}`;
  const response = await axios.get(url, {
    params: { ...params, apikey: apiKey },
    timeout: 30000,
  });
  return response.data;
}

export async function fetchCompanyProfile(ticker: string, apiKey: string): Promise<FMPProfile | null> {
  try {
    const data = await fmpFetch<FMPProfile[]>('/profile', apiKey, { symbol: ticker });
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export async function fetchIncomeStatements(ticker: string, years: number, apiKey: string): Promise<FMPIncomeStatement[]> {
  try {
    const data = await fmpFetch<FMPIncomeStatement[]>('/income-statement', apiKey, {
      symbol: ticker,
      period: 'annual',
      limit: String(years),
    });
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchBalanceSheets(ticker: string, years: number, apiKey: string): Promise<FMPBalanceSheet[]> {
  try {
    const data = await fmpFetch<FMPBalanceSheet[]>('/balance-sheet-statement', apiKey, {
      symbol: ticker,
      period: 'annual',
      limit: String(years),
    });
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchCashFlows(ticker: string, years: number, apiKey: string): Promise<FMPCashFlow[]> {
  try {
    const data = await fmpFetch<FMPCashFlow[]>('/cash-flow-statement', apiKey, {
      symbol: ticker,
      period: 'annual',
      limit: String(years),
    });
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchQuote(ticker: string, apiKey: string): Promise<FMPQuote | null> {
  try {
    const data = await fmpFetch<FMPQuote[]>('/quote', apiKey, { symbol: ticker });
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export async function fetchKeyMetrics(ticker: string, apiKey: string): Promise<FMPKeyMetrics | null> {
  try {
    const data = await fmpFetch<FMPKeyMetrics[]>('/key-metrics', apiKey, {
      symbol: ticker,
      limit: '1',
    });
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export async function fetchEnterpriseValues(ticker: string, years: number, apiKey: string): Promise<FMPEnterpriseValue[]> {
  try {
    const data = await fmpFetch<FMPEnterpriseValue[]>('/enterprise-values', apiKey, {
      symbol: ticker,
      limit: String(years),
    });
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchFinancialRatios(ticker: string, years: number, apiKey: string): Promise<FMPFinancialRatio[]> {
  try {
    const data = await fmpFetch<FMPFinancialRatio[]>('/ratios', apiKey, {
      symbol: ticker,
      period: 'annual',
      limit: String(years),
    });
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchFinancialScores(ticker: string, apiKey: string): Promise<FMPFinancialScore | null> {
  try {
    const data = await fmpFetch<FMPFinancialScore[]>('/financial-scores', apiKey, { symbol: ticker });
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export async function fetchRevenueByProduct(ticker: string, years: number, apiKey: string): Promise<FMPRevenueSegment[]> {
  try {
    const data = await fmpFetch<FMPSegmentationResponse[]>('/revenue-product-segmentation', apiKey, {
      symbol: ticker,
      limit: String(years),
    });
    return flattenSegmentation(data || []);
  } catch {
    return [];
  }
}

export async function fetchRevenueByGeography(ticker: string, years: number, apiKey: string): Promise<FMPRevenueSegment[]> {
  try {
    const data = await fmpFetch<FMPSegmentationResponse[]>('/revenue-geographic-segmentation', apiKey, {
      symbol: ticker,
      limit: String(years),
    });
    return flattenSegmentation(data || []);
  } catch {
    return [];
  }
}

export interface FMPStockScreener {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  exchange: string;
  price: number;
}

export async function fetchSP500List(apiKey: string): Promise<Array<{ ticker: string; name: string; sector: string; marketCap: number }>> {
  const allStocks: FMPStockScreener[] = [];
  const exchanges = ['NASDAQ', 'NYSE'];

  // Try company-screener first (stable API)
  for (const exchange of exchanges) {
    try {
      const data = await fmpFetch<FMPStockScreener[]>('/company-screener', apiKey, {
        exchange,
        isEtf: 'false',
        isFund: 'false',
        isActivelyTrading: 'true',
        limit: '500',
      });
      if (Array.isArray(data)) {
        allStocks.push(...data);
        console.log(`[FMP] company-screener ${exchange}: ${data.length} results`);
      }
    } catch (error) {
      console.error(`[FMP] company-screener ${exchange} failed:`, error instanceof Error ? error.message : error);
    }
  }

  // Fallback to stock-list if screener returned nothing
  if (allStocks.length === 0) {
    console.log('[FMP] Falling back to /stock-list endpoint');
    try {
      const data = await fmpFetch<Array<{
        symbol: string;
        companyName: string;
        marketCap: number;
        sector: string;
        industry: string;
        exchangeShortName: string;
        price: number;
      }>>('/stock-list', apiKey, {});
      if (Array.isArray(data)) {
        const nasdaqNyse = data.filter((s) => {
          const ex = (s.exchangeShortName || '').toUpperCase();
          return ex === 'NASDAQ' || ex === 'NYSE';
        });
        allStocks.push(...nasdaqNyse.map((s) => ({
          symbol: s.symbol,
          companyName: s.companyName || s.symbol,
          marketCap: s.marketCap || 0,
          sector: s.sector || '',
          industry: s.industry || '',
          exchange: s.exchangeShortName || '',
          price: s.price || 0,
        })));
        console.log(`[FMP] stock-list fallback: ${nasdaqNyse.length} NASDAQ+NYSE results`);
      }
    } catch (error) {
      console.error('[FMP] stock-list fallback failed:', error instanceof Error ? error.message : error);
    }
  }

  // Final fallback: hardcoded S&P 500 list
  if (allStocks.length === 0) {
    console.log('[FMP] Using hardcoded S&P 500 ticker list as fallback');
    const { SP500_TICKERS, SP500_SECTORS } = await import('../data/sp500.js');
    return SP500_TICKERS.map((ticker) => ({
      ticker,
      name: ticker,
      sector: SP500_SECTORS[ticker] || '',
      marketCap: 0,
    }));
  }

  const seen = new Set<string>();
  const filtered = allStocks.filter((s) => {
    if (!s.symbol || seen.has(s.symbol)) return false;
    seen.add(s.symbol);
    return true;
  });

  filtered.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

  return filtered.map((s) => ({
    ticker: s.symbol,
    name: s.companyName || s.symbol,
    sector: s.sector || '',
    marketCap: s.marketCap || 0,
  }));
}
