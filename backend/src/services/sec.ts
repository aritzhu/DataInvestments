import axios from 'axios';
import { isEuropeanTicker } from './companyMeta';

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
  // SEC EDGAR only covers US-listed companies. European-suffixed tickers
  // (e.g. DTE.DE) must never be resolved against the stripped base ticker,
  // which would match the wrong US company.
  if (isEuropeanTicker(ticker)) return null;

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
      if (!fact.end) continue;
      const endYear = new Date(fact.end).getFullYear();
      if (Number.isNaN(endYear)) continue;
      const existing = byYear.get(endYear);
      if (!existing || new Date(fact.filed) > new Date(existing.filed)) {
        byYear.set(endYear, fact);
      }
    }

    const results = Array.from(byYear.entries())
      .map(([year, fact]) => ({ year, value: fact.val }))
      .sort((a, b) => a.year - b.year);

    if (results.length > 0) return results;
  }

  return [];
}

export interface ExtractedValues extends Array<{ year: number; value: number }> {
  tag: string | null;
}

// Merge values across multiple XBRL tags, one value per year. The first tag
// in priority order that reports a given year wins it, so companies that drift
// between tags (e.g. AAL stopping a tag after FY2021) keep every year instead
// of dropping the years covered by older tags. The returned array carries
// `.tag` with the concept that supplied the most recent year.
function extractBestTag(facts: SECCompanyFacts, tags: string[]): ExtractedValues {
  const byYear = new Map<number, number>();
  let bestTag: string | null = null;
  let bestMaxYear = 0;
  for (const tag of tags) {
    let tagMaxYear = 0;
    for (const v of extractAnnualValues(facts, tag)) {
      if (!byYear.has(v.year)) {
        byYear.set(v.year, v.value);
        if (v.year > tagMaxYear) tagMaxYear = v.year;
      }
    }
    if (tagMaxYear > bestMaxYear) {
      bestMaxYear = tagMaxYear;
      bestTag = tag;
    }
  }
  const result = Array.from(byYear.entries())
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year - b.year) as ExtractedValues;
  result.tag = bestTag;
  return result;
}

// Common revenue tags to try
const REVENUE_TAGS = [
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenues',
  'Revenue',
  'SalesRevenueNet',
  'OperatingRevenue',
];

export function extractRevenue(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, REVENUE_TAGS);
}

// ===== Quarterly (10-Q) extraction =====
// SEC quarterly income / cash-flow facts are reported year-to-date, so the
// single-quarter value for Q2/Q3/Q4 is obtained by de-cumulating within the
// fiscal year. Balance-sheet facts are point-in-time and read directly.

export interface SecQuarterlyValues extends Array<{ year: number; quarter: number; value: number }> {
  tag: string | null;
}

const QUARTERLY_FIELD_TAGS: Record<string, { tags: string[]; pointInTime: boolean }> = {
  revenue: { tags: REVENUE_TAGS, pointInTime: false },
  netIncome: { tags: ['NetIncomeLoss', 'ProfitLoss'], pointInTime: false },
  costOfRevenue: { tags: ['CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold', 'CostOfSales'], pointInTime: false },
  grossProfit: { tags: ['GrossProfit', 'GrossProfitLoss'], pointInTime: false },
  operatingExpenses: { tags: ['OperatingExpenses', 'OperatingCostsAndExpenses', 'OperatingExpense'], pointInTime: false },
  sgaExpense: { tags: ['SellingGeneralAndAdministrativeExpense', 'SellingAndAdministrativeExpense', 'AdministrativeExpense', 'SalesAndMarketingExpense'], pointInTime: false },
  rdExpense: { tags: ['ResearchAndDevelopmentExpense'], pointInTime: false },
  interestExpense: { tags: ['InterestExpense', 'InterestAndDebtExpense', 'InterestExpenseNonoperating'], pointInTime: false },
  taxExpense: { tags: ['IncomeTaxExpenseBenefit', 'ProvisionForIncomeTaxes', 'IncomeTaxExpenseContinuingOperations'], pointInTime: false },
  ebit: { tags: ['OperatingIncomeLoss', 'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest', 'OtherOperatingIncomeExpense'], pointInTime: false },
  depreciation: { tags: ['DepreciationAndAmortization', 'DepreciationDepletionAndAmortization', 'Depreciation', 'AdjustmentsForDepreciationAndAmortisationExpense'], pointInTime: false },
  capex: { tags: ['PaymentsToAcquirePropertyPlantAndEquipment', 'CapitalExpenditure', 'CapitalExpenditures', 'AdditionsOtherThanThroughBusinessCombinationsPropertyPlantAndEquipment', 'AdditionsOtherThanThroughBusinessCombinationsPropertyPlantAndEquipmentIncludingRightofuseAssets', 'PaymentsToAcquireProductiveAssets'], pointInTime: false },
  operatingCashFlow: { tags: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByOperatingActivities', 'NetCashUsedInOperatingActivities'], pointInTime: false },
  investingCashFlow: { tags: ['NetCashProvidedByUsedInInvestingActivities', 'NetCashUsedForInvestingActivites', 'NetCashUsedInInvestingActivities'], pointInTime: false },
  financingCashFlow: { tags: ['NetCashProvidedByUsedInFinancingActivities', 'NetCashUsedProvidedByFinancingActivities', 'NetCashUsedInFinancingActivities'], pointInTime: false },
  dividendsPaid: { tags: ['PaymentsOfDividends', 'DividendsPaid'], pointInTime: false },
  shareRepurchases: { tags: ['PaymentsForRepurchaseOfCommonStock', 'RepurchaseOfCommonStock', 'ShareRepurchases', 'PurchaseOfTreasuryShares', 'IncreaseDecreaseThroughTreasuryShareTransactions'], pointInTime: false },
  totalAssets: { tags: ['Assets', 'AssetsCurrent'], pointInTime: true },
  cash: { tags: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsAndShortTermInvestments', 'Cash', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'], pointInTime: true },
  receivables: { tags: ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'AccountsReceivableNet'], pointInTime: true },
  inventory: { tags: ['InventoryNet', 'Inventory', 'InventoryCurrent'], pointInTime: true },
  currentAssets: { tags: ['AssetsCurrent'], pointInTime: true },
  ppe: { tags: ['PropertyPlantAndEquipmentNet', 'PropertyPlantAndEquipmentGross', 'PropertyPlantAndEquipmentAndFinanceLeaseRightOfUseAssetAfterAccumulatedDepreciationAndAmortization'], pointInTime: true },
  goodwill: { tags: ['Goodwill', 'GoodwillImpairmentLoss'], pointInTime: true },
  intangibles: { tags: ['IntangibleAssetsNetExcludingGoodwill', 'IntangibleAssetsNet'], pointInTime: true },
  totalEquity: { tags: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'Equity', 'EquityAttributableToParent'], pointInTime: true },
  currentLiabilities: { tags: ['LiabilitiesCurrent'], pointInTime: true },
  accountsPayable: { tags: ['AccountsPayable', 'AccountsPayableCurrent'], pointInTime: true },
  shortTermDebt: { tags: ['DebtCurrent', 'LongTermDebtCurrent', 'ShortTermBorrowings'], pointInTime: true },
  longTermDebt: { tags: ['LongTermDebtNoncurrent', 'LongTermDebt'], pointInTime: true },
  retainedEarnings: { tags: ['RetainedEarningsAccumulatedDeficit', 'RetainedEarnings'], pointInTime: true },
  shortTermInvestments: { tags: ['ShortTermInvestments', 'MarketableSecurities', 'ShortTermMarketableSecurities'], pointInTime: true },
  treasuryStock: { tags: ['TreasuryStockValue', 'TreasuryStockCommon', 'TreasuryStock'], pointInTime: true },
};

function quarterOfEnd(end: string): number {
  const m = new Date(end).getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

function durationDays(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
}

function extractQuarterlyTagSeries(facts: SECCompanyFacts, concept: string, pointInTime: boolean): { year: number; quarter: number; value: number }[] {
  for (const ns of ['us-gaap', 'ifrs-full'] as const) {
    const nsFacts = facts.facts[ns as keyof typeof facts.facts] as
      | Record<string, { units?: Record<string, SECFact[]> }>
      | undefined;
    const unitMap = nsFacts?.[concept]?.units;
    const allValues = unitMap?.USD?.length ? unitMap.USD : unitMap?.EUR?.length ? unitMap.EUR : [];
    if (!allValues.length) continue;

    // SEC XBRL filings carry prior-year comparatives inside the same 10-Q, so
    // facts are grouped by their actual period dates, not by the fy/fp labels.
    const byPeriod = new Map<string, SECFact>();
    for (const v of allValues) {
      if (v.form !== '10-Q' && v.form !== '10-K') continue;
      if (!v.end) continue;
      if (!pointInTime && !v.start) continue;
      const key = `${v.start ?? ''}|${v.end}`;
      const existing = byPeriod.get(key);
      if (!existing || new Date(v.filed) > new Date(existing.filed)) byPeriod.set(key, v);
    }

    if (pointInTime) {
      const results: { year: number; quarter: number; value: number }[] = [];
      for (const fact of byPeriod.values()) {
        if (fact.form === '10-K') continue; // Dec-31 annual row is stored separately
        const q = quarterOfEnd(fact.end as string);
        if (q === 4) continue;
        const year = new Date(fact.end as string).getFullYear();
        results.push({ year, quarter: q, value: fact.val });
      }
      results.sort((a, b) => a.year - b.year || a.quarter - b.quarter);
      return results;
    }

    // Flow statements: YTD (cumulative) facts have duration > 150 days, single
    // quarter facts are ~90 days. Group by (year, quarter-of-period-end).
    const byYear = new Map<number, Map<number, SECFact[]>>();
    for (const fact of byPeriod.values()) {
      const year = new Date(fact.end as string).getFullYear();
      const q = quarterOfEnd(fact.end as string);
      if (!byYear.has(year)) byYear.set(year, new Map());
      const qm = byYear.get(year)!;
      if (!qm.has(q)) qm.set(q, []);
      qm.get(q)!.push(fact);
    }

    const results: { year: number; quarter: number; value: number }[] = [];
    for (const [year, qm] of byYear) {
      const cumFor = (q: number): SECFact | undefined => {
        const arr = qm.get(q);
        if (!arr?.length) return undefined;
        return [...arr].sort(
          (a, b) => durationDays(b.start as string, b.end as string) - durationDays(a.start as string, a.end as string),
        )[0];
      };
      const singleFor = (q: number): SECFact | undefined => {
        const arr = qm.get(q);
        return arr?.find((f) => {
          const d = durationDays(f.start as string, f.end as string);
          return d >= 80 && d <= 110;
        });
      };

      // Emit single-quarter values directly (exact from filings) and fill any
      // missing quarter by de-cumulating YTD (cumulative) facts.
      let singleSum: number | null = null;
      let lastCum: number | null = null;
      for (let q = 1; q <= 4; q++) {
        const s = singleFor(q);
        const c = cumFor(q);
        if (s) {
          results.push({ year, quarter: q, value: s.val });
          singleSum = (singleSum ?? 0) + s.val;
          lastCum = null;
        } else if (c) {
          if (lastCum != null) {
            results.push({ year, quarter: q, value: c.val - lastCum });
            lastCum = c.val;
            singleSum = null;
          } else if (singleSum != null) {
            results.push({ year, quarter: q, value: c.val - singleSum });
            lastCum = c.val;
            singleSum = null;
          } else if (q === 1) {
            results.push({ year, quarter: q, value: c.val });
            lastCum = c.val;
          }
        } else {
          singleSum = null;
          lastCum = null;
        }
      }
    }

    results.sort((a, b) => a.year - b.year || a.quarter - b.quarter);
    if (results.length > 0) return results;
  }
  return [];
}

export function extractQuarterlyField(facts: SECCompanyFacts, field: string, pointInTimeOverride?: boolean): SecQuarterlyValues {
  const cfg = QUARTERLY_FIELD_TAGS[field];
  const empty = Object.assign([], { tag: null }) as SecQuarterlyValues;
  if (!cfg) return empty;
  const pointInTime = pointInTimeOverride ?? cfg.pointInTime;

  const filled = new Map<string, { year: number; quarter: number; value: number; tag: string }>();
  let maxYear = 0;
  let maxQuarter = 0;
  let tag: string | null = null;
  for (const t of cfg.tags) {
    for (const qv of extractQuarterlyTagSeries(facts, t, pointInTime)) {
      const key = `${qv.year}-${qv.quarter}`;
      if (filled.has(key)) continue; // first tag in priority order wins
      filled.set(key, { ...qv, tag: t });
      if (qv.year > maxYear || (qv.year === maxYear && qv.quarter > maxQuarter)) {
        maxYear = qv.year;
        maxQuarter = qv.quarter;
        tag = t;
      }
    }
  }

  const result = Array.from(filled.values())
    .map(({ year, quarter, value }) => ({ year, quarter, value }))
    .sort((a, b) => a.year - b.year || a.quarter - b.quarter) as SecQuarterlyValues;
  result.tag = tag;
  return result;
}


export function extractNetIncome(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['NetIncomeLoss', 'ProfitLoss']);
}

export function extractTotalAssets(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['Assets', 'AssetsCurrent']);
}

export function extractCostOfRevenue(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold', 'CostOfSales']);
}

export function extractOperatingExpenses(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['OperatingExpenses', 'OperatingCostsAndExpenses', 'OperatingExpense']);
}

export function extractSGA(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['SellingGeneralAndAdministrativeExpense', 'SellingAndAdministrativeExpense', 'AdministrativeExpense', 'SalesAndMarketingExpense']);
}

export function extractRD(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['ResearchAndDevelopmentExpense']);
}

export function extractInterestExpense(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['InterestExpense', 'InterestAndDebtExpense', 'InterestExpenseNonoperating']);
}

export function extractTaxExpense(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['IncomeTaxExpenseBenefit', 'ProvisionForIncomeTaxes', 'IncomeTaxExpenseContinuingOperations']);
}

export function extractCapex(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'PaymentsToAcquirePropertyPlantAndEquipment',
    'CapitalExpenditure',
    'CapitalExpenditures',
    'AdditionsOtherThanThroughBusinessCombinationsPropertyPlantAndEquipment',
    'AdditionsOtherThanThroughBusinessCombinationsPropertyPlantAndEquipmentIncludingRightofuseAssets',
    'PaymentsToAcquireProductiveAssets',
  ]);
}

export function extractDepreciation(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'DepreciationAndAmortization',
    'DepreciationDepletionAndAmortization',
    'Depreciation',
    'AdjustmentsForDepreciationAndAmortisationExpense',
  ]);
}

function toYearMap(values: { year: number; value: number }[]): Map<number, number> {
  return new Map(values.map((v) => [v.year, v.value]));
}

export function extractTotalLiabilities(facts: SECCompanyFacts): ExtractedValues {
  const liabs = toYearMap(extractAnnualValues(facts, 'Liabilities'));
  const current = toYearMap(extractAnnualValues(facts, 'LiabilitiesCurrent'));
  const nonCurrent = toYearMap(extractAnnualValues(facts, 'LiabilitiesNoncurrent'));
  const assets = toYearMap(extractAnnualValues(facts, 'Assets'));
  const equityInclNci = toYearMap(extractAnnualValues(facts, 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'));
  const equity = toYearMap(extractAnnualValues(facts, 'StockholdersEquity'));

  const years = new Set([...liabs.keys(), ...current.keys(), ...nonCurrent.keys(), ...assets.keys()]);
  const result: { year: number; value: number }[] = [];
  for (const year of years) {
    let value = liabs.get(year) ?? null;
    if (value == null) {
      const cur = current.get(year);
      const nonCur = nonCurrent.get(year);
      if (cur != null && nonCur != null) value = cur + nonCur;
    }
    if (value == null) {
      const a = assets.get(year);
      const eq = equityInclNci.get(year) ?? equity.get(year);
      if (a != null && eq != null) value = a - eq;
    }
    if (value != null) result.push({ year, value });
  }
  const tagged = result as ExtractedValues;
  tagged.tag = 'Liabilities';
  return tagged.sort((a, b) => a.year - b.year);
}

export function extractTotalEquity(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'StockholdersEquity',
    'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
    'Equity',
    'EquityAttributableToParent',
  ]);
}

export function extractGrossProfit(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['GrossProfit', 'GrossProfitLoss']);
}

export function extractOperatingIncome(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'OperatingIncomeLoss',
    'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
    'OtherOperatingIncomeExpense',
  ]);
}

export function extractOperatingCashFlow(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'NetCashProvidedByUsedInOperatingActivities',
    'NetCashProvidedByOperatingActivities',
    'NetCashUsedInOperatingActivities',
  ]);
}

export function extractInvestingCashFlow(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'NetCashProvidedByUsedInInvestingActivities',
    'NetCashUsedForInvestingActivites',
    'NetCashUsedInInvestingActivities',
  ]);
}

export function extractFinancingCashFlow(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'NetCashProvidedByUsedInFinancingActivities',
    'NetCashUsedProvidedByFinancingActivities',
    'NetCashUsedInFinancingActivities',
  ]);
}

export function extractDividendsPaid(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['PaymentsOfDividends', 'DividendsPaid']);
}

export function extractShareRepurchases(facts: SECCompanyFacts): ExtractedValues {
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

export function extractCash(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'CashAndCashEquivalentsAtCarryingValue',
    'CashCashEquivalentsAndShortTermInvestments',
    'Cash',
    'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
  ]);
}

export function extractReceivables(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['AccountsReceivableNetCurrent', 'ReceivablesNetCurrent', 'AccountsReceivableNet']);
}

export function extractInventory(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['InventoryNet', 'Inventory', 'InventoryCurrent']);
}

export function extractCurrentAssets(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['AssetsCurrent']);
}

export function extractPPE(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, [
    'PropertyPlantAndEquipmentNet',
    'PropertyPlantAndEquipmentGross',
    'PropertyPlantAndEquipmentAndFinanceLeaseRightOfUseAssetAfterAccumulatedDepreciationAndAmortization',
  ]);
}

export function extractGoodwill(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['Goodwill', 'GoodwillImpairmentLoss']);
}

export function extractIntangibles(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['IntangibleAssetsNetExcludingGoodwill', 'IntangibleAssetsNet']);
}

export function extractAccountsPayable(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['AccountsPayable', 'AccountsPayableCurrent']);
}

export function extractShortTermDebt(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['DebtCurrent', 'LongTermDebtCurrent', 'ShortTermBorrowings']);
}

export function extractLongTermDebt(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['LongTermDebtNoncurrent', 'LongTermDebt']);
}

export function extractRetainedEarnings(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['RetainedEarningsAccumulatedDeficit', 'RetainedEarnings']);
}

export function extractCurrentLiabilities(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['LiabilitiesCurrent']);
}

export function extractShortTermInvestments(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['ShortTermInvestments', 'MarketableSecurities', 'ShortTermMarketableSecurities']);
}

export function extractTreasuryStock(facts: SECCompanyFacts): ExtractedValues {
  return extractBestTag(facts, ['TreasuryStockValue', 'TreasuryStockCommon', 'TreasuryStock']);
}
