import type { FinancialData, BalanceSheet, StockMetric } from '@prisma/client';

type Financial = FinancialData;
type Balance = BalanceSheet;
type Stock = StockMetric;

interface ValuationResult {
  id: string;
  name: string;
  fairValue: number | null;
  confidence: 'high' | 'medium' | 'low' | 'na';
}

interface ValuationInput {
  financials: Financial[];
  balanceSheets: Balance[];
  stock: Stock;
}

function latest<T extends { year: number }>(arr: T[]): T | undefined {
  return [...arr].sort((a, b) => b.year - a.year)[0];
}

function netDebt(bs: Balance | undefined): number {
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
  return stock.sharesOutstanding ?? 0;
}

const SANITY_MULTIPLE = 10;
function applySanityBound(result: ValuationResult, currentPrice: number): ValuationResult {
  if (result.fairValue == null || currentPrice <= 0) return result;
  if (result.fairValue > SANITY_MULTIPLE * currentPrice || result.fairValue < 0) {
    return { ...result, confidence: 'low' };
  }
  return result;
}

function computeDCF(input: ValuationInput, config: { growthRate: number; discountRate: number; horizonYears: number }): ValuationResult {
  const f = latest(input.financials);
  const shares = sharesOf(input.stock);
  if (!f || shares <= 0) return { id: 'dcf', name: 'DCF', fairValue: null, confidence: 'na' };

  const fcfValues = input.financials.map((x) => x.freeCashFlow ?? (x.operatingCashFlow != null ? x.operatingCashFlow - x.capex : 0)).filter((v) => v !== 0);
  const fcf = fcfValues.length > 0 ? fcfValues.reduce((a, b) => a + b, 0) / fcfValues.length : 0;
  if (fcf <= 0) return { id: 'dcf', name: 'DCF', fairValue: null, confidence: 'na' };

  const g = config.growthRate / 100;
  const r = config.discountRate / 100;
  const tg = 0.03;

  let totalPV = 0;
  for (let i = 1; i <= config.horizonYears; i++) {
    totalPV += (fcf * Math.pow(1 + g, i)) / Math.pow(1 + r, i);
  }
  const terminalValue = (fcf * Math.pow(1 + g, config.horizonYears) * (1 + tg)) / (r - tg);
  const terminalPV = terminalValue / Math.pow(1 + r, config.horizonYears);
  const fairValue = (totalPV + terminalPV) / shares;

  const conf = fcfValues.length >= 3 ? (consistency(fcfValues) > 0.6 ? 'high' : 'medium') : 'low';
  return { id: 'dcf', name: 'DCF', fairValue, confidence: conf };
}

function computePER(input: ValuationInput, config: { targetPE: number }): ValuationResult {
  const f = latest(input.financials);
  const shares = sharesOf(input.stock);
  if (!f || shares <= 0 || f.netIncome <= 0) return { id: 'per', name: 'PER', fairValue: null, confidence: 'na' };
  const eps = f.netIncome / shares;
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
  const f = latest(input.financials);
  const shares = sharesOf(input.stock);
  if (!f || shares <= 0 || f.revenue <= 0) return { id: 'ps', name: 'P/S', fairValue: null, confidence: 'na' };
  const sps = f.revenue / shares;
  const fairValue = sps * config.targetPS;
  const currentPS = input.stock.psRatio ?? 0;
  const conf = currentPS > 0 && currentPS < 20 ? 'high' : currentPS > 0 ? 'medium' : 'low';
  return { id: 'ps', name: 'P/S', fairValue, confidence: conf };
}

function computeEVEBITDA(input: ValuationInput, config: { targetMultiple: number }): ValuationResult {
  const f = latest(input.financials);
  const bs = latest(input.balanceSheets);
  const shares = sharesOf(input.stock);
  if (!f || shares <= 0 || !f.ebitda || f.ebitda <= 0) return { id: 'ev_ebitda', name: 'EV/EBITDA', fairValue: null, confidence: 'na' };
  const ev = f.ebitda * config.targetMultiple;
  const nd = netDebt(bs);
  const fairValue = (ev - nd) / shares;
  const currentMult = input.stock.enterpriseValue && f.ebitda ? input.stock.enterpriseValue / f.ebitda : 0;
  const conf = currentMult > 0 && currentMult < 40 ? 'high' : currentMult > 0 ? 'medium' : 'low';
  return { id: 'ev_ebitda', name: 'EV/EBITDA', fairValue, confidence: conf };
}

function computeEVEBIT(input: ValuationInput, config: { targetMultiple: number }): ValuationResult {
  const f = latest(input.financials);
  const bs = latest(input.balanceSheets);
  const shares = sharesOf(input.stock);
  const ebit = f?.ebit ?? (f ? (f.grossProfit ?? (f.revenue - f.costOfRevenue)) - f.operatingExpenses : null);
  if (!f || shares <= 0 || !ebit || ebit <= 0) return { id: 'ev_ebit', name: 'EV/EBIT', fairValue: null, confidence: 'na' };
  const evEbit = ebit * config.targetMultiple;
  const ndEbit = netDebt(bs);
  const fairValue = (evEbit - ndEbit) / shares;
  const currentMultEbit = input.stock.enterpriseValue && ebit ? input.stock.enterpriseValue / ebit : 0;
  const conf = currentMultEbit > 0 && currentMultEbit < 50 ? 'high' : currentMultEbit > 0 ? 'medium' : 'low';
  return { id: 'ev_ebit', name: 'EV/EBIT', fairValue, confidence: conf };
}

function computeDDM(input: ValuationInput, config: { growthRate: number; requiredReturn: number }): ValuationResult {
  const f = latest(input.financials);
  const shares = sharesOf(input.stock);
  const divPerShare = f && shares > 0 && f.dividendsPaid ? Math.abs(f.dividendsPaid) / shares : 0;
  if (shares <= 0 || divPerShare <= 0) return { id: 'ddm', name: 'DDM', fairValue: null, confidence: 'na' };
  const d1 = divPerShare * (1 + config.growthRate / 100);
  const r = config.requiredReturn / 100;
  const g = config.growthRate / 100;
  const fairValue = r > g ? d1 / (r - g) : null;
  const divYield = input.stock.dividendYield ?? 0;
  const conf = divYield > 0.02 && fairValue !== null ? 'high' : divYield > 0 ? 'medium' : 'low';
  return { id: 'ddm', name: 'DDM', fairValue, confidence: conf };
}

function computeGrahamNumber(input: ValuationInput): ValuationResult {
  const f = latest(input.financials);
  const bs = latest(input.balanceSheets);
  const shares = sharesOf(input.stock);
  if (!f || shares <= 0) return { id: 'graham', name: 'Graham', fairValue: null, confidence: 'na' };
  const eps = f.netIncome / shares;
  const equity = bs?.totalStockholdersEquity ?? f.totalEquity;
  const bvps = equity ? equity / shares : 0;
  if (eps <= 0 || bvps <= 0) return { id: 'graham', name: 'Graham', fairValue: null, confidence: 'na' };
  const fairValue = Math.sqrt(22.5 * eps * bvps);
  return { id: 'graham', name: 'Graham', fairValue, confidence: 'high' };
}

function computeFCFYield(input: ValuationInput, config: { targetYield: number }): ValuationResult {
  const f = latest(input.financials);
  const shares = sharesOf(input.stock);
  if (!f || shares <= 0) return { id: 'fcf_yield', name: 'FCF Yield', fairValue: null, confidence: 'na' };
  const fcf = f.freeCashFlow ?? (f.operatingCashFlow != null ? f.operatingCashFlow - f.capex : 0);
  const fcfPerShare = fcf / shares;
  const fairValue = config.targetYield > 0 ? fcfPerShare / (config.targetYield / 100) : null;
  const currentYield = input.stock.currentPrice > 0 ? fcfPerShare / input.stock.currentPrice : 0;
  const conf = currentYield > 0.05 ? 'high' : currentYield > 0.02 ? 'medium' : currentYield > 0 ? 'low' : 'na';
  return { id: 'fcf_yield', name: 'FCF Yield', fairValue, confidence: conf };
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
};

export function getSectorConfigs(sector: string | null | undefined, industry?: string | null): ValuationConfigs {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  for (const [key, config] of Object.entries(SECTOR_CONFIGS)) {
    if (text.includes(key)) return config;
  }
  return DEFAULT_CONFIGS;
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
  'specialty retail': 'pe',
  default: 'dcf',
};

export function getRecommendedModel(sector: string | null | undefined, industry?: string | null): string {
  const text = `${sector || ''} ${industry || ''}`.toLowerCase();
  for (const [key, modelId] of Object.entries(SECTOR_RECOMMENDED_MODEL)) {
    if (key !== 'default' && text.includes(key)) return modelId;
  }
  return SECTOR_RECOMMENDED_MODEL.default;
}

export function getRecommendedFairValue(results: ValuationResult[], sector: string | null | undefined, industry?: string | null): { model: string; fairValue: number | null } {
  const model = getRecommendedModel(sector, industry);
  const fairValue = results.find(r => r.id === model)?.fairValue ?? null;
  return { model, fairValue };
}

export function computeAll(input: ValuationInput, configs: ValuationConfigs): ValuationResult[] {
  const currentPrice = input.stock?.currentPrice ?? 0;
  const results = [
    computeDCF(input, configs.dcf),
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
  buy: 'Subvalorada',
  hold: 'Justa',
  sell: 'Sobrevalorada',
  na: 'Sin datos',
};
