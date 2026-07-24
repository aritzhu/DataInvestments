export const FIELD_LABELS: Record<string, string> = {
  revenue: 'Revenue', costOfRevenue: 'Cost of Revenue', grossProfit: 'Gross Profit',
  operatingExpenses: 'Operating Expenses', sgaExpense: 'SG&A Expense', rdExpense: 'R&D Expense',
  interestExpense: 'Interest Expense', taxExpense: 'Tax Expense', netIncome: 'Net Income',
  ebit: 'EBIT', ebitda: 'EBITDA', capex: 'CapEx', depreciation: 'Depreciation & Amort.',
  operatingCashFlow: 'Operating Cash Flow', investingCashFlow: 'Investing Cash Flow',
  financingCashFlow: 'Financing Cash Flow', dividendsPaid: 'Dividends Paid',
  shareRepurchases: 'Share Repurchases', totalAssets: 'Total Assets', cash: 'Cash & Equiv.',
  receivables: 'Receivables', inventory: 'Inventory', currentAssets: 'Current Assets',
  ppe: 'PP&E', goodwill: 'Goodwill', intangibleAssets: 'Intangible Assets',
  totalLiabilities: 'Total Liabilities', currentLiabilities: 'Current Liabilities',
  accountsPayable: 'Accounts Payable', shortTermDebt: 'Short-Term Debt',
  longTermDebt: 'Long-Term Debt', totalEquity: 'Total Equity',
  retainedEarnings: 'Retained Earnings', sharesOutstanding: 'Shares Outstanding',
};

export function guessField(tag: string): string | null {
  const colonIdx = tag.indexOf(':');
  const rawConcept = colonIdx >= 0 ? tag.substring(colonIdx + 1) : tag;
  const lower = rawConcept.toLowerCase();

  if (/periodincreasedecrease|fairvalue|faceamount|unrealized|gross|net$|disclosure|reservedforfuture|sharesauthorized|sharesissued|parorstated|amortizedcost|fairvalue|unamortized|maturity|maturities|continuousunrealized/i.test(lower)) return null;
  if (/adjustmentsrelated|adjustmentsto|allocatedshare|allowancefor|stepacquisition|remeasurement|cumulativeeffect|methodinvestment/i.test(lower)) return null;
  if (/availableforsale|debtrecover|debtsec/i.test(lower)) return null;

  if (lower === 'revenue' || lower === 'revenuefromcontractswithcustomers' || lower === 'revenuefrominterest') return 'revenue';
  if (lower === 'costofsales') return 'costOfRevenue';
  if (lower === 'grossprofit') return 'grossProfit';
  if (lower === 'operatingexpenses') return 'operatingExpenses';
  if (lower === 'profitloss' || lower === 'profitlossfromcontinuingoperations') return 'netIncome';
  if (lower === 'operatingprofitloss' || lower === 'profitlossfromoperatingactivities' || lower === 'operatingincome') return 'ebit';
  if (lower === 'ebitda') return 'ebitda';
  if (lower === 'financecosts' || lower === 'interestexpenseclassifiedasoperatingactivities') return 'interestExpense';
  if (lower === 'incometaxexpense' || lower === 'incometaxexpensecontinuingoperations') return 'taxExpense';
  if (lower === 'depreciationamortisationcharge' || lower === 'depreciationandamortisationexpense' || lower === 'depreciation') return 'depreciation';
  if (lower === 'employeebenefitsexpense') return 'sgaExpense';
  if (lower === 'researchanddevelopmentexpense') return 'rdExpense';
  if (lower === 'sellingandmarketingexpense' || lower === 'administrativeexpense') return 'sgaExpense';
  if (lower === 'purchaseofpropertyplantandequipment' || lower === 'acquisitionsofpropertyplantandequipment') return 'capex';
  if (lower === 'cashflowsfromusedinoperatingactivities') return 'operatingCashFlow';
  if (lower === 'cashflowsfromusedininvestingactivities') return 'investingCashFlow';
  if (lower === 'cashflowsfromusedinfinancingactivities' || lower === 'cashflowfromusedinfinancingactivities') return 'financingCashFlow';
  if (lower === 'dividendspaid' || lower === 'dividendspaidclassifiedasfinancingactivities') return 'dividendsPaid';
  if (lower === 'paymentsforrepurchaseofownequity') return 'shareRepurchases';
  if (lower === 'numberofsharesissued') return 'sharesOutstanding';
  if (lower === 'cashandcashequivalents') return 'cash';
  if (lower === 'tradeandotherreceivables' || lower === 'tradeandothercurrentreceivables') return 'receivables';
  if (lower === 'inventories') return 'inventory';
  if (lower === 'assetscurrent' || lower === 'currentassets') return 'currentAssets';
  if (lower === 'noncurrentassets' || lower === 'assetsnoncurrent') return 'nonCurrentAssets';
  if (lower === 'propertyplantandequipment') return 'ppe';
  if (lower === 'goodwill') return 'goodwill';
  if (lower === 'intangibleassets' || lower === 'intangibleassetsotherthangoodwill') return 'intangibleAssets';
  if (lower === 'liabilitiescurrent' || lower === 'currentliabilities') return 'currentLiabilities';
  if (lower === 'noncurrentliabilities') return 'nonCurrentLiabilities';
  if (lower === 'tradeandotherpayables' || lower === 'tradeandothercurrentpayables') return 'accountsPayable';
  if (lower === 'shorttermborrowings' || lower === 'currentleaseliabilities') return 'shortTermDebt';
  if (lower === 'longtermborrowings' || lower === 'noncurrentleaseliabilities') return 'longTermDebt';
  if (lower === 'equity' || lower === 'equityattributabletoownersofparent') return 'totalEquity';
  if (lower === 'retainedearnings') return 'retainedEarnings';
  if (lower === 'liabilities' || lower === 'totalliabilities') return 'totalLiabilities';
  if (lower === 'assets' || lower === 'totalassets') return 'totalAssets';
  if (lower === 'interestincome' || lower === 'financeincome') return 'interestIncome';
  if (lower === 'feeandcommissionincome') return 'feeIncome';
  if (lower === 'feeandcommissionexpense') return 'feeExpense';

  if (lower === 'revenuefromcontractwithcustomerincludingassessedtax' || lower === 'revenues' || lower === 'revenuefromcontractwithcustomer') return 'revenue';
  if (lower.includes('revenue') && !lower.includes('cost') && !lower.includes('deferred') && !lower.includes('recognized') && !lower.includes('increase') && !lower.includes('decrease') && !lower.includes('disaggregation')) return 'revenue';
  if (lower === 'costofrevenue' || lower === 'costofgoodssold') return 'costOfRevenue';
  if (lower.includes('costofrevenue') || lower.includes('costofgoodssold')) return 'costOfRevenue';
  if (lower === 'grossprofitloss') return 'grossProfit';
  if (lower.includes('operatingexpense') && !lower.includes('selling') && !lower.includes('research')) return 'operatingExpenses';
  if (lower.includes('sellinggeneralandadmin') || lower.includes('sellinggeneral')) return 'sgaExpense';
  if (lower.includes('researchanddevelopment') || lower.includes('rdexpense')) return 'rdExpense';
  if (lower === 'interestexpensedebt') return 'interestExpense';
  if (lower.includes('interestexpense') && !lower.includes('income')) return 'interestExpense';
  if (lower === 'incometaxexpensebenefit') return 'taxExpense';
  if (lower.includes('incometaxexpense') || lower === 'currentincometaxexpensebenefit' || lower === 'deferredincometaxexpensebenefit') return 'taxExpense';
  if (lower.includes('incometax') && lower.includes('expense')) return 'taxExpense';
  if (lower === 'netincome_loss' || lower === 'netincome' || lower === 'profitloss') return 'netIncome';
  if (lower === 'operatingincome_loss' || lower === 'operatingincome') return 'ebit';
  if (lower.includes('ebitda') && !lower.includes('adjust')) return 'ebitda';
  if (lower === 'ebit' || lower === 'earningsbeforeinterestandtaxes') return 'ebit';

  if (lower.includes('paymentsforpropertyplant') || lower === 'capitalexpenditures' || lower === 'acquisitionsnetofcashacquired') return 'capex';
  if (lower === 'depreciationamortizationanddepletion' || lower === 'depreciationandamortization' || lower === 'depreciationamortization') return 'depreciation';
  if (lower === 'netcashprovidedbyoperatingactivities') return 'operatingCashFlow';
  if (lower === 'netcashusedinforgninvestingactivities' || lower === 'netcashusedininvestingactivities') return 'investingCashFlow';
  if (lower === 'netcashusedinfinancingactivities') return 'financingCashFlow';
  if (lower === 'paymentsfordividends' || lower === 'paymentstoequityholders') return 'dividendsPaid';
  if (lower.includes('repurchase') && (lower.includes('common') || lower.includes('stock'))) return 'shareRepurchases';
  if (lower === 'repurchaseofcapitalstock' || lower === 'repurchasesofcommonstock') return 'shareRepurchases';

  if (lower === 'assetscurrent') return 'currentAssets';
  if (lower === 'assetsnoncurrent') return 'nonCurrentAssets';
  if (lower === 'cashandcashequivalentsatcarryingvalue' || lower === 'cashcashandequivalentsatcarryingvalue') return 'cash';
  if (lower === 'cashandshortterminvestments' || lower === 'cashcash equivalentsandshortterminvestments') return 'cash';
  if (lower.includes('receivable') && !lower.includes('allowance') && !lower.includes('factoring')) return 'receivables';
  if (lower === 'inventorynet' || lower === 'inventory') return 'inventory';
  if (lower.includes('propertyplantandequipmentnet') || lower === 'propertyplantandequipmentgross') return 'ppe';
  if (lower === 'goodwillimpairmentloss') return 'goodwill';
  if (lower === 'intangibleassetsnet' || lower.includes('intangibleasset')) return 'intangibleAssets';

  if (lower === 'currentliabilities') return 'currentLiabilities';
  if (lower.includes('accountspayable') && lower.includes('current')) return 'accountsPayable';
  if (lower === 'accountspayable' || lower === 'accountspayablecurrent') return 'accountsPayable';
  if (lower === 'shorttermdebt' || lower === 'currentportionlongtermdebt' || lower === 'debtcurrenportionoflongtermdebt') return 'shortTermDebt';
  if (lower === 'longtermdebt' || lower === 'longtermdebtnoncurrent') return 'longTermDebt';
  if (lower === 'accruedincometaxescurrent' || lower === 'incometaxespayable') return 'accountsPayable';
  if (lower === 'liabilitiesnoncurrent' || lower.includes('liabilit')) return 'totalLiabilities';

  if (lower === 'stockholdersequity' || lower === 'stockholdersinvestment' || lower === 'partnerscapital' || lower === 'equity') return 'totalEquity';
  if (lower.includes('retainedearning')) return 'retainedEarnings';

  if (lower === 'commonstocksharesoutstanding') return 'sharesOutstanding';
  if (lower.includes('commonstock') && lower.includes('value') && !lower.includes('par')) return 'sharesOutstanding';

  return null;
}
