export interface ValidationWarning {
  field: string;
  value: number;
  message: string;
}

interface FieldBounds {
  min: number;
  max: number;
}

const FIELD_BOUNDS: Record<string, FieldBounds> = {
  revenue:              { min: -10e9,  max: 600e9 },
  costOfRevenue:        { min: -10e9,  max: 500e9 },
  grossProfit:          { min: -50e9,  max: 300e9 },
  operatingExpenses:    { min: -10e9,  max: 400e9 },
  sgaExpense:           { min: 0,      max: 100e9 },
  rdExpense:            { min: 0,      max: 50e9 },
  interestExpense:      { min: 0,      max: 50e9 },
  taxExpense:           { min: -20e9,  max: 50e9 },
  netIncome:            { min: -50e9,  max: 200e9 },
  ebitda:               { min: -50e9,  max: 250e9 },
  ebit:                 { min: -50e9,  max: 200e9 },
  capex:                { min: 0,      max: 100e9 },
  depreciation:         { min: 0,      max: 50e9 },
  operatingCashFlow:    { min: -50e9,  max: 200e9 },
  investingCashFlow:    { min: -100e9, max: 100e9 },
  financingCashFlow:    { min: -100e9, max: 100e9 },
  freeCashFlow:         { min: -50e9,  max: 200e9 },
  dividendsPaid:        { min: 0,      max: 30e9 },
  shareRepurchases:     { min: 0,      max: 50e9 },
  totalAssets:          { min: 0,      max: 5e12 },
  totalLiabilities:     { min: 0,      max: 5e12 },
  totalEquity:          { min: -100e9, max: 500e9 },
  marketCap:            { min: 0,      max: 5e12 },
  sharesOutstanding:    { min: 1000,   max: 50e9 },
  enterpriseValue:      { min: 0,      max: 6e12 },
  cashAndCashEquivalents: { min: 0,    max: 1e12 },
  shortTermInvestments: { min: 0,      max: 500e9 },
  accountsReceivable:   { min: 0,      max: 300e9 },
  inventory:            { min: 0,      max: 100e9 },
  totalCurrentAssets:   { min: 0,      max: 3e12 },
  propertyPlantEquipment: { min: 0,    max: 2e12 },
  goodwill:             { min: 0,      max: 200e9 },
  intangibleAssets:     { min: 0,      max: 200e9 },
  totalNonCurrentAssets: { min: 0,     max: 4e12 },
  accountsPayable:      { min: 0,      max: 200e9 },
  shortTermDebt:        { min: 0,      max: 500e9 },
  totalCurrentLiabilities: { min: 0,   max: 2e12 },
  longTermDebt:         { min: 0,      max: 1e12 },
  totalNonCurrentLiabilities: { min: 0, max: 3e12 },
  totalStockholdersEquity: { min: -100e9, max: 500e9 },
  retainedEarnings:     { min: -200e9, max: 300e9 },
  treasuryStock:        { min: -100e9, max: 100e9 },
};

function validateField(field: string, value: number | null | undefined): ValidationWarning | null {
  if (value == null || !Number.isFinite(value)) return null;
  const bounds = FIELD_BOUNDS[field];
  if (!bounds) return null;
  if (value < bounds.min || value > bounds.max) {
    return {
      field,
      value,
      message: `${field} = ${value.toExponential(2)} outside expected range [${bounds.min.toExponential(1)}, ${bounds.max.toExponential(1)}]`,
    };
  }
  return null;
}

export interface FinancialDataInput {
  revenue?: number | null;
  costOfRevenue?: number | null;
  grossProfit?: number | null;
  operatingExpenses?: number | null;
  sgaExpense?: number | null;
  rdExpense?: number | null;
  interestExpense?: number | null;
  taxExpense?: number | null;
  netIncome?: number | null;
  ebitda?: number | null;
  ebit?: number | null;
  capex?: number | null;
  depreciation?: number | null;
  operatingCashFlow?: number | null;
  investingCashFlow?: number | null;
  financingCashFlow?: number | null;
  freeCashFlow?: number | null;
  dividendsPaid?: number | null;
  shareRepurchases?: number | null;
  totalAssets?: number | null;
  totalLiabilities?: number | null;
  totalEquity?: number | null;
  marketCap?: number | null;
  sharesOutstanding?: number | null;
  enterpriseValue?: number | null;
}

export interface BalanceSheetInput {
  cashAndCashEquivalents?: number | null;
  shortTermInvestments?: number | null;
  accountsReceivable?: number | null;
  inventory?: number | null;
  totalCurrentAssets?: number | null;
  propertyPlantEquipment?: number | null;
  goodwill?: number | null;
  intangibleAssets?: number | null;
  totalNonCurrentAssets?: number | null;
  totalAssets?: number | null;
  accountsPayable?: number | null;
  shortTermDebt?: number | null;
  totalCurrentLiabilities?: number | null;
  longTermDebt?: number | null;
  totalNonCurrentLiabilities?: number | null;
  totalLiabilities?: number | null;
  totalStockholdersEquity?: number | null;
  retainedEarnings?: number | null;
  treasuryStock?: number | null;
}

export function validateFinancialData(data: FinancialDataInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const rec = data as Record<string, number | null | undefined>;
  for (const key of Object.keys(FIELD_BOUNDS)) {
    const w = validateField(key, rec[key] as number | null | undefined);
    if (w) warnings.push(w);
  }
  return warnings;
}

export function validateBalanceSheet(data: BalanceSheetInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const rec = data as Record<string, number | null | undefined>;
  for (const key of Object.keys(FIELD_BOUNDS)) {
    const w = validateField(key, rec[key] as number | null | undefined);
    if (w) warnings.push(w);
  }
  return warnings;
}

export function logValidationWarnings(ticker: string, warnings: ValidationWarning[], source: string): void {
  for (const w of warnings) {
    console.warn(`[Validation] ${ticker} (${source}): ${w.message}`);
  }
}
