import type { FinancialData, BalanceSheet, StockMetric } from '@prisma/client';

type Financial = FinancialData;
type Balance = BalanceSheet;
type Stock = StockMetric;

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
  applicability?: { applicable: boolean; reason: string };
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
  balanceSheets: Balance[];
  stock: Stock;
  currency?: string;
}

function latest<T extends { year: number; quarter?: number | null }>(arr: T[]): T | undefined {
  return [...arr].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.quarter ?? 0) - (a.quarter ?? 0);
  })[0];
}

export interface TTMData {
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
  balanceSheet: Balance | undefined;
  isTTM: boolean;
  annualFields: string[];
}

function sumField<T>(items: T[], field: keyof T): number {
  return items.reduce((acc, item) => acc + ((item[field] as number) ?? 0), 0);
}

function sumFieldNull<T>(items: T[], field: keyof T): number | null {
  const total = items.reduce((acc, item) => acc + ((item[field] as number) ?? 0), 0);
  return items.some((item) => item[field] != null) ? total : null;
}

function latestAnnual<T extends { year: number; quarter?: number | null }>(arr: T[]): T | undefined {
  return [...arr.filter((x) => (x.quarter ?? 0) === 0)].sort((a, b) => b.year - a.year)[0];
}

function ttmSumOrAnnual<T extends { year: number; quarter?: number | null }>(last4: T[], annual: T | undefined, field: keyof T): number | null {
  const present = last4.filter((x) => (x[field] as number | null) != null);
  if (present.length === 4) {
    return present.reduce((acc, x) => acc + ((x[field] as number) ?? 0), 0);
  }
  return (annual?.[field] as number | null | undefined) ?? null;
}

const YTD_FIELDS: Array<keyof Financial> = [
  'revenue',
  'netIncome',
  'ebitda',
  'ebit',
  'operatingCashFlow',
  'freeCashFlow',
  'capex',
  'depreciation',
  'sgaExpense',
  'rdExpense',
  'interestExpense',
  'taxExpense',
  'costOfRevenue',
  'grossProfit',
  'operatingExpenses',
  'dividendsPaid',
  'shareRepurchases',
];

function hasCumulativeYtd(last4: Financial[], all?: Financial[]): boolean {
  const byYear = new Map<number, Financial[]>();
  for (const f of last4) {
    if ((f.quarter ?? 0) === 0) continue;
    if (!byYear.has(f.year)) byYear.set(f.year, []);
    byYear.get(f.year)!.push(f);
  }
  for (const rows of byYear.values()) {
    const year = rows[0].year;
    if (rows.length < 2) continue;
    const annual = all?.find((f) => f.year === year && (f.quarter ?? 0) === 0);
    if (annual?.revenue != null && annual.revenue > 0) {
      const allQuarterRows = (all ?? []).filter((f) => f.year === year && (f.quarter ?? 0) !== 0);
      const sumQuarters = allQuarterRows.reduce((acc, r) => acc + ((r.revenue ?? 0) as number), 0);
      if (sumQuarters / annual.revenue > 1.25) return true;
    }
    const maxQrow = [...rows].sort((a, b) => (b.quarter ?? 0) - (a.quarter ?? 0))[0];
    const maxQ = maxQrow.quarter ?? 0;
    if (maxQ <= 0) continue;
    const lower = rows.filter((r) => (r.quarter ?? 0) < maxQ);
    for (const field of YTD_FIELDS) {
      const rowValue = maxQrow[field] as number | null | undefined;
      if (rowValue == null || rowValue <= 0) continue;
      const sumLower = lower.reduce((acc, r) => acc + ((r[field] as number) ?? 0), 0);
      if (sumLower > 0 && rowValue >= sumLower * 1.5) return true;
    }
  }
  return false;
}

export function trailing12Months(financials: Financial[], balanceSheets: Balance[]): TTMData | null {
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

  const annualFallback = (): TTMData | null => {
    const f = latestAnnual(financials) ?? latest(financials);
    const bs = latest(balanceSheets);
    if (!f) return null;
    return {
      revenue: f.revenue ?? 0,
      netIncome: f.netIncome ?? 0,
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

  if (hasCumulativeYtd(last4, financials)) {
    return annualFallback();
  }

  const bs = latest(balanceSheets);
  const annual = latestAnnual(financials);
  const TRACKED_TTM_FIELDS = ['ebitda', 'ebit', 'operatingCashFlow', 'freeCashFlow', 'dividendsPaid', 'shareRepurchases'] as const;
  const annualFields: string[] = [];
  for (const field of TRACKED_TTM_FIELDS) {
    const presentCount = last4.filter((x) => (x[field] as number | null) != null).length;
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
  return financials.some((f) => f.quarter != null && f.quarter > 0);
}

export function isFinancial(sector?: string | null, industry?: string | null): boolean {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  if (text.includes('financial data') || text.includes('exchanges')) return false;
  return /bank|financ|insur|seguro|banco|assuranc|reinsur|credit/.test(text);
}

export function netDebt(bs: Balance | undefined): number {
  return (bs?.shortTermDebt ?? 0) + (bs?.longTermDebt ?? 0) - (bs?.cashAndCashEquivalents ?? 0);
}

function consistency(arr: number[]): number {
  if (arr.length < 2) return 0;
  let pos = 0;
  for (let i = 1; i < arr.length; i++) {
    if ((arr[i] > 0 && arr[i - 1] > 0) || (arr[i] < 0 && arr[i - 1] < 0)) pos++;
  }
  return pos / (arr.length - 1);
}

function sharesOf(stock: Stock): number {
  const shares = stock.sharesOutstanding ?? 0;
  const price = stock.currentPrice ?? 0;
  const mcap = stock.marketCap ?? 0;
  if (shares > 0 && price > 0 && mcap > 0) {
    const impliedShares = mcap / price;
    const divergence = Math.abs(impliedShares - shares) / shares;
    if (divergence > 0.25) {
      return impliedShares;
    }
  }
  return shares;
}

function fmtVal(n: number, currency?: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1e9) s = (n / 1e9).toFixed(1) + 'B';
  else if (abs >= 1e6) s = (n / 1e6).toFixed(1) + 'M';
  else s = n.toFixed(2);
  return `${sym}${s}`;
}
function fmtB(n: number, currency?: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${(n / 1e9).toFixed(1)}B`;
}

const SANITY_MULTIPLE = 6;
function applySanityBound(result: ValuationResult, currentPrice: number): ValuationResult {
  if (result.fairValue == null || currentPrice <= 0) return result;
  if (result.fairValue > SANITY_MULTIPLE * currentPrice || result.fairValue < 0) {
    return { ...result, confidence: 'na' as const, confidenceReason: `Valor (${result.fairValue.toFixed(0)}) > ${SANITY_MULTIPLE}x precio actual — método excluido del promedio (no fiable)` };
  }
  return result;
}

function capConfidence(conf: ValuationResult['confidence'], annualFields: string[] | undefined, fields: string[]): ValuationResult['confidence'] {
  if (conf === 'high' && annualFields && fields.some((f) => annualFields.includes(f))) return 'medium';
  return conf;
}

const PARTIAL_DATA_WARNING = 'Datos trimestrales incompletos: este cálculo usa el último ejercicio anual en lugar de los 4 trimestres.';

// ── Consumer Cyclical enhanced DCF ──
const CC_RF = 3;
const CC_MARKET_PREMIUM = 5;
const CC_KD_FALLBACK = 5;
const CC_TAX_FALLBACK = 25;
const CC_GROWTH_WEIGHTS = { cagr5: 0.5, cagr10: 0.3, recent: 0.2 };

export function isConsumerCyclical(sector: string | null | undefined, _industry?: string | null): boolean {
  const s = (sector || '').toLowerCase();
  return s === 'consumer cyclical' || s === 'consumer discretionary';
}

interface GrowthResult {
  growthRate: number | null;
  details: { cagr5: number | null; cagr10: number | null; recent: number | null };
}
function computeWeightedGrowth(financials: Financial[]): GrowthResult {
  const annual = financials
    .filter((x) => x.quarter == null || x.quarter === 0)
    .filter((x) => x.revenue != null && x.revenue > 0)
    .sort((a, b) => a.year - b.year);
  const details = { cagr5: null as number | null, cagr10: null as number | null, recent: null as number | null };
  if (annual.length < 2) return { growthRate: null, details };

  const last = annual[annual.length - 1];
  const lastRev = last.revenue!;
  const prev = annual[annual.length - 2];
  details.recent = lastRev / prev.revenue! - 1;

  const spanFor = (startRow: Financial): number => last.year - startRow.year;
  const cagr = (startRev: number | null, startRow: Financial): number | null => {
    if (startRev == null || startRev <= 0 || lastRev <= 0) return null;
    const span = spanFor(startRow);
    if (span <= 0) return null;
    return Math.pow(lastRev / startRev, 1 / span) - 1;
  };
  const growthFrom = (yearsBack: number): number | null => {
    const target = last.year - yearsBack;
    const start = annual.find((x) => x.year === target) ?? annual[0];
    return cagr(start?.revenue ?? null, start);
  };
  details.cagr5 = growthFrom(5);
  details.cagr10 = growthFrom(10);

  const parts: Array<{ value: number; weight: number }> = [];
  if (details.cagr5 != null) parts.push({ value: details.cagr5, weight: CC_GROWTH_WEIGHTS.cagr5 });
  if (details.cagr10 != null) parts.push({ value: details.cagr10, weight: CC_GROWTH_WEIGHTS.cagr10 });
  if (details.recent != null) parts.push({ value: details.recent, weight: CC_GROWTH_WEIGHTS.recent });
  if (parts.length === 0) return { growthRate: null, details };

  const wSum = parts.reduce((a, p) => a + p.weight, 0);
  const growthRate = parts.reduce((a, p) => a + p.value * p.weight, 0) / wSum;
  return { growthRate, details };
}

interface DCFRates {
  g: number;
  r: number;
  growthDetails: GrowthResult['details'];
  growthApplied: boolean;
  wacc: { Ke: number; Kd: number; tax: number; equity: number; debt: number; equityWeight: number; debtWeight: number; wacc: number } | null;
}
function consumerCyclicalRates(input: ValuationInput, config: { growthRate: number; discountRate: number }, sector: string | null | undefined, industry?: string | null, ccOverride?: { growth?: boolean; discount?: boolean }): DCFRates {
  if (!isConsumerCyclical(sector, industry)) {
    return { g: config.growthRate / 100, r: config.discountRate / 100, growthDetails: { cagr5: null, cagr10: null, recent: null }, growthApplied: false, wacc: null };
  }

  const growth = computeWeightedGrowth(input.financials);
  const growthApplied = growth.growthRate != null;
  const g = ccOverride?.growth ? config.growthRate / 100 : (growthApplied ? growth.growthRate! : config.growthRate / 100);

  const bs = latest(input.balanceSheets);
  const beta = input.stock?.beta != null ? input.stock.beta : null;
  const equity = bs?.totalStockholdersEquity != null && bs.totalStockholdersEquity > 0 ? bs.totalStockholdersEquity : null;
  const debtTotal = bs != null ? (bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0) : 0;
  const debt = debtTotal > 0 ? debtTotal : null;
  const interest = latest(input.financials)?.interestExpense != null ? Math.abs(latest(input.financials)!.interestExpense!) : null;
  const lastFin = latest(input.financials);
  const taxExpense = lastFin?.taxExpense != null ? Math.abs(lastFin.taxExpense) : null;
  const netIncome = lastFin?.netIncome != null ? Math.abs(lastFin.netIncome) : null;
  const pretax = taxExpense != null && netIncome != null ? taxExpense + netIncome : null;

  let wacc: DCFRates['wacc'] = null;
  let r = config.discountRate / 100;
  if (!ccOverride?.discount && beta != null && equity != null && debt != null) {
    const Ke = CC_RF + beta * CC_MARKET_PREMIUM;
    const Kd = interest != null && interest > 0 && debt > 0 ? (interest / debt) * 100 : CC_KD_FALLBACK;
    const tax = pretax != null && pretax > 0 && taxExpense != null ? taxExpense / pretax : CC_TAX_FALLBACK / 100;
    const taxPct = pretax != null && pretax > 0 && taxExpense != null ? (taxExpense / pretax) * 100 : CC_TAX_FALLBACK;
    const total = equity + debt;
    const eW = equity / total;
    const dW = debt / total;
    const waccPct = Ke * eW + Kd * (1 - tax) * dW;
    if (isFinite(waccPct) && waccPct > 0) {
      r = waccPct / 100;
      wacc = { Ke, Kd, tax: taxPct, equity, debt, equityWeight: eW, debtWeight: dW, wacc: waccPct };
    }
  }

  return { g, r, growthDetails: growth.details, growthApplied, wacc };
}

export function dcfSeedRates(input: ValuationInput, config: { growthRate: number; discountRate: number }, sector: string | null | undefined, industry?: string | null): { growthRate: number; discountRate: number; growthApplied: boolean } {
  const cc = consumerCyclicalRates(input, config, sector, industry);
  const cappedG = cc.g >= cc.r ? cc.r - 0.005 : cc.g;
  return { growthRate: +(cappedG * 100).toFixed(2), discountRate: +(cc.r * 100).toFixed(2), growthApplied: cc.growthApplied };
}

// ── P/E normalizado (Consumer Defensive) ──
interface EPSYear { year: number; eps: number; }
function annualEpsSeries(input: ValuationInput): EPSYear[] {
  const shares = sharesOf(input.stock);
  if (shares <= 0) return [];
  return input.financials
    .filter((x) => (x.quarter == null || x.quarter === 0) && typeof x.netIncome === 'number')
    .map((x) => ({ year: x.year, eps: (x.netIncome ?? 0) / shares }))
    .filter((e) => e.eps > 0)
    .sort((a, b) => b.year - a.year);
}
function epsCagr(rows: EPSYear[], yearsBack: number): { value: number | null; span: number } {
  if (rows.length < 2) return { value: null, span: 0 };
  const last = rows[0];
  const target = rows.find((r) => r.year === last.year - yearsBack) ?? rows[rows.length - 1];
  const span = last.year - target.year;
  if (span <= 0 || target.eps <= 0 || last.eps <= 0) return { value: null, span };
  return { value: Math.pow(last.eps / target.eps, 1 / span) - 1, span };
}
function normalizeEPS(input: ValuationInput): { eps: number | null; years: number; volatile: boolean; method: string } {
  const series = annualEpsSeries(input);
  if (series.length === 0) return { eps: null, years: 0, volatile: false, method: 'none' };
  const recent = series.slice(0, 5).map((e) => e.eps);
  let eps: number;
  let method: string;
  if (recent.length >= 5) {
    const sorted = [...recent].sort((a, b) => a - b);
    const core = sorted.slice(1, -1);
    eps = core.reduce((a, b) => a + b, 0) / core.length;
    method = 'median_5y_trimmed';
  } else {
    eps = recent.reduce((a, b) => a + b, 0) / recent.length;
    method = `average_${recent.length}y`;
  }
  const max = Math.max(...recent);
  const min = Math.min(...recent);
  const volatile = max > 0 && min > 0 && (max - min) / max > 0.5;
  return { eps: Math.max(eps, 0), years: series.length, volatile, method };
}
function expectedEPSGrowth(input: ValuationInput): { bear: number; base: number; bull: number } {
  const series = annualEpsSeries(input);
  const cagr5 = epsCagr(series, 5).value;
  const cagr10 = epsCagr(series, 10).value;
  const recent = series.length >= 2 ? series[0].eps / series[1].eps - 1 : null;

  const annual = input.financials
    .filter((x) => (x.quarter == null || x.quarter === 0) && (x.revenue ?? 0) > 0)
    .sort((a, b) => a.year - b.year);
  let revCagr5: number | null = null;
  if (annual.length >= 2) {
    const last = annual[annual.length - 1];
    const target = annual.find((x) => x.year === last.year - 5) ?? annual[0];
    const span = last.year - target.year;
    if (span > 0 && target.revenue! > 0) revCagr5 = Math.pow(last.revenue! / target.revenue!, 1 / span) - 1;
  }

  const parts: Array<{ value: number; weight: number }> = [];
  if (cagr5 != null) parts.push({ value: cagr5, weight: 0.5 });
  if (cagr10 != null) parts.push({ value: cagr10, weight: 0.3 });
  if (recent != null) parts.push({ value: recent, weight: 0.2 });
  if (revCagr5 != null && parts.length > 0) {
    parts.push({ value: revCagr5, weight: 0.1 });
  }
  if (parts.length === 0) return { bear: 0.02, base: 0.04, bull: 0.06 };

  const wSum = parts.reduce((a, p) => a + p.weight, 0);
  let base = parts.reduce((a, p) => a + p.value * p.weight, 0) / wSum;
  base = Math.min(Math.max(base, 0), 0.2);
  const spread = Math.max(base * 0.4, 0.01);
  return {
    bear: Math.max(base - spread, 0.005),
    base,
    bull: Math.min(base + spread, 0.25),
  };
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface EPSGrowthStats {
  cagr3: number | null;
  cagr5: number | null;
  cagr10: number | null;
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  positiveYears: number;
  totalYears: number;
}
function epsGrowthStats(input: ValuationInput): EPSGrowthStats {
  const series = annualEpsSeries(input);
  const empty: EPSGrowthStats = { cagr3: null, cagr5: null, cagr10: null, mean: null, median: null, stdDev: null, min: null, max: null, positiveYears: 0, totalYears: 0 };
  if (series.length < 2) return empty;
  const asc = [...series].sort((a, b) => a.year - b.year);
  const yearly: number[] = [];
  for (let i = 1; i < asc.length; i++) {
    const prev = asc[i - 1].eps;
    if (prev > 0) yearly.push(asc[i].eps / prev - 1);
  }
  if (yearly.length === 0) return empty;
  const cagr3 = epsCagr(series, 3).value;
  const cagr5 = epsCagr(series, 5).value;
  const cagr10 = epsCagr(series, 10).value;
  const mean = yearly.reduce((a, b) => a + b, 0) / yearly.length;
  const median = medianOf(yearly);
  const variance = yearly.reduce((a, b) => a + (b - mean) * (b - mean), 0) / yearly.length;
  const stdDev = Math.sqrt(variance);
  return {
    cagr3, cagr5, cagr10,
    mean, median, stdDev,
    min: Math.min(...yearly),
    max: Math.max(...yearly),
    positiveYears: yearly.filter((v) => v > 0).length,
    totalYears: yearly.length,
  };
}
function fundamentalPE(input: ValuationInput, g: number): { pe: number; payout: number; ke: number; g: number } | null {
  const beta = input.stock?.beta;
  const last = latest(input.financials);
  if (beta == null || !last || (last.netIncome ?? 0) <= 0) return null;
  const Ke = (CC_RF + beta * CC_MARKET_PREMIUM) / 100;
  if (Ke <= g) return null;
  const dividends = last.dividendsPaid != null ? Math.abs(last.dividendsPaid) : null;
  let payout: number | null = null;
  if (dividends != null && last.netIncome! > 0) payout = dividends / last.netIncome!;
  if (payout == null || payout <= 0) payout = input.stock?.payoutRatio;
  if (payout == null || payout <= 0 || payout > 1.5) return null;
  const pe = payout / (Ke - g);
  if (!isFinite(pe) || pe <= 0 || pe > 60) return null;
  return { pe, payout, ke: Ke, g };
}
function computeTargetPE(input: ValuationInput, growth: { bear: number; base: number; bull: number }): { target: number; rangeLow: number; rangeHigh: number; sources: { fundamental: { pe: number; payout: number; ke: number; g: number } | null; forward: number | null; current: number | null }; weights: { fundamental: number; forward: number; current: number }; usedFallback: boolean; fallbackReason: string | null } {
  const fundamental = fundamentalPE(input, growth.base);
  const forward = input.stock?.forwardPE != null && input.stock.forwardPE > 0 ? input.stock.forwardPE : null;
  const current = input.stock?.peRatio != null && input.stock.peRatio > 0 ? input.stock.peRatio : null;

  const nominal = { fundamental: 0.5, forward: 0.3, current: 0.2 };
  const parts: Array<{ value: number; nominal: number }> = [];
  if (fundamental) parts.push({ value: fundamental.pe, nominal: nominal.fundamental });
  if (forward != null) parts.push({ value: forward, nominal: nominal.forward });
  if (current != null) parts.push({ value: current, nominal: nominal.current });

  let usedFallback = false;
  let fallbackReason: string | null = null;
  let target: number;

  if (parts.length === 0) {
    usedFallback = true;
    fallbackReason = 'Sin P/E fundamental (Ke o payout no fiables), sin P/E forward ni P/E actual';
    target = 15;
  } else {
    const wSum = parts.reduce((a, p) => a + p.nominal, 0);
    target = parts.reduce((a, p) => a + p.value * p.nominal, 0) / wSum;
    if (parts.length < 3) {
      fallbackReason = `Algunas referencias no disponibles (${parts.length} de 3); se re-ponderaron los presentes.`;
    }
  }

  target = Math.min(Math.max(target, 5), 40);
  const spread = Math.max(target * 0.18, 1);
  const weights = {
    fundamental: fundamental ? nominal.fundamental : 0,
    forward: forward != null ? nominal.forward : 0,
    current: current != null ? nominal.current : 0,
  };
  return { target, rangeLow: Math.max(target - spread, 4), rangeHigh: target + spread, sources: { fundamental, forward, current }, weights, usedFallback, fallbackReason };
}
function perConfidence(input: ValuationInput, normalized: { years: number; volatile: boolean }, growth: { bear: number; base: number; bull: number }, pe: { target: number; rangeLow: number; rangeHigh: number }): { level: 'high' | 'medium' | 'low' | 'na'; reason: string } {
  const beta = input.stock?.beta;
  const payout = input.stock?.payoutRatio;
  const reasons: string[] = [];
  let score = 0;
  if (normalized.years >= 8) score += 2; else if (normalized.years >= 5) score += 1; else { score -= 1; reasons.push('pocos años de datos'); }
  if (normalized.volatile) { score -= 1; reasons.push('EPS volátil'); }
  if (beta == null) { score -= 1; reasons.push('sin beta/Ke'); }
  if (payout == null || payout <= 0) { score -= 1; reasons.push('sin payout fiable'); }
  const rangeRatio = pe.target > 0 ? (pe.rangeHigh - pe.rangeLow) / pe.target : 0;
  if (rangeRatio > 0.5) { score -= 1; reasons.push('múltiplos extremos o componentes muy dispares'); }
  if (growth.base > 0.15) { score -= 1; reasons.push('crecimiento extremadamente elevado'); }
  const level = score >= 2 ? 'high' : score >= 0 ? 'medium' : 'low';
  return { level, reason: reasons.length ? reasons.join('; ') : 'Datos razonablemente completos' };
}

const PER_INAPPROPRIATE = ['bank', 'insurance', 'utility', 'telecom', 'mining', 'materials', 'reit', 'real estate', 'oil', 'gas', 'energy', 'commodity'];
function isPERInappropriate(sector: string | null | undefined, industry?: string | null): boolean {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  return PER_INAPPROPRIATE.some((k) => text.includes(k));
}

const HEALTHCARE_INDUSTRY_HINTS = ['drug manufacturer', 'medical device', 'medical instrument', 'medical supply', 'healthcare plan', 'healthcare service', 'healthcare business', 'medical diagnostic', 'diagnostic & research', 'medical -', 'pharmaceutical', 'pharma', 'healthcare -', 'health care'];
const HEALTHCARE_EXCLUSION_HINTS = ['reit', 'biotech', 'biotechnology'];

export function isHealthcareEPSPERApplicable(sector: string | null | undefined, industry?: string | null): boolean {
  if (isPERInappropriate(sector, industry)) return false;
  const sectorText = (sector || '').toLowerCase();
  const industryText = (industry || '').toLowerCase();
  const text = `${sectorText} ${industryText}`;
  if (HEALTHCARE_EXCLUSION_HINTS.some((k) => text.includes(k))) return false;
  const sectorIsHealthcare = sectorText.includes('health');
  return sectorIsHealthcare || HEALTHCARE_INDUSTRY_HINTS.some((k) => text.includes(k));
}

const PER_NORM_BASE = {
  id: 'per_norm' as const,
  name: 'P/E Normalizado',
  description: 'Valor basado en el beneficio sostenible por acción (EPS normalizado) y un P/E objetivo',
  explanation: 'Proyecta el beneficio sostenible de la empresa y lo multiplica por un múltiplo P/E razonable derivado de sus fundamentales (coste de equity, payout y crecimiento).',
  formula: 'EPS normalizado × P/E objetivo',
  configurable: true as const,
};

export function computePENormalized(input: ValuationInput, sector?: string | null, industry?: string | null): ValuationResult {
  const { stock } = input;
  const shares = sharesOf(stock);
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  if (isPERInappropriate(sector, industry)) {
    return { ...PER_NORM_BASE, fairValue: null, confidence: 'na', confidenceReason: `El P/E no es apropiado para ${sector || 'este sector'} — se valora mejor por activos o flujos`, inputs: [], applicability: { applicable: false, reason: `P/E no apropiado para ${sector || 'este sector'}` } };
  }
  if (!stock || shares <= 0 || !ttm || (ttm.netIncome ?? 0) <= 0) {
    return { ...PER_NORM_BASE, fairValue: null, confidence: 'na', confidenceReason: 'Beneficio neto no positivo', inputs: [] };
  }

  const normalized = normalizeEPS(input);
  if (normalized.eps == null || normalized.eps <= 0) {
    return { ...PER_NORM_BASE, fairValue: null, confidence: 'na', confidenceReason: 'No hay un EPS sostenible positivo', inputs: [], dataWarning: 'Datos históricos insuficientes para normalizar el EPS (se necesita al menos un ejercicio con beneficio positivo).' };
  }

  const growth = expectedEPSGrowth(input);
  const pe = computeTargetPE(input, growth);
  const conf = perConfidence(input, normalized, growth, pe);

  const targetPrice = normalized.eps * pe.target;
  const bearPrice = normalized.eps * pe.rangeLow;
  const bullPrice = normalized.eps * pe.rangeHigh;

  const basePrice = targetPrice;
  const currentPE = stock.peRatio ?? null;
  const upside = stock.currentPrice > 0 ? basePrice / stock.currentPrice - 1 : null;

  const sensitivityTable = [-0.2, -0.1, 0, 0.1, 0.2].map((f) => {
    const peCalc = Math.round(pe.target * (1 + f) * 10) / 10;
    return { pe: peCalc, price: normalized.eps! * peCalc, isTarget: Math.abs(peCalc - pe.target) < 0.01 };
  });

  const sources = pe.sources;
  const growthRaw = { bear: growth.bear * 100, base: growth.base * 100, bull: growth.bull * 100 };
  const cagr5v = epsCagr(annualEpsSeries(input), 5).value;
  const cagr5Pct = cagr5v != null ? `${(cagr5v * 100).toFixed(1)}%` : '—';
  const stats = epsGrowthStats(input);
  const pctOrDash = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '—';
  const currency = input.currency;
  const healthcare = isHealthcareEPSPERApplicable(sector, industry);

  return {
    ...PER_NORM_BASE,
    explanation: `Proyecta el beneficio sostenible (EPS normalizado de ${normalized.years} ejercicios) y lo multiplica por un P/E objetivo ${pe.target.toFixed(1)}x derivado de fundamentales. CAGR EPS 3/5/10A ≈ ${pctOrDash(stats.cagr3)} / ${cagr5Pct} / ${pctOrDash(stats.cagr10)}. P/E histórico y de comparables no disponibles en el modelo de datos.`,
    formula: `EPS(${fmtVal(normalized.eps, currency)}) × P/E(${pe.target.toFixed(1)})`,
    fairValue: basePrice,
    confidence: conf.level,
    confidenceReason: conf.reason,
    applicability: { applicable: true, reason: healthcare ? 'Empresa de healthcare madura y rentable: aplica el método EPS + P/E.' : 'Método P/E aplicable a esta empresa.' },
    inputs: [
      { label: 'EPS normalizado', value: fmtVal(normalized.eps, currency), rawValue: normalized.eps },
      { label: 'Método EPS normalizado', value: normalized.method.replace(/_/g, ' '), rawValue: ['none', 'median_5y_trimmed', 'average_5y', 'average_4y', 'average_3y', 'average_2y', 'average_1y'].indexOf(normalized.method) },
      { label: 'Años usados', value: `${normalized.years}`, rawValue: normalized.years },
      { label: 'CAGR EPS 3Y', value: pctOrDash(stats.cagr3), rawValue: stats.cagr3 ?? 0 },
      { label: 'CAGR EPS 5Y', value: cagr5Pct, rawValue: stats.cagr5 ?? 0 },
      { label: 'CAGR EPS 10Y', value: pctOrDash(stats.cagr10), rawValue: stats.cagr10 ?? 0 },
      { label: 'Consistencia', value: stats.totalYears > 0 ? `${stats.positiveYears}/${stats.totalYears} años con crecimiento > 0` : '—', rawValue: stats.totalYears > 0 ? stats.positiveYears / stats.totalYears : 0 },
      { label: 'P/E actual', value: currentPE != null && currentPE > 0 ? `${currentPE.toFixed(1)}x` : 'N/D', rawValue: currentPE ?? 0 },
      { label: 'P/E forward', value: sources.forward != null ? `${sources.forward.toFixed(1)}x` : '—', rawValue: sources.forward ?? 0 },
      { label: 'P/E fundamental', value: sources.fundamental != null ? `${sources.fundamental.pe.toFixed(1)}x` : 'No disponible', rawValue: sources.fundamental?.pe ?? 0 },
      { label: 'Peso P/E fundamental', value: pe.weights.fundamental > 0 ? `${(pe.weights.fundamental * 100).toFixed(0)}%` : '—', rawValue: pe.weights.fundamental },
      { label: 'Peso P/E forward', value: pe.weights.forward > 0 ? `${(pe.weights.forward * 100).toFixed(0)}%` : '—', rawValue: pe.weights.forward },
      { label: 'Peso P/E actual', value: pe.weights.current > 0 ? `${(pe.weights.current * 100).toFixed(0)}%` : '—', rawValue: pe.weights.current },
      { label: 'Crecimiento EPS (base)', value: `${growthRaw.base.toFixed(1)}%`, rawValue: growthRaw.base },
      { label: 'P/E objetivo', value: `${pe.target.toFixed(1)}x`, rawValue: pe.target },
      { label: 'Precio objetivo', value: fmtVal(basePrice, currency), rawValue: basePrice },
      { label: 'Upside/downside', value: upside != null ? `${(upside * 100).toFixed(1)}%` : '—', rawValue: upside ?? 0 },
    ],
    scenarios: { bear: bearPrice, base: basePrice, bull: bullPrice },
    sensitivityTable,
    perPEBreakdown: {
      fundamental: sources.fundamental,
      forward: sources.forward,
      current: sources.current,
      weights: pe.weights,
      usedFallback: pe.usedFallback,
      fallbackReason: pe.fallbackReason,
    },
  };
}

// ── DCF ──
export function computeDCF(input: ValuationInput, config: { growthRate: number; discountRate: number; horizonYears: number }, sector?: string | null, industry?: string | null, ccOverride?: { growth?: boolean; discount?: boolean }): ValuationResult {
  const f = latest(input.financials);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!f || !stock || shares <= 0) {
    return { id: 'dcf', name: 'DCF (Flujo de Caja Descontado)', description: 'Valor intrínseco calculado con flujos de caja futuros descontados', explanation: 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Es el método más fundamental: una empresa vale la suma de todo el dinero que generará en el futuro, ajustado por riesgo y tiempo.', formula: 'Σ(FCF×(1+g)ⁿ/(1+r)ⁿ) + TV', fairValue: null, confidence: 'na', confidenceReason: 'Datos insuficientes', configurable: true, inputs: [] };
  }

  const isQuarterly = hasQuarterlyData(input.financials);
  const annualFCFs = input.financials
    .filter((x) => x.quarter == null || x.quarter === 0)
    .map((x) => x.freeCashFlow ?? (x.operatingCashFlow != null ? x.operatingCashFlow - (x.capex ?? 0) : null))
    .filter((v): v is number => v != null && v !== 0)
    .filter((v) => v > 0);
  const avgAnnualFCF = annualFCFs.length > 0 ? annualFCFs.reduce((a, b) => a + b, 0) / annualFCFs.length : 0;

  let fcf: number;
  let fcfSource: string;
  let fcfValues: number[] = [];
  let ttmAnnualFields: string[] | undefined;
  let usedAnnualFallback = false;
  if (isQuarterly) {
    const ttm = trailing12Months(input.financials, input.balanceSheets);
    ttmAnnualFields = ttm?.annualFields;
    const ttmFCF = ttm?.freeCashFlow ?? ttm?.operatingCashFlow;
    if (ttmFCF != null && ttmFCF > 0) {
      fcf = ttmFCF;
      fcfSource = 'TTM';
    } else if (avgAnnualFCF > 0) {
      fcf = avgAnnualFCF;
      fcfSource = `promedio de ${annualFCFs.length} años`;
      usedAnnualFallback = true;
    } else {
      return { id: 'dcf', name: 'DCF (Flujo de Caja Descontado)', description: 'Valor intrínseco calculado con flujos de caja futuros descontados', explanation: 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Es el método más fundamental: una empresa vale la suma de todo el dinero que generará en el futuro, ajustado por riesgo y tiempo.', formula: 'Σ(FCF×(1+g)ⁿ/(1+r)ⁿ) + TV', fairValue: null, confidence: 'na', confidenceReason: 'Sin flujo de caja libre positivo (TTM ni anual)', configurable: true, inputs: [] };
    }
  } else {
    fcfValues = input.financials.map((x) => x.freeCashFlow ?? (x.operatingCashFlow != null ? x.operatingCashFlow - (x.capex ?? 0) : null)).filter((v): v is number => v != null && v !== 0);
    if (fcfValues.length === 0) {
      return { id: 'dcf', name: 'DCF (Flujo de Caja Descontado)', description: 'Valor intrínseco calculado con flujos de caja futuros descontados', explanation: 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Es el método más fundamental: una empresa vale la suma de todo el dinero que generará en el futuro, ajustado por riesgo y tiempo.', formula: 'Σ(FCF×(1+g)ⁿ/(1+r)ⁿ) + TV', fairValue: null, confidence: 'na', confidenceReason: 'Sin datos de flujo de caja libre', configurable: true, inputs: [] };
    }
    if (avgAnnualFCF > 0) {
      fcf = avgAnnualFCF;
      fcfSource = `promedio de ${annualFCFs.length} años`;
    } else {
      fcf = fcfValues.reduce((a, b) => a + b, 0) / fcfValues.length;
      fcfSource = `${fcfValues.length} años`;
    }
  }
  if (fcf <= 0) {
    return { id: 'dcf', name: 'DCF (Flujo de Caja Descontado)', description: 'Valor intrínseco calculado con flujos de caja futuros descontados', explanation: 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Es el método más fundamental: una empresa vale la suma de todo el dinero que generará en el futuro, ajustado por riesgo y tiempo.', formula: 'Σ(FCF×(1+g)ⁿ/(1+r)ⁿ) + TV', fairValue: null, confidence: 'na', confidenceReason: 'FCF no positivo', configurable: true, inputs: [] };
  }

  const cc = consumerCyclicalRates(input, { growthRate: config.growthRate, discountRate: config.discountRate }, sector, industry, ccOverride);
  const g = cc.g >= cc.r ? cc.r - 0.005 : cc.g;
  const r = cc.r;
  const tg = 0.03;

  let totalPV = 0;
  for (let i = 1; i <= config.horizonYears; i++) {
    totalPV += (fcf * Math.pow(1 + g, i)) / Math.pow(1 + r, i);
  }
  const terminalValue = (fcf * Math.pow(1 + g, config.horizonYears) * (1 + tg)) / (r - tg);
  const terminalPV = terminalValue / Math.pow(1 + r, config.horizonYears);
  const fairValue = (totalPV + terminalPV) / shares;

  const baseConf: ValuationResult['confidence'] = isQuarterly ? 'medium' : (fcfValues.length >= 3 ? (consistency(fcfValues) > 0.6 ? 'high' : 'medium') : 'low');
  const conf = capConfidence(baseConf, ttmAnnualFields, ['freeCashFlow', 'operatingCashFlow']);
  const dataWarning = ttmAnnualFields && ttmAnnualFields.some((f) => f === 'freeCashFlow' || f === 'operatingCashFlow') ? PARTIAL_DATA_WARNING : undefined;
  const currency = input.currency;

  return {
    id: 'dcf', name: 'DCF (Flujo de Caja Descontado)',
    description: 'Valor intrínseco calculado con flujos de caja futuros descontados',
    explanation: usedAnnualFallback
      ? 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. El FCF TTM (últimos 4 trimestres) no fue positivo, así que usa el FCF promedio de los ejercicios completos para suavizar la volatilidad cíclica.'
      : (isQuarterly
          ? 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Usa el FCF TTM (últimos 4 trimestres) como base de proyección.'
          : 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Usa el FCF promedio de los últimos años para suavizar la volatilidad cíclica.'),
    formula: `Σ(FCF_${fcfSource === 'TTM' ? 'TTM' : 'prom'}×(1+${config.growthRate}%)ⁿ/(1+${config.discountRate}%)ⁿ) + TV`,
    fairValue, confidence: conf,
    confidenceReason: `FCF ${fcfSource}: ${fmtB(fcf, currency)}`,
    configurable: true,
    ...(dataWarning ? { dataWarning } : {}),
    inputs: [
      { label: `FCF ${fcfSource}`, value: fmtB(fcf, currency), rawValue: fcf },
      { label: 'Crecimiento anual', value: `${(g * 100).toFixed(2)}%`, rawValue: g * 100 },
      ...(cc.growthApplied ? [
        { label: 'CAGR ingresos 5 años', value: cc.growthDetails.cagr5 != null ? `${(cc.growthDetails.cagr5 * 100).toFixed(2)}%` : '—', rawValue: cc.growthDetails.cagr5 ?? 0 },
        { label: 'CAGR ingresos 10 años', value: cc.growthDetails.cagr10 != null ? `${(cc.growthDetails.cagr10 * 100).toFixed(2)}%` : '—', rawValue: cc.growthDetails.cagr10 ?? 0 },
        { label: 'Crecimiento reciente', value: cc.growthDetails.recent != null ? `${(cc.growthDetails.recent * 100).toFixed(2)}%` : '—', rawValue: cc.growthDetails.recent ?? 0 },
        { label: 'Peso ponderado (5a/10a/reciente)', value: `${CC_GROWTH_WEIGHTS.cagr5}/${CC_GROWTH_WEIGHTS.cagr10}/${CC_GROWTH_WEIGHTS.recent}`, rawValue: CC_GROWTH_WEIGHTS.cagr5 },
      ] : []),
      { label: cc.wacc ? 'Tasa de descuento (WACC)' : 'Tasa de descuento', value: `${(r * 100).toFixed(2)}%`, rawValue: r * 100 },
      ...(cc.wacc ? [
        { label: 'Ke (CAPM: rf 3% + β×5%)', value: `${cc.wacc.Ke.toFixed(2)}%`, rawValue: cc.wacc.Ke },
        { label: 'Kd (interés/deuda)', value: `${cc.wacc.Kd.toFixed(2)}%`, rawValue: cc.wacc.Kd },
        { label: 'Impuesto efectivo', value: `${cc.wacc.tax.toFixed(1)}%`, rawValue: cc.wacc.tax },
        { label: 'Equity', value: fmtB(cc.wacc.equity, currency), rawValue: cc.wacc.equity },
        { label: 'Deuda', value: fmtB(cc.wacc.debt, currency), rawValue: cc.wacc.debt },
        { label: 'Peso Equity / Deuda', value: `${(cc.wacc.equityWeight * 100).toFixed(0)}% / ${(cc.wacc.debtWeight * 100).toFixed(0)}%`, rawValue: cc.wacc.equityWeight },
        { label: 'WACC = Ke×E/(D+E) + Kd×(1−t)×D/(D+E)', value: `${cc.wacc.wacc.toFixed(2)}%`, rawValue: cc.wacc.wacc },
      ] : []),
      { label: 'Horizonte', value: `${config.horizonYears} años`, rawValue: config.horizonYears },
      { label: 'Terminal growth', value: `${(tg * 100).toFixed(0)}%`, rawValue: tg * 100 },
      { label: 'Valor presente FCF', value: fmtB(totalPV, currency), rawValue: totalPV },
      { label: 'Valor terminal (PV)', value: fmtB(terminalPV, currency), rawValue: terminalPV },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
    ],
  };
}

// ── PER ──
export function computePER(input: ValuationInput, config: { targetPE: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!ttm || !stock || shares <= 0 || (ttm.netIncome ?? 0) <= 0) {
    return { id: 'per', name: 'PER (Precio/Beneficio)', description: 'Valor basado en el beneficio neto por acción y el ratio P/E', explanation: 'Pregunta: "¿Cuánto pagarías por 1€ de beneficio?" Si la empresa gana 5 por acción y el P/E objetivo es 20x, el valor justo es 100. Es el método más utilizado por inversores institucionales. Un P/E bajo sugiere infravaloración; uno alto sobrevaloración o altas expectativas de crecimiento.', formula: 'EPS × Target P/E', fairValue: null, confidence: 'na', confidenceReason: 'Beneficio neto no positivo', configurable: true, inputs: [], negativeInputWarning: undefined };
  }
  const netIncome = ttm.netIncome;
  const eps = netIncome / shares;
  const fairValue = eps * config.targetPE;
  const currentPE = stock.peRatio ?? 0;
  const conf = currentPE > 0 && currentPE < 50 ? 'high' : currentPE > 0 ? 'medium' : 'low';
  const currency = input.currency;
  return {
    id: 'per', name: 'PER (Precio/Beneficio)',
    description: 'Valor basado en el beneficio neto por acción y el ratio P/E',
    explanation: 'Pregunta: "¿Cuánto pagarías por 1€ de beneficio?" Si la empresa gana 5 por acción y el P/E objetivo es 20x, el valor justo es 100. Es el método más utilizado por inversores institucionales. Un P/E bajo sugiere infravaloración; uno alto sobrevaloración o altas expectativas de crecimiento.',
    formula: `EPS(${fmtVal(eps, currency)}) × Target P/E(${config.targetPE})`,
    fairValue, confidence: conf,
    confidenceReason: currentPE > 0 ? `PER actual: ${currentPE.toFixed(1)}` : 'Sin PER disponible',
    configurable: true,
    inputs: [
      { label: 'Beneficio neto', value: fmtB(netIncome, currency), rawValue: netIncome },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'EPS', value: fmtVal(eps, currency), rawValue: eps },
      { label: 'Target P/E', value: `${config.targetPE}x`, rawValue: config.targetPE },
      { label: 'P/E actual', value: currentPE > 0 ? `${currentPE.toFixed(1)}x` : 'N/D', rawValue: currentPE },
    ],
  };
}

// ── P/B ──
export function computePB(input: ValuationInput, config: { targetPB: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  const equity = bs?.totalStockholdersEquity;
  if (!stock || shares <= 0 || equity == null || equity <= 0) {
    return { id: 'pb', name: 'P/B (Precio/Valor en Libro)', description: 'Patrimonio neto por acción multiplicado por P/B objetivo', explanation: 'Compara el precio de la acción con el valor contable de los activos netos (patrimonio). Un P/B de 1x significa que compras la empresa a precio de libros. Funciona mejor para bancos y empresas intensivas en activos. No es útil para empresas de servicios o tecnología donde los activos intangibles dominan.', formula: 'BVPS × Target P/B', fairValue: null, confidence: 'na', confidenceReason: 'Sin patrimonio neto', configurable: true, inputs: [], negativeInputWarning: undefined };
  }
  const bvps = equity / shares;
  const fairValue = bvps * config.targetPB;
  const currentPB = stock.pbRatio ?? 0;
  const conf = currentPB >= 0.2 && currentPB < 10 ? 'high' : currentPB > 0 ? 'medium' : 'low';
  const currency = input.currency;
  return {
    id: 'pb', name: 'P/B (Precio/Valor en Libro)',
    description: 'Patrimonio neto por acción multiplicado por P/B objetivo',
    explanation: 'Compara el precio de la acción con el valor contable de los activos netos (patrimonio). Un P/B de 1x significa que compras la empresa a precio de libros. Funciona mejor para bancos y empresas intensivas en activos. No es útil para empresas de servicios o tecnología donde los activos intangibles dominan.',
    formula: `BVPS(${fmtVal(bvps, currency)}) × Target P/B(${config.targetPB})`,
    fairValue, confidence: conf,
    confidenceReason: currentPB > 0 ? `P/B actual: ${currentPB.toFixed(1)}` : 'Sin P/B disponible',
    configurable: true,
    inputs: [
      { label: 'Patrimonio total', value: fmtB(equity, currency), rawValue: equity },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'BVPS', value: fmtVal(bvps, currency), rawValue: bvps },
      { label: 'Target P/B', value: `${config.targetPB}x`, rawValue: config.targetPB },
      { label: 'P/B actual', value: currentPB > 0 ? `${currentPB.toFixed(1)}x` : 'N/D', rawValue: currentPB },
    ],
  };
}

// ── P/S ──
export function computePS(input: ValuationInput, config: { targetPS: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!ttm || !stock || shares <= 0 || (ttm.revenue ?? 0) <= 0) {
    return { id: 'ps', name: 'P/S (Precio/Ventas)', description: 'Ingresos por acción multiplicado por P/S objetivo', explanation: 'Mide cuánto paga el mercado por cada euro de ingresos. Es útil para empresas que aún no generan beneficios (startups, empresas en crecimiento). A diferencia del PER, nunca es negativo porque los ingresos siempre son positivos, pero ignora completamente la rentabilidad.', formula: 'SPS × Target P/S', fairValue: null, confidence: 'na', confidenceReason: 'Sin ingresos', configurable: true, inputs: [] };
  }
  const sps = ttm.revenue / shares;
  const fairValue = sps * config.targetPS;
  const currentPS = stock.psRatio ?? 0;
  const conf = currentPS > 0 && currentPS < 20 ? 'high' : currentPS > 0 ? 'medium' : 'low';
  const currency = input.currency;
  return {
    id: 'ps', name: 'P/S (Precio/Ventas)',
    description: 'Ingresos por acción multiplicado por P/S objetivo',
    explanation: 'Mide cuánto paga el mercado por cada euro de ingresos. Es útil para empresas que aún no generan beneficios (startups, empresas en crecimiento). A diferencia del PER, nunca es negativo porque los ingresos siempre son positivos, pero ignora completamente la rentabilidad.',
    formula: `SPS(${fmtVal(sps, currency)}) × Target P/S(${config.targetPS})`,
    fairValue, confidence: conf,
    confidenceReason: currentPS > 0 ? `P/S actual: ${currentPS.toFixed(1)}` : 'Sin P/S disponible',
    configurable: true,
    inputs: [
      { label: 'Ingresos totales', value: fmtB(ttm.revenue, currency), rawValue: ttm.revenue },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'SPS', value: fmtVal(sps, currency), rawValue: sps },
      { label: 'Target P/S', value: `${config.targetPS}x`, rawValue: config.targetPS },
      { label: 'P/S actual', value: currentPS > 0 ? `${currentPS.toFixed(1)}x` : 'N/D', rawValue: currentPS },
    ],
  };
}

// ── EV/EBITDA ──
export function computeEVEBITDA(input: ValuationInput, config: { targetMultiple: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!ttm || !stock || shares <= 0 || !ttm.ebitda || ttm.ebitda <= 0) {
    return {
      id: 'ev_ebitda', name: 'EV/EBITDA',
      description: 'Múltiplo de empresa sobre EBITDA',
      explanation: 'Valora la empresa entera (deuda incluida) en función de su capacidad operativa de generar beneficios antes de intereses, impuestos y amortizaciones. Es el múltiplo preferido en fusiones y adquisiciones porque es independiente de la estructura de capital y las políticas contables.',
      formula: '(EBITDA × Múltiplo − Net Debt) / Shares',
      fairValue: null, confidence: 'na',
      confidenceReason: 'Sin EBITDA',
      configurable: true, inputs: [],
      negativeInputWarning: undefined,
    };
  }
  if (stock.enterpriseValue != null && stock.enterpriseValue < 0) {
    return {
      id: 'ev_ebitda', name: 'EV/EBITDA',
      description: 'Múltiplo de empresa sobre EBITDA',
      explanation: 'Valora la empresa entera (deuda incluida) en función de su capacidad operativa de generar beneficios antes de intereses, impuestos y amortizaciones. Es el múltiplo preferido en fusiones y adquisiciones porque es independiente de la estructura de capital y las políticas contables.',
      formula: '(EBITDA × Múltiplo − Net Debt) / Shares',
      fairValue: null, confidence: 'na',
      confidenceReason: 'EV negativo: no aplica a empresas con tesorería neta (banca/financieras)',
      configurable: true, inputs: [],
    };
  }
  const ebitda = ttm.ebitda;
  const ev = ebitda * config.targetMultiple;
  const nd = netDebt(bs);
  const fairValue = (ev - nd) / shares;
  const currentMult = stock.enterpriseValue && ebitda ? stock.enterpriseValue / ebitda : 0;
  const baseConf: ValuationResult['confidence'] = currentMult > 0 && currentMult < 40 ? 'high' : currentMult > 0 ? 'medium' : 'low';
  const conf = capConfidence(baseConf, ttm.annualFields, ['ebitda']);
  const dataWarning = ttm.annualFields.includes('ebitda') ? PARTIAL_DATA_WARNING : undefined;
  const currency = input.currency;
  return {
    id: 'ev_ebitda', name: 'EV/EBITDA',
    description: 'Múltiplo de empresa sobre EBITDA',
    explanation: 'Valora la empresa entera (deuda incluida) en función de su capacidad operativa de generar beneficios antes de intereses, impuestos y amortizaciones. Es el múltiplo preferido en fusiones y adquisiciones porque es independiente de la estructura de capital y las políticas contables.',
    formula: `(EBITDA×${config.targetMultiple} − Net Debt) / Shares`,
    fairValue, confidence: conf,
    confidenceReason: currentMult > 0 ? `Múltiplo actual: ${currentMult.toFixed(1)}x` : 'Sin EV/EBITDA',
    configurable: true,
    ...(dataWarning ? { dataWarning } : {}),
    inputs: [
      { label: 'EBITDA', value: fmtB(ebitda, currency), rawValue: ebitda },
      { label: 'Múltiplo target', value: `${config.targetMultiple}x`, rawValue: config.targetMultiple },
      { label: 'EV implícito', value: fmtB(ev, currency), rawValue: ev },
      { label: 'Deuda neta', value: fmtB(nd, currency), rawValue: nd },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'Múltiplo actual', value: currentMult > 0 ? `${currentMult.toFixed(1)}x` : 'N/D', rawValue: currentMult },
    ],
  };
}

// ── EV/EBIT ──
export function computeEVEBIT(input: ValuationInput, config: { targetMultiple: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  const ebit = ttm?.ebit ?? (ttm ? (ttm.grossProfit - ttm.operatingExpenses) : null) ?? latest(input.financials)?.ebit ?? null;
  if (!ttm || !stock || shares <= 0 || ebit == null || ebit <= 0) {
    return { id: 'ev_ebit', name: 'EV/EBIT', description: 'Múltiplo de empresa sobre EBIT', explanation: 'Similar a EV/EBITDA pero sin añadir de nuevo la depreciación. Es más conservador porque refleja la necesidad real de reinvertir en activos. Ideal para comparar empresas dentro del mismo sector con diferentes intensidades de capital.', formula: '(EBIT × Múltiplo − Net Debt) / Shares', fairValue: null, confidence: 'na', confidenceReason: ebit == null ? 'Sin EBIT' : ebit < 0 ? 'EBIT no positivo (pérdidas): el múltiplo EV/EBIT no es representativo' : 'EBIT es cero', configurable: true, inputs: [], negativeInputWarning: undefined };
  }
  if (stock.enterpriseValue != null && stock.enterpriseValue < 0) {
    return { id: 'ev_ebit', name: 'EV/EBIT', description: 'Múltiplo de empresa sobre EBIT', explanation: 'Similar a EV/EBITDA pero sin añadir de nuevo la depreciación. Es más conservador porque refleja la necesidad real de reinvertir en activos. Ideal para comparar empresas dentro del mismo sector con diferentes intensidades de capital.', formula: '(EBIT × Múltiplo − Net Debt) / Shares', fairValue: null, confidence: 'na', confidenceReason: 'EV negativo: no aplica a empresas con tesorería neta (banca/financieras)', configurable: true, inputs: [] };
  }
  const evEbit = ebit * config.targetMultiple;
  const ndEbit = netDebt(bs);
  const fairValue = (evEbit - ndEbit) / shares;
  const currentMultEbit = stock.enterpriseValue && ebit ? stock.enterpriseValue / ebit : 0;
  const baseConf: ValuationResult['confidence'] = currentMultEbit > 0 && currentMultEbit < 50 ? 'high' : currentMultEbit > 0 ? 'medium' : 'low';
  const conf = capConfidence(baseConf, ttm.annualFields, ['ebit']);
  const dataWarning = ttm.annualFields.includes('ebit') ? PARTIAL_DATA_WARNING : undefined;
  const evEbitWarning = ebit < 0
    ? 'EBIT negativo: la empresa tiene pérdidas operativas. El EV/EBIT no es aplicable con EBIT negativo.'
    : undefined;
  const currency = input.currency;
  return {
    id: 'ev_ebit', name: 'EV/EBIT',
    description: 'Múltiplo de empresa sobre EBIT',
    explanation: 'Similar a EV/EBITDA pero sin añadir de nuevo la depreciación. Es más conservador porque refleja la necesidad real de reinvertir en activos. Ideal para comparar empresas dentro del mismo sector con diferentes intensidades de capital.',
    formula: `(EBIT×${config.targetMultiple} − Net Debt) / Shares`,
    fairValue, confidence: conf,
    confidenceReason: currentMultEbit > 0 ? `Múltiplo actual: ${currentMultEbit.toFixed(1)}x` : 'Sin EV/EBIT',
    configurable: true,
    negativeInputWarning: evEbitWarning,
    ...(dataWarning ? { dataWarning } : {}),
    inputs: [
      { label: 'EBIT', value: fmtB(ebit, currency), rawValue: ebit },
      { label: 'Múltiplo target', value: `${config.targetMultiple}x`, rawValue: config.targetMultiple },
      { label: 'EV implícito', value: fmtB(evEbit, currency), rawValue: evEbit },
      { label: 'Deuda neta', value: fmtB(ndEbit, currency), rawValue: ndEbit },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'Múltiplo actual', value: currentMultEbit > 0 ? `${currentMultEbit.toFixed(1)}x` : 'N/D', rawValue: currentMultEbit },
    ],
  };
}

// ── Dividend Discount (DDM) ──
export function computeDDM(input: ValuationInput, config: { growthRate: number; requiredReturn: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const f = latest(input.financials);
  const { stock } = input;
  const shares = sharesOf(stock);
  const divPaid = ttm?.dividendsPaid ?? f?.dividendsPaid ?? null;
  const divPerShare = ttm && shares > 0 && divPaid ? Math.abs(divPaid) / shares : 0;
  if (!stock || shares <= 0 || divPerShare <= 0) {
    return { id: 'ddm', name: 'DDM (Descuento de Dividendos)', description: 'Valor intrínseco por dividendos futuros descontados', explanation: 'Basado en la idea de que una acción vale la suma de todos sus dividendos futuros descontados. Funciona exclusivamente para empresas maduras con historial estable de dividendos (utilities, bancos). No es aplicable a empresas que no pagan dividendos o que reinvierten todo el beneficio.', formula: 'D₁ / (r − g)', fairValue: null, confidence: 'na', confidenceReason: 'Sin dividendos', configurable: true, inputs: [] };
  }
  const d1 = divPerShare * (1 + config.growthRate / 100);
  const r = config.requiredReturn / 100;
  const g = config.growthRate / 100;
  const fairValue = r > g ? d1 / (r - g) : null;
  const divYield = stock.dividendYield ?? 0;
  const baseConf: ValuationResult['confidence'] = divYield > 0.02 && fairValue !== null ? 'high' : divYield > 0 ? 'medium' : 'low';
  const conf = capConfidence(baseConf, ttm?.annualFields, ['dividendsPaid']);
  const dataWarning = ttm && ttm.annualFields.includes('dividendsPaid') ? PARTIAL_DATA_WARNING : undefined;
  const currency = input.currency;
  return {
    id: 'ddm', name: 'DDM (Descuento de Dividendos)',
    description: 'Valor intrínseco por dividendos futuros descontados',
    explanation: 'Basado en la idea de que una acción vale la suma de todos sus dividendos futuros descontados. Funciona exclusivamente para empresas maduras con historial estable de dividendos (utilities, bancos). No es aplicable a empresas que no pagan dividendos o que reinvierten todo el beneficio.',
    formula: `D₁(${fmtVal(d1, currency)}) / (${config.requiredReturn}% − ${config.growthRate}%)`,
    fairValue, confidence: conf,
    confidenceReason: divYield > 0 ? `Yield: ${(divYield * 100).toFixed(1)}%` : 'Sin yield disponible',
    configurable: true,
    ...(dataWarning ? { dataWarning } : {}),
    inputs: [
      { label: 'Dividendo total', value: fmtB(Math.abs(divPaid ?? 0), currency), rawValue: Math.abs(divPaid ?? 0) },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'Div/acción', value: fmtVal(divPerShare, currency), rawValue: divPerShare },
      { label: 'D₁ (próximo año)', value: fmtVal(d1, currency), rawValue: d1 },
      { label: 'Crecimiento', value: `${config.growthRate}%`, rawValue: config.growthRate },
      { label: 'Retorno requerido', value: `${config.requiredReturn}%`, rawValue: config.requiredReturn },
      { label: 'Dividend yield', value: divYield > 0 ? `${(divYield * 100).toFixed(1)}%` : 'N/D', rawValue: divYield * 100 },
    ],
  };
}

// ── Graham Number ──
export function computeGrahamNumber(input: ValuationInput): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const f = latest(input.financials);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!ttm || !stock || shares <= 0) {
    return { id: 'graham', name: 'Número de Graham', description: 'Fórmula defensiva de Benjamin Graham', explanation: 'Fórmula defensiva creada por Benjamin Graham (mentor de Warren Buffett). Establece un tope máximo razonable para el precio de una acción basándose en su beneficio y patrimonio neto. Si la acción cuesta menos que el Número de Graham, se considera una ganga segura.', formula: '√(22.5 × EPS × BVPS)', fairValue: null, confidence: 'na', confidenceReason: 'Datos insuficientes', configurable: false, inputs: [] };
  }
  const eps = ttm.netIncome / shares;
  const equity = bs?.totalStockholdersEquity ?? f?.totalEquity;
  const bvps = equity ? equity / shares : 0;
  if (eps <= 0 || bvps <= 0) {
    return { id: 'graham', name: 'Número de Graham', description: 'Fórmula defensiva de Benjamin Graham', explanation: 'Fórmula defensiva creada por Benjamin Graham (mentor de Warren Buffett). Establece un tope máximo razonable para el precio de una acción basándose en su beneficio y patrimonio neto. Si la acción cuesta menos que el Número de Graham, se considera una ganga segura.', formula: '√(22.5 × EPS × BVPS)', fairValue: null, confidence: 'na', confidenceReason: eps <= 0 ? 'EPS negativo' : 'Book Value negativo', configurable: false, inputs: [], negativeInputWarning: eps <= 0 ? 'El Número de Graham requiere beneficios positivos (EPS > 0). Con EPS negativo, la fórmula no aplica y el resultado no es significativo.' : 'El Número de Graham requiere patrimonio positivo (BVPS > 0).' };
  }
  const fairValue = Math.sqrt(22.5 * eps * bvps);
  const currency = input.currency;
  return {
    id: 'graham', name: 'Número de Graham',
    description: 'Fórmula defensiva de Benjamin Graham',
    explanation: 'Fórmula defensiva creada por Benjamin Graham (mentor de Warren Buffett). Establece un tope máximo razonable para el precio de una acción basándose en su beneficio y patrimonio neto. Si la acción cuesta menos que el Número de Graham, se considera una ganga segura.',
    formula: `√(22.5 × ${fmtVal(eps, currency)} × ${fmtVal(bvps, currency)})`,
    fairValue, confidence: 'high',
    confidenceReason: `EPS: ${fmtVal(eps, currency)}, BVPS: ${fmtVal(bvps, currency)}`,
    configurable: false,
    inputs: [
      { label: 'Beneficio neto', value: fmtB(ttm.netIncome, currency), rawValue: ttm.netIncome },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'EPS', value: fmtVal(eps, currency), rawValue: eps },
      { label: 'Patrimonio', value: fmtB(equity ?? 0, currency), rawValue: equity ?? 0 },
      { label: 'BVPS', value: `${fmtVal(bvps, currency)}`, rawValue: bvps },
      { label: 'Constante Graham', value: '22.5', rawValue: 22.5 },
    ],
  };
}

// ── FCF Yield ──
export function computeFCFYield(input: ValuationInput, config: { targetYield: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!ttm || !stock || shares <= 0) {
    return { id: 'fcf_yield', name: 'FCF Yield', description: 'Precio implícito dado un rendimiento de FCF objetivo', explanation: 'Invierte la lógica: dado un rendimiento objetivo del FCF, ¿cuál debería ser el precio? Si la empresa genera $10 de FCF por acción y quieres un 5% de rendimiento, el precio justo es $200. Es análogo al yield de un bono pero para acciones.', formula: 'FCF/Share ÷ Target Yield', fairValue: null, confidence: 'na', confidenceReason: 'Datos insuficientes', configurable: true, inputs: [] };
  }
  const fcf = ttm.freeCashFlow ?? (ttm.operatingCashFlow != null ? ttm.operatingCashFlow - ttm.capex : null);
  if (fcf == null) {
    return { id: 'fcf_yield', name: 'FCF Yield', description: 'Precio implícito dado un rendimiento de FCF objetivo', explanation: 'Invierte la lógica: dado un rendimiento objetivo del FCF, ¿cuál debería ser el precio? Si la empresa genera $10 de FCF por acción y quieres un 5% de rendimiento, el precio justo es $200. Es análogo al yield de un bono pero para acciones.', formula: 'FCF/Share ÷ Target Yield', fairValue: null, confidence: 'na', confidenceReason: 'Sin datos de FCF', configurable: true, inputs: [] };
  }
  const fcfPerShare = fcf / shares;
  const fairValue = config.targetYield > 0 ? fcfPerShare / (config.targetYield / 100) : null;
  const currentYield = stock.currentPrice > 0 ? fcfPerShare / stock.currentPrice : 0;
  const baseConf: ValuationResult['confidence'] = currentYield > 0.05 ? 'high' : currentYield > 0.02 ? 'medium' : currentYield > 0 ? 'low' : 'na';
  const conf = capConfidence(baseConf, ttm.annualFields, ['freeCashFlow', 'operatingCashFlow']);
  const dataWarning = ttm.annualFields.some((f) => f === 'freeCashFlow' || f === 'operatingCashFlow') ? PARTIAL_DATA_WARNING : undefined;
  const fcfYieldWarning = fcf < 0
    ? 'FCF negativo: la empresa genera un flujo de caja libre negativo. Un yield negativo produce un valor intrínseco negativo, indicando que la empresa destruye valor en efectivo.'
    : undefined;
  const currency = input.currency;
  return {
    id: 'fcf_yield', name: 'FCF Yield',
    description: 'Precio implícito dado un rendimiento de FCF objetivo',
    explanation: 'Invierte la lógica: dado un rendimiento objetivo del FCF, ¿cuál debería ser el precio? Si la empresa genera 10 de FCF por acción y quieres un 5% de rendimiento, el precio justo es 200. Es análogo al yield de un bono pero para acciones.',
    formula: `FCF/Share(${fmtVal(fcfPerShare, currency)}) ÷ ${config.targetYield}%`,
    fairValue, confidence: conf,
    confidenceReason: currentYield > 0 ? `FCF yield actual: ${(currentYield * 100).toFixed(1)}%` : 'Sin FCF positivo',
    configurable: true,
    negativeInputWarning: fcfYieldWarning,
    ...(dataWarning ? { dataWarning } : {}),
    inputs: [
      { label: 'FCF total', value: fmtB(fcf, currency), rawValue: fcf },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'FCF/acción', value: fmtVal(fcfPerShare, currency), rawValue: fcfPerShare },
      { label: 'Yield objetivo', value: `${config.targetYield}%`, rawValue: config.targetYield },
      { label: 'FCF yield actual', value: currentYield > 0 ? `${(currentYield * 100).toFixed(1)}%` : 'N/D', rawValue: currentYield * 100 },
    ],
  };
}

// ── Net-Net ──
export function computeNetNet(input: ValuationInput): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!bs || !stock || shares <= 0) {
    return { id: 'netnet', name: 'Net-Net (NCAV)', description: 'Net Current Asset Value de Benjamin Graham', explanation: 'La fórmula más conservadora de Graham. Calcula el valor de liquidación de los activos corrientes (efectivo, cobros, inventario) menos toda la deuda. Si la acción cuesta menos que esto, estás comprando la empresa por debajo de su valor de liquidación — una oportunidad rara pero real.', formula: '(Cash + 0.5×AR + 0.5×Inv − Total Liabilities) / Shares', fairValue: null, confidence: 'na', confidenceReason: 'Sin balance sheet', configurable: false, inputs: [] };
  }
  const ncav = (bs.cashAndCashEquivalents ?? 0) + 0.5 * (bs.accountsReceivable ?? 0) + 0.5 * (bs.inventory ?? 0) - (bs.totalLiabilities ?? 0);
  const fairValue = ncav / shares;
  const conf = fairValue > stock.currentPrice ? 'high' : fairValue > 0 ? 'medium' : 'low';
  const netnetWarning = ncav < 0
    ? 'NCAV negativo: los pasivos totales superan los activos corrientes ajustados. El valor de liquidación neto es negativo, lo que indica que la empresa tiene más deudas que activos líquidos.'
    : undefined;
  const currency = input.currency;
  return {
    id: 'netnet', name: 'Net-Net (NCAV)',
    description: 'Net Current Asset Value de Benjamin Graham',
    explanation: 'La fórmula más conservadora de Graham. Calcula el valor de liquidación de los activos corrientes (efectivo, cobros, inventario) menos toda la deuda. Si la acción cuesta menos que esto, estás comprando la empresa por debajo de su valor de liquidación — una oportunidad rara pero real.',
    formula: `(Cash + 0.5×AR + 0.5×Inv − Liabilities) / Shares`,
    fairValue, confidence: conf,
    confidenceReason: `NCAV: ${fmtB(ncav, currency)}`,
    configurable: false,
    negativeInputWarning: netnetWarning,
    inputs: [
      { label: 'Cash & equivalents', value: fmtB(bs.cashAndCashEquivalents ?? 0, currency), rawValue: bs.cashAndCashEquivalents ?? 0 },
      { label: 'Cuentas por cobrar', value: fmtB(bs.accountsReceivable ?? 0, currency), rawValue: bs.accountsReceivable ?? 0 },
      { label: 'AR × 0.5', value: fmtB(0.5 * (bs.accountsReceivable ?? 0), currency), rawValue: 0.5 * (bs.accountsReceivable ?? 0) },
      { label: 'Inventarios', value: fmtB(bs.inventory ?? 0, currency), rawValue: bs.inventory ?? 0 },
      { label: 'Inv × 0.5', value: fmtB(0.5 * (bs.inventory ?? 0), currency), rawValue: 0.5 * (bs.inventory ?? 0) },
      { label: 'Total liabilities', value: fmtB(bs.totalLiabilities ?? 0, currency), rawValue: bs.totalLiabilities ?? 0 },
      { label: 'NCAV total', value: fmtB(ncav, currency), rawValue: ncav },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
    ],
  };
}

export function computeAll(input: ValuationInput, configs: ValuationConfigs, sector?: string | null, industry?: string | null, ccOverride?: { growth?: boolean; discount?: boolean }): ValuationResult[] {
  const currentPrice = input.stock?.currentPrice ?? 0;
  const financial = isFinancial(sector, industry);
  const results: ValuationResult[] = [
    computeDCF(input, configs.dcf, sector, industry, ccOverride),
    computePER(input, configs.per),
    computePB(input, configs.pb),
    computePS(input, configs.ps),
    computeEVEBITDA(input, configs.evEbitda),
    computeEVEBIT(input, configs.evEbit),
    computeDDM(input, configs.ddm),
    computeGrahamNumber(input),
    computeFCFYield(input, configs.fcfYield),
    computeNetNet(input),
    computePENormalized(input, sector, industry),
  ];
  return results.map((r) => applySanityBound(r, currentPrice));
}

export type ValuationConfigs = {
  dcf: { growthRate: number; discountRate: number; horizonYears: number };
  per: { targetPE: number };
  pb: { targetPB: number };
  ps: { targetPS: number };
  evEbitda: { targetMultiple: number };
  evEbit: { targetMultiple: number };
  ddm: { growthRate: number; requiredReturn: number };
  fcfYield: { targetYield: number };
};

export const DEFAULT_CONFIGS: ValuationConfigs = {
  dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 },
  per: { targetPE: 20 },
  pb: { targetPB: 3 },
  ps: { targetPS: 5 },
  evEbitda: { targetMultiple: 15 },
  evEbit: { targetMultiple: 18 },
  ddm: { growthRate: 3, requiredReturn: 10 },
  fcfYield: { targetYield: 5 },
};

const AIRLINE_CONFIGS: ValuationConfigs = {
  dcf: { growthRate: 3, discountRate: 12, horizonYears: 10 },
  per: { targetPE: 10 },
  pb: { targetPB: 1.5 },
  ps: { targetPS: 0.5 },
  evEbitda: { targetMultiple: 6 },
  evEbit: { targetMultiple: 8 },
  ddm: { growthRate: 0, requiredReturn: 12 },
  fcfYield: { targetYield: 8 },
};

const SECTOR_CONFIGS: Record<string, ValuationConfigs> = {
  airlines: AIRLINE_CONFIGS,
  'air transport': AIRLINE_CONFIGS,
  airline: AIRLINE_CONFIGS,
  'passenger airlines': AIRLINE_CONFIGS,
  banking: { dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 }, per: { targetPE: 12 }, pb: { targetPB: 1.5 }, ps: { targetPS: 3 }, evEbitda: { targetMultiple: 10 }, evEbit: { targetMultiple: 12 }, ddm: { growthRate: 3, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
  'financial services': { dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 }, per: { targetPE: 12 }, pb: { targetPB: 1.5 }, ps: { targetPS: 3 }, evEbitda: { targetMultiple: 10 }, evEbit: { targetMultiple: 12 }, ddm: { growthRate: 3, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
  insurance: { dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 }, per: { targetPE: 12 }, pb: { targetPB: 1.5 }, ps: { targetPS: 3 }, evEbitda: { targetMultiple: 10 }, evEbit: { targetMultiple: 12 }, ddm: { growthRate: 3, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
  technology: { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'consumer electronics': { dcf: { growthRate: 6, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  semiconductors: { dcf: { growthRate: 10, discountRate: 11, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 10 }, ps: { targetPS: 12 }, evEbitda: { targetMultiple: 22 }, evEbit: { targetMultiple: 28 }, ddm: { growthRate: 5, requiredReturn: 11 }, fcfYield: { targetYield: 3 } },
  'internet content': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 6 }, ps: { targetPS: 7 }, evEbitda: { targetMultiple: 18 }, evEbit: { targetMultiple: 22 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  utilities: { dcf: { growthRate: 2, discountRate: 8, horizonYears: 10 }, per: { targetPE: 16 }, pb: { targetPB: 2 }, ps: { targetPS: 3 }, evEbitda: { targetMultiple: 9 }, evEbit: { targetMultiple: 11 }, ddm: { growthRate: 3, requiredReturn: 8 }, fcfYield: { targetYield: 5 } },
  'drug manufacturers': { dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 }, per: { targetPE: 18 }, pb: { targetPB: 4 }, ps: { targetPS: 5 }, evEbitda: { targetMultiple: 14 }, evEbit: { targetMultiple: 18 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  energy: { dcf: { growthRate: 2, discountRate: 12, horizonYears: 10 }, per: { targetPE: 10 }, pb: { targetPB: 1.5 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 6 }, evEbit: { targetMultiple: 8 }, ddm: { growthRate: 3, requiredReturn: 12 }, fcfYield: { targetYield: 8 } },
  reit: { dcf: { growthRate: 3, discountRate: 8, horizonYears: 10 }, per: { targetPE: 20 }, pb: { targetPB: 1.5 }, ps: { targetPS: 5 }, evEbitda: { targetMultiple: 14 }, evEbit: { targetMultiple: 16 }, ddm: { growthRate: 3, requiredReturn: 8 }, fcfYield: { targetYield: 5 } },
  'auto - manufacturers': { dcf: { growthRate: 5, discountRate: 11, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 3 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 8 }, evEbit: { targetMultiple: 12 }, ddm: { growthRate: 2, requiredReturn: 11 }, fcfYield: { targetYield: 6 } },
  'auto manufacturers': { dcf: { growthRate: 5, discountRate: 11, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 3 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 8 }, evEbit: { targetMultiple: 12 }, ddm: { growthRate: 2, requiredReturn: 11 }, fcfYield: { targetYield: 6 } },
  'drug manufacturers - general': { dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 }, per: { targetPE: 18 }, pb: { targetPB: 4 }, ps: { targetPS: 5 }, evEbitda: { targetMultiple: 14 }, evEbit: { targetMultiple: 18 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'internet - content': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 6 }, ps: { targetPS: 7 }, evEbitda: { targetMultiple: 18 }, evEbit: { targetMultiple: 22 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'internet content & information': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 6 }, ps: { targetPS: 7 }, evEbitda: { targetMultiple: 18 }, evEbit: { targetMultiple: 22 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'internet retail': { dcf: { growthRate: 10, discountRate: 11, horizonYears: 10 }, per: { targetPE: 30 }, pb: { targetPB: 10 }, ps: { targetPS: 3 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 0, requiredReturn: 11 }, fcfYield: { targetYield: 3 } },
  'specialty retail': { dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 3 }, ps: { targetPS: 1 }, evEbitda: { targetMultiple: 10 }, evEbit: { targetMultiple: 12 }, ddm: { growthRate: 3, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
  'software - infrastructure': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'software - application': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  software: { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  telecom: { dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 1.5 }, ps: { targetPS: 2 }, evEbitda: { targetMultiple: 7 }, evEbit: { targetMultiple: 9 }, ddm: { growthRate: 3, requiredReturn: 9 }, fcfYield: { targetYield: 6 } },
  'communication services': { dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 1.5 }, ps: { targetPS: 2 }, evEbitda: { targetMultiple: 7 }, evEbit: { targetMultiple: 9 }, ddm: { growthRate: 3, requiredReturn: 9 }, fcfYield: { targetYield: 6 } },
  'telecom services': { dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 1.5 }, ps: { targetPS: 2 }, evEbitda: { targetMultiple: 7 }, evEbit: { targetMultiple: 9 }, ddm: { growthRate: 3, requiredReturn: 9 }, fcfYield: { targetYield: 6 } },
  'consumer defensive': { dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 }, per: { targetPE: 18 }, pb: { targetPB: 3 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 12 }, evEbit: { targetMultiple: 15 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
  'grocery stores': { dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 }, per: { targetPE: 18 }, pb: { targetPB: 3 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 12 }, evEbit: { targetMultiple: 15 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
};

export function getSectorConfigs(sector: string | null | undefined, industry?: string | null): ValuationConfigs {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  for (const [key, config] of Object.entries(SECTOR_CONFIGS)) {
    if (text.includes(key)) return config;
  }
  return DEFAULT_CONFIGS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modelo de negocio: se infiere de las métricas financieras de la empresa para
// elegir el método de valoración. Esta es la implementación canónica (backend);
// el frontend consume los resultados vía API.
// ─────────────────────────────────────────────────────────────────────────────

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

const BUSINESS_MODEL_RECOMMENDED: Record<BusinessModel, string> = {
  brand: 'per',
  asset_light: 'dcf',
  asset_heavy: 'ev_ebitda',
  growth: 'dcf',
  stable: 'ddm',
  commodity: 'fcf_yield',
  financial: 'pb',
};

const BUSINESS_MODEL_LABEL: Record<BusinessModel, string> = {
  brand: 'Negocio de marca / intangibles',
  asset_light: 'Negocio ligero en activos (servicios/software)',
  asset_heavy: 'Negocio intensivo en capital',
  growth: 'Negocio de alto crecimiento',
  stable: 'Negocio maduro / generador de efectivo',
  commodity: 'Negocio cíclico / commodity',
  financial: 'Entidad financiera',
};

export function computeRoic(input: ValuationInput): number | null {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  if (!ttm) return null;
  const bs = ttm.balanceSheet;
  if (!bs) return null;
  const equity = bs.totalStockholdersEquity ?? 0;
  const cash = (bs.cashAndCashEquivalents ?? 0) + (bs.shortTermInvestments ?? 0);
  const debt = (bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0);
  const investedCapital = equity + debt - cash;
  if (investedCapital <= 0) return null;
  const revenue = ttm.revenue ?? 0;
  if (revenue <= 0) return null;

  let ebit = ttm.ebit;
  if (ebit == null) {
    ebit = (ttm.netIncome ?? 0) + (ttm.taxExpense ?? 0);
  }
  if (ebit == null || ebit <= 0) return null;

  const taxExp = ttm.taxExpense ?? 0;
  let taxRate = 0.21;
  if (taxExp > 0) {
    taxRate = Math.min(Math.max(taxExp / ebit, 0), 0.6);
  }
  const nopat = ebit * (1 - taxRate);
  if (nopat <= 0) return null;
  return nopat / investedCapital;
}

function revenueCagr(input: ValuationInput, years: number): number | null {
  const annual = input.financials
    .filter((f) => (f.quarter ?? 0) === 0 && (f.revenue ?? 0) > 0)
    .sort((a, b) => a.year - b.year);
  if (annual.length < 2) return null;
  const last = annual[annual.length - 1];
  const target = annual.find((r) => r.year === last.year - years) ?? annual[0];
  const span = last.year - target.year;
  if (span < 3 || (target.revenue ?? 0) <= 0 || (last.revenue ?? 0) <= 0) return null;
  return Math.pow(last.revenue! / target.revenue!, 1 / span) - 1;
}

export function inferBusinessModel(input: ValuationInput, sector?: string | null, industry?: string | null): BusinessModelInference {
  const { stock } = input;
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet;

  const finText = `${sector || ''} ${industry || ''}`.toLowerCase();
  if (/bank|banc|insur|seguro|financial services|crédit|mortgage|mutual fund/.test(finText)) {
    return { model: 'financial', label: BUSINESS_MODEL_LABEL.financial, reason: `Sector/industria ${sector || ''} ${industry || ''}: se valora por múltiplos de balance (P/B).` };
  }

  const revenue = ttm?.revenue ?? 0;
  if (!ttm || revenue <= 0 || !stock) {
    return { model: null, label: 'No determinado', reason: 'Datos financieros insuficientes para inferir el modelo de negocio.' };
  }

  const netIncome = ttm.netIncome ?? 0;
  const grossProfit = ttm.grossProfit ?? 0;
  const capex = ttm.capex ?? 0;
  const fcf = ttm.freeCashFlow ?? null;

  const grossMargin = ttm.grossProfit != null && revenue > 0 ? grossProfit / revenue : null;
  const netMargin = revenue > 0 ? netIncome / revenue : null;
  const capexIntensity = revenue > 0 ? capex / revenue : null;
  const roic = computeRoic(input) ?? (stock.roic ?? null);
  const assetTurnover = bs?.totalAssets != null && bs.totalAssets > 0 ? revenue / bs.totalAssets : null;
  const ps = stock.psRatio ?? null;
  const payout = stock.payoutRatio ?? null;
  const divYield = stock.dividendYield ?? null;
  const beta = stock.beta ?? null;
  const growthCagr = epsCagr(annualEpsSeries(input), 5).value;
  const revCagr = revenueCagr(input, 5);

  const highMargin = grossMargin != null && grossMargin > 0.5;
  const highNetMargin = netMargin != null && netMargin > 0.15;
  const positiveAndStable = netMargin != null && netMargin >= 0.05 && grossMargin != null && grossMargin >= 0.2;
  const highRoic = roic != null && roic > 0.15;
  const highCapex = capexIntensity != null && capexIntensity > 0.12;
  const lowAssetTurnover = assetTurnover != null && assetTurnover < 0.5;
  const highAssetTurnover = assetTurnover != null && assetTurnover > 1;
  const highPs = ps != null && ps > 2;
  const highPayout = payout != null && payout > 0.5;
  const highDiv = divYield != null && divYield >= 0.02;
  const lowBeta = beta != null && beta < 1.2;
  const highCagr = growthCagr != null && growthCagr > 0.15;
  const highRevCagr = revCagr != null && revCagr >= 0.15;
  const serviceOrTech = /software|technology|internet|services|consult|healthcare|telecom|media/.test(finText);
  const netDebtToEbitda = ttm.ebitda != null && ttm.ebitda > 0 && bs != null
    ? (((bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0) - ((bs.cashAndCashEquivalents ?? 0) + (bs.shortTermInvestments ?? 0))) / ttm.ebitda)
    : null;
  const leveraged = netDebtToEbitda != null && netDebtToEbitda > 2;

  if (highCapex && (lowAssetTurnover || leveraged)) {
    return { model: 'asset_heavy', label: BUSINESS_MODEL_LABEL.asset_heavy, reason: `Intensidad de capital alta (capex/revenue ${(capexIntensity! * 100).toFixed(1)}%), rotación de activos ${assetTurnover != null ? assetTurnover.toFixed(2) : 'n/d'} ${leveraged ? 'y deuda neta/EBITDA relevante.' : '.'}` };
  }
  if (highMargin && highRoic && highPs) {
    return { model: 'brand', label: BUSINESS_MODEL_LABEL.brand, reason: `Margen bruto ${(grossMargin! * 100).toFixed(0)}%, ROIC ${(roic! * 100).toFixed(0)}% y P/S ${ps!.toFixed(1)}x: valor concentrado en marca/intangibles.` };
  }
  if (highMargin && !highCapex && highNetMargin && (highAssetTurnover || serviceOrTech)) {
    return { model: 'asset_light', label: BUSINESS_MODEL_LABEL.asset_light, reason: `Bajo capex (${capexIntensity != null ? (capexIntensity * 100).toFixed(1) : 'n/d'}% de ventas) con margen neto ${(netMargin! * 100).toFixed(0)}% y rotación de activos ${assetTurnover != null ? assetTurnover.toFixed(2) : 'n/d'}: modelo ligero en activos.` };
  }
  if (highPayout && highDiv && lowBeta && (growthCagr == null || growthCagr < 0.12)) {
    return { model: 'stable', label: BUSINESS_MODEL_LABEL.stable, reason: `Payout ${(payout! * 100).toFixed(0)}%, rentabilidad por dividendo ${(divYield! * 100).toFixed(2)}% y beta ${beta!.toFixed(2)}: negocio maduro.` };
  }
  if (highRevCagr && netIncome > 0 && positiveAndStable && !highCapex) {
    return { model: 'growth', label: BUSINESS_MODEL_LABEL.growth, reason: `Revenue CAGR 5A ≈ ${(revCagr! * 100).toFixed(1)}%, margen neto ${(netMargin! * 100).toFixed(0)}% y beneficio TTM positivo: crecimiento con calidad.` };
  }
  if (fcf != null && netMargin != null && netMargin > 0.02 && netMargin < 0.1 && lowAssetTurnover && !highCapex) {
    return { model: 'commodity', label: BUSINESS_MODEL_LABEL.commodity, reason: `Margen neto reducido (${(netMargin * 100).toFixed(0)}%) con baja rotación de activos: perfil cíclico / commodity.` };
  }

  return { model: null, label: 'No determinado', reason: 'No se detecta un perfil dominante; se usa el criterio por sector.' };
}

const SECTOR_RECOMMENDED_MODEL: Record<string, string> = {
  banking: 'pb',
  'financial services': 'pb',
  insurance: 'pb',
  utilities: 'ddm',
  energy: 'ev_ebitda',
  'oil & gas': 'ev_ebitda',
  airlines: 'ev_ebitda',
  'air transport': 'ev_ebitda',
  'auto - manufacturers': 'ev_ebitda',
  'auto manufacturers': 'ev_ebitda',
  reit: 'fcf_yield',
  'real estate': 'fcf_yield',
  technology: 'dcf',
  semiconductors: 'dcf',
  'internet content': 'ps',
  'internet - content': 'ps',
  'internet content & information': 'ps',
  'internet retail': 'ps',
  'consumer electronics': 'ps',
  'drug manufacturers': 'dcf',
  'specialty retail': 'per',
  'communication services': 'ev_ebitda',
  'telecom services': 'ev_ebitda',
  'telecoms': 'ev_ebitda',
  software: 'dcf',
  'consumer defensive': 'per_norm',
  default: 'dcf',
};

const SECTOR_PRIORITY_MODEL: Record<string, string> = {
  utilities: 'ddm',
  reit: 'fcf_yield',
  'real estate': 'fcf_yield',
  energy: 'ev_ebitda',
  'oil & gas': 'ev_ebitda',
  banking: 'pb',
  'financial services': 'pb',
  insurance: 'pb',
  'consumer defensive': 'per_norm',
  'internet retail': 'ps',
  software: 'dcf',
  technology: 'dcf',
  semiconductors: 'dcf',
};

const SECTOR_PRIORITY_LABEL: Record<string, string> = {
  utilities: 'Sector regulado / utility: DDM',
  reit: 'Real estate / REIT: FCF yield',
  'real estate': 'Real estate / REIT: FCF yield',
  energy: 'Commodity energético: EV/EBITDA',
  'oil & gas': 'Commodity energético: EV/EBITDA',
  banking: 'Entidad financiera',
  'financial services': 'Entidad financiera',
  insurance: 'Entidad financiera',
  'consumer defensive': 'Defensivo de consumo: EPS normalizado',
  'internet retail': 'Retail online: P/S',
  software: 'Software/tech: DCF',
  technology: 'Software/tech: DCF',
  semiconductors: 'Software/tech: DCF',
};

function sectorPriority(sector?: string | null, industry?: string | null): string | null {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  for (const key of Object.keys(SECTOR_PRIORITY_MODEL)) {
    if (text.includes(key)) return key;
  }
  return null;
}

export function getRecommendedModel(input: ValuationInput, sector?: string | null, industry?: string | null): { id: string; businessModel?: BusinessModelInference } {
  if (isHealthcareEPSPERApplicable(sector, industry)) {
    const normalized = normalizeEPS(input);
    if (normalized.eps != null && normalized.eps > 0) {
      return {
        id: 'per_norm',
        businessModel: {
          model: null,
          label: 'Healthcare maduro: EPS + P/E',
          reason: `Empresa de healthcare madura y rentable (EPS normalizado positivo, ${normalized.years} ejercicios): se valora por beneficio sostenible por acción × P/E objetivo.`,
        },
      };
    }
  }
  const priorityKey = sectorPriority(sector, industry);
  if (priorityKey != null) {
    const financial = priorityKey === 'banking' || priorityKey === 'financial services' || priorityKey === 'insurance';
    return {
      id: SECTOR_PRIORITY_MODEL[priorityKey],
      businessModel: {
        model: financial ? 'financial' : null,
        label: SECTOR_PRIORITY_LABEL[priorityKey],
        reason: `Sector ${priorityKey}: se aplica prioridad sectorial ${SECTOR_PRIORITY_MODEL[priorityKey]}.`,
      },
    };
  }
  const bm = inferBusinessModel(input, sector, industry);
  if (bm.model != null) {
    return { id: BUSINESS_MODEL_RECOMMENDED[bm.model], businessModel: bm };
  }
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  for (const [key, modelId] of Object.entries(SECTOR_RECOMMENDED_MODEL)) {
    if (key !== 'default' && text.includes(key)) return { id: modelId, businessModel: bm };
  }
  return { id: SECTOR_RECOMMENDED_MODEL.default, businessModel: bm };
}

const RECOMMENDED_FALLBACK = ['per_norm', 'ev_ebitda', 'per', 'pb', 'fcf_yield', 'ddm'];

export function getRecommendedFairValue(results: ValuationResult[], input: ValuationInput, sector?: string | null, industry?: string | null): { model: string; fairValue: number | null; businessModel?: BusinessModelInference } {
  const { id: model, businessModel } = getRecommendedModel(input, sector, industry);
  const fv = results.find((r) => r.id === model)?.fairValue ?? null;
  if (fv != null) return { model, fairValue: fv, businessModel };
  for (const alt of RECOMMENDED_FALLBACK) {
    if (alt === model) continue;
    const altFv = results.find((r) => r.id === alt)?.fairValue ?? null;
    if (altFv != null) return { model: alt, fairValue: altFv, businessModel };
  }
  return { model, fairValue: null, businessModel };
}

export type Verdict = 'buy' | 'hold' | 'sell' | 'na';

export function getVerdict(fairValue: number | null, currentPrice: number): Verdict {
  if (fairValue == null || currentPrice <= 0) return 'na';
  const upside = (fairValue - currentPrice) / currentPrice;
  if (upside > 0.15) return 'buy';
  if (upside < -0.15) return 'sell';
  return 'hold';
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  buy: 'Infravalorada',
  hold: 'Justa',
  sell: 'Sobrevalorada',
  na: 'Sin datos',
};