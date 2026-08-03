const YFINANCE_URL = process.env.YFINANCE_URL || 'http://yfinance-service:8000';

export interface YFinanceRecord {
  date: string;
  [field: string]: number | string | null;
}

export interface YFinanceQuarterlyData {
  ticker: string;
  hasQuarterly: boolean;
  income: YFinanceRecord[];
  balance: YFinanceRecord[];
  cashflow: YFinanceRecord[];
}

export interface YFinanceInfo {
  ticker: string;
  info: Record<string, any>;
}

export async function fetchYFinanceQuarterly(ticker: string): Promise<YFinanceQuarterlyData | null> {
  try {
    const res = await fetch(`${YFINANCE_URL}/api/yfinance/${encodeURIComponent(ticker)}/quarterly`);
    if (!res.ok) {
      console.log(`[YFinance] ${ticker}: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as YFinanceQuarterlyData;
  } catch {
    console.log(`[YFinance] ${ticker}: connection failed (sidecar may be down)`);
    return null;
  }
}

export async function fetchYFinanceAnnual(ticker: string): Promise<YFinanceQuarterlyData | null> {
  try {
    const res = await fetch(`${YFINANCE_URL}/api/yfinance/${encodeURIComponent(ticker)}/annual`);
    if (!res.ok) return null;
    return (await res.json()) as YFinanceQuarterlyData;
  } catch {
    return null;
  }
}

export async function fetchYFinanceInfo(ticker: string): Promise<YFinanceInfo | null> {
  try {
    const res = await fetch(`${YFINANCE_URL}/api/yfinance/${encodeURIComponent(ticker)}/info`);
    if (!res.ok) return null;
    return (await res.json()) as YFinanceInfo;
  } catch {
    return null;
  }
}

// --- Field mapping helpers ---

function num(val: unknown): number | null {
  if (val == null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : null;
}

function pickNum(row: YFinanceRecord, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = num(row[k]);
    if (v != null) return v;
  }
  return null;
}

export function parseYFinanceDate(dateStr: string): { year: number; quarter: number } {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const quarter = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  return { year, quarter };
}

export function mapIncomeRecord(record: YFinanceRecord) {
  return {
    revenue: pickNum(record, 'Total Revenue', 'Operating Revenue', 'totalRevenue') ?? 0,
    costOfRevenue: pickNum(record, 'Cost Of Revenue', 'costOfRevenue') ?? 0,
    grossProfit: pickNum(record, 'Gross Profit', 'grossProfit'),
    operatingExpenses: pickNum(record, 'Operating Expense', 'Total Operating Expenses As Reported', 'totalOperatingExpenses', 'TotalOperatingExpenses'),
    sgaExpense: pickNum(record, 'Selling General And Administration', 'SellingGeneralAdministrative') ?? 0,
    rdExpense: pickNum(record, 'Research And Development', 'researchDevelopment') ?? 0,
    interestExpense: pickNum(record, 'Interest Expense', 'Interest Expense Non Operating', 'interestExpense') ?? 0,
    taxExpense: pickNum(record, 'Tax Provision', 'incomeTaxExpense') ?? 0,
    netIncome: pickNum(record, 'Net Income Common Stockholders', 'Net Income', 'Net Income Including Noncontrolling Interests', 'netIncome') ?? 0,
    ebitda: pickNum(record, 'EBITDA', 'Normalized EBITDA'),
    ebit: pickNum(record, 'EBIT', 'Operating Income', 'Pretax Income', 'ebit', 'operatingIncome'),
    depreciation: pickNum(record, 'Depreciation And Amortization In Income Statement', 'Depreciation Amortization And Accretion Net', 'Depreciation') ?? 0,
  };
}

export function mapCashflowRecord(record: YFinanceRecord) {
  const capex = pickNum(record, 'Capital Expenditure', 'capitalExpenditures');
  const ocf = pickNum(record, 'Operating Cash Flow', 'Cash Flow From Continuing Operating Activities', 'operatingCashflow', 'operatingCashFlow');
  const fcf = pickNum(record, 'Free Cash Flow', 'freeCashflow');

  return {
    operatingCashFlow: ocf,
    investingCashFlow: pickNum(record, 'Cash Flow From Continuing Investing Activities', 'Investing Cash Flow', 'investingCashflow'),
    financingCashFlow: pickNum(record, 'Cash Flow From Continuing Financing Activities', 'Financing Cash Flow', 'financingCashflow'),
    capex: capex != null ? Math.abs(capex) : 0,
    freeCashFlow: fcf ?? (ocf != null && capex != null ? ocf - Math.abs(capex) : null),
    dividendsPaid: pickNum(record, 'Cash Dividends Paid', 'Dividends Paid', 'dividendsPaid'),
    shareRepurchases: pickNum(record, 'Repurchase Of Capital Stock', 'Common Stock Repurchased', 'repurchaseOfCapitalStock'),
  };
}

export function mapBalanceRecord(record: YFinanceRecord) {
  return {
    cashAndCashEquivalents: pickNum(record, 'Cash And Cash Equivalents', 'Cash Cash Equivalents And Short Term Investments', 'cash', 'Cash') ?? null,
    shortTermInvestments: pickNum(record, 'Other Short Term Investments', 'Short Term Investments') ?? null,
    accountsReceivable: pickNum(record, 'Net Receivables', 'Accounts Receivable', 'netReceivables') ?? null,
    inventory: pickNum(record, 'Inventory') ?? null,
    totalCurrentAssets: pickNum(record, 'Current Assets', 'totalCurrentAssets') ?? null,
    propertyPlantEquipment: pickNum(record, 'Net PPE', 'Property Plant And Equipment Net', 'netPpe') ?? null,
    goodwill: pickNum(record, 'Goodwill') ?? null,
    intangibleAssets: pickNum(record, 'Other Intangible Assets', 'Intangible Assets') ?? null,
    totalNonCurrentAssets: pickNum(record, 'Total Non Current Assets', 'totalNonCurrentAssets') ?? null,
    totalAssets: pickNum(record, 'Total Assets', 'totalAssets') ?? null,
    accountsPayable: pickNum(record, 'Accounts Payable', 'accountsPayable') ?? null,
    shortTermDebt: pickNum(record, 'Current Debt', 'Current Debt And Capital Lease Obligation', 'Short Term Debt', 'Other Short Term Debt') ?? null,
    totalCurrentLiabilities: pickNum(record, 'Current Liabilities', 'totalCurrentLiabilities') ?? null,
    longTermDebt: pickNum(record, 'Long Term Debt', 'Long Term Debt And Capital Lease Obligation', 'Other Long Term Debt', 'longTermDebt') ?? null,
    totalNonCurrentLiabilities: pickNum(record, 'Total Non Current Liabilities Net Minority Interest', 'Total Non Current Liabilities', 'totalNonCurrentLiabilities') ?? null,
    totalLiabilities: pickNum(record, 'Total Liabilities Net Minority Interest', 'Total Liabilities Gross Minority Interest', 'Total Liabilities', 'totalLiabilities') ?? null,
    totalStockholdersEquity: pickNum(record, 'Stockholders Equity', 'Total Stockholder Equity', 'Stockholders Equity Including Portion Attributable To Noncontrolling Interests', 'totalStockholderEquity') ?? null,
    retainedEarnings: pickNum(record, 'Retained Earnings', 'retainedEarnings') ?? null,
    treasuryStock: pickNum(record, 'Treasury Stock') ?? null,
  };
}
