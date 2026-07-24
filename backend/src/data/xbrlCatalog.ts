// Catálogo de XBRL tags disponibles para importación desde SEC EDGAR
// Organizados por categoría con tags alternativos en orden de prioridad

export interface FieldCatalogEntry {
  fieldName: string;
  label: string;
  category: FieldCategory;
  source: 'sec' | 'european' | 'yahoo';
  xbrlTags: string[];
  defaultValue: number | null;
  description: string;
}

export type FieldCategory =
  | 'income_statement'
  | 'cash_flow'
  | 'balance_sheet_assets'
  | 'balance_sheet_liabilities'
  | 'balance_sheet_equity'
  | 'shares_eps'
  | 'deferred_taxes'
  | 'leases'
  | 'debt_detail'
  | 'other';

export const FIELD_CATEGORIES: Record<FieldCategory, { label: string; color: string }> = {
  income_statement: { label: 'Income Statement', color: '#2563eb' },
  cash_flow: { label: 'Cash Flow', color: '#059669' },
  balance_sheet_assets: { label: 'Balance Sheet - Assets', color: '#7c3aed' },
  balance_sheet_liabilities: { label: 'Balance Sheet - Liabilities', color: '#dc2626' },
  balance_sheet_equity: { label: 'Balance Sheet - Equity', color: '#d97706' },
  shares_eps: { label: 'Shares & EPS', color: '#0891b2' },
  deferred_taxes: { label: 'Deferred Taxes', color: '#4f46e5' },
  leases: { label: 'Leases', color: '#be185d' },
  debt_detail: { label: 'Debt Detail', color: '#9333ea' },
  other: { label: 'Other', color: '#64748b' },
};

// ===== CAMPOS ACTUALES (ya importados) =====
export const EXISTING_FIELDS: FieldCatalogEntry[] = [
  // Income Statement
  {
    fieldName: 'revenue',
    label: 'Revenue',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: [
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'Revenues',
      'Revenue',
      'SalesRevenueNet',
      'OperatingRevenue',
    ],
    defaultValue: 0,
    description: 'Ingresos por ventas o servicios',
  },
  {
    fieldName: 'costOfRevenue',
    label: 'Cost of Revenue',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold'],
    defaultValue: 0,
    description: 'Costo directo de bienes o servicios vendidos',
  },
  {
    fieldName: 'grossProfit',
    label: 'Gross Profit',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['GrossProfit', 'GrossProfitLoss'],
    defaultValue: null,
    description: 'Beneficio bruto (Revenue - COGS)',
  },
  {
    fieldName: 'operatingExpenses',
    label: 'Operating Expenses',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['OperatingExpenses', 'OperatingCostsAndExpenses'],
    defaultValue: 0,
    description: 'Gastos operativos totales',
  },
  {
    fieldName: 'sgaExpense',
    label: 'SG&A Expense',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['SellingGeneralAndAdministrativeExpense', 'SellingAndAdministrativeExpense'],
    defaultValue: 0,
    description: 'Gastos de ventas, generales y administrativos',
  },
  {
    fieldName: 'rdExpense',
    label: 'R&D Expense',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['ResearchAndDevelopmentExpense'],
    defaultValue: 0,
    description: 'Gastos de investigación y desarrollo',
  },
  {
    fieldName: 'interestExpense',
    label: 'Interest Expense',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['InterestExpense', 'InterestAndDebtExpense'],
    defaultValue: 0,
    description: 'Gastos por intereses',
  },
  {
    fieldName: 'taxExpense',
    label: 'Tax Expense',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['IncomeTaxExpenseBenefit', 'ProvisionForIncomeTaxes'],
    defaultValue: 0,
    description: 'Impuestos a la renta',
  },
  {
    fieldName: 'netIncome',
    label: 'Net Income',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['NetIncomeLoss', 'ProfitLoss'],
    defaultValue: 0,
    description: 'Beneficio neto',
  },
  {
    fieldName: 'ebit',
    label: 'EBIT',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['OperatingIncomeLoss'],
    defaultValue: null,
    description: 'Beneficio antes de intereses e impuestos',
  },
  {
    fieldName: 'ebitda',
    label: 'EBITDA',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: ['DepreciationAndAmortization'],
    defaultValue: null,
    description: 'EBITDA (calculado: EBIT + Depreciación)',
  },
  // Cash Flow
  {
    fieldName: 'capex',
    label: 'CapEx',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: [
      'PaymentsToAcquirePropertyPlantAndEquipment',
      'CapitalExpenditure',
      'CapitalExpenditures',
    ],
    defaultValue: 0,
    description: 'Inversiones en capital fijo',
  },
  {
    fieldName: 'depreciation',
    label: 'Depreciation',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: [
      'DepreciationAndAmortization',
      'DepreciationDepletionAndAmortization',
      'Depreciation',
    ],
    defaultValue: 0,
    description: 'Depreciación y amortización',
  },
  {
    fieldName: 'operatingCashFlow',
    label: 'Operating Cash Flow',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: [
      'NetCashProvidedByUsedInOperatingActivities',
      'NetCashProvidedByOperatingActivities',
      'NetCashUsedInOperatingActivities',
    ],
    defaultValue: null,
    description: 'Flujo de caja operativo',
  },
  {
    fieldName: 'investingCashFlow',
    label: 'Investing Cash Flow',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: [
      'NetCashProvidedByUsedInInvestingActivities',
      'NetCashUsedForInvestingActivites',
      'NetCashUsedInInvestingActivities',
    ],
    defaultValue: null,
    description: 'Flujo de caja de inversión',
  },
  {
    fieldName: 'financingCashFlow',
    label: 'Financing Cash Flow',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: [
      'NetCashProvidedByUsedInFinancingActivities',
      'NetCashUsedProvidedByFinancingActivities',
      'NetCashUsedInFinancingActivities',
    ],
    defaultValue: null,
    description: 'Flujo de caja de financiación',
  },
  {
    fieldName: 'dividendsPaid',
    label: 'Dividends Paid',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: ['PaymentsOfDividends', 'DividendsPaid'],
    defaultValue: null,
    description: 'Dividendos pagados',
  },
  {
    fieldName: 'shareRepurchases',
    label: 'Share Repurchases',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: [
      'PaymentsForRepurchaseOfCommonStock',
      'RepurchaseOfCommonStock',
      'ShareRepurchases',
    ],
    defaultValue: null,
    description: 'Recompra de acciones',
  },
  // Balance Sheet - Assets
  {
    fieldName: 'totalAssets',
    label: 'Total Assets',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['Assets', 'AssetsCurrent'],
    defaultValue: null,
    description: 'Total de activos',
  },
  {
    fieldName: 'cash',
    label: 'Cash & Equivalents',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: [
      'CashAndCashEquivalentsAtCarryingValue',
      'CashCashEquivalentsAndShortTermInvestments',
    ],
    defaultValue: null,
    description: 'Efectivo y equivalentes',
  },
  {
    fieldName: 'receivables',
    label: 'Accounts Receivable',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'AccountsReceivableNet'],
    defaultValue: null,
    description: 'Cuentas por cobrar',
  },
  {
    fieldName: 'inventory',
    label: 'Inventory',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['InventoryNet', 'Inventory', 'InventoryCurrent'],
    defaultValue: null,
    description: 'Inventario',
  },
  {
    fieldName: 'currentAssets',
    label: 'Current Assets',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['AssetsCurrent'],
    defaultValue: null,
    description: 'Activos corrientes',
  },
  {
    fieldName: 'ppe',
    label: 'Property, Plant & Equipment',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['PropertyPlantAndEquipmentNet', 'PropertyPlantAndEquipmentGross'],
    defaultValue: null,
    description: 'Propiedad, planta y equipo',
  },
  {
    fieldName: 'goodwill',
    label: 'Goodwill',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['Goodwill', 'GoodwillImpairmentLoss'],
    defaultValue: null,
    description: 'Fondo de comercio',
  },
  {
    fieldName: 'intangibleAssets',
    label: 'Intangible Assets',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['IntangibleAssetsNetExcludingGoodwill', 'IntangibleAssetsNet'],
    defaultValue: null,
    description: 'Activos intangibles',
  },
  // Balance Sheet - Liabilities
  {
    fieldName: 'totalLiabilities',
    label: 'Total Liabilities',
    category: 'balance_sheet_liabilities',
    source: 'sec',
    xbrlTags: ['Liabilities', 'LiabilitiesCurrent'],
    defaultValue: null,
    description: 'Total de pasivos',
  },
  {
    fieldName: 'currentLiabilities',
    label: 'Current Liabilities',
    category: 'balance_sheet_liabilities',
    source: 'sec',
    xbrlTags: ['LiabilitiesCurrent'],
    defaultValue: null,
    description: 'Pasivos corrientes',
  },
  {
    fieldName: 'accountsPayable',
    label: 'Accounts Payable',
    category: 'balance_sheet_liabilities',
    source: 'sec',
    xbrlTags: ['AccountsPayable', 'AccountsPayableCurrent'],
    defaultValue: null,
    description: 'Cuentas por pagar',
  },
  {
    fieldName: 'shortTermDebt',
    label: 'Short-Term Debt',
    category: 'balance_sheet_liabilities',
    source: 'sec',
    xbrlTags: ['DebtCurrent', 'LongTermDebtCurrent', 'ShortTermBorrowings'],
    defaultValue: null,
    description: 'Deuda a corto plazo',
  },
  {
    fieldName: 'longTermDebt',
    label: 'Long-Term Debt',
    category: 'balance_sheet_liabilities',
    source: 'sec',
    xbrlTags: ['LongTermDebtNoncurrent', 'LongTermDebt'],
    defaultValue: null,
    description: 'Deuda a largo plazo',
  },
  // Balance Sheet - Equity
  {
    fieldName: 'totalEquity',
    label: 'Total Equity',
    category: 'balance_sheet_equity',
    source: 'sec',
    xbrlTags: ['StockholdersEquity', 'Equity'],
    defaultValue: null,
    description: 'Patrimonio neto',
  },
  {
    fieldName: 'retainedEarnings',
    label: 'Retained Earnings',
    category: 'balance_sheet_equity',
    source: 'sec',
    xbrlTags: ['RetainedEarningsAccumulatedDeficit', 'RetainedEarnings'],
    defaultValue: null,
    description: 'Beneficios acumulados',
  },
  // Shares
  {
    fieldName: 'sharesOutstanding',
    label: 'Shares Outstanding',
    category: 'shares_eps',
    source: 'sec',
    xbrlTags: ['EntityCommonStockSharesOutstanding'],
    defaultValue: null,
    description: 'Acciones en circulación',
  },
];

// ===== CAMPOS NUEVOS (disponibles para activar) =====
export const NEW_FIELDS: FieldCatalogEntry[] = [
  // Income Statement - Extended
  {
    fieldName: 'stockBasedCompensation',
    label: 'Stock-Based Compensation',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: [
      'ShareBasedCompensation',
      'AllocatedShareBasedCompensationExpense',
    ],
    defaultValue: null,
    description: 'Gasto por compensación con acciones (no efectivo)',
  },
  {
    fieldName: 'otherOperatingExpense',
    label: 'Other Operating Expense',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: [
      'OtherOperatingExpense',
      'OtherCostAndOperatingExpense',
    ],
    defaultValue: null,
    description: 'Otros gastos operativos',
  },
  {
    fieldName: 'otherIncomeExpense',
    label: 'Other Income (Expense)',
    category: 'income_statement',
    source: 'sec',
    xbrlTags: [
      'OtherNonoperatingIncomeExpense',
      'OtherIncomeExpense',
    ],
    defaultValue: null,
    description: 'Otros ingresos/gastos no operativos',
  },

  // Cash Flow - Extended
  {
    fieldName: 'amortization',
    label: 'Amortization',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: [
      'AmortizationOfIntangibleAssets',
      'FiniteLivedIntangibleAssetsAmortizationExpense',
    ],
    defaultValue: null,
    description: 'Amortización de activos intangibles',
  },
  {
    fieldName: 'depreciationAmortizationAccretion',
    label: 'D&A + Accretion',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: ['DepreciationAmortizationAndAccretionNet'],
    defaultValue: null,
    description: 'Depreciación, amortización y aceleración combinada',
  },
  {
    fieldName: 'proceedsFromDebt',
    label: 'Proceeds from Debt',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: ['ProceedsFromIssuanceOfLongTermDebt'],
    defaultValue: null,
    description: 'Ingresos por emisión de deuda',
  },
  {
    fieldName: 'repaymentsOfDebt',
    label: 'Repayments of Debt',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: ['RepaymentsOfLongTermDebt'],
    defaultValue: null,
    description: 'Pagos de deuda',
  },
  {
    fieldName: 'proceedsFromStockIssuance',
    label: 'Proceeds from Stock',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: ['ProceedsFromIssuanceOfCommonStock'],
    defaultValue: null,
    description: 'Ingresos por emisión de acciones',
  },
  {
    fieldName: 'acquisitionsSpent',
    label: 'Acquisitions',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: ['PaymentsToAcquireBusinessesNetOfCashAcquired'],
    defaultValue: null,
    description: 'Pagos por adquisiciones',
  },
  {
    fieldName: 'softwareCapitalized',
    label: 'Software Capitalized',
    category: 'cash_flow',
    source: 'sec',
    xbrlTags: [
      'CapitalizedSoftwareCosts',
      'PaymentsToAcquireSoftwareForUse',
    ],
    defaultValue: null,
    description: 'Costos de software capitalizados',
  },

  // Balance Sheet - Assets - Extended
  {
    fieldName: 'shortTermInvestments',
    label: 'Short-Term Investments',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: [
      'ShortTermInvestments',
      'MarketableSecuritiesCurrent',
    ],
    defaultValue: null,
    description: 'Inversiones a corto plazo / valores negociables',
  },
  {
    fieldName: 'restrictedCash',
    label: 'Restricted Cash',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: [
      'RestrictedCashAndCashEquivalentsAtCarryingValue',
    ],
    defaultValue: null,
    description: 'Efectivo restringido',
  },
  {
    fieldName: 'otherCurrentAssets',
    label: 'Other Current Assets',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['OtherAssetsCurrent'],
    defaultValue: null,
    description: 'Otros activos corrientes',
  },
  {
    fieldName: 'otherNoncurrentAssets',
    label: 'Other Non-Current Assets',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['OtherAssetsNoncurrent'],
    defaultValue: null,
    description: 'Otros activos no corrientes',
  },
  {
    fieldName: 'finiteLivedIntangibles',
    label: 'Finite-Lived Intangibles',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: [
      'FiniteLivedIntangibleAssetsNet',
      'FiniteLivedIntangibleAssetsGross',
    ],
    defaultValue: null,
    description: 'Intangibles de vida finita (neto)',
  },
  {
    fieldName: 'indefiniteLivedIntangibles',
    label: 'Indefinite-Lived Intangibles',
    category: 'balance_sheet_assets',
    source: 'sec',
    xbrlTags: ['IndefiniteLivedIntangibleAssetsExcludingGoodwill'],
    defaultValue: null,
    description: 'Intangibles de vida indefinida',
  },

  // Balance Sheet - Liabilities - Extended
  {
    fieldName: 'otherCurrentLiabilities',
    label: 'Other Current Liabilities',
    category: 'balance_sheet_liabilities',
    source: 'sec',
    xbrlTags: [
      'OtherLiabilitiesCurrent',
      'OtherAccruedLiabilitiesCurrent',
    ],
    defaultValue: null,
    description: 'Otros pasivos corrientes',
  },
  {
    fieldName: 'otherNoncurrentLiabilities',
    label: 'Other Non-Current Liabilities',
    category: 'balance_sheet_liabilities',
    source: 'sec',
    xbrlTags: ['OtherLiabilitiesNoncurrent'],
    defaultValue: null,
    description: 'Otros pasivos no corrientes',
  },
  {
    fieldName: 'totalDebt',
    label: 'Total Debt',
    category: 'balance_sheet_liabilities',
    source: 'sec',
    xbrlTags: [
      'LongTermDebtAndCapitalLeaseObligations',
      'LongTermDebtNoncurrent',
    ],
    defaultValue: null,
    description: 'Total de deuda (corriente + no corriente)',
  },

  // Balance Sheet - Equity - Extended
  {
    fieldName: 'paidInCapital',
    label: 'Paid-in Capital',
    category: 'balance_sheet_equity',
    source: 'sec',
    xbrlTags: [
      'CommonStocksIncludingAdditionalPaidInCapital',
    ],
    defaultValue: null,
    description: 'Capital pagado (par + prima)',
  },
  {
    fieldName: 'treasuryStock',
    label: 'Treasury Stock',
    category: 'balance_sheet_equity',
    source: 'sec',
    xbrlTags: [
      'TreasuryStockValueAcquiredCostMethod',
      'TreasuryStockCommon',
    ],
    defaultValue: null,
    description: 'Acciones en tesorería',
  },
  {
    fieldName: 'aoci',
    label: 'Accumulated OCI',
    category: 'balance_sheet_equity',
    source: 'sec',
    xbrlTags: [
      'AccumulatedOtherComprehensiveIncomeLossNetOfTax',
    ],
    defaultValue: null,
    description: 'Otro resultado integral acumulado',
  },
  {
    fieldName: 'noncontrollingInterest',
    label: 'Noncontrolling Interest',
    category: 'balance_sheet_equity',
    source: 'sec',
    xbrlTags: ['NoncontrollingInterest'],
    defaultValue: null,
    description: 'Interés minoritario',
  },

  // Shares & EPS
  {
    fieldName: 'dilutedShares',
    label: 'Diluted Shares',
    category: 'shares_eps',
    source: 'sec',
    xbrlTags: [
      'WeightedAverageNumberOfDilutedSharesOutstanding',
    ],
    defaultValue: null,
    description: 'Acciones diluidas promedio',
  },
  {
    fieldName: 'epsBasic',
    label: 'EPS Basic',
    category: 'shares_eps',
    source: 'sec',
    xbrlTags: ['EarningsPerShareBasic'],
    defaultValue: null,
    description: 'Beneficio por acción básico',
  },
  {
    fieldName: 'epsDiluted',
    label: 'EPS Diluted',
    category: 'shares_eps',
    source: 'sec',
    xbrlTags: ['EarningsPerShareDiluted'],
    defaultValue: null,
    description: 'Beneficio por acción diluido',
  },
  {
    fieldName: 'basicShares',
    label: 'Basic Shares',
    category: 'shares_eps',
    source: 'sec',
    xbrlTags: ['WeightedAverageNumberOfSharesOutstandingBasic'],
    defaultValue: null,
    description: 'Acciones básicas promedio',
  },

  // Deferred Taxes
  {
    fieldName: 'deferredTaxAssets',
    label: 'Deferred Tax Assets',
    category: 'deferred_taxes',
    source: 'sec',
    xbrlTags: [
      'DeferredIncomeTaxAssetsNet',
      'DeferredTaxAssetsNet',
    ],
    defaultValue: null,
    description: 'Activos por impuestos diferidos',
  },
  {
    fieldName: 'deferredTaxLiabilities',
    label: 'Deferred Tax Liabilities',
    category: 'deferred_taxes',
    source: 'sec',
    xbrlTags: [
      'DeferredIncomeTaxLiabilities',
      'DeferredIncomeTaxLiabilitiesNet',
      'DeferredTaxLiabilities',
    ],
    defaultValue: null,
    description: 'Pasivos por impuestos diferidos',
  },
  {
    fieldName: 'deferredTaxExpense',
    label: 'Deferred Tax Expense',
    category: 'deferred_taxes',
    source: 'sec',
    xbrlTags: ['DeferredIncomeTaxExpenseBenefit'],
    defaultValue: null,
    description: 'Gasto por impuestos diferidos',
  },
  {
    fieldName: 'deferredTaxAssetsLiabilitiesNet',
    label: 'Deferred Tax Net',
    category: 'deferred_taxes',
    source: 'sec',
    xbrlTags: ['DeferredTaxAssetsLiabilitiesNet'],
    defaultValue: null,
    description: 'Posición neta de impuestos diferidos',
  },

  // Leases
  {
    fieldName: 'operatingLeaseLiability',
    label: 'Operating Lease Liability',
    category: 'leases',
    source: 'sec',
    xbrlTags: [
      'OperatingLeaseLiability',
      'OperatingLeaseLiabilityNoncurrent',
    ],
    defaultValue: null,
    description: 'Pasivo por arrendamiento operativo (ASC 842)',
  },
  {
    fieldName: 'operatingLeaseLiabilityCurrent',
    label: 'Operating Lease - Current',
    category: 'leases',
    source: 'sec',
    xbrlTags: ['OperatingLeaseLiabilityCurrent'],
    defaultValue: null,
    description: 'Pasivo operativo corriente',
  },
  {
    fieldName: 'operatingLeaseROUAsset',
    label: 'Operating Lease ROU Asset',
    category: 'leases',
    source: 'sec',
    xbrlTags: ['OperatingLeaseRightOfUseAsset'],
    defaultValue: null,
    description: 'Activo de derecho de uso (arrendamiento operativo)',
  },
  {
    fieldName: 'financeLeaseLiability',
    label: 'Finance Lease Liability',
    category: 'leases',
    source: 'sec',
    xbrlTags: [
      'FinanceLeaseLiability',
      'FinanceLeaseLiabilityNoncurrent',
    ],
    defaultValue: null,
    description: 'Pasivo por arrendamiento financiero',
  },
  {
    fieldName: 'financeLeaseROUAsset',
    label: 'Finance Lease ROU Asset',
    category: 'leases',
    source: 'sec',
    xbrlTags: ['FinanceLeaseRightOfUseAsset'],
    defaultValue: null,
    description: 'Activo de derecho de uso (arrendamiento financiero)',
  },
  {
    fieldName: 'leaseCost',
    label: 'Lease Cost',
    category: 'leases',
    source: 'sec',
    xbrlTags: ['OperatingLeaseCost'],
    defaultValue: null,
    description: 'Costo total de arrendamiento',
  },
  {
    fieldName: 'leasePayments',
    label: 'Lease Payments',
    category: 'leases',
    source: 'sec',
    xbrlTags: ['OperatingLeasePayments'],
    defaultValue: null,
    description: 'Pagos por arrendamiento',
  },

  // Debt Detail
  {
    fieldName: 'debtMaturitiesNext12M',
    label: 'Debt Due Next 12M',
    category: 'debt_detail',
    source: 'sec',
    xbrlTags: [
      'LongTermDebtMaturitiesRepaymentsOfPrincipalInNextTwelveMonths',
    ],
    defaultValue: null,
    description: 'Deuda que vence en próximos 12 meses',
  },
  {
    fieldName: 'debtMaturitiesYear2',
    label: 'Debt Due Year 2',
    category: 'debt_detail',
    source: 'sec',
    xbrlTags: [
      'LongTermDebtMaturitiesRepaymentsOfPrincipalInYearTwo',
    ],
    defaultValue: null,
    description: 'Deuda que vence en año 2',
  },
  {
    fieldName: 'debtMaturitiesYear3',
    label: 'Debt Due Year 3',
    category: 'debt_detail',
    source: 'sec',
    xbrlTags: [
      'LongTermDebtMaturitiesRepaymentsOfPrincipalInYearThree',
    ],
    defaultValue: null,
    description: 'Deuda que vence en año 3',
  },
  {
    fieldName: 'debtMaturitiesYear4',
    label: 'Debt Due Year 4',
    category: 'debt_detail',
    source: 'sec',
    xbrlTags: [
      'LongTermDebtMaturitiesRepaymentsOfPrincipalInYearFour',
    ],
    defaultValue: null,
    description: 'Deuda que vence en año 4',
  },
  {
    fieldName: 'debtMaturitiesYear5',
    label: 'Debt Due Year 5',
    category: 'debt_detail',
    source: 'sec',
    xbrlTags: [
      'LongTermDebtMaturitiesRepaymentsOfPrincipalInYearFive',
    ],
    defaultValue: null,
    description: 'Deuda que vence en año 5',
  },
  {
    fieldName: 'debtMaturitiesAfter5',
    label: 'Debt Due After Year 5',
    category: 'debt_detail',
    source: 'sec',
    xbrlTags: [
      'LongTermDebtMaturitiesRepaymentsOfPrincipalThereafter',
    ],
    defaultValue: null,
    description: 'Deuda que vence después del año 5',
  },
  {
    fieldName: 'debtWeightedAvgRate',
    label: 'Debt Weighted Avg Rate',
    category: 'debt_detail',
    source: 'sec',
    xbrlTags: ['ShortTermDebtWeightedAverageInterestRate'],
    defaultValue: null,
    description: 'Tasa de interés promedio ponderada',
  },

  // Other
  {
    fieldName: 'comprehensiveIncome',
    label: 'Comprehensive Income',
    category: 'other',
    source: 'sec',
    xbrlTags: ['OtherComprehensiveIncomeLossNetOfTax'],
    defaultValue: null,
    description: 'Otro resultado integral del período',
  },
  {
    fieldName: 'gainOnDisposal',
    label: 'Gain/Loss on Disposal',
    category: 'other',
    source: 'sec',
    xbrlTags: ['GainLossOnSaleOfPropertyPlantEquipment'],
    defaultValue: null,
    description: 'Ganancia/pérdida por disposición de activos',
  },
  {
    fieldName: 'unrecognizedTaxBenefits',
    label: 'Unrecognized Tax Benefits',
    category: 'other',
    source: 'sec',
    xbrlTags: [
      'UnrecognizedTaxBenefits',
      'UnrecognizedTaxBenefitsThatWouldImpactEffectiveTaxRate',
    ],
    defaultValue: null,
    description: 'Beneficios fiscales no reconocidos',
  },
  {
    fieldName: 'equityMethodIncome',
    label: 'Equity Method Income',
    category: 'other',
    source: 'sec',
    xbrlTags: [
      'ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod',
    ],
    defaultValue: null,
    description: 'Ingresos por método de participación',
  },
];

// Todos los campos combinados
export const ALL_FIELDS: FieldCatalogEntry[] = [...EXISTING_FIELDS, ...NEW_FIELDS];

// Helper para obtener un campo por nombre
export function getFieldByName(fieldName: string): FieldCatalogEntry | undefined {
  return ALL_FIELDS.find((f) => f.fieldName === fieldName);
}

// Helper para obtener campos por categoría
export function getFieldsByCategory(category: FieldCategory): FieldCatalogEntry[] {
  return ALL_FIELDS.filter((f) => f.category === category);
}

// Helper para obtener campos por fuente
export function getFieldsBySource(source: 'sec' | 'european' | 'yahoo'): FieldCatalogEntry[] {
  return ALL_FIELDS.filter((f) => f.source === source);
}
