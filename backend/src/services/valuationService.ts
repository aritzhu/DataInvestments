import type { FinancialData, BalanceSheet, StockMetric } from '@prisma/client';

type Financial = FinancialData;
type Balance = BalanceSheet;
type Stock = StockMetric;

interface ValuationResult {
  id: string;
  name: string;
  fairValue: number | null;
  confidence: 'high' | 'medium' | 'low' | 'na';
  confidenceReason?: string;
  dataWarning?: string;
}

interface ValuationInput {
  financials: Financial[];
  balanceSheets: Balance[];
  stock: Stock;
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
  balanceSheet: Balance | undefined;
  isTTM: boolean;
  // Fields rebuilt from the latest annual figure because the quarterly rows
  // were missing values (partial quarters). `['*']` when the whole TTM is the
  // annual fallback. Used to keep confidence honest.
  annualFields: string[];
}

function sumField<T>(items: T[], field: keyof T): number {
  return items.reduce((acc, item) => acc + ((item[field] as number) ?? 0), 0);
}

function sumFieldNull<T>(items: T[], field: keyof T): number | null {
  const total = items.reduce((acc, item) => acc + ((item[field] as number) ?? 0), 0);
  return items.some((item) => item[field] != null) ? total : null;
}

// Latest annual (quarter=0) row. Yahoo's quarterly timeseries often leaves
// cashflow/EBITDA inputs null for European tickers even though the annual rows
// carry real values, so we fill those from the annual figures below.
function latestAnnual<T extends { year: number; quarter?: number | null }>(arr: T[]): T | undefined {
  return [...arr.filter((x) => (x.quarter ?? 0) === 0)].sort((a, b) => b.year - a.year)[0];
}

// Sums `field` across the last-4 quarterly rows only when all 4 carry a value;
// if any quarter is missing the field, the partial sum would understate the
// period, so we fall back to the latest annual figure instead.
function ttmSumOrAnnual<T extends { year: number; quarter?: number | null }>(last4: T[], annual: T | undefined, field: keyof T): number | null {
  const present = last4.filter((x) => (x[field] as number | null) != null);
  if (present.length === 4) {
    return present.reduce((acc, x) => acc + ((x[field] as number) ?? 0), 0);
  }
  return (annual?.[field] as number | null | undefined) ?? null;
}

function annualFallback(financials: Financial[], balanceSheets: Balance[]): TTMData | null {
  const f = latestAnnual(financials) ?? latest(financials);
  const bs = latest(balanceSheets);
  if (!f) return null;
  return {
    revenue: f.revenue ?? 0,
    netIncome: f.netIncome ?? 0,
    ebitda: f.ebitda,
    ebit: f.ebit,
    operatingCashFlow: f.operatingCashFlow,
    freeCashFlow: f.freeCashFlow,
    capex: f.capex ?? 0,
    depreciation: f.depreciation ?? 0,
    sgaExpense: f.sgaExpense ?? 0,
    interestExpense: f.interestExpense ?? 0,
    taxExpense: f.taxExpense ?? 0,
    costOfRevenue: f.costOfRevenue ?? 0,
    grossProfit: f.grossProfit ?? 0,
    operatingExpenses: f.operatingExpenses ?? 0,
    rdExpense: f.rdExpense ?? 0,
    dividendsPaid: f.dividendsPaid,
    shareRepurchases: f.shareRepurchases,
    balanceSheet: bs,
    isTTM: false,
    annualFields: ['*'],
  };
}

function trailing12Months(financials: Financial[], balanceSheets: Balance[]): TTMData | null {
  const quarterly = financials.filter((f) => f.quarter != null && f.quarter > 0);

  // Fallback to annual if no quarterly data
  if (quarterly.length < 4) {
    return annualFallback(financials, balanceSheets);
  }

  // Only trust the TTM when the 4 most recent quarters are consecutive and
  // carry real revenue. Missing quarters or zero-filled rows (e.g. quarterly
  // windows that are sparse for European tickers) otherwise inflate/deflate
  // the trailing sums, so fall back to the latest annual figures.
  const byKey = new Map<string, Financial>();
  for (const f of quarterly) byKey.set(`${f.year}-${f.quarter}`, f);

  const sorted = [...quarterly].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.quarter ?? 0) - (a.quarter ?? 0);
  });
  const latestQ = sorted[0];

  let year = latestQ.year;
  let quarter = latestQ.quarter ?? 4;
  const last4: Financial[] = [];
  for (let i = 0; i < 4; i++) {
    const rec = byKey.get(`${year}-${quarter}`);
    if (!rec || !rec.revenue) {
      return annualFallback(financials, balanceSheets);
    }
    last4.push(rec);
    quarter -= 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }
  }

  // Use latest balance sheet (point-in-time snapshot)
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

export function isFinancial(sector?: string | null, industry?: string | null): boolean {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  if (text.includes('financial data') || text.includes('exchanges')) return false;
  return /bank|financ|insur|seguro|banco|assuranc|reinsur|credit/.test(text);
}

function netDebt(bs: Balance | undefined): { value: number; fallback: boolean } {
  if (!bs) return { value: 0, fallback: false };
  const hasStd = bs.shortTermDebt != null;
  const hasLtd = bs.longTermDebt != null;
  if (!hasStd && !hasLtd) {
    const tncl = bs.totalNonCurrentLiabilities ?? null;
    const cash = bs.cashAndCashEquivalents ?? 0;
    if (tncl != null) return { value: tncl - cash, fallback: true };
    return { value: 0 - cash, fallback: false };
  }
  return { value: (bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0) - (bs.cashAndCashEquivalents ?? 0), fallback: false };
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

const SANITY_MULTIPLE = 6;
function applySanityBound(result: ValuationResult, currentPrice: number): ValuationResult {
  if (result.fairValue == null || currentPrice <= 0) return result;
  if (result.fairValue > SANITY_MULTIPLE * currentPrice || result.fairValue < 0) {
    return { ...result, confidence: 'na' as const };
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
const DEBT_FALLBACK_WARNING = 'Balance incompleto: la deuda se estimó como pasivos no corrientes menos tesorería (no hay desglose de deuda).';

const CC_RF = 3; // tasa libre de riesgo %
const CC_MARKET_PREMIUM = 5; // prima de mercado %
const CC_KD_FALLBACK = 5; // % cuando no hay deuda o interés real
const CC_TAX_FALLBACK = 25; // %
const CC_GROWTH_WEIGHTS = { cagr5: 0.5, cagr10: 0.3, recent: 0.2 };

function isConsumerCyclical(sector: string | null | undefined, industry?: string | null): boolean {
  const s = (sector || '').toLowerCase();
  return s === 'consumer cyclical' || s === 'consumer discretionary';
}

interface BackendGrowthResult {
  growthRate: number | null;
  details: { cagr5: number | null; cagr10: number | null; recent: number | null };
}
function computeWeightedGrowth(financials: Financial[]): BackendGrowthResult {
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

  const atYear = (yearsBack: number): number | null => {
    const target = last.year - yearsBack;
    const row = annual.find((x) => x.year === target);
    return row ? row.revenue! : null;
  };
  const cagr = (startRev: number | null, yearsBack: number): number | null => {
    if (startRev == null || startRev <= 0 || yearsBack <= 0) return null;
    return Math.pow(lastRev / startRev, 1 / yearsBack) - 1;
  };
  details.cagr5 = cagr(atYear(5), 5);
  details.cagr10 = cagr(atYear(10), 10);

  const parts: Array<{ value: number; weight: number }> = [];
  if (details.cagr5 != null) parts.push({ value: details.cagr5, weight: CC_GROWTH_WEIGHTS.cagr5 });
  if (details.cagr10 != null) parts.push({ value: details.cagr10, weight: CC_GROWTH_WEIGHTS.cagr10 });
  if (details.recent != null) parts.push({ value: details.recent, weight: CC_GROWTH_WEIGHTS.recent });
  if (parts.length === 0) return { growthRate: null, details };

  const wSum = parts.reduce((a, p) => a + p.weight, 0);
  const growthRate = parts.reduce((a, p) => a + p.value * p.weight, 0) / wSum;
  return { growthRate, details };
}

interface BackendDCFRates {
  g: number; // decimal
  r: number; // decimal
  growthDetails: BackendGrowthResult['details'];
  growthApplied: boolean;
}
function consumerCyclicalRates(input: ValuationInput, config: { growthRate: number; discountRate: number }, sector: string | null | undefined, industry?: string | null): BackendDCFRates {
  if (!isConsumerCyclical(sector, industry)) {
    return { g: config.growthRate / 100, r: config.discountRate / 100, growthDetails: { cagr5: null, cagr10: null, recent: null }, growthApplied: false };
  }

  const growth = computeWeightedGrowth(input.financials);
  const growthApplied = growth.growthRate != null;
  const g = growthApplied ? growth.growthRate! : config.growthRate / 100;

  const bs = latest(input.balanceSheets);
  const beta = input.stock?.beta != null ? input.stock.beta : null;
  const equity = bs?.totalStockholdersEquity != null && bs.totalStockholdersEquity > 0 ? bs.totalStockholdersEquity : null;
  const debtRaw = (bs != null ? (bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0) : 0);
  const debt = debtRaw > 0 ? debtRaw : null;
  const lastFin = latest(input.financials);
  const interest = lastFin?.interestExpense != null ? Math.abs(lastFin.interestExpense) : null;
  const taxExpense = lastFin?.taxExpense != null ? Math.abs(lastFin.taxExpense) : null;
  const netIncome = lastFin?.netIncome != null ? Math.abs(lastFin.netIncome) : null;
  const pretax = taxExpense != null && netIncome != null ? taxExpense + netIncome : null;

  let r = config.discountRate / 100;
  if (beta != null && equity != null && debt != null) {
    const Ke = CC_RF + beta * CC_MARKET_PREMIUM; // %
    const Kd = interest != null && interest > 0 ? (interest / debt) * 100 : CC_KD_FALLBACK; // %
    const tax = pretax != null && pretax > 0 && taxExpense != null ? taxExpense / pretax : CC_TAX_FALLBACK / 100; // decimal
    const total = equity + debt;
    const waccPct = Ke * (equity / total) + Kd * (1 - tax) * (debt / total);
    if (isFinite(waccPct) && waccPct > 0) r = waccPct / 100;
  }

  return { g, r, growthDetails: growth.details, growthApplied };
}

function computeDCF(input: ValuationInput, config: { growthRate: number; discountRate: number; horizonYears: number }, sector?: string | null, industry?: string | null): ValuationResult {
  const f = latest(input.financials);
  const shares = sharesOf(input.stock);
  if (!f || shares <= 0) return { id: 'dcf', name: 'DCF', fairValue: null, confidence: 'na' };

  const quarterly = input.financials.some((x) => x.quarter != null && x.quarter > 0);
  const annualFCFs = input.financials
    .filter((x) => x.quarter == null || x.quarter === 0)
    .map((x) => x.freeCashFlow ?? (x.operatingCashFlow != null && x.capex != null ? x.operatingCashFlow - x.capex : null))
    .filter((v): v is number => v != null && v !== 0)
    .filter((v) => v > 0);
  const avgAnnualFCF = annualFCFs.length > 0 ? annualFCFs.reduce((a, b) => a + b, 0) / annualFCFs.length : 0;
  let fcf: number;
  let fcfValues: number[] = [];
  let ttmAnnualFields: string[] | undefined;
  if (quarterly) {
    const ttm = trailing12Months(input.financials, input.balanceSheets);
    ttmAnnualFields = ttm?.annualFields;
    const ttmFCF = ttm?.freeCashFlow ?? ttm?.operatingCashFlow;
    if (ttmFCF != null && ttmFCF > 0) {
      fcf = ttmFCF;
    } else if (avgAnnualFCF > 0) {
      fcf = avgAnnualFCF;
    } else {
      return { id: 'dcf', name: 'DCF', fairValue: null, confidence: 'na' };
    }
  } else {
    fcfValues = input.financials
      .map((x) => x.freeCashFlow ?? (x.operatingCashFlow != null && x.capex != null ? x.operatingCashFlow - x.capex : null))
      .filter((v): v is number => v != null && v !== 0);
    if (fcfValues.length === 0) return { id: 'dcf', name: 'DCF', fairValue: null, confidence: 'na' };
    if (avgAnnualFCF > 0) {
      fcf = avgAnnualFCF;
    } else {
      fcf = fcfValues.reduce((a, b) => a + b, 0) / fcfValues.length;
    }
  }
  if (fcf <= 0) return { id: 'dcf', name: 'DCF', fairValue: null, confidence: 'na' };

  const cc = consumerCyclicalRates(input, { growthRate: config.growthRate, discountRate: config.discountRate }, sector, industry);
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

  const baseConf: ValuationResult['confidence'] = quarterly ? 'medium' : (fcfValues.length >= 3 ? (consistency(fcfValues) > 0.6 ? 'high' : 'medium') : 'low');
  const conf = capConfidence(baseConf, ttmAnnualFields, ['freeCashFlow', 'operatingCashFlow']);
  const dataWarning = ttmAnnualFields && ttmAnnualFields.some((f) => f === 'freeCashFlow' || f === 'operatingCashFlow') ? PARTIAL_DATA_WARNING : undefined;
  return { id: 'dcf', name: 'DCF', fairValue, confidence: conf, ...(dataWarning ? { dataWarning } : {}) };
}

function computePER(input: ValuationInput, config: { targetPE: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const shares = sharesOf(input.stock);
  if (!ttm || shares <= 0 || ttm.netIncome <= 0) return { id: 'per', name: 'PER', fairValue: null, confidence: 'na' };
  const eps = ttm.netIncome / shares;
  const fairValue = eps * config.targetPE;
  const currentPE = input.stock.peRatio ?? 0;
  const conf = currentPE > 0 && currentPE < 50 ? 'high' : currentPE > 0 ? 'medium' : 'low';
  return { id: 'per', name: 'PER', fairValue, confidence: conf };
}

function computePB(input: ValuationInput, config: { targetPB: number }): ValuationResult {
  const bs = latest(input.balanceSheets);
  const shares = sharesOf(input.stock);
  const equity = bs?.totalStockholdersEquity;
  if (shares <= 0 || !equity || equity <= 0) return { id: 'pb', name: 'P/B', fairValue: null, confidence: 'na' };
  const bvps = equity / shares;
  const fairValue = bvps * config.targetPB;
  const currentPB = input.stock.pbRatio ?? 0;
  const conf = currentPB > 0 && currentPB < 10 ? 'high' : currentPB > 0 ? 'medium' : 'low';
  return { id: 'pb', name: 'P/B', fairValue, confidence: conf };
}

function computePS(input: ValuationInput, config: { targetPS: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const shares = sharesOf(input.stock);
  if (!ttm || shares <= 0 || ttm.revenue <= 0) return { id: 'ps', name: 'P/S', fairValue: null, confidence: 'na' };
  const sps = ttm.revenue / shares;
  const fairValue = sps * config.targetPS;
  const currentPS = input.stock.psRatio ?? 0;
  const conf = currentPS > 0 && currentPS < 20 ? 'high' : currentPS > 0 ? 'medium' : 'low';
  return { id: 'ps', name: 'P/S', fairValue, confidence: conf };
}

function computeEVEBITDA(input: ValuationInput, config: { targetMultiple: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  const shares = sharesOf(input.stock);
  if (!ttm || shares <= 0 || !ttm.ebitda || ttm.ebitda <= 0) return { id: 'ev_ebitda', name: 'EV/EBITDA', fairValue: null, confidence: 'na' };
  if (input.stock.enterpriseValue != null && input.stock.enterpriseValue < 0) {
    return { id: 'ev_ebitda', name: 'EV/EBITDA', fairValue: null, confidence: 'na', confidenceReason: 'EV negativo: no aplica a empresas con tesorería neta (banca/financieras)' };
  }
  const ev = ttm.ebitda * config.targetMultiple;
  const nd = netDebt(bs);
  const fairValue = (ev - nd.value) / shares;
  const currentMult = input.stock.enterpriseValue && ttm.ebitda ? input.stock.enterpriseValue / ttm.ebitda : 0;
  const baseConf: ValuationResult['confidence'] = currentMult > 0 && currentMult < 40 ? 'high' : currentMult > 0 ? 'medium' : 'low';
  let conf = capConfidence(baseConf, ttm.annualFields, ['ebitda']);
  if (nd.fallback && conf !== 'na') conf = 'low';
  const dataWarning = nd.fallback
    ? DEBT_FALLBACK_WARNING
    : ttm.annualFields.includes('ebitda')
      ? PARTIAL_DATA_WARNING
      : undefined;
  return { id: 'ev_ebitda', name: 'EV/EBITDA', fairValue, confidence: conf, ...(dataWarning ? { dataWarning } : {}) };
}

function computeEVEBIT(input: ValuationInput, config: { targetMultiple: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  const shares = sharesOf(input.stock);
  const ebit = ttm?.ebit ?? (ttm ? (ttm.grossProfit - ttm.operatingExpenses) : null) ?? latest(input.financials)?.ebit ?? null;
  if (!ttm || shares <= 0 || ebit == null || ebit <= 0) return { id: 'ev_ebit', name: 'EV/EBIT', fairValue: null, confidence: 'na', ...(ebit != null && ebit < 0 ? { confidenceReason: 'EBIT no positivo (pérdidas): el múltiplo EV/EBIT no es representativo' } : {}) };
  if (input.stock.enterpriseValue != null && input.stock.enterpriseValue < 0) {
    return { id: 'ev_ebit', name: 'EV/EBIT', fairValue: null, confidence: 'na', confidenceReason: 'EV negativo: no aplica a empresas con tesorería neta (banca/financieras)' };
  }
  const evEbit = ebit * config.targetMultiple;
  const ndEbit = netDebt(bs);
  const fairValue = (evEbit - ndEbit.value) / shares;
  const currentMultEbit = input.stock.enterpriseValue && ebit ? input.stock.enterpriseValue / ebit : 0;
  const baseConf: ValuationResult['confidence'] = currentMultEbit > 0 && currentMultEbit < 50 ? 'high' : currentMultEbit > 0 ? 'medium' : 'low';
  let conf = capConfidence(baseConf, ttm.annualFields, ['ebit']);
  if (ndEbit.fallback && conf !== 'na') conf = 'low';
  const dataWarning = ndEbit.fallback
    ? DEBT_FALLBACK_WARNING
    : ttm.annualFields.includes('ebit')
      ? PARTIAL_DATA_WARNING
      : undefined;
  return { id: 'ev_ebit', name: 'EV/EBIT', fairValue, confidence: conf, ...(dataWarning ? { dataWarning } : {}) };
}

function computeDDM(input: ValuationInput, config: { growthRate: number; requiredReturn: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const f = latest(input.financials);
  const shares = sharesOf(input.stock);
  const divPaid = ttm?.dividendsPaid ?? f?.dividendsPaid ?? null;
  const divPerShare = ttm && shares > 0 && divPaid ? Math.abs(divPaid) / shares : 0;
  if (shares <= 0 || divPerShare <= 0) return { id: 'ddm', name: 'DDM', fairValue: null, confidence: 'na' };
  const d1 = divPerShare * (1 + config.growthRate / 100);
  const r = config.requiredReturn / 100;
  const g = config.growthRate / 100;
  const fairValue = r > g ? d1 / (r - g) : null;
  const divYield = input.stock.dividendYield ?? 0;
  const baseConf: ValuationResult['confidence'] = divYield > 0.02 && fairValue !== null ? 'high' : divYield > 0 ? 'medium' : 'low';
  const conf = capConfidence(baseConf, ttm?.annualFields, ['dividendsPaid']);
  const dataWarning = ttm?.annualFields.includes('dividendsPaid') ? PARTIAL_DATA_WARNING : undefined;
  return { id: 'ddm', name: 'DDM', fairValue, confidence: conf, ...(dataWarning ? { dataWarning } : {}) };
}

function computeGrahamNumber(input: ValuationInput): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const f = latest(input.financials);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  const shares = sharesOf(input.stock);
  if (!ttm || shares <= 0) return { id: 'graham', name: 'Graham', fairValue: null, confidence: 'na' };
  const eps = ttm.netIncome / shares;
  const equity = bs?.totalStockholdersEquity ?? f?.totalEquity;
  const bvps = equity ? equity / shares : 0;
  if (eps <= 0 || bvps <= 0) return { id: 'graham', name: 'Graham', fairValue: null, confidence: 'na' };
  const fairValue = Math.sqrt(22.5 * eps * bvps);
  return { id: 'graham', name: 'Graham', fairValue, confidence: 'high' };
}

function computeFCFYield(input: ValuationInput, config: { targetYield: number }): ValuationResult {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const shares = sharesOf(input.stock);
  if (!ttm || shares <= 0) return { id: 'fcf_yield', name: 'FCF Yield', fairValue: null, confidence: 'na' };
  const fcf = ttm.freeCashFlow ?? (ttm.operatingCashFlow != null ? ttm.operatingCashFlow - ttm.capex : null);
  if (fcf == null) return { id: 'fcf_yield', name: 'FCF Yield', fairValue: null, confidence: 'na' };
  const fcfPerShare = fcf / shares;
  const fairValue = config.targetYield > 0 ? fcfPerShare / (config.targetYield / 100) : null;
  const currentYield = input.stock.currentPrice > 0 ? fcfPerShare / input.stock.currentPrice : 0;
  const baseConf: ValuationResult['confidence'] = currentYield > 0.05 ? 'high' : currentYield > 0.02 ? 'medium' : currentYield > 0 ? 'low' : 'na';
  const conf = capConfidence(baseConf, ttm?.annualFields, ['freeCashFlow', 'operatingCashFlow']);
  const dataWarning = ttm?.annualFields.some((f) => f === 'freeCashFlow' || f === 'operatingCashFlow') ? PARTIAL_DATA_WARNING : undefined;
  return { id: 'fcf_yield', name: 'FCF Yield', fairValue, confidence: conf, ...(dataWarning ? { dataWarning } : {}) };
}

function computeNetNet(input: ValuationInput): ValuationResult {
  const bs = latest(input.balanceSheets);
  const shares = sharesOf(input.stock);
  if (!bs || shares <= 0) return { id: 'netnet', name: 'Net-Net', fairValue: null, confidence: 'na' };
  const ncav = (bs.cashAndCashEquivalents ?? 0) + 0.5 * (bs.accountsReceivable ?? 0) + 0.5 * (bs.inventory ?? 0) - (bs.totalLiabilities ?? 0);
  const fairValue = ncav / shares;
  const conf = fairValue > input.stock.currentPrice ? 'high' : fairValue > 0 ? 'medium' : 'low';
  return { id: 'netnet', name: 'Net-Net', fairValue, confidence: conf };
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
  'consumer electronics': { dcf: { growthRate: 6, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  semiconductors: { dcf: { growthRate: 10, discountRate: 11, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 10 }, ps: { targetPS: 12 }, evEbitda: { targetMultiple: 22 }, evEbit: { targetMultiple: 28 }, ddm: { growthRate: 5, requiredReturn: 11 }, fcfYield: { targetYield: 3 } },
  'internet content': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 6 }, ps: { targetPS: 7 }, evEbitda: { targetMultiple: 18 }, evEbit: { targetMultiple: 22 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  utilities: { dcf: { growthRate: 2, discountRate: 8, horizonYears: 10 }, per: { targetPE: 16 }, pb: { targetPB: 2 }, ps: { targetPS: 3 }, evEbitda: { targetMultiple: 9 }, evEbit: { targetMultiple: 11 }, ddm: { growthRate: 3, requiredReturn: 8 }, fcfYield: { targetYield: 5 } },
  'drug manufacturers': { dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 }, per: { targetPE: 18 }, pb: { targetPB: 4 }, ps: { targetPS: 5 }, evEbitda: { targetMultiple: 14 }, evEbit: { targetMultiple: 18 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  energy: { dcf: { growthRate: 2, discountRate: 12, horizonYears: 10 }, per: { targetPE: 10 }, pb: { targetPB: 1.5 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 6 }, evEbit: { targetMultiple: 8 }, ddm: { growthRate: 3, requiredReturn: 12 }, fcfYield: { targetYield: 8 } },
  reit: { dcf: { growthRate: 3, discountRate: 8, horizonYears: 10 }, per: { targetPE: 20 }, pb: { targetPB: 1.5 }, ps: { targetPS: 5 }, evEbitda: { targetMultiple: 14 }, evEbit: { targetMultiple: 16 }, ddm: { growthRate: 3, requiredReturn: 8 }, fcfYield: { targetYield: 8 } },
  'auto - manufacturers': { dcf: { growthRate: 5, discountRate: 11, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 3 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 6 }, evEbit: { targetMultiple: 9 }, ddm: { growthRate: 2, requiredReturn: 11 }, fcfYield: { targetYield: 6 } },
  'auto manufacturers': { dcf: { growthRate: 5, discountRate: 11, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 3 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 6 }, evEbit: { targetMultiple: 9 }, ddm: { growthRate: 2, requiredReturn: 11 }, fcfYield: { targetYield: 6 } },
  'drug manufacturers - general': { dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 }, per: { targetPE: 18 }, pb: { targetPB: 4 }, ps: { targetPS: 5 }, evEbitda: { targetMultiple: 14 }, evEbit: { targetMultiple: 18 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'internet - content': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 6 }, ps: { targetPS: 7 }, evEbitda: { targetMultiple: 18 }, evEbit: { targetMultiple: 22 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'internet content & information': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 6 }, ps: { targetPS: 7 }, evEbitda: { targetMultiple: 18 }, evEbit: { targetMultiple: 22 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'internet retail': { dcf: { growthRate: 8, discountRate: 11, horizonYears: 10 }, per: { targetPE: 20 }, pb: { targetPB: 6 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 12 }, evEbit: { targetMultiple: 15 }, ddm: { growthRate: 0, requiredReturn: 11 }, fcfYield: { targetYield: 5 } },
  'lodging': { dcf: { growthRate: 4, discountRate: 11, horizonYears: 10 }, per: { targetPE: 14 }, pb: { targetPB: 2 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 8 }, evEbit: { targetMultiple: 10 }, ddm: { growthRate: 2, requiredReturn: 11 }, fcfYield: { targetYield: 6 } },
  'specialty retail': { dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 3 }, ps: { targetPS: 1 }, evEbitda: { targetMultiple: 10 }, evEbit: { targetMultiple: 12 }, ddm: { growthRate: 3, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
  'software - infrastructure': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  'software - application': { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  software: { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
  telecom: { dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 1.5 }, ps: { targetPS: 2 }, evEbitda: { targetMultiple: 7 }, evEbit: { targetMultiple: 9 }, ddm: { growthRate: 3, requiredReturn: 9 }, fcfYield: { targetYield: 6 } },
  'communication services': { dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 1.5 }, ps: { targetPS: 2 }, evEbitda: { targetMultiple: 7 }, evEbit: { targetMultiple: 9 }, ddm: { growthRate: 3, requiredReturn: 9 }, fcfYield: { targetYield: 6 } },
  'telecom services': { dcf: { growthRate: 2, discountRate: 9, horizonYears: 10 }, per: { targetPE: 15 }, pb: { targetPB: 1.5 }, ps: { targetPS: 2 }, evEbitda: { targetMultiple: 7 }, evEbit: { targetMultiple: 9 }, ddm: { growthRate: 3, requiredReturn: 9 }, fcfYield: { targetYield: 6 } },
  'consumer defensive': { dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 }, per: { targetPE: 18 }, pb: { targetPB: 3 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 12 }, evEbit: { targetMultiple: 15 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
  'grocery stores': { dcf: { growthRate: 4, discountRate: 10, horizonYears: 10 }, per: { targetPE: 18 }, pb: { targetPB: 3 }, ps: { targetPS: 1.5 }, evEbitda: { targetMultiple: 12 }, evEbit: { targetMultiple: 15 }, ddm: { growthRate: 4, requiredReturn: 10 }, fcfYield: { targetYield: 5 } },
  'real estate': { dcf: { growthRate: 3, discountRate: 8, horizonYears: 10 }, per: { targetPE: 20 }, pb: { targetPB: 1.5 }, ps: { targetPS: 5 }, evEbitda: { targetMultiple: 14 }, evEbit: { targetMultiple: 16 }, ddm: { growthRate: 3, requiredReturn: 8 }, fcfYield: { targetYield: 8 } },
  technology: { dcf: { growthRate: 8, discountRate: 10, horizonYears: 10 }, per: { targetPE: 25 }, pb: { targetPB: 8 }, ps: { targetPS: 8 }, evEbitda: { targetMultiple: 20 }, evEbit: { targetMultiple: 25 }, ddm: { growthRate: 5, requiredReturn: 10 }, fcfYield: { targetYield: 4 } },
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
// elegir el método de valoración, usando el sector como refuerzo/fallback.
// NOTA: este archivo replica la lógica de frontend/src/utils/valuation.ts.
// La valoración está duplicada entre frontend y backend y debe unificarse
// (moverla a backend o a un paquete compartido) para evitar divergencias.
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

/** CAGR sobre los ingresos/beneficio anuales entre el último y `spanYears` antes. */
function incomeCagr(rows: Financial[], spanYears: number): number | null {
  const annual = rows
    .filter((x) => (x.quarter ?? 0) === 0 && x.netIncome != null && x.netIncome > 0)
    .sort((a, b) => a.year - b.year);
  if (annual.length < 2) return null;
  const last = annual[annual.length - 1];
  const target = annual.find((x) => x.year === last.year - spanYears) ?? annual[0];
  const span = last.year - target.year;
  const targetNi = target.netIncome;
  const lastNi = last.netIncome;
  if (span <= 0 || targetNi == null || targetNi <= 0 || lastNi == null || lastNi <= 0) return null;
  return Math.pow(lastNi / targetNi, 1 / span) - 1;
}

export function inferBusinessModel(input: ValuationInput, sector?: string | null, industry?: string | null): BusinessModelInference {
  const { stock } = input;
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet;

  // 1) Financiero: por sector/industria (regla dura, reutiliza isFinancial).
  if (isFinancial(sector, industry)) {
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

  const grossMargin = revenue > 0 ? grossProfit / revenue : null;
  const netMargin = revenue > 0 ? netIncome / revenue : null;
  const capexIntensity = revenue > 0 ? capex / revenue : null;
  const roic = stock.roic ?? null;
  const assetTurnover = bs?.totalAssets != null && bs.totalAssets > 0 ? revenue / bs.totalAssets : null;
  const ps = stock.psRatio ?? null;
  const payout = stock.payoutRatio ?? null;
  const divYield = stock.dividendYield ?? null;
  const beta = stock.beta ?? null;
  const growthCagr = incomeCagr(input.financials, 5);

  const highMargin = grossMargin != null && grossMargin > 0.5;
  const highNetMargin = netMargin != null && netMargin > 0.15;
  const highRoic = roic != null && roic > 0.15;
  const highCapex = capexIntensity != null && capexIntensity > 0.12;
  const lowAssetTurnover = assetTurnover != null && assetTurnover < 0.5;
  const highPs = ps != null && ps > 2;
  const highPayout = payout != null && payout > 0.5;
  const highDiv = divYield != null && divYield > 0.04;
  const lowBeta = beta != null && beta < 1;
  const highCagr = growthCagr != null && growthCagr > 0.15;
  const netDebtToEbitda = ttm.ebitda != null && ttm.ebitda > 0 && bs != null
    ? (netDebt(bs).value / ttm.ebitda)
    : null;
  const leveraged = netDebtToEbitda != null && netDebtToEbitda > 2;

  if (highCapex && (lowAssetTurnover || leveraged)) {
    return { model: 'asset_heavy', label: BUSINESS_MODEL_LABEL.asset_heavy, reason: `Intensidad de capital alta (capex/revenue ${(capexIntensity! * 100).toFixed(1)}%), rotación de activos ${assetTurnover != null ? assetTurnover.toFixed(2) : 'n/d'} ${leveraged ? 'y deuda neta/EBITDA relevante.' : '.'}` };
  }
  if (highMargin && highRoic && highPs) {
    return { model: 'brand', label: BUSINESS_MODEL_LABEL.brand, reason: `Margen bruto ${(grossMargin! * 100).toFixed(0)}%, ROIC ${(roic! * 100).toFixed(0)}% y P/S ${ps!.toFixed(1)}x: valor concentrado en marca/intangibles.` };
  }
  if (highCagr && !highCapex) {
    return { model: 'growth', label: BUSINESS_MODEL_LABEL.growth, reason: `Crecimiento beneficio CAGR 5A ≈ ${(growthCagr! * 100).toFixed(1)}%` };
  }
  if (highPayout && highDiv && lowBeta) {
    return { model: 'stable', label: BUSINESS_MODEL_LABEL.stable, reason: `Payout ${(payout! * 100).toFixed(0)}%, rentabilidad por dividendo ${(divYield! * 100).toFixed(2)}% y beta ${beta!.toFixed(2)}: negocio maduro.` };
  }
  if (highMargin && !highCapex && highNetMargin) {
    return { model: 'asset_light', label: BUSINESS_MODEL_LABEL.asset_light, reason: `Bajo capex (${capexIntensity != null ? (capexIntensity * 100).toFixed(1) : 'n/d'}% de ventas) con margen neto ${(netMargin! * 100).toFixed(0)}%: modelo ligero en activos.` };
  }
  if (fcf != null && netMargin != null && netMargin > 0.02 && netMargin < 0.1 && lowAssetTurnover) {
    return { model: 'commodity', label: BUSINESS_MODEL_LABEL.commodity, reason: `Margen neto reducido (${(netMargin * 100).toFixed(0)}%) con alta rotación/activos: perfil cíclico.` };
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
  semiconductors: 'dcf',
  'internet content': 'ps',
  'internet - content': 'ps',
  'internet content & information': 'ps',
  'internet retail': 'ev_ebitda',
  lodging: 'ev_ebitda',
  'consumer electronics': 'ps',
  'drug manufacturers': 'dcf',
  'specialty retail': 'per',
  'communication services': 'ev_ebitda',
  'telecom services': 'ev_ebitda',
  'telecoms': 'ev_ebitda',
  software: 'dcf',
  'consumer defensive': 'per',
  technology: 'dcf',
  default: 'dcf',
};

export function getRecommendedModel(input: ValuationInput, sector?: string | null, industry?: string | null): { id: string; businessModel?: BusinessModelInference } {
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

const RECOMMENDED_FALLBACK = ['ev_ebitda', 'per', 'pb', 'fcf_yield', 'ddm'];

export function getRecommendedFairValue(results: ValuationResult[], input: ValuationInput, sector?: string | null, industry?: string | null): { model: string; fairValue: number | null; businessModel?: BusinessModelInference } {
  const { id: model, businessModel } = getRecommendedModel(input, sector, industry);
  if (results.find((r) => r.id === model)?.fairValue != null) return { model, fairValue: results.find((r) => r.id === model)?.fairValue ?? null, businessModel };
  for (const alt of RECOMMENDED_FALLBACK) {
    if (alt === model) continue;
    const fv = results.find((r) => r.id === alt)?.fairValue ?? null;
    if (fv != null) return { model: alt, fairValue: fv, businessModel };
  }
  return { model, fairValue: null, businessModel };
}

export function computeAll(input: ValuationInput, configs: ValuationConfigs, sector?: string | null, industry?: string | null): ValuationResult[] {
  const currentPrice = input.stock?.currentPrice ?? 0;
  const financial = isFinancial(sector, industry);
  const results = [
    computeDCF(input, configs.dcf, sector, industry),
    computePER(input, configs.per),
    computePB(input, configs.pb),
    financial ? { id: 'ps', name: 'P/S', fairValue: null, confidence: 'na' as const, confidenceReason: 'P/S no aplica a banca/seguros' } : computePS(input, configs.ps),
    financial ? { id: 'ev_ebitda', name: 'EV/EBITDA', fairValue: null, confidence: 'na' as const, confidenceReason: 'EV/EBITDA no aplica a banca/seguros' } : computeEVEBITDA(input, configs.evEbitda),
    financial ? { id: 'ev_ebit', name: 'EV/EBIT', fairValue: null, confidence: 'na' as const, confidenceReason: 'EV/EBIT no aplica a banca/seguros' } : computeEVEBIT(input, configs.evEbit),
    computeDDM(input, configs.ddm),
    computeGrahamNumber(input),
    computeFCFYield(input, configs.fcfYield),
    computeNetNet(input),
  ];
  return results.map((r) => applySanityBound(r, currentPrice));
}

const CONFIDENCE_WEIGHT: Record<string, number> = { high: 1.0, medium: 0.7, low: 0.4, na: 0 };

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
