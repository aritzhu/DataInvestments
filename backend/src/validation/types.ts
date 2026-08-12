export type Severity = 'ok' | 'warn' | 'error';

export interface ValidationResult {
  rule: string;
  severity: Severity;
  message: string;
  field?: string;
  year?: number;
}

export interface FinancialRow {
  year: number;
  quarter: number | null;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  ebitda: number | null;
  ebit: number | null;
  depreciation: number | null;
  operatingCashFlow: number | null;
  capex: number | null;
  freeCashFlow: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  netIncome: number | null;
}

export interface StockRow {
  sharesOutstanding: number | null;
  currentPrice: number | null;
  marketCap: number | null;
}

export interface ValidationContext {
  sector: string | null;
  peers?: { revenueMedian?: number; totalAssetsMedian?: number };
}

export function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v !== 0;
}
