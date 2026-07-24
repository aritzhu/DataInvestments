// Catálogo unificado de campos: cada campo interno tiene tags de las 3 fuentes
// El admin puede añadir tags personalizados a cualquier fuente

export type FieldCategory =
  | 'income_statement'
  | 'cash_flow'
  | 'balance_sheet_assets'
  | 'balance_sheet_liabilities'
  | 'balance_sheet_equity'
  | 'shares_eps'
  | 'other';

export const FIELD_CATEGORIES: Record<FieldCategory, { label: string; color: string }> = {
  income_statement: { label: 'Income Statement', color: '#2563eb' },
  cash_flow: { label: 'Cash Flow', color: '#059669' },
  balance_sheet_assets: { label: 'Balance Sheet - Assets', color: '#7c3aed' },
  balance_sheet_liabilities: { label: 'Balance Sheet - Liabilities', color: '#dc2626' },
  balance_sheet_equity: { label: 'Balance Sheet - Equity', color: '#d97706' },
  shares_eps: { label: 'Shares & EPS', color: '#0891b2' },
  other: { label: 'Other', color: '#64748b' },
};

export interface FieldMappingEntry {
  fieldName: string;
  label: string;
  category: FieldCategory;
  description: string;
  defaultValue: number | null;
  sources: {
    sec: string[];       // XBRL tags (us-gaap namespace)
    european: string[];  // IFRS concepts
    yahoo: string[];     // Yahoo field names
  };
}

export const FIELD_MAPPING_CATALOG: FieldMappingEntry[] = [
  // ===== INCOME STATEMENT =====
  {
    fieldName: 'revenue',
    label: 'Revenue',
    category: 'income_statement',
    description: 'Ingresos por ventas o servicios',
    defaultValue: 0,
    sources: {
      sec: [
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'Revenues', 'Revenue', 'SalesRevenueNet', 'OperatingRevenue',
      ],
      european: [
        'ifrs-full:Revenue',
        'ifrs-full:RevenueFromContractsWithCustomers',
        'ifrs-full:RevenueFromInterest',
      ],
      yahoo: ['totalRevenue'],
    },
  },
  {
    fieldName: 'costOfRevenue',
    label: 'Cost of Revenue',
    category: 'income_statement',
    description: 'Costo directo de bienes o servicios vendidos',
    defaultValue: 0,
    sources: {
      sec: ['CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold'],
      european: ['ifrs-full:CostOfSales'],
      yahoo: [],
    },
  },
  {
    fieldName: 'grossProfit',
    label: 'Gross Profit',
    category: 'income_statement',
    description: 'Beneficio bruto (Revenue - COGS)',
    defaultValue: null,
    sources: {
      sec: ['GrossProfit', 'GrossProfitLoss'],
      european: ['ifrs-full:GrossProfit'],
      yahoo: [],
    },
  },
  {
    fieldName: 'operatingExpenses',
    label: 'Operating Expenses',
    category: 'income_statement',
    description: 'Gastos operativos totales',
    defaultValue: 0,
    sources: {
      sec: ['OperatingExpenses', 'OperatingCostsAndExpenses'],
      european: ['ifrs-full:OperatingExpenses'],
      yahoo: [],
    },
  },
  {
    fieldName: 'sgaExpense',
    label: 'SG&A Expense',
    category: 'income_statement',
    description: 'Gastos de ventas, generales y administrativos',
    defaultValue: 0,
    sources: {
      sec: ['SellingGeneralAndAdministrativeExpense', 'SellingAndAdministrativeExpense'],
      european: ['SellingGeneralAndAdministrativeExpense'],
      yahoo: [],
    },
  },
  {
    fieldName: 'rdExpense',
    label: 'R&D Expense',
    category: 'income_statement',
    description: 'Gastos de investigación y desarrollo',
    defaultValue: 0,
    sources: {
      sec: ['ResearchAndDevelopmentExpense'],
      european: ['ResearchAndDevelopmentExpense'],
      yahoo: [],
    },
  },
  {
    fieldName: 'interestExpense',
    label: 'Interest Expense',
    category: 'income_statement',
    description: 'Gastos por intereses',
    defaultValue: 0,
    sources: {
      sec: ['InterestExpense', 'InterestAndDebtExpense'],
      european: [
        'ifrs-full:FinanceCosts',
        'ifrs-full:InterestExpenseClassifiedAsOperatingActivities',
      ],
      yahoo: ['interestExpense'],
    },
  },
  {
    fieldName: 'taxExpense',
    label: 'Tax Expense',
    category: 'income_statement',
    description: 'Impuestos a la renta',
    defaultValue: 0,
    sources: {
      sec: ['IncomeTaxExpenseBenefit', 'ProvisionForIncomeTaxes'],
      european: [
        'ifrs-full:IncomeTaxExpense',
        'ifrs-full:IncomeTaxExpenseContinuingOperations',
      ],
      yahoo: [],
    },
  },
  {
    fieldName: 'netIncome',
    label: 'Net Income',
    category: 'income_statement',
    description: 'Beneficio neto',
    defaultValue: 0,
    sources: {
      sec: ['NetIncomeLoss', 'ProfitLoss'],
      european: ['ifrs-full:ProfitLoss'],
      yahoo: ['netIncome'],
    },
  },
  {
    fieldName: 'ebit',
    label: 'EBIT',
    category: 'income_statement',
    description: 'Beneficio antes de intereses e impuestos',
    defaultValue: null,
    sources: {
      sec: ['OperatingIncomeLoss'],
      european: [
        'ifrs-full:OperatingProfitLoss',
        'ifrs-full:ProfitLossFromOperatingActivities',
        'ifrs-full:OperatingIncome',
        'ifrs-full:EBITDA',
      ],
      yahoo: ['operatingIncome'],
    },
  },
  {
    fieldName: 'ebitda',
    label: 'EBITDA',
    category: 'income_statement',
    description: 'EBITDA (calculado: EBIT + Depreciación)',
    defaultValue: null,
    sources: {
      sec: [],  // Calculado en código
      european: ['ifrs-full:EBITDA'],
      yahoo: [],
    },
  },
  {
    fieldName: 'stockBasedCompensation',
    label: 'Stock-Based Compensation',
    category: 'income_statement',
    description: 'Gasto por compensación con acciones (no efectivo)',
    defaultValue: null,
    sources: {
      sec: ['ShareBasedCompensation', 'AllocatedShareBasedCompensationExpense'],
      european: [],
      yahoo: [],
    },
  },

  // ===== CASH FLOW =====
  {
    fieldName: 'capex',
    label: 'CapEx',
    category: 'cash_flow',
    description: 'Inversiones en capital fijo',
    defaultValue: 0,
    sources: {
      sec: [
        'PaymentsToAcquirePropertyPlantAndEquipment',
        'CapitalExpenditure', 'CapitalExpenditures',
      ],
      european: [
        'ifrs-full:PurchaseOfPropertyPlantAndEquipment',
        'ifrs-full:PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets',
      ],
      yahoo: ['capitalExpenditures'],
    },
  },
  {
    fieldName: 'depreciation',
    label: 'Depreciation & Amortization',
    category: 'cash_flow',
    description: 'Depreciación y amortización',
    defaultValue: 0,
    sources: {
      sec: [
        'DepreciationAndAmortization',
        'DepreciationDepletionAndAmortization',
        'Depreciation',
      ],
      european: [
        'ifrs-full:DepreciationAmortisationCharge',
        'ifrs-full:DepreciationAndAmortisationExpense',
      ],
      yahoo: [],
    },
  },
  {
    fieldName: 'operatingCashFlow',
    label: 'Operating Cash Flow',
    category: 'cash_flow',
    description: 'Flujo de caja operativo',
    defaultValue: null,
    sources: {
      sec: [
        'NetCashProvidedByUsedInOperatingActivities',
        'NetCashProvidedByOperatingActivities',
        'NetCashUsedInOperatingActivities',
      ],
      european: ['ifrs-full:CashFlowsFromUsedInOperatingActivities'],
      yahoo: ['totalCashflowsFromOperatingActivities'],
    },
  },
  {
    fieldName: 'investingCashFlow',
    label: 'Investing Cash Flow',
    category: 'cash_flow',
    description: 'Flujo de caja de inversión',
    defaultValue: null,
    sources: {
      sec: [
        'NetCashProvidedByUsedInInvestingActivities',
        'NetCashUsedForInvestingActivites',
        'NetCashUsedInInvestingActivities',
      ],
      european: ['ifrs-full:CashFlowsFromUsedInInvestingActivities'],
      yahoo: [],
    },
  },
  {
    fieldName: 'financingCashFlow',
    label: 'Financing Cash Flow',
    category: 'cash_flow',
    description: 'Flujo de caja de financiación',
    defaultValue: null,
    sources: {
      sec: [
        'NetCashProvidedByUsedInFinancingActivities',
        'NetCashUsedProvidedByFinancingActivities',
        'NetCashUsedInFinancingActivities',
      ],
      european: ['ifrs-full:CashFlowsFromUsedInFinancingActivities'],
      yahoo: [],
    },
  },
  {
    fieldName: 'dividendsPaid',
    label: 'Dividends Paid',
    category: 'cash_flow',
    description: 'Dividendos pagados',
    defaultValue: null,
    sources: {
      sec: ['PaymentsOfDividends', 'DividendsPaid'],
      european: [
        'ifrs-full:DividendsPaid',
        'ifrs-full:DividendsPaidClassifiedAsFinancingActivities',
      ],
      yahoo: [],
    },
  },
  {
    fieldName: 'shareRepurchases',
    label: 'Share Repurchases',
    category: 'cash_flow',
    description: 'Recompra de acciones',
    defaultValue: null,
    sources: {
      sec: [
        'PaymentsForRepurchaseOfCommonStock',
        'RepurchaseOfCommonStock',
        'ShareRepurchases',
      ],
      european: ['PurchaseOfTreasuryShares'],
      yahoo: [],
    },
  },
  {
    fieldName: 'amortization',
    label: 'Amortization',
    category: 'cash_flow',
    description: 'Amortización de activos intangibles',
    defaultValue: null,
    sources: {
      sec: [
        'AmortizationOfIntangibleAssets',
        'FiniteLivedIntangibleAssetsAmortizationExpense',
      ],
      european: [],
      yahoo: [],
    },
  },

  // ===== BALANCE SHEET - ASSETS =====
  {
    fieldName: 'totalAssets',
    label: 'Total Assets',
    category: 'balance_sheet_assets',
    description: 'Total de activos',
    defaultValue: null,
    sources: {
      sec: ['Assets', 'AssetsCurrent'],
      european: ['ifrs-full:Assets'],
      yahoo: ['totalAssets'],
    },
  },
  {
    fieldName: 'cash',
    label: 'Cash & Equivalents',
    category: 'balance_sheet_assets',
    description: 'Efectivo y equivalentes',
    defaultValue: null,
    sources: {
      sec: [
        'CashAndCashEquivalentsAtCarryingValue',
        'CashCashEquivalentsAndShortTermInvestments',
      ],
      european: ['ifrs-full:CashAndCashEquivalents'],
      yahoo: ['cashAndCashEquivalents'],
    },
  },
  {
    fieldName: 'receivables',
    label: 'Accounts Receivable',
    category: 'balance_sheet_assets',
    description: 'Cuentas por cobrar',
    defaultValue: null,
    sources: {
      sec: ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'AccountsReceivableNet'],
      european: [
        'ifrs-full:TradeAndOtherReceivables',
        'ifrs-full:TradeAndOtherCurrentReceivables',
      ],
      yahoo: [],
    },
  },
  {
    fieldName: 'inventory',
    label: 'Inventory',
    category: 'balance_sheet_assets',
    description: 'Inventario',
    defaultValue: null,
    sources: {
      sec: ['InventoryNet', 'Inventory', 'InventoryCurrent'],
      european: ['ifrs-full:Inventories'],
      yahoo: ['inventory'],
    },
  },
  {
    fieldName: 'currentAssets',
    label: 'Current Assets',
    category: 'balance_sheet_assets',
    description: 'Activos corrientes',
    defaultValue: null,
    sources: {
      sec: ['AssetsCurrent'],
      european: ['ifrs-full:CurrentAssets'],
      yahoo: ['totalCurrentAssets'],
    },
  },
  {
    fieldName: 'shortTermInvestments',
    label: 'Short-Term Investments',
    category: 'balance_sheet_assets',
    description: 'Inversiones a corto plazo',
    defaultValue: null,
    sources: {
      sec: ['ShortTermInvestments', 'MarketableSecuritiesCurrent'],
      european: [],
      yahoo: [],
    },
  },
  {
    fieldName: 'ppe',
    label: 'Property, Plant & Equipment',
    category: 'balance_sheet_assets',
    description: 'Propiedad, planta y equipo',
    defaultValue: null,
    sources: {
      sec: ['PropertyPlantAndEquipmentNet', 'PropertyPlantAndEquipmentGross'],
      european: ['ifrs-full:PropertyPlantAndEquipment'],
      yahoo: [],
    },
  },
  {
    fieldName: 'goodwill',
    label: 'Goodwill',
    category: 'balance_sheet_assets',
    description: 'Fondo de comercio',
    defaultValue: null,
    sources: {
      sec: ['Goodwill'],
      european: ['ifrs-full:Goodwill'],
      yahoo: [],
    },
  },
  {
    fieldName: 'intangibleAssets',
    label: 'Intangible Assets',
    category: 'balance_sheet_assets',
    description: 'Activos intangibles',
    defaultValue: null,
    sources: {
      sec: ['IntangibleAssetsNetExcludingGoodwill', 'IntangibleAssetsNet'],
      european: [
        'ifrs-full:IntangibleAssets',
        'ifrs-full:IntangibleAssetsOtherThanGoodwill',
      ],
      yahoo: [],
    },
  },

  // ===== BALANCE SHEET - LIABILITIES =====
  {
    fieldName: 'totalLiabilities',
    label: 'Total Liabilities',
    category: 'balance_sheet_liabilities',
    description: 'Total de pasivos',
    defaultValue: null,
    sources: {
      sec: ['Liabilities', 'LiabilitiesCurrent'],
      european: ['ifrs-full:Liabilities'],
      yahoo: ['totalLiabilities'],
    },
  },
  {
    fieldName: 'currentLiabilities',
    label: 'Current Liabilities',
    category: 'balance_sheet_liabilities',
    description: 'Pasivos corrientes',
    defaultValue: null,
    sources: {
      sec: ['LiabilitiesCurrent'],
      european: ['ifrs-full:CurrentLiabilities'],
      yahoo: ['totalCurrentLiabilities'],
    },
  },
  {
    fieldName: 'accountsPayable',
    label: 'Accounts Payable',
    category: 'balance_sheet_liabilities',
    description: 'Cuentas por pagar',
    defaultValue: null,
    sources: {
      sec: ['AccountsPayable', 'AccountsPayableCurrent'],
      european: [
        'ifrs-full:TradeAndOtherPayables',
        'ifrs-full:TradeAndOtherCurrentPayables',
      ],
      yahoo: [],
    },
  },
  {
    fieldName: 'shortTermDebt',
    label: 'Short-Term Debt',
    category: 'balance_sheet_liabilities',
    description: 'Deuda a corto plazo',
    defaultValue: null,
    sources: {
      sec: ['DebtCurrent', 'LongTermDebtCurrent', 'ShortTermBorrowings'],
      european: [
        'ifrs-full:ShorttermBorrowings',
        'ifrs-full:CurrentLeaseLiabilities',
      ],
      yahoo: [],
    },
  },
  {
    fieldName: 'longTermDebt',
    label: 'Long-Term Debt',
    category: 'balance_sheet_liabilities',
    description: 'Deuda a largo plazo',
    defaultValue: null,
    sources: {
      sec: ['LongTermDebtNoncurrent', 'LongTermDebt'],
      european: [
        'ifrs-full:LongtermBorrowings',
        'ifrs-full:NoncurrentLeaseLiabilities',
      ],
      yahoo: [],
    },
  },
  {
    fieldName: 'operatingLeaseLiability',
    label: 'Operating Lease Liability',
    category: 'balance_sheet_liabilities',
    description: 'Pasivo por arrendamiento operativo',
    defaultValue: null,
    sources: {
      sec: ['OperatingLeaseLiability', 'OperatingLeaseLiabilityNoncurrent'],
      european: [],
      yahoo: [],
    },
  },
  {
    fieldName: 'deferredTaxLiabilities',
    label: 'Deferred Tax Liabilities',
    category: 'balance_sheet_liabilities',
    description: 'Pasivos por impuestos diferidos',
    defaultValue: null,
    sources: {
      sec: [
        'DeferredIncomeTaxLiabilities',
        'DeferredIncomeTaxLiabilitiesNet',
        'DeferredTaxLiabilities',
      ],
      european: [],
      yahoo: [],
    },
  },

  // ===== BALANCE SHEET - EQUITY =====
  {
    fieldName: 'totalEquity',
    label: 'Total Equity',
    category: 'balance_sheet_equity',
    description: 'Patrimonio neto',
    defaultValue: null,
    sources: {
      sec: ['StockholdersEquity', 'Equity'],
      european: [
        'ifrs-full:Equity',
        'ifrs-full:EquityAttributableToOwnersOfParent',
      ],
      yahoo: ['totalStockholderEquity'],
    },
  },
  {
    fieldName: 'retainedEarnings',
    label: 'Retained Earnings',
    category: 'balance_sheet_equity',
    description: 'Beneficios acumulados',
    defaultValue: null,
    sources: {
      sec: ['RetainedEarningsAccumulatedDeficit', 'RetainedEarnings'],
      european: ['ifrs-full:RetainedEarnings'],
      yahoo: ['retainedEarnings'],
    },
  },
  {
    fieldName: 'paidInCapital',
    label: 'Paid-in Capital',
    category: 'balance_sheet_equity',
    description: 'Capital pagado',
    defaultValue: null,
    sources: {
      sec: ['CommonStocksIncludingAdditionalPaidInCapital'],
      european: [],
      yahoo: [],
    },
  },
  {
    fieldName: 'treasuryStock',
    label: 'Treasury Stock',
    category: 'balance_sheet_equity',
    description: 'Acciones en tesorería',
    defaultValue: null,
    sources: {
      sec: ['TreasuryStockValueAcquiredCostMethod', 'TreasuryStockCommon'],
      european: [],
      yahoo: [],
    },
  },
  {
    fieldName: 'aoci',
    label: 'Accumulated OCI',
    category: 'balance_sheet_equity',
    description: 'Otro resultado integral acumulado',
    defaultValue: null,
    sources: {
      sec: ['AccumulatedOtherComprehensiveIncomeLossNetOfTax'],
      european: [],
      yahoo: [],
    },
  },

  // ===== SHARES & EPS =====
  {
    fieldName: 'sharesOutstanding',
    label: 'Shares Outstanding',
    category: 'shares_eps',
    description: 'Acciones en circulación',
    defaultValue: null,
    sources: {
      sec: ['EntityCommonStockSharesOutstanding'],
      european: ['ifrs-full:NumberofSharesIssued'],
      yahoo: [],
    },
  },
  {
    fieldName: 'dilutedShares',
    label: 'Diluted Shares',
    category: 'shares_eps',
    description: 'Acciones diluidas promedio',
    defaultValue: null,
    sources: {
      sec: ['WeightedAverageNumberOfDilutedSharesOutstanding'],
      european: [],
      yahoo: [],
    },
  },
  {
    fieldName: 'epsBasic',
    label: 'EPS Basic',
    category: 'shares_eps',
    description: 'Beneficio por acción básico',
    defaultValue: null,
    sources: {
      sec: ['EarningsPerShareBasic'],
      european: [],
      yahoo: [],
    },
  },
  {
    fieldName: 'epsDiluted',
    label: 'EPS Diluted',
    category: 'shares_eps',
    description: 'Beneficio por acción diluido',
    defaultValue: null,
    sources: {
      sec: ['EarningsPerShareDiluted'],
      european: [],
      yahoo: [],
    },
  },

  // ===== OTHER =====
  {
    fieldName: 'otherIncomeExpense',
    label: 'Other Income (Expense)',
    category: 'other',
    description: 'Otros ingresos/gastos no operativos',
    defaultValue: null,
    sources: {
      sec: ['OtherNonoperatingIncomeExpense', 'OtherIncomeExpense'],
      european: [],
      yahoo: [],
    },
  },
  {
    fieldName: 'gainOnDisposal',
    label: 'Gain/Loss on Disposal',
    category: 'other',
    description: 'Ganancia/pérdida por disposición de activos',
    defaultValue: null,
    sources: {
      sec: ['GainLossOnSaleOfPropertyPlantEquipment'],
      european: [],
      yahoo: [],
    },
  },
  {
    fieldName: 'comprehensiveIncome',
    label: 'Comprehensive Income',
    category: 'other',
    description: 'Otro resultado integral del período',
    defaultValue: null,
    sources: {
      sec: ['OtherComprehensiveIncomeLossNetOfTax'],
      european: [],
      yahoo: [],
    },
  },
];

// Helpers
export function getFieldByName(fieldName: string): FieldMappingEntry | undefined {
  return FIELD_MAPPING_CATALOG.find((f) => f.fieldName === fieldName);
}

export function getFieldsByCategory(category: FieldCategory): FieldMappingEntry[] {
  return FIELD_MAPPING_CATALOG.filter((f) => f.category === category);
}

/** Get all tags for a field+source, including any custom tags from FieldConfig */
export function getTagsForFieldSource(
  fieldName: string,
  source: 'sec' | 'european' | 'yahoo',
  customTags: string[] = []
): string[] {
  const entry = getFieldByName(fieldName);
  const baseTags = entry?.sources[source] || [];
  return [...baseTags, ...customTags.filter((t) => !baseTags.includes(t))];
}
