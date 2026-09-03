import type { CompanyProfile } from '../components/CompanyPage';
import { fmtCurrency } from './format';

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
  // Fields rebuilt from the latest annual figure because the quarterly rows
  // were missing values (partial quarters). `['*']` when the whole TTM is the
  // annual fallback. Used to keep confidence honest.
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

function netDebt(bs: BalanceSheet | undefined): number {
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

function fmtVal(n: number, currency: string): string {
  return fmtCurrency(n, currency);
}
function fmtB(n: number, currency: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${(n / 1e9).toFixed(1)}B`;
}

// Sanity bound: if fair value is more than MAX_MULTIPLE × current price, demote confidence
const SANITY_MULTIPLE = 6;
function applySanityBound(result: ValuationResult, currentPrice: number): ValuationResult {
  if (result.fairValue == null || currentPrice <= 0) return result;
  if (result.fairValue > SANITY_MULTIPLE * currentPrice || result.fairValue < 0) {
    return { ...result, confidence: 'na', confidenceReason: `Valor (${result.fairValue.toFixed(0)}) > ${SANITY_MULTIPLE}x precio actual — método excluido del promedio (no fiable)` };
  }
  return result;
}

// Data-quality: cap confidence to 'medium' when the field behind a method was
// rebuilt from the latest annual figure because some quarterly rows were
// missing values (partial quarters). This keeps valuations honest: a value
// built on incomplete quarterly data must not claim full confidence.
function capConfidence(conf: ValuationResult['confidence'], annualFields: string[] | undefined, fields: string[]): ValuationResult['confidence'] {
  if (conf === 'high' && annualFields && fields.some((f) => annualFields.includes(f))) return 'medium';
  return conf;
}

const PARTIAL_DATA_WARNING = 'Datos trimestrales incompletos: este cálculo usa el último ejercicio anual en lugar de los 4 trimestres.';

// ── Consumer Cyclical enhanced DCF ──
// Params de sector para Consumer Cyclical (CAPM Ke, Kd fallback, tax fallback).
const CC_RF = 3; // tasa libre de riesgo %
const CC_MARKET_PREMIUM = 5; // prima de mercado %
const CC_KD_FALLBACK = 5; // % cuando no hay deuda o interés real
const CC_TAX_FALLBACK = 25; // %
const CC_GROWTH_WEIGHTS = { cagr5: 0.5, cagr10: 0.3, recent: 0.2 };

export function isConsumerCyclical(sector: string | null | undefined, _industry?: string | null): boolean {
  const s = (sector || '').toLowerCase();
  return s === 'consumer cyclical' || s === 'consumer discretionary';
}

// Media ponderada de crecimiento de ingresos: CAGR 5 años, CAGR 10 años y crecimiento reciente.
interface GrowthResult {
  growthRate: number | null;
  details: { cagr5: number | null; cagr10: number | null; recent: number | null };
}
function computeWeightedGrowth(financials: Financial[]): GrowthResult {
  const annual = financials
    .filter((x) => x.quarter == null || x.quarter === 0)
    .filter((x) => typeof x.revenue === 'number' && x.revenue > 0)
    .sort((a, b) => a.year - b.year);
  const details = { cagr5: null as number | null, cagr10: null as number | null, recent: null as number | null };
  if (annual.length < 2) return { growthRate: null, details };

  const last = annual[annual.length - 1];
  const lastRev = last.revenue;
  const prev = annual[annual.length - 2];
  details.recent = lastRev / prev.revenue - 1;

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

  // Combinar solo los componentes disponibles, re-ponderando.
  const parts: Array<{ value: number; weight: number }> = [];
  if (details.cagr5 != null) parts.push({ value: details.cagr5, weight: CC_GROWTH_WEIGHTS.cagr5 });
  if (details.cagr10 != null) parts.push({ value: details.cagr10, weight: CC_GROWTH_WEIGHTS.cagr10 });
  if (details.recent != null) parts.push({ value: details.recent, weight: CC_GROWTH_WEIGHTS.recent });
  if (parts.length === 0) return { growthRate: null, details };

  const wSum = parts.reduce((a, p) => a + p.weight, 0);
  const growthRate = parts.reduce((a, p) => a + p.value * p.weight, 0) / wSum;
  return { growthRate, details };
}

// Aplica la nueva lógica g (crecimiento) y r (WACC) cuando aplica al sector Consumer Cyclical.
// Devuelve null cuando no debe aplicarse o faltan datos (el caller debe usar la config).
interface DCFRates {
  g: number; // decimal
  r: number; // decimal
  growthDetails: GrowthResult['details'];
  growthApplied: boolean;
  wacc: { Ke: number; Kd: number; tax: number; equity: number; debt: number; equityWeight: number; debtWeight: number; wacc: number } | null;
}
function consumerCyclicalRates(input: ValuationInput, config: { growthRate: number; discountRate: number }, sector: string | null | undefined, industry?: string | null, ccOverride?: { growth?: boolean; discount?: boolean }): DCFRates {
  // Solo aplica a Consumer Cyclical.
  if (!isConsumerCyclical(sector, industry)) {
    return { g: config.growthRate / 100, r: config.discountRate / 100, growthDetails: { cagr5: null, cagr10: null, recent: null }, growthApplied: false, wacc: null };
  }

  // Crecimiento ponderado (con fallback a config). growth.growthRate ya es decimal (ratio).
  const growth = computeWeightedGrowth(input.financials);
  const growthApplied = growth.growthRate != null;
  // g: si hay override manual, la config del slider manda; si no, usa el ponderado (fallback a config).
  const g = ccOverride?.growth ? config.growthRate / 100 : (growthApplied ? growth.growthRate! : config.growthRate / 100);

  // WACC = Ke×E/(D+E) + Kd×(1−tax)×D/(D+E). Si falta algún dato → fallback a discountRate de config.
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
    const Ke = CC_RF + beta * CC_MARKET_PREMIUM; // %
    const Kd = interest != null && interest > 0 && debt > 0 ? (interest / debt) * 100 : CC_KD_FALLBACK; // %
    const tax = pretax != null && pretax > 0 && taxExpense != null ? taxExpense / pretax : CC_TAX_FALLBACK / 100; // decimal
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

// Devuelve los valores de crecimiento/descuento que el DCF Consumer usaría de forma
// automática (media ponderada + WACC), para poder inicializar los sliders con ellos.
// growthApplied: false si no hay datos (usaría la config).
export function dcfSeedRates(input: ValuationInput, config: { growthRate: number; discountRate: number }, sector: string | null | undefined, industry?: string | null): { growthRate: number; discountRate: number; growthApplied: boolean } {
  const cc = consumerCyclicalRates(input, config, sector, industry);
  const cappedG = cc.g >= cc.r ? cc.r - 0.005 : cc.g;
  return { growthRate: +(cappedG * 100).toFixed(2), discountRate: +(cc.r * 100).toFixed(2), growthApplied: cc.growthApplied };
}

// ── DCF ──
export function computeDCF(input: ValuationInput, config: { growthRate: number; discountRate: number; horizonYears: number }, sector?: string | null, industry?: string | null, ccOverride?: { growth?: boolean; discount?: boolean }): ValuationResult {
  const f = latest(input.financials);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!f || !stock || shares <= 0) {
    return { id: 'dcf', name: 'DCF (Flujo de Caja Descontado)', description: 'Valor intrínseco calculado con flujos de caja futuros descontados', explanation: 'Estima el valor de la empresa proyectando sus flujos de caja libres futuros y descontándolos al presente. Es el método más fundamental: una empresa vale la suma de todo el dinero que generará en el futuro, ajustado por riesgo y tiempo.', formula: 'Σ(FCF×(1+g)ⁿ/(1+r)ⁿ) + TV', fairValue: null, confidence: 'na', confidenceReason: 'Datos insuficientes', configurable: true, inputs: [] };
  }

  // Use TTM FCF when quarterly data exists, otherwise average annual FCF.
  // If the TTM FCF is not positive (e.g. cyclical firms), fall back to the
  // average of complete-year (Q0) FCFs so that valuation still computes.
  const isQuarterly = hasQuarterlyData(input.financials);
  const annualFCFs = input.financials
    .filter((x) => x.quarter == null || x.quarter === 0)
    .map((x) => x.freeCashFlow ?? (x.operatingCashFlow != null ? x.operatingCashFlow - x.capex : null))
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
    fcfValues = input.financials.map((x) => x.freeCashFlow ?? (x.operatingCashFlow != null ? x.operatingCashFlow - x.capex : null)).filter((v): v is number => v != null && v !== 0);
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
  const g = cc.g >= cc.r ? cc.r - 0.005 : cc.g; // cap g below r to avoid divergent terminal value
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
    confidenceReason: `FCF ${fcfSource}: ${fmtB(fcf, input.currency)}`,
    configurable: true,
    ...(dataWarning ? { dataWarning } : {}),
    inputs: [
      { label: `FCF ${fcfSource}`, value: fmtB(fcf, input.currency), rawValue: fcf },
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
        { label: 'Equity', value: fmtB(cc.wacc.equity, input.currency), rawValue: cc.wacc.equity },
        { label: 'Deuda', value: fmtB(cc.wacc.debt, input.currency), rawValue: cc.wacc.debt },
        { label: 'Peso Equity / Deuda', value: `${(cc.wacc.equityWeight * 100).toFixed(0)}% / ${(cc.wacc.debtWeight * 100).toFixed(0)}%`, rawValue: cc.wacc.equityWeight },
        { label: 'WACC = Ke×E/(D+E) + Kd×(1−t)×D/(D+E)', value: `${cc.wacc.wacc.toFixed(2)}%`, rawValue: cc.wacc.wacc },
      ] : []),
      { label: 'Horizonte', value: `${config.horizonYears} años`, rawValue: config.horizonYears },
      { label: 'Terminal growth', value: `${(tg * 100).toFixed(0)}%`, rawValue: tg * 100 },
      { label: 'Valor presente FCF', value: fmtB(totalPV, input.currency), rawValue: totalPV },
      { label: 'Valor terminal (PV)', value: fmtB(terminalPV, input.currency), rawValue: terminalPV },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
    ],
  };
}

// ── PER ──
export function computePER(input: ValuationInput, config: { targetPE: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const { stock } = input;
  const shares = sharesOf(stock);
  if (!ttm || !stock || shares <= 0 || ttm.netIncome <= 0) {
    return { id: 'per', name: 'PER (Precio/Beneficio)', description: 'Valor basado en el beneficio neto por acción y el ratio P/E', explanation: 'Pregunta: "¿Cuánto pagarías por 1€ de beneficio?" Si la empresa gana 5 por acción y el P/E objetivo es 20x, el valor justo es 100. Es el método más utilizado por inversores institucionales. Un P/E bajo sugiere infravaloración; uno alto sobrevaloración o altas expectativas de crecimiento.', formula: 'EPS × Target P/E', fairValue: null, confidence: 'na', confidenceReason: 'Beneficio neto no positivo', configurable: true, inputs: [], negativeInputWarning: undefined };
  }
  const netIncome = ttm.netIncome;
  const eps = netIncome / shares;
  const fairValue = eps * config.targetPE;
  const currentPE = stock.peRatio ?? 0;
  const conf = currentPE > 0 && currentPE < 50 ? 'high' : currentPE > 0 ? 'medium' : 'low';
  return {
    id: 'per', name: 'PER (Precio/Beneficio)',
    description: 'Valor basado en el beneficio neto por acción y el ratio P/E',
    explanation: 'Pregunta: "¿Cuánto pagarías por 1€ de beneficio?" Si la empresa gana 5 por acción y el P/E objetivo es 20x, el valor justo es 100. Es el método más utilizado por inversores institucionales. Un P/E bajo sugiere infravaloración; uno alto sobrevaloración o altas expectativas de crecimiento.',
    formula: `EPS(${fmtVal(eps, input.currency)}) × Target P/E(${config.targetPE})`,
    fairValue, confidence: conf,
    confidenceReason: currentPE > 0 ? `PER actual: ${currentPE.toFixed(1)}` : 'Sin PER disponible',
    configurable: true,
    inputs: [
      { label: 'Beneficio neto', value: fmtB(netIncome, input.currency), rawValue: netIncome },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'EPS', value: fmtVal(eps, input.currency), rawValue: eps },
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
  const conf = currentPB > 0 && currentPB < 10 ? 'high' : currentPB > 0 ? 'medium' : 'low';
  return {
    id: 'pb', name: 'P/B (Precio/Valor en Libro)',
    description: 'Patrimonio neto por acción multiplicado por P/B objetivo',
    explanation: 'Compara el precio de la acción con el valor contable de los activos netos (patrimonio). Un P/B de 1x significa que compras la empresa a precio de libros. Funciona mejor para bancos y empresas intensivas en activos. No es útil para empresas de servicios o tecnología donde los activos intangibles dominan.',
    formula: `BVPS(${fmtVal(bvps, input.currency)}) × Target P/B(${config.targetPB})`,
    fairValue, confidence: conf,
    confidenceReason: currentPB > 0 ? `P/B actual: ${currentPB.toFixed(1)}` : 'Sin P/B disponible',
    configurable: true,
    inputs: [
      { label: 'Patrimonio total', value: fmtB(equity, input.currency), rawValue: equity },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'BVPS', value: fmtVal(bvps, input.currency), rawValue: bvps },
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
  if (!ttm || !stock || shares <= 0 || ttm.revenue <= 0) {
    return { id: 'ps', name: 'P/S (Precio/Ventas)', description: 'Ingresos por acción multiplicado por P/S objetivo', explanation: 'Mide cuánto paga el mercado por cada euro de ingresos. Es útil para empresas que aún no generan beneficios (startups, empresas en crecimiento). A diferencia del PER, nunca es negativo porque los ingresos siempre son positivos, pero ignora completamente la rentabilidad.', formula: 'SPS × Target P/S', fairValue: null, confidence: 'na', confidenceReason: 'Sin ingresos', configurable: true, inputs: [] };
  }
  const sps = ttm.revenue / shares;
  const fairValue = sps * config.targetPS;
  const currentPS = stock.psRatio ?? 0;
  const conf = currentPS > 0 && currentPS < 20 ? 'high' : currentPS > 0 ? 'medium' : 'low';
  return {
    id: 'ps', name: 'P/S (Precio/Ventas)',
    description: 'Ingresos por acción multiplicado por P/S objetivo',
    explanation: 'Mide cuánto paga el mercado por cada euro de ingresos. Es útil para empresas que aún no generan beneficios (startups, empresas en crecimiento). A diferencia del PER, nunca es negativo porque los ingresos siempre son positivos, pero ignora completamente la rentabilidad.',
    formula: `SPS(${fmtVal(sps, input.currency)}) × Target P/S(${config.targetPS})`,
    fairValue, confidence: conf,
    confidenceReason: currentPS > 0 ? `P/S actual: ${currentPS.toFixed(1)}` : 'Sin P/S disponible',
    configurable: true,
    inputs: [
      { label: 'Ingresos totales', value: fmtB(ttm.revenue, input.currency), rawValue: ttm.revenue },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'SPS', value: fmtVal(sps, input.currency), rawValue: sps },
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
      { label: 'EBITDA', value: fmtB(ebitda, input.currency), rawValue: ebitda },
      { label: 'Múltiplo target', value: `${config.targetMultiple}x`, rawValue: config.targetMultiple },
      { label: 'EV implícito', value: fmtB(ev, input.currency), rawValue: ev },
      { label: 'Deuda neta', value: fmtB(nd, input.currency), rawValue: nd },
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
      { label: 'EBIT', value: fmtB(ebit, input.currency), rawValue: ebit },
      { label: 'Múltiplo target', value: `${config.targetMultiple}x`, rawValue: config.targetMultiple },
      { label: 'EV implícito', value: fmtB(evEbit, input.currency), rawValue: evEbit },
      { label: 'Deuda neta', value: fmtB(ndEbit, input.currency), rawValue: ndEbit },
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
  return {
    id: 'ddm', name: 'DDM (Descuento de Dividendos)',
    description: 'Valor intrínseco por dividendos futuros descontados',
    explanation: 'Basado en la idea de que una acción vale la suma de todos sus dividendos futuros descontados. Funciona exclusivamente para empresas maduras con historial estable de dividendos (utilities, bancos). No es aplicable a empresas que no pagan dividendos o que reinvierten todo el beneficio.',
    formula: `D₁(${fmtVal(d1, input.currency)}) / (${config.requiredReturn}% − ${config.growthRate}%)`,
    fairValue, confidence: conf,
    confidenceReason: divYield > 0 ? `Yield: ${(divYield * 100).toFixed(1)}%` : 'Sin yield disponible',
    configurable: true,
    ...(dataWarning ? { dataWarning } : {}),
    inputs: [
      { label: 'Dividendo total', value: fmtB(Math.abs(divPaid ?? 0), input.currency), rawValue: Math.abs(divPaid ?? 0) },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'Div/acción', value: fmtVal(divPerShare, input.currency), rawValue: divPerShare },
      { label: 'D₁ (próximo año)', value: fmtVal(d1, input.currency), rawValue: d1 },
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
  return {
    id: 'graham', name: 'Número de Graham',
    description: 'Fórmula defensiva de Benjamin Graham',
    explanation: 'Fórmula defensiva creada por Benjamin Graham (mentor de Warren Buffett). Establece un tope máximo razonable para el precio de una acción basándose en su beneficio y patrimonio neto. Si la acción cuesta menos que el Número de Graham, se considera una ganga segura.',
    formula: `√(22.5 × ${fmtVal(eps, input.currency)} × ${fmtVal(bvps, input.currency)})`,
    fairValue, confidence: 'high',
    confidenceReason: `EPS: ${fmtVal(eps, input.currency)}, BVPS: ${fmtVal(bvps, input.currency)}`,
    configurable: false,
    inputs: [
      { label: 'Beneficio neto', value: fmtB(ttm.netIncome, input.currency), rawValue: ttm.netIncome },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'EPS', value: fmtVal(eps, input.currency), rawValue: eps },
      { label: 'Patrimonio', value: fmtB(equity ?? 0, input.currency), rawValue: equity ?? 0 },
      { label: 'BVPS', value: `$${bvps.toFixed(2)}`, rawValue: bvps },
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
  return {
    id: 'fcf_yield', name: 'FCF Yield',
    description: 'Precio implícito dado un rendimiento de FCF objetivo',
    explanation: 'Invierte la lógica: dado un rendimiento objetivo del FCF, ¿cuál debería ser el precio? Si la empresa genera 10 de FCF por acción y quieres un 5% de rendimiento, el precio justo es 200. Es análogo al yield de un bono pero para acciones.',
    formula: `FCF/Share(${fmtVal(fcfPerShare, input.currency)}) ÷ ${config.targetYield}%`,
    fairValue, confidence: conf,
    confidenceReason: currentYield > 0 ? `FCF yield actual: ${(currentYield * 100).toFixed(1)}%` : 'Sin FCF positivo',
    configurable: true,
    negativeInputWarning: fcfYieldWarning,
    ...(dataWarning ? { dataWarning } : {}),
    inputs: [
      { label: 'FCF total', value: fmtB(fcf, input.currency), rawValue: fcf },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
      { label: 'FCF/acción', value: fmtVal(fcfPerShare, input.currency), rawValue: fcfPerShare },
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
  return {
    id: 'netnet', name: 'Net-Net (NCAV)',
    description: 'Net Current Asset Value de Benjamin Graham',
    explanation: 'La fórmula más conservadora de Graham. Calcula el valor de liquidación de los activos corrientes (efectivo, cobros, inventario) menos toda la deuda. Si la acción cuesta menos que esto, estás comprando la empresa por debajo de su valor de liquidación — una oportunidad rara pero real.',
    formula: `(Cash + 0.5×AR + 0.5×Inv − Liabilities) / Shares`,
    fairValue, confidence: conf,
    confidenceReason: `NCAV: ${fmtB(ncav, input.currency)}`,
    configurable: false,
    negativeInputWarning: netnetWarning,
    inputs: [
      { label: 'Cash & equivalents', value: fmtB(bs.cashAndCashEquivalents ?? 0, input.currency), rawValue: bs.cashAndCashEquivalents ?? 0 },
      { label: 'Cuentas por cobrar', value: fmtB(bs.accountsReceivable ?? 0, input.currency), rawValue: bs.accountsReceivable ?? 0 },
      { label: 'AR × 0.5', value: fmtB(0.5 * (bs.accountsReceivable ?? 0), input.currency), rawValue: 0.5 * (bs.accountsReceivable ?? 0) },
      { label: 'Inventarios', value: fmtB(bs.inventory ?? 0, input.currency), rawValue: bs.inventory ?? 0 },
      { label: 'Inv × 0.5', value: fmtB(0.5 * (bs.inventory ?? 0), input.currency), rawValue: 0.5 * (bs.inventory ?? 0) },
      { label: 'Total liabilities', value: fmtB(bs.totalLiabilities ?? 0, input.currency), rawValue: bs.totalLiabilities ?? 0 },
      { label: 'NCAV total', value: fmtB(ncav, input.currency), rawValue: ncav },
      { label: 'Acciones', value: `${(shares / 1e9).toFixed(2)}B`, rawValue: shares },
    ],
  };
}

export function computeAll(input: ValuationInput, configs: {
  dcf: { growthRate: number; discountRate: number; horizonYears: number };
  per: { targetPE: number };
  pb: { targetPB: number };
  ps: { targetPS: number };
  evEbitda: { targetMultiple: number };
  evEbit: { targetMultiple: number };
  ddm: { growthRate: number; requiredReturn: number };
  fcfYield: { targetYield: number };
}, sector?: string | null, industry?: string | null, ccOverride?: { growth?: boolean; discount?: boolean }): ValuationResult[] {
  const currentPrice = input.stock?.currentPrice ?? 0;
  const results = [
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
  ];
  return results.map((r) => applySanityBound(r, currentPrice));
}

const CONFIDENCE_WEIGHT: Record<string, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
  na: 0,
};

export function weightedAverage(results: ValuationResult[]): number | null {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const r of results) {
    if (r.fairValue != null && r.fairValue > 0) {
      const w = CONFIDENCE_WEIGHT[r.confidence] ?? 0;
      weightedSum += r.fairValue * w;
      totalWeight += w;
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
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

export const DEFAULT_CONFIGS = {
  dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 },
  per: { targetPE: 20 },
  pb: { targetPB: 3 },
  ps: { targetPS: 5 },
  evEbitda: { targetMultiple: 15 },
  evEbit: { targetMultiple: 18 },
  ddm: { growthRate: 3, requiredReturn: 10 },
  fcfYield: { targetYield: 5 },
};

// Sector-aware default configs: key is sector name (case-insensitive partial match)
const AIRLINE_CONFIGS: typeof DEFAULT_CONFIGS = {
  dcf: { growthRate: 3, discountRate: 12, horizonYears: 10 },
  per: { targetPE: 10 },
  pb: { targetPB: 1.5 },
  ps: { targetPS: 0.5 },
  evEbitda: { targetMultiple: 6 },
  evEbit: { targetMultiple: 8 },
  ddm: { growthRate: 0, requiredReturn: 12 },
  fcfYield: { targetYield: 8 },
};

const SECTOR_CONFIGS: Record<string, typeof DEFAULT_CONFIGS> = {
  airlines: AIRLINE_CONFIGS,
  'air transport': AIRLINE_CONFIGS,
  airline: AIRLINE_CONFIGS,
  'passenger airlines': AIRLINE_CONFIGS,
  banking: {
    dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 12 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 10 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 3, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
  'financial services': {
    dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 12 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 10 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 3, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
  insurance: {
    dcf: { growthRate: 3, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 12 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 10 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 3, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
  technology: {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 8 },
    ps: { targetPS: 8 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'consumer electronics': {
    dcf: { growthRate: 6, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 8 },
    ps: { targetPS: 8 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 4, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  semiconductors: {
    dcf: { growthRate: 10, discountRate: 11, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 10 },
    ps: { targetPS: 12 },
    evEbitda: { targetMultiple: 22 },
    evEbit: { targetMultiple: 28 },
    ddm: { growthRate: 5, requiredReturn: 11 },
    fcfYield: { targetYield: 3 },
  },
  'internet content': {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 6 },
    ps: { targetPS: 7 },
    evEbitda: { targetMultiple: 18 },
    evEbit: { targetMultiple: 22 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  utilities: {
    dcf: { growthRate: 2, discountRate: 8, horizonYears: 10 },
    per: { targetPE: 16 },
    pb: { targetPB: 2 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 9 },
    evEbit: { targetMultiple: 11 },
    ddm: { growthRate: 3, requiredReturn: 8 },
    fcfYield: { targetYield: 5 },
  },
  'drug manufacturers': {
    dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 18 },
    pb: { targetPB: 4 },
    ps: { targetPS: 5 },
    evEbitda: { targetMultiple: 14 },
    evEbit: { targetMultiple: 18 },
    ddm: { growthRate: 4, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  energy: {
    dcf: { growthRate: 2, discountRate: 12, horizonYears: 10 },
    per: { targetPE: 10 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 1.5 },
    evEbitda: { targetMultiple: 6 },
    evEbit: { targetMultiple: 8 },
    ddm: { growthRate: 3, requiredReturn: 12 },
    fcfYield: { targetYield: 8 },
  },
  reit: {
    dcf: { growthRate: 3, discountRate: 8, horizonYears: 10 },
    per: { targetPE: 20 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 5 },
    evEbitda: { targetMultiple: 14 },
    evEbit: { targetMultiple: 16 },
    ddm: { growthRate: 3, requiredReturn: 8 },
    fcfYield: { targetYield: 5 },
  },
  'auto - manufacturers': {
    dcf: { growthRate: 5, discountRate: 11, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 3 },
    ps: { targetPS: 1.5 },
    evEbitda: { targetMultiple: 8 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 2, requiredReturn: 11 },
    fcfYield: { targetYield: 6 },
  },
  'auto manufacturers': {
    dcf: { growthRate: 5, discountRate: 11, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 3 },
    ps: { targetPS: 1.5 },
    evEbitda: { targetMultiple: 8 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 2, requiredReturn: 11 },
    fcfYield: { targetYield: 6 },
  },
  'drug manufacturers - general': {
    dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 18 },
    pb: { targetPB: 4 },
    ps: { targetPS: 5 },
    evEbitda: { targetMultiple: 14 },
    evEbit: { targetMultiple: 18 },
    ddm: { growthRate: 4, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'internet - content': {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 6 },
    ps: { targetPS: 7 },
    evEbitda: { targetMultiple: 18 },
    evEbit: { targetMultiple: 22 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'internet content & information': {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 6 },
    ps: { targetPS: 7 },
    evEbitda: { targetMultiple: 18 },
    evEbit: { targetMultiple: 22 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'internet retail': {
    dcf: { growthRate: 10, discountRate: 11, horizonYears: 10 },
    per: { targetPE: 30 },
    pb: { targetPB: 10 },
    ps: { targetPS: 3 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 0, requiredReturn: 11 },
    fcfYield: { targetYield: 3 },
  },
  'specialty retail': {
    dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 3 },
    ps: { targetPS: 1 },
    evEbitda: { targetMultiple: 10 },
    evEbit: { targetMultiple: 12 },
    ddm: { growthRate: 3, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
  'software - infrastructure': {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 8 },
    ps: { targetPS: 8 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  'software - application': {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 8 },
    ps: { targetPS: 8 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  software: {
    dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 25 },
    pb: { targetPB: 8 },
    ps: { targetPS: 8 },
    evEbitda: { targetMultiple: 20 },
    evEbit: { targetMultiple: 25 },
    ddm: { growthRate: 5, requiredReturn: 10 },
    fcfYield: { targetYield: 4 },
  },
  telecom: {
    dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 2 },
    evEbitda: { targetMultiple: 7 },
    evEbit: { targetMultiple: 9 },
    ddm: { growthRate: 3, requiredReturn: 9 },
    fcfYield: { targetYield: 6 },
  },
  'communication services': {
    dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 2 },
    evEbitda: { targetMultiple: 7 },
    evEbit: { targetMultiple: 9 },
    ddm: { growthRate: 3, requiredReturn: 9 },
    fcfYield: { targetYield: 6 },
  },
  'telecom services': {
    dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 },
    per: { targetPE: 15 },
    pb: { targetPB: 1.5 },
    ps: { targetPS: 2 },
    evEbitda: { targetMultiple: 7 },
    evEbit: { targetMultiple: 9 },
    ddm: { growthRate: 3, requiredReturn: 9 },
    fcfYield: { targetYield: 6 },
  },
  'consumer defensive': {
    dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 18 },
    pb: { targetPB: 3 },
    ps: { targetPS: 1.5 },
    evEbitda: { targetMultiple: 12 },
    evEbit: { targetMultiple: 15 },
    ddm: { growthRate: 4, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
  'grocery stores': {
    dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 },
    per: { targetPE: 18 },
    pb: { targetPB: 3 },
    ps: { targetPS: 1.5 },
    evEbitda: { targetMultiple: 12 },
    evEbit: { targetMultiple: 15 },
    ddm: { growthRate: 4, requiredReturn: 10 },
    fcfYield: { targetYield: 5 },
  },
};

export function getSectorConfigs(sector: string | null | undefined, industry?: string | null): typeof DEFAULT_CONFIGS {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  // Check industry first (more specific), then sector
  for (const [key, config] of Object.entries(SECTOR_CONFIGS)) {
    if (text.includes(key)) return config;
  }
  return DEFAULT_CONFIGS;
}

export const SECTOR_RECOMMENDED_MODEL: Record<string, string> = {
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
  telecoms: 'ev_ebitda',
  software: 'dcf',
  'consumer defensive': 'per',
  default: 'dcf',
};

export function getRecommendedModel(sector: string | null | undefined, industry?: string | null): string {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  for (const [key, modelId] of Object.entries(SECTOR_RECOMMENDED_MODEL)) {
    if (key !== 'default' && text.includes(key)) return modelId;
  }
  return SECTOR_RECOMMENDED_MODEL.default;
}

const RECOMMENDED_FALLBACK = ['ev_ebitda', 'per', 'pb', 'fcf_yield', 'ddm'];

export function getRecommendedFairValue(results: ValuationResult[], sector: string | null | undefined, industry?: string | null): { model: string; fairValue: number | null } {
  const model = getRecommendedModel(sector, industry);
  const fv = results.find((r) => r.id === model)?.fairValue ?? null;
  if (fv != null) return { model, fairValue: fv };
  for (const alt of RECOMMENDED_FALLBACK) {
    if (alt === model) continue;
    const altFv = results.find((r) => r.id === alt)?.fairValue ?? null;
    if (altFv != null) return { model: alt, fairValue: altFv };
  }
  return { model, fairValue: null };
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
  role?: CommodityRole;
}

const COMMODITY_MAP: CommodityMapping[] = [
  { companyTicker: 'BAS.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.6, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'LIN.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.3, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: '1COV.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.6, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SZU.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'BNR.DE', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.3, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'KCO.DE', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'TKA.DE', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SDF.DE', commoditySymbol: 'HG=F', commodityName: 'Potasa', elasticity: 0.7, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SGO.PA', commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'CRDA.L', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'GLEN.L', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.65, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'RIO.L', commoditySymbol: 'HRC=F', commodityName: 'Mineral de hierro', elasticity: 0.7, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'ACX.MC', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.75, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'MTS.MC', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'STEEL.AS', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'AKZA.AS', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'DSM.AS', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.3, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'BZU.MI', commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SIKA.SW', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'CLN.SW', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'GIVN.SW', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.3, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SOL.BR', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'UMP.BR', commoditySymbol: 'SI=F', commodityName: 'Plata', elasticity: 0.6, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'VOE.VI', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'WIE.VI', commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'BOL.ST', commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.7, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SSAB-A.ST', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SSAB.HE', commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'YAR.OL', commoditySymbol: 'HG=F', commodityName: 'Fertilizantes', elasticity: 0.7, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'UPM.HE', commoditySymbol: 'LBS=F', commodityName: 'Madera', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'CRH.IR', commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
  { companyTicker: 'SMDS.IR', commoditySymbol: 'LBS=F', commodityName: 'Pulpa', elasticity: 0.5, defaultOptimisticPct: 20, defaultPessimisticPct: 20 },
];

interface CommodityByIndustryRule {
  match: RegExp;
  commoditySymbol: string;
  commodityName: string;
  elasticity: number;
  pctMP: number;
}

const COMMODITY_BY_INDUSTRY: CommodityByIndustryRule[] = [
  { match: /steel|iron|ferro/i, commoditySymbol: 'HRC=F', commodityName: 'Acero', elasticity: 0.8, pctMP: 0.7 },
  { match: /copper|red metal/i, commoditySymbol: 'HG=F', commodityName: 'Cobre', elasticity: 0.6, pctMP: 0.6 },
  { match: /alumin/i, commoditySymbol: 'ALI=F', commodityName: 'Aluminio', elasticity: 0.6, pctMP: 0.6 },
  { match: /gold|precious/i, commoditySymbol: 'GC=F', commodityName: 'Oro', elasticity: 0.7, pctMP: 0.6 },
  { match: /silver/i, commoditySymbol: 'SI=F', commodityName: 'Plata', elasticity: 0.6, pctMP: 0.6 },
  { match: /paper|pulp|forest|lumber|packaging/i, commoditySymbol: 'LBS=F', commodityName: 'Pulpa/Madera', elasticity: 0.5, pctMP: 0.5 },
  { match: /oil ?[&and] ?gas|petroleum|energy/i, commoditySymbol: 'CL=F', commodityName: 'Energía', elasticity: 0.4, pctMP: 0.5 },
];

const DEFAULT_PCT_MP_BY_SYMBOL: Record<string, number> = {
  'HRC=F': 0.7,
  'HG=F': 0.6,
  'ALI=F': 0.6,
  'GC=F': 0.6,
  'SI=F': 0.6,
  'LBS=F': 0.5,
  'CL=F': 0.5,
};

export function getCommodityMapping(ticker: string, industry?: string | null, sector?: string | null): CommodityMapping | null {
  const normalized = ticker.toUpperCase();
  const explicit = COMMODITY_MAP.find((m) => m.companyTicker.toUpperCase() === normalized);
  if (explicit) {
    return {
      ...explicit,
      pctMP: explicit.pctMP ?? DEFAULT_PCT_MP_BY_SYMBOL[explicit.commoditySymbol] ?? 0.5,
      taxRate: explicit.taxRate ?? 0.25,
    };
  }
  if (sector && sector.toLowerCase() !== 'basic materials') return null;
  if (!industry) return null;
  const rule = COMMODITY_BY_INDUSTRY.find((r) => r.match.test(industry));
  if (!rule) return null;
  return {
    companyTicker: normalized,
    commoditySymbol: rule.commoditySymbol,
    commodityName: rule.commodityName,
    elasticity: rule.elasticity,
    defaultOptimisticPct: 20,
    defaultPessimisticPct: 20,
    pctMP: rule.pctMP,
    taxRate: 0.25,
  };
}
