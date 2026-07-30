import axios from 'axios';

const SEC_BASE = 'https://data.sec.gov';
const USER_AGENT = process.env.SEC_USER_AGENT || 'DataInvestments admin@datainvestments.com';

let tickerToCikMap: Record<string, string> | null = null;

async function secFetch<T>(url: string): Promise<T> {
  const response = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: 30000,
  });
  return response.data;
}

export async function getTickerToCikMap(): Promise<Record<string, string>> {
  if (tickerToCikMap) return tickerToCikMap;

  const data = await secFetch<Record<string, { cik_str: number; ticker: string; title: string }>>(
    'https://www.sec.gov/files/company_tickers.json'
  );

  tickerToCikMap = {};
  for (const [_key, value] of Object.entries(data)) {
    const cikStr = String(value.cik_str).padStart(10, '0');
    // Map by ticker (e.g., "AAPL") and by title (e.g., "APPLE INC.")
    tickerToCikMap[value.ticker.toUpperCase()] = cikStr;
    tickerToCikMap[value.title.toUpperCase()] = cikStr;
  }
  return tickerToCikMap;
}

export async function getCikForTicker(ticker: string): Promise<string | null> {
  const map = await getTickerToCikMap();
  const cik = map[ticker.toUpperCase()];
  if (cik) return cik;
  const baseTicker = ticker.split('.')[0];
  if (baseTicker !== ticker) {
    return map[baseTicker.toUpperCase()] || null;
  }
  return null;
}

export interface SECFact {
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  start?: string;
  end?: string;
}

export interface SECCompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    'dei'?: Record<string, unknown>;
    'us-gaap'?: Record<string, {
      label: string;
      description: string;
      units: {
        USD?: SECFact[];
        'USD/shares'?: SECFact[];
        shares?: SECFact[];
      };
    }>;
    'ifrs-full'?: Record<string, {
      label: string;
      description: string;
      units: {
        USD?: SECFact[];
      };
    }>;
  };
}

export async function fetchCompanyFacts(cik: string): Promise<SECCompanyFacts | null> {
  try {
    const paddedCik = cik.padStart(10, '0');
    return await secFetch<SECCompanyFacts>(
      `${SEC_BASE}/api/xbrl/companyfacts/CIK${paddedCik}.json`
    );
  } catch {
    return null;
  }
}

export function extractAnnualValues(facts: SECCompanyFacts, concept: string, namespaces: string[] = ['us-gaap', 'ifrs-full']): { year: number; value: number }[] {
  for (const ns of namespaces) {
    const nsFacts = facts.facts[ns as keyof typeof facts.facts];
    const unitMap = (nsFacts as Record<string, { units: Record<string, SECFact[]> }>)?.[concept]?.units;
    const allValues = unitMap?.USD?.length ? unitMap.USD : unitMap?.EUR?.length ? unitMap.EUR : [];

    if (!allValues.length) continue;

    const annual = allValues.filter((v: SECFact) => v.form === '10-K' && v.fp === 'FY' || v.form === '20-F' && v.fp === 'FY');

    const byYear = new Map<number, SECFact>();
    for (const fact of annual) {
      const existing = byYear.get(fact.fy);
      if (!existing || new Date(fact.filed) > new Date(existing.filed)) {
        byYear.set(fact.fy, fact);
      }
    }

    const results = Array.from(byYear.entries())
      .map(([year, fact]) => ({ year, value: fact.val }))
      .sort((a, b) => a.year - b.year);

    if (results.length > 0) return results;
  }

  return [];
}

// Try multiple XBRL tags and return the one with the most recent data
function extractBestTag(facts: SECCompanyFacts, tags: string[]): { year: number; value: number }[] {
  let best: { year: number; value: number }[] = [];
  let bestMaxYear = 0;
  for (const tag of tags) {
    const values = extractAnnualValues(facts, tag);
    if (values.length > 0) {
      const maxYear = Math.max(...values.map((v) => v.year));
      if (maxYear > bestMaxYear) {
        best = values;
        bestMaxYear = maxYear;
      }
    }
  }
  return best;
}

// Common revenue tags to try
const REVENUE_TAGS = [
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenues',
  'Revenue',
  'SalesRevenueNet',
  'OperatingRevenue',
];

export function extractRevenue(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, REVENUE_TAGS);
}

export function extractNetIncome(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['NetIncomeLoss', 'ProfitLoss']);
}

export function extractTotalAssets(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['Assets', 'AssetsCurrent']);
}

export function extractCostOfRevenue(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold', 'CostOfSales']);
}

export function extractOperatingExpenses(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['OperatingExpenses', 'OperatingCostsAndExpenses', 'OperatingExpense']);
}

export function extractSGA(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['SellingGeneralAndAdministrativeExpense', 'SellingAndAdministrativeExpense', 'AdministrativeExpense', 'SalesAndMarketingExpense']);
}

export function extractRD(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['ResearchAndDevelopmentExpense']);
}

export function extractInterestExpense(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['InterestExpense', 'InterestAndDebtExpense']);
}

export function extractTaxExpense(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['IncomeTaxExpenseBenefit', 'ProvisionForIncomeTaxes', 'IncomeTaxExpenseContinuingOperations']);
}

export function extractCapex(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, [
    'PaymentsToAcquirePropertyPlantAndEquipment',
    'CapitalExpenditure',
    'CapitalExpenditures',
    'AdditionsOtherThanThroughBusinessCombinationsPropertyPlantAndEquipment',
    'AdditionsOtherThanThroughBusinessCombinationsPropertyPlantAndEquipmentIncludingRightofuseAssets',
  ]);
}

export function extractDepreciation(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, [
    'DepreciationAndAmortization',
    'DepreciationDepletionAndAmortization',
    'Depreciation',
    'AdjustmentsForDepreciationAndAmortisationExpense',
  ]);
}

export function extractTotalLiabilities(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['Liabilities', 'LiabilitiesCurrent']);
}

export function extractTotalEquity(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['StockholdersEquity', 'Equity']);
}

export function extractGrossProfit(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['GrossProfit', 'GrossProfitLoss']);
}

export function extractOperatingIncome(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, [
    'OperatingIncomeLoss',
    'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
    'OtherOperatingIncomeExpense',
  ]);
}

export function extractOperatingCashFlow(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, [
    'NetCashProvidedByUsedInOperatingActivities',
    'NetCashProvidedByOperatingActivities',
    'NetCashUsedInOperatingActivities',
  ]);
}

export function extractInvestingCashFlow(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, [
    'NetCashProvidedByUsedInInvestingActivities',
    'NetCashUsedForInvestingActivites',
    'NetCashUsedInInvestingActivities',
  ]);
}

export function extractFinancingCashFlow(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, [
    'NetCashProvidedByUsedInFinancingActivities',
    'NetCashUsedProvidedByFinancingActivities',
    'NetCashUsedInFinancingActivities',
  ]);
}

export function extractDividendsPaid(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['PaymentsOfDividends', 'DividendsPaid']);
}

export function extractShareRepurchases(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, [
    'PaymentsForRepurchaseOfCommonStock',
    'RepurchaseOfCommonStock',
    'ShareRepurchases',
    'PurchaseOfTreasuryShares',
    'IncreaseDecreaseThroughTreasuryShareTransactions',
  ]);
}

export function extractSharesOutstanding(facts: SECCompanyFacts): number | null {
  const namespaces = [facts.facts['dei'], facts.facts['us-gaap'], facts.facts['ifrs-full']];

  const tags = [
    'EntityCommonStockSharesOutstanding',
    'CommonStockSharesOutstanding',
    'CommonStockSharesIssued',
    'WeightedAverageNumberOfSharesOutstandingBasic',
    'WeightedAverageNumberOfDilutedSharesOutstanding',
    'AdjustedWeightedAverageShares',
    'AdjustedWeightedAverageNumberOfShares',
    'SharesOutstanding',
  ];

  for (const ns of namespaces) {
    if (!ns) continue;
    for (const tag of tags) {
      const entry = ns[tag] as { units?: Record<string, SECFact[]> } | undefined;
      const units = entry?.units;
      if (!units) continue;

      const unitKey = Object.keys(units).find(k => k.toLowerCase().includes('share'));
      if (!unitKey) continue;
      const factsArr = units[unitKey];
      if (!factsArr?.length) continue;

      const latest = factsArr.reduce((a: SECFact, b: SECFact) =>
        new Date(a.filed) > new Date(b.filed) ? a : b
      ).val;
      if (latest >= 100_000) return latest;
    }
  }

  return null;
}

export function extractCash(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsAndShortTermInvestments']);
}

export function extractReceivables(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'AccountsReceivableNet']);
}

export function extractInventory(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['InventoryNet', 'Inventory', 'InventoryCurrent']);
}

export function extractCurrentAssets(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['AssetsCurrent']);
}

export function extractPPE(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['PropertyPlantAndEquipmentNet', 'PropertyPlantAndEquipmentGross']);
}

export function extractGoodwill(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['Goodwill', 'GoodwillImpairmentLoss']);
}

export function extractIntangibles(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['IntangibleAssetsNetExcludingGoodwill', 'IntangibleAssetsNet']);
}

export function extractAccountsPayable(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['AccountsPayable', 'AccountsPayableCurrent']);
}

export function extractShortTermDebt(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['DebtCurrent', 'LongTermDebtCurrent', 'ShortTermBorrowings']);
}

export function extractLongTermDebt(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['LongTermDebtNoncurrent', 'LongTermDebt']);
}

export function extractRetainedEarnings(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['RetainedEarningsAccumulatedDeficit', 'RetainedEarnings']);
}

export function extractCurrentLiabilities(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['LiabilitiesCurrent']);
}

export function extractShortTermInvestments(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['ShortTermInvestments', 'MarketableSecurities', 'ShortTermMarketableSecurities']);
}

export function extractTreasuryStock(facts: SECCompanyFacts): { year: number; value: number }[] {
  return extractBestTag(facts, ['TreasuryStockValue', 'TreasuryStockCommon', 'TreasuryStock']);
}
