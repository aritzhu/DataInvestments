// Exportación a CSV compatible con Excel es-ES:
// separador ';', BOM UTF-8 y decimales con punto (Excel es-ES los interpreta bien).
// Sin dependencias externas.

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(';')];
  for (const row of rows) lines.push(row.map(escape).join(';'));
  return '\uFEFF' + lines.join('\r\n');
}

function num(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? '' : String(v);
}

function quarterLabel(quarter: number | null): string {
  return quarter && quarter > 0 ? `Q${quarter}` : 'Anual';
}

// ── Income statement ────────────────────────────────────────────────────────

export interface IncomeRow {
  year: number;
  quarter: number | null;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  sgaExpense: number | null;
  rdExpense: number | null;
  interestExpense: number | null;
  taxExpense: number | null;
  ebitda: number | null;
  ebit: number | null;
  netIncome: number | null;
}

const INCOME_HEADERS = [
  'Año', 'Período',
  'Ingresos', 'Costo de ventas', 'Beneficio bruto',
  'Gastos operativos', 'Gastos SG&A', 'I+D',
  'Intereses', 'Impuestos',
  'EBITDA', 'EBIT', 'Beneficio neto',
];

export function incomeToCsv(rows: IncomeRow[]): string {
  const body = rows.map((r) => [
    r.year,
    quarterLabel(r.quarter),
    num(r.revenue),
    num(r.costOfRevenue),
    num(r.grossProfit ?? (r.revenue != null && r.costOfRevenue != null ? r.revenue - r.costOfRevenue : null)),
    num(r.operatingExpenses),
    num(r.sgaExpense),
    num(r.rdExpense),
    num(r.interestExpense),
    num(r.taxExpense),
    num(r.ebitda),
    num(r.ebit),
    num(r.netIncome),
  ]);
  return toCsv(INCOME_HEADERS, body);
}

// ── Balance sheet ───────────────────────────────────────────────────────────

export interface BalanceRow {
  year: number;
  quarter: number | null;
  cashAndCashEquivalents: number | null;
  shortTermInvestments: number | null;
  accountsReceivable: number | null;
  inventory: number | null;
  totalCurrentAssets: number | null;
  propertyPlantEquipment: number | null;
  goodwill: number | null;
  intangibleAssets: number | null;
  totalNonCurrentAssets: number | null;
  totalAssets: number | null;
  accountsPayable: number | null;
  shortTermDebt: number | null;
  totalCurrentLiabilities: number | null;
  longTermDebt: number | null;
  totalNonCurrentLiabilities: number | null;
  totalLiabilities: number | null;
  totalStockholdersEquity: number | null;
  retainedEarnings: number | null;
  treasuryStock: number | null;
}

const BALANCE_HEADERS = [
  'Año', 'Período',
  'Efectivo', 'Inv. corto plazo', 'Cuentas a cobrar', 'Inventario',
  'Activo corriente', 'PP&E', 'Fondo de comercio', 'Intangibles',
  'Activo no corriente', 'Activo total',
  'Cuentas a pagar', 'Deuda corto plazo', 'Pasivo corriente',
  'Deuda largo plazo', 'Pasivo no corriente', 'Pasivo total',
  'Fondos propios', 'Beneficios retenidos', 'Acciones propias',
];

export function balanceToCsv(rows: BalanceRow[]): string {
  const body = rows.map((r) => [
    r.year,
    quarterLabel(r.quarter),
    num(r.cashAndCashEquivalents),
    num(r.shortTermInvestments),
    num(r.accountsReceivable),
    num(r.inventory),
    num(r.totalCurrentAssets),
    num(r.propertyPlantEquipment),
    num(r.goodwill),
    num(r.intangibleAssets),
    num(r.totalNonCurrentAssets),
    num(r.totalAssets),
    num(r.accountsPayable),
    num(r.shortTermDebt),
    num(r.totalCurrentLiabilities),
    num(r.longTermDebt),
    num(r.totalNonCurrentLiabilities),
    num(r.totalLiabilities),
    num(r.totalStockholdersEquity),
    num(r.retainedEarnings),
    num(r.treasuryStock),
  ]);
  return toCsv(BALANCE_HEADERS, body);
}

// ── Cash flow ───────────────────────────────────────────────────────────────

export interface CashFlowRow {
  year: number;
  quarter: number | null;
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
  capex: number | null;
  depreciation: number | null;
  freeCashFlow: number | null;
  dividendsPaid: number | null;
  shareRepurchases: number | null;
}

const CASHFLOW_HEADERS = [
  'Año', 'Período',
  'Flujo operativo', 'Flujo de inversión', 'Flujo de financiación',
  'CapEx', 'Depreciación', 'Free cash flow',
  'Dividendos pagados', 'Recompra de acciones',
];

export function cashFlowToCsv(rows: CashFlowRow[]): string {
  const body = rows.map((r) => [
    r.year,
    quarterLabel(r.quarter),
    num(r.operatingCashFlow),
    num(r.investingCashFlow),
    num(r.financingCashFlow),
    num(r.capex),
    num(r.depreciation),
    num(r.freeCashFlow ?? (r.operatingCashFlow != null && r.capex != null ? r.operatingCashFlow - r.capex : null)),
    num(r.dividendsPaid),
    num(r.shareRepurchases),
  ]);
  return toCsv(CASHFLOW_HEADERS, body);
}

// ── Company list / screener ─────────────────────────────────────────────────

export interface CompanyExportRow {
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  currentPrice: number | null;
  marketCap: number | null;
  pe: number | null;
  netMargin: number | null;
  fcfYield: number | null;
  ndEbitda: number | null;
}

const COMPANY_HEADERS = [
  'Ticker', 'Nombre', 'Sector', 'Industria', 'País', 'Moneda',
  'Precio', 'Market cap', 'P/E', 'Margen neto', 'FCF yield', 'ND/EBITDA',
];

export function companiesToCsv(rows: CompanyExportRow[]): string {
  const pct = (v: number | null): string => (v === null ? '' : `${(v * 100).toFixed(1)}%`);
  const x = (v: number | null, suffix = ''): string => (v === null ? '' : `${Number.isFinite(v) ? v.toFixed(2) : v}${suffix}`);
  const body = rows.map((r) => [
    r.ticker,
    r.name,
    r.sector ?? '',
    r.industry ?? '',
    r.country ?? '',
    r.currency ?? '',
    x(r.currentPrice),
    r.marketCap === null ? '' : String(Math.round(r.marketCap)),
    x(r.pe, 'x'),
    pct(r.netMargin),
    pct(r.fcfYield),
    x(r.ndEbitda, 'x'),
  ]);
  return toCsv(COMPANY_HEADERS, body);
}
