import type { CompanyProfile } from '../components/CompanyPage';

type Financial = CompanyProfile['financials'][0];
type BalanceSheet = CompanyProfile['balanceSheets'][0];
type Stock = CompanyProfile['stockMetrics'][0];

export interface ValuationInputData {
  label: string;
  value: string;
  rawValue: number;
}

export interface ValuationResult {
  id: string;
  name: string;
  description: string;
  explanation: string;
  formula: string;
  fairValue: number | null;
  confidence: 'high' | 'medium' | 'low' | 'na';
  confidenceReason: string;
  configurable: boolean;
  inputs: ValuationInputData[];
  negativeInputWarning?: string;
  dataWarning?: string;
  scenarios?: { bear: number; base: number; bull: number };
  sensitivityTable?: { pe: number; price: number; isTarget?: boolean }[];
  perPEBreakdown?: {
    fundamental: { pe: number; payout: number; ke: number; g: number } | null;
    forward: number | null;
    current: number | null;
    weights: { fundamental: number; forward: number; current: number };
    usedFallback: boolean;
    fallbackReason: string | null;
  };
}

export interface ValuationInput {
  financials: Financial[];
  balanceSheets: BalanceSheet[];
  stock: Stock;
  currency: string;
}

function latest<T extends { year: number; quarter?: number | null }>(arr: T[]): T | undefined {
  return [...arr].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.quarter ?? 0) - (a.quarter ?? 0);
  })[0];
}

interface TTMData {
  revenue: number;
  netIncome: number;
  ebitda: number | null;
  ebit: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  capex: number;
  depreciation: number;
  sgaExpense: number;
  interestExpense: number;
  taxExpense: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  rdExpense: number;
  dividendsPaid: number | null;
  shareRepurchases: number | null;
  balanceSheet: BalanceSheet | undefined;
  isTTM: boolean;
  annualFields: string[];
}

function sumField(items: Financial[], field: keyof Financial): number {
  return items.reduce((acc, f) => acc + ((f[field] as number) ?? 0), 0);
}

// Latest annual (quarter=0) row. Yahoo's quarterly timeseries often leaves
// cashflow/EBITDA inputs null for European tickers even though the annual rows
// carry real values, so we fill those from the annual figures below.
function latestAnnual<T extends { year: number; quarter?: number | null }>(arr: T[]): T | undefined {
  return [...arr.filter(x => (x.quarter ?? 0) === 0)].sort((a, b) => b.year - a.year)[0];
}

// Sums `field` across the last-4 quarterly rows only when all 4 carry a value;
// if any quarter is missing the field, the partial sum would understate the
// period, so we fall back to the latest annual figure instead.
function ttmSumOrAnnual<T extends { year: number; quarter?: number | null }>(last4: T[], annual: T | undefined, field: keyof T): number | null {
  const present = last4.filter(x => (x[field] as number | null) != null);
  if (present.length === 4) {
    return present.reduce((acc, x) => acc + ((x[field] as number) ?? 0), 0);
  }
  return (annual?.[field] as number | null | undefined) ?? null;
}

export function trailing12Months(financials: Financial[], balanceSheets: BalanceSheet[]): TTMData | null {
  const sorted = [...financials].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.quarter ?? 0) - (a.quarter ?? 0);
  });
  const byKey = new Map<string, Financial>();
  for (const f of financials) {
    byKey.set(`${f.year}-${f.quarter ?? 4}`, f);
  }
  const latestQ = sorted[0];
  if (!latestQ) return null;

  // Annual fallback: used when fewer than 4 reliable quarters exist. European
  // tickers often leave quarterly cashflow/EBITDA fields null while annual
  // rows carry real values, so we rebuild the TTM from the annual figures.
  const annualFallback = (): TTMData | null => {
    const f = latestAnnual(financials) ?? latest(financials);
    const bs = latest(balanceSheets);
    if (!f) return null;
    return {
      revenue: f.revenue,
      netIncome: f.netIncome,
      ebitda: f.ebitda ?? null,
      ebit: f.ebit ?? null,
      operatingCashFlow: f.operatingCashFlow ?? null,
      freeCashFlow: f.freeCashFlow ?? null,
      capex: f.capex ?? 0,
      depreciation: f.depreciation ?? 0,
      sgaExpense: f.sgaExpense ?? 0,
      interestExpense: f.interestExpense ?? 0,
      taxExpense: f.taxExpense ?? 0,
      costOfRevenue: f.costOfRevenue ?? 0,
      grossProfit: f.grossProfit ?? 0,
      operatingExpenses: f.operatingExpenses ?? 0,
      rdExpense: f.rdExpense ?? 0,
      dividendsPaid: f.dividendsPaid ?? null,
      shareRepurchases: f.shareRepurchases ?? null,
      balanceSheet: bs,
      isTTM: false,
      annualFields: ['*'],
    };
  };

  // Walk back 4 consecutive quarters; if a quarter is missing or reports zero
  // revenue, fall back to the annual figures.
  let year = latestQ.year;
  let quarter = latestQ.quarter ?? 4;
  const last4: Financial[] = [];
  for (let i = 0; i < 4; i++) {
    const rec = byKey.get(`${year}-${quarter}`);
    if (!rec || rec.revenue === 0) {
      return annualFallback();
    }
    last4.push(rec);
    quarter -= 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }
  }

  const bs = latest(balanceSheets);
  const annual = latestAnnual(financials);
  const TRACKED_TTM_FIELDS = ['ebitda', 'ebit', 'operatingCashFlow', 'freeCashFlow', 'dividendsPaid', 'shareRepurchases'] as const;
  const annualFields: string[] = [];
  for (const field of TRACKED_TTM_FIELDS) {
    const presentCount = last4.filter(x => (x[field] as number | null) != null).length;
    if (presentCount < 4) annualFields.push(field);
  }
  return {
    revenue: sumField(last4, 'revenue'),
    netIncome: sumField(last4, 'netIncome'),
    ebitda: ttmSumOrAnnual(last4, annual, 'ebitda'),
    ebit: ttmSumOrAnnual(last4, annual, 'ebit'),
    operatingCashFlow: ttmSumOrAnnual(last4, annual, 'operatingCashFlow'),
    freeCashFlow: ttmSumOrAnnual(last4, annual, 'freeCashFlow'),
    capex: ttmSumOrAnnual(last4, annual, 'capex') ?? 0,
    depreciation: ttmSumOrAnnual(last4, annual, 'depreciation') ?? 0,
    sgaExpense: ttmSumOrAnnual(last4, annual, 'sgaExpense') ?? 0,
    interestExpense: ttmSumOrAnnual(last4, annual, 'interestExpense') ?? 0,
    taxExpense: ttmSumOrAnnual(last4, annual, 'taxExpense') ?? 0,
    costOfRevenue: ttmSumOrAnnual(last4, annual, 'costOfRevenue') ?? 0,
    grossProfit: ttmSumOrAnnual(last4, annual, 'grossProfit') ?? 0,
    operatingExpenses: ttmSumOrAnnual(last4, annual, 'operatingExpenses') ?? 0,
    rdExpense: ttmSumOrAnnual(last4, annual, 'rdExpense') ?? 0,
    dividendsPaid: ttmSumOrAnnual(last4, annual, 'dividendsPaid'),
    shareRepurchases: ttmSumOrAnnual(last4, annual, 'shareRepurchases'),
    balanceSheet: bs,
    isTTM: true,
    annualFields,
  };
}

export function hasQuarterlyData(financials: Financial[]): boolean {
  return financials.some(f => f.quarter != null && f.quarter > 0);
}

export function latestFinancialPeriod(financials: Financial[]): { year: number | null; quarter: number | null; isTTM: boolean } {
  const quarterly = financials.filter(f => f.quarter != null && f.quarter > 0);
  if (quarterly.length >= 4) {
    const sorted = [...quarterly].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return (b.quarter ?? 0) - (a.quarter ?? 0);
    });
    return { year: sorted[0].year, quarter: sorted[0].quarter ?? null, isTTM: true };
  }
  const f = latest(financials);
  return { year: f?.year ?? null, quarter: null, isTTM: false };
}

// Human-readable label of the financial period a metric is based on:
// "TTM Q2 2026" when the last 4 quarters are used, "Ejercicio 2025" otherwise.
export function ttmPeriodLabel(financials: Financial[]): string {
  const p = latestFinancialPeriod(financials);
  if (!p.year) return '—';
  if (p.isTTM && p.quarter != null) {
    return `TTM Q${p.quarter} ${p.year}`;
  }
  return `Ejercicio ${p.year}`;
}

export type Verdict = 'buy' | 'hold' | 'sell' | 'na';

export function getVerdict(fairValue: number | null, currentPrice: number): { verdict: Verdict; upside: number | null; label: string } {
  if (fairValue == null || currentPrice <= 0) {
    return { verdict: 'na', upside: null, label: 'Sin datos' };
  }
  const upside = (fairValue - currentPrice) / currentPrice;
  if (upside > 0.15) return { verdict: 'buy', upside, label: 'Infravalorada' };
  if (upside < -0.15) return { verdict: 'sell', upside, label: 'Sobrevalorada' };
  return { verdict: 'hold', upside, label: 'Justa' };
}

export const VERDICT_COLORS: Record<Verdict, string> = {
  buy: '#059669',
  hold: '#d97706',
  sell: '#dc2626',
  na: '#94a3b8',
};

export const VERDICT_BG: Record<Verdict, string> = {
  buy: '#ecfdf5',
  hold: '#fffbeb',
  sell: '#fef2f2',
  na: '#f8fafc',
};

export const VERDICT_BORDER: Record<Verdict, string> = {
  buy: '#a7f3d0',
  hold: '#fde68a',
  sell: '#fecaca',
  na: '#e2e8f0',
};

export type BusinessModel =
  | 'brand'
  | 'asset_light'
  | 'asset_heavy'
  | 'growth'
  | 'stable'
  | 'commodity'
  | 'financial';

export interface BusinessModelInference {
  model: BusinessModel | null;
  label: string;
  reason: string;
}

export type CommodityRole = 'producer' | 'consumer';

export interface CommodityMapping {
  companyTicker: string;
  commoditySymbol: string;
  commodityName: string;
  elasticity: number;
  defaultOptimisticPct: number;
  defaultPessimisticPct: number;
  pctMP?: number;
  taxRate?: number;
}