export type ConfidenceLevel = 'full' | 'partial' | 'low';

export interface MetricConfidence {
  level: ConfidenceLevel;
  reason: string | null;
}

export interface QualityContext {
  gaps: string[];
  warningFields: string[];
}

export const GAP_LABELS: Record<string, string> = {
  shortTermDebt: 'deuda a corto plazo',
  longTermDebt: 'deuda a largo plazo',
  interestExpense: 'gasto de intereses',
  ebit: 'EBIT',
  ebitda: 'EBITDA',
  operatingCashFlow: 'flujo operativo',
  freeCashFlow: 'flujo de caja libre',
  dividendsPaid: 'dividendos pagados',
  shareRepurchases: 'recompras',
  totalCurrentAssets: 'activo corriente',
  totalCurrentLiabilities: 'pasivo corriente',
  inventory: 'inventario',
  accountsReceivable: 'cuentas a cobrar',
  accountsPayable: 'cuentas a pagar',
  totalAssets: 'activo total',
  totalStockholdersEquity: 'patrimonio neto',
  netIncome: 'beneficio neto',
  capex: 'CapEx',
};

// Fields (gap keys) each metric depends on. Absence of one downgrades
// confidence to "partial"; an out-of-range validation warning downgrades to "low".
const METRIC_FIELD_DEPS: Record<string, string[]> = {
  netDebt: ['shortTermDebt', 'longTermDebt'],
  netDebtEbitda: ['shortTermDebt', 'longTermDebt', 'ebitda'],
  interestCoverage: ['ebit', 'interestExpense'],
  currentRatio: ['totalCurrentAssets', 'totalCurrentLiabilities'],
  quickRatio: ['totalCurrentAssets', 'totalCurrentLiabilities', 'inventory'],
  workingCapital: ['totalCurrentAssets', 'totalCurrentLiabilities'],
  totalDebtEquity: ['shortTermDebt', 'longTermDebt', 'totalStockholdersEquity'],
  payoutRatio: ['dividendsPaid', 'netIncome'],
  dividendCoverage: ['dividendsPaid', 'netIncome'],
  buybackYield: ['shareRepurchases'],
  shareholderYield: ['dividendsPaid', 'shareRepurchases'],
  fcfDividendCoverage: ['dividendsPaid', 'freeCashFlow'],
  fcfYoY: ['freeCashFlow'],
  fcfConversion: ['freeCashFlow'],
  fcfMargin: ['freeCashFlow'],
  capexIntensity: ['capex'],
  inventoryTurnover: ['inventory'],
  daysInventoryOutstanding: ['inventory'],
  daysSalesOutstanding: ['accountsReceivable'],
  daysPayableOutstanding: ['accountsPayable'],
  cashConversionCycle: ['inventory', 'accountsReceivable', 'accountsPayable'],
  assetTurnover: ['totalAssets'],
  dupont_roe: ['totalAssets', 'totalStockholdersEquity'],
  dupont_netMargin: ['netIncome'],
  dupont_assetTurnover: ['totalAssets'],
  dupont_equityMultiplier: ['totalAssets', 'totalStockholdersEquity'],
};

export function getMetricConfidence(key: string, ctx: QualityContext): MetricConfidence {
  const deps = METRIC_FIELD_DEPS[key] ?? [];
  const flagged = deps.filter((d) => ctx.warningFields.includes(d));
  if (flagged.length > 0) {
    return {
      level: 'low',
      reason: `Valor fuera de rango esperado en ${flagged.map((f) => GAP_LABELS[f] ?? f).join(', ')}`,
    };
  }
  const missing = deps.filter((d) => ctx.gaps.includes(d));
  if (missing.length > 0) {
    return {
      level: 'partial',
      reason: `Ratio calculado sin ${missing.map((f) => GAP_LABELS[f] ?? f).join(', ')}`,
    };
  }
  return { level: 'full', reason: null };
}

// Extracts the field names from validation warning messages like
// "revenue = 1.0E+12 outside expected range [...]".
export function parseWarningFields(warnings: string[]): string[] {
  return warnings
    .map((w) => (w.split(' ')[0] || '').trim())
    .filter(Boolean);
}
