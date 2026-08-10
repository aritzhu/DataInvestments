import type { CompanyProfile } from '../components/CompanyPage';
import { trailing12Months, ttmPeriodLabel } from './valuation';

type Financial = CompanyProfile['financials'][0];
type BalanceSheet = CompanyProfile['balanceSheets'][0];
type Stock = CompanyProfile['stockMetrics'][0];

export interface FundamentalInput {
  financials: Financial[];
  balanceSheets: BalanceSheet[];
  stock: Stock | null;
  currency: string;
}

function annualRows<T extends { year: number; quarter: number | null }>(arr: T[]): T[] {
  return [...arr].filter(x => (x.quarter ?? 0) === 0).sort((a, b) => a.year - b.year);
}

function latest<T extends { year: number }>(arr: T[]): T | undefined {
  return [...arr].sort((a, b) => b.year - a.year)[0];
}

/** Year-over-year % change between two values, guarded against zero/absent bases. */
function pctChange(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return current / previous - 1;
}

/**
 * Compounded growth between the latest value and the one `spanYears` prior.
 * Falls back to the earliest available year when the exact window is missing.
 */
function growthOverYears(
  rows: Array<{ year: number; value: number | null }>,
  spanYears: number,
): { value: number | null; span: number } {
  const sorted = rows.filter(r => r.value != null).sort((a, b) => b.year - a.year);
  if (sorted.length < 2) return { value: null, span: 0 };
  const last = sorted[0];
  const target = sorted.find(r => r.year === last.year - spanYears) ?? sorted[sorted.length - 1];
  const span = last.year - target.year;
  if (span <= 0 || target.value == null || target.value <= 0 || last.value == null || last.value <= 0) {
    return { value: null, span };
  }
  const ratio = last.value / target.value;
  if (ratio <= 0) return { value: null, span };
  return { value: Math.pow(ratio, 1 / span) - 1, span };
}

/* ------------------------------------------------------------------ */
/*  Pilar 1 — Crecimiento                                              */
/* ------------------------------------------------------------------ */

export interface GrowthMetrics {
  revenueYoY: number | null;
  netIncomeYoY: number | null;
  fcfYoY: number | null;
  revenueCagr3y: number | null;
  revenueCagr5y: number | null;
  netIncomeCagr3y: number | null;
  netIncomeCagr5y: number | null;
  growthUsedForPeg: number | null;
  growthUsedForPegLabel: string;
  peg: number | null;
  sustainableGrowth: number | null;
  availableYears: number;
  periodLabel: string;
}

export function computeGrowth(input: FundamentalInput): GrowthMetrics {
  const annual = annualRows(input.financials);
  const revenues = annual.map(f => ({ year: f.year, value: f.revenue }));
  const incomes = annual.map(f => ({ year: f.year, value: f.netIncome }));
  const fcfs = annual.map(f => ({ year: f.year, value: f.freeCashFlow }));

  const rev = revenues.length;
  const revYoY = pctChange(revenues[rev - 1]?.value, revenues[rev - 2]?.value);
  const niYoY = pctChange(incomes[incomes.length - 1]?.value, incomes[incomes.length - 2]?.value);
  const fcfYoY = pctChange(fcfs[fcfs.length - 1]?.value, fcfs[fcfs.length - 2]?.value);

  const revCagr3 = growthOverYears(revenues, 3);
  const revCagr5 = growthOverYears(revenues, 5);
  const niCagr3 = growthOverYears(incomes, 3);
  const niCagr5 = growthOverYears(incomes, 5);

  const candidates: Array<{ value: number | null; label: string }> = [
    { value: niCagr5.value, label: 'CAGR beneficio 5 años' },
    { value: niCagr3.value, label: 'CAGR beneficio 3 años' },
    { value: niYoY, label: 'Beneficio último año' },
  ];
  const growth = candidates.find(c => c.value != null && c.value > 0) ?? { value: null, label: '' };

  let peg: number | null = null;
  const pe = input.stock?.peRatio ?? null;
  if (pe != null && pe > 0 && growth.value != null && growth.value > 0) {
    peg = pe / (growth.value * 100);
  }

  let sustainableGrowth: number | null = null;
  const roe = input.stock?.roe ?? null;
  if (roe != null) {
    const ttm = trailing12Months(input.financials, input.balanceSheets);
    const dividends = ttm?.dividendsPaid != null ? Math.abs(ttm.dividendsPaid) : null;
    const buybacks = ttm?.shareRepurchases != null ? Math.abs(ttm.shareRepurchases) : null;
    const netIncome = ttm?.netIncome ?? 0;
    const payouts = (dividends ?? 0) + (buybacks ?? 0);
    const payout = payouts > 0 && netIncome > 0 ? payouts / netIncome : 0;
    const retention = Math.max(0, 1 - payout);
    sustainableGrowth = roe * retention;
  }

  return {
    revenueYoY: revYoY,
    netIncomeYoY: niYoY,
    fcfYoY,
    revenueCagr3y: revCagr3.value,
    revenueCagr5y: revCagr5.value,
    netIncomeCagr3y: niCagr3.value,
    netIncomeCagr5y: niCagr5.value,
    growthUsedForPeg: growth.value,
    growthUsedForPegLabel: growth.label,
    peg,
    sustainableGrowth,
    availableYears: annual.length,
    periodLabel: annual.length > 0 ? `Ejercicio ${annual[annual.length - 1].year}` : '—',
  };
}

/* ------------------------------------------------------------------ */
/*  Pilar 2 — Solvencia                                                */
/* ------------------------------------------------------------------ */

export interface SolvencyMetrics {
  netDebt: number | null;
  netDebtEbitda: number | null;
  interestCoverage: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  workingCapital: number | null;
  totalDebtEquity: number | null;
  periodLabel: string;
}

export function computeSolvency(input: FundamentalInput): SolvencyMetrics {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  if (!bs) {
    return { netDebt: null, netDebtEbitda: null, interestCoverage: null, currentRatio: null, quickRatio: null, workingCapital: null, totalDebtEquity: null, periodLabel: '—' };
  }

  const cash = (bs.cashAndCashEquivalents ?? 0) + (bs.shortTermInvestments ?? 0);
  const totalDebt = (bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0);
  const netDebt = totalDebt - cash;
  const equity = bs.totalStockholdersEquity ?? 0;

  const ebitda = ttm?.ebitda ?? null;
  const ebit = ttm?.ebit ?? null;
  const interest = ttm?.interestExpense ?? null;

  const currentAssets = bs.totalCurrentAssets ?? null;
  const currentLiabilities = bs.totalCurrentLiabilities ?? null;
  const inventory = bs.inventory ?? null;

  return {
    netDebt,
    netDebtEbitda: ebitda != null && ebitda > 0 ? netDebt / ebitda : null,
    interestCoverage: ebit != null && interest != null && interest > 0 ? ebit / interest : null,
    currentRatio: currentAssets != null && currentLiabilities != null && currentLiabilities > 0 ? currentAssets / currentLiabilities : null,
    quickRatio: currentAssets != null && currentLiabilities != null && currentLiabilities > 0 && inventory != null
      ? (currentAssets - inventory) / currentLiabilities
      : null,
    workingCapital: currentAssets != null && currentLiabilities != null ? currentAssets - currentLiabilities : null,
    totalDebtEquity: equity > 0 ? totalDebt / equity : null,
    periodLabel: ttmPeriodLabel(input.financials),
  };
}

/* ------------------------------------------------------------------ */
/*  Pilar 3 — Retorno al accionista                                    */
/* ------------------------------------------------------------------ */

export interface ShareholderMetrics {
  payoutRatio: number | null;
  dividendCoverage: number | null;
  buybackYield: number | null;
  shareholderYield: number | null;
  fcfDividendCoverage: number | null;
  periodLabel: string;
}

export function computeShareholderReturns(input: FundamentalInput): ShareholderMetrics {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  if (!ttm) {
    return { payoutRatio: null, dividendCoverage: null, buybackYield: null, shareholderYield: null, fcfDividendCoverage: null, periodLabel: '—' };
  }

  const netIncome = ttm.netIncome ?? 0;
  const dividends = ttm.dividendsPaid != null ? Math.abs(ttm.dividendsPaid) : null;
  const buybacks = ttm.shareRepurchases != null ? Math.abs(ttm.shareRepurchases) : null;
  const fcf = ttm.freeCashFlow ?? null;

  const marketCap = input.stock?.marketCap ?? null;
  const mc = marketCap != null && marketCap > 0 ? marketCap : (input.stock?.currentPrice ?? 0) * (input.stock?.sharesOutstanding ?? 0);

  const totalReturn = (dividends ?? 0) + (buybacks ?? 0);

  return {
    payoutRatio: dividends != null && netIncome > 0 ? dividends / netIncome : null,
    dividendCoverage: dividends != null && dividends > 0 && netIncome > 0 ? netIncome / dividends : null,
    buybackYield: buybacks != null && buybacks > 0 && mc > 0 ? buybacks / mc : null,
    shareholderYield: totalReturn > 0 && mc > 0 ? totalReturn / mc : null,
    fcfDividendCoverage: dividends != null && dividends > 0 && fcf != null ? fcf / dividends : null,
    periodLabel: ttmPeriodLabel(input.financials),
  };
}

/* ------------------------------------------------------------------ */
/*  Pilar 4 — Eficiencia y DuPont                                      */
/* ------------------------------------------------------------------ */

export interface EfficiencyMetrics {
  assetTurnover: number | null;
  inventoryTurnover: number | null;
  receivablesTurnover: number | null;
  daysInventoryOutstanding: number | null;
  daysSalesOutstanding: number | null;
  daysPayableOutstanding: number | null;
  cashConversionCycle: number | null;
  fcfConversion: number | null;
  fcfMargin: number | null;
  capexIntensity: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  operatingMargin: number | null;
  dupont: {
    roe: number | null;
    netMargin: number | null;
    assetTurnover: number | null;
    equityMultiplier: number | null;
  };
  periodLabel: string;
}

export function computeEfficiency(input: FundamentalInput): EfficiencyMetrics {
  const ttm = trailing12Months(input.financials, input.balanceSheets);
  const bs = ttm?.balanceSheet ?? latest(input.balanceSheets);
  if (!ttm || !bs) {
    return {
      assetTurnover: null, inventoryTurnover: null, receivablesTurnover: null,
      daysInventoryOutstanding: null, daysSalesOutstanding: null, daysPayableOutstanding: null,
      cashConversionCycle: null, fcfConversion: null, fcfMargin: null, capexIntensity: null,
      grossMargin: null, netMargin: null, operatingMargin: null,
      dupont: { roe: null, netMargin: null, assetTurnover: null, equityMultiplier: null },
      periodLabel: '—',
    };
  }

  const revenue = ttm.revenue;
  const cogs = ttm.costOfRevenue;
  const netIncome = ttm.netIncome;
  const ebit = ttm.ebit;
  const fcf = ttm.freeCashFlow;
  const capex = ttm.capex;

  const assets = bs.totalAssets ?? null;
  const inventory = bs.inventory ?? null;
  const receivables = bs.accountsReceivable ?? null;
  const payables = bs.accountsPayable ?? null;
  const equity = bs.totalStockholdersEquity ?? null;

  const assetTurnover = assets != null && assets > 0 ? revenue / assets : null;
  const inventoryTurnover = inventory != null && inventory > 0 && cogs > 0 ? cogs / inventory : null;
  const receivablesTurnover = receivables != null && receivables > 0 ? revenue / receivables : null;

  const dio = inventoryTurnover != null && inventoryTurnover > 0 ? 365 / inventoryTurnover : null;
  const dso = receivablesTurnover != null && receivablesTurnover > 0 ? 365 / receivablesTurnover : null;
  const dpo = payables != null && payables > 0 && cogs > 0 ? (payables / cogs) * 365 : null;

  const netMargin = revenue > 0 ? netIncome / revenue : null;
  const grossMargin = revenue > 0 ? ttm.grossProfit / revenue : null;
  const operatingMargin = ebit != null && revenue > 0 ? ebit / revenue : null;
  const equityMultiplier = assets != null && equity != null && equity > 0 ? assets / equity : null;

  return {
    assetTurnover,
    inventoryTurnover,
    receivablesTurnover,
    daysInventoryOutstanding: dio,
    daysSalesOutstanding: dso,
    daysPayableOutstanding: dpo,
    cashConversionCycle: dio != null && dso != null && dpo != null ? dio + dso - dpo : null,
    fcfConversion: fcf != null && netIncome > 0 ? fcf / netIncome : null,
    fcfMargin: fcf != null && revenue > 0 ? fcf / revenue : null,
    capexIntensity: revenue > 0 ? capex / revenue : null,
    grossMargin,
    netMargin,
    operatingMargin,
    dupont: {
      roe: netMargin != null && assetTurnover != null && equityMultiplier != null ? netMargin * assetTurnover * equityMultiplier : null,
      netMargin,
      assetTurnover,
      equityMultiplier,
    },
    periodLabel: ttmPeriodLabel(input.financials),
  };
}
