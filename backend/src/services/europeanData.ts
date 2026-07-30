import axios from 'axios';
import { validateFinancialData, logValidationWarnings } from '../utils/financialValidation';
import prisma from '../infrastructure/prisma/client';
const GLEIF_BASE = 'https://api.gleif.org/api/v1';
const XBRL_BASE = 'https://filings.xbrl.org/api';

// ===== CUSTOM TAGS (FieldConfig source='european') =====

let cachedEuropeanCustomTags: Map<string, string[]> | null = null;

export async function loadCustomEuropeanTags(): Promise<Map<string, string[]>> {
  if (cachedEuropeanCustomTags) return cachedEuropeanCustomTags;
  const configs = await prisma.fieldConfig.findMany({
    where: { source: 'european', active: true },
  });
  const map = new Map<string, string[]>();
  for (const c of configs) {
    if (c.customTags.length > 0) {
      map.set(c.fieldName, c.customTags);
    }
  }
  cachedEuropeanCustomTags = map;
  return map;
}

export function clearEuropeanCustomTagsCache(): void {
  cachedEuropeanCustomTags = null;
}

// ===== CONCEPT MAPPINGS (learned from Tag Discovery) =====

let cachedConceptMappings: Map<string, string> | null = null;

export async function loadConceptMappings(): Promise<Map<string, string>> {
  if (cachedConceptMappings) return cachedConceptMappings;
  const mappings = await prisma.conceptMapping.findMany();
  const map = new Map<string, string>();
  for (const m of mappings) {
    map.set(m.conceptName, m.fieldName);
  }
  cachedConceptMappings = map;
  return map;
}

export function clearConceptMappingsCache(): void {
  cachedConceptMappings = null;
}

// ===== LEI LOOKUP (GLEIF) =====

interface GLEIFLeiRecord {
  attributes: {
    lei: string;
    entity: {
      legalName: { name: string };
    };
  };
}

interface GLEIFSearchResponse {
  data: GLEIFLeiRecord[];
}

function normalizeLegalName(name: string): string {
  return name
    .toUpperCase()
    .replace(/,\s*/g, ' ')
    .replace(/\.\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function resolveLEI(companyName: string): Promise<string | null> {
  const candidates = await resolveLEICandidates(companyName);
  return candidates[0] || null;
}

async function resolveLEICandidates(companyName: string): Promise<string[]> {
  const normalized = normalizeLegalName(companyName);
  const seenLeis = new Set<string>();
  const results: { lei: string; score: number }[] = [];

  const queries = [
    { filterKey: 'entity.legalName', name: companyName },
    { filterKey: 'entity.legalName', name: normalized },
    { filterKey: 'fulltext', name: companyName },
    { filterKey: 'fulltext', name: normalized },
  ];

  for (const { filterKey, name } of queries) {
    try {
      const response = await axios.get<GLEIFSearchResponse>(`${GLEIF_BASE}/lei-records`, {
        params: {
          [`filter[${filterKey}]`]: name,
          'page[size]': 10,
        },
        headers: { Accept: 'application/vnd.api+json' },
        timeout: 10000,
      });
      const records = response.data?.data || [];
      for (const r of records) {
        const lei = r.attributes.lei;
        if (seenLeis.has(lei)) continue;
        seenLeis.add(lei);
        const recordName = r.attributes.entity.legalName.name;
        const recordNorm = normalizeLegalName(recordName);
        let score = 10;
        if (recordName.toUpperCase() === companyName.toUpperCase()) score = 100;
        else if (recordNorm === normalized) score = 80;
        else if (recordNorm.startsWith(normalized) || normalized.startsWith(recordNorm)) score = 50;
        results.push({ lei, score });
      }
    } catch {
      continue;
    }
  }

  return results.sort((a, b) => b.score - a.score).map((r) => r.lei);
}

// ===== XBRL FILING API =====

interface XBRLFilingAttributes {
  period_end: string;
  json_url: string | null;
  country: string;
}

interface XBRLFiling {
  id: string;
  attributes: XBRLFilingAttributes;
  relationships: {
    entity: { links: { related: string } };
  };
}

interface XBRLFilingsResponse {
  data: XBRLFiling[];
}

interface XBRLJsonFact {
  value: string | number;
  dimensions: {
    concept: string;
    period: string;
    entity?: string;
    unit?: string;
  };
}

interface XBRLJsonFiling {
  facts: Record<string, XBRLJsonFact>;
}

const IFRS_MAP: Record<string, string> = {
  'ifrs-full:Revenue': 'revenue',
  'ifrs-full:RevenueFromContractsWithCustomers': 'revenue',
  'ifrs-full:CostOfSales': 'costOfRevenue',
  'ifrs-full:GrossProfit': 'grossProfit',
  'ifrs-full:OperatingExpenses': 'operatingExpenses',
  'ifrs-full:ProfitLoss': 'netIncome',
  'ifrs-full:EBITDA': 'ebitda',
  'ifrs-full:OperatingProfitLoss': 'ebit',
  'ifrs-full:ProfitLossFromOperatingActivities': 'ebit',
  'ifrs-full:FinanceCosts': 'interestExpense',
  'ifrs-full:IncomeTaxExpense': 'taxExpense',
  'ifrs-full:IncomeTaxExpenseContinuingOperations': 'taxExpense',
  'ifrs-full:DepreciationAmortisationCharge': 'depreciation',
  'ifrs-full:DepreciationAndAmortisationExpense': 'depreciation',
  'ifrs-full:RawMaterialsAndConsumablesUsed': 'rawMaterialsUsed',
  'ifrs-full:EmployeeBenefitsExpense': 'employeeExpense',
  'ifrs-full:OtherExpenseByNature': 'operatingExpenses',
  'ifrs-full:OtherIncome': 'otherIncome',
  'ifrs-full:PurchaseOfPropertyPlantAndEquipment': 'capex',
  'ifrs-full:PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets': 'capex',
  'ifrs-full:CashFlowsFromUsedInOperatingActivities': 'operatingCashFlow',
  'ifrs-full:CashFlowsFromUsedInInvestingActivities': 'investingCashFlow',
  'ifrs-full:CashFlowsFromUsedInFinancingActivities': 'financingCashFlow',
  'ifrs-full:DividendsPaid': 'dividendsPaid',
  'ifrs-full:DividendsPaidClassifiedAsFinancingActivities': 'dividendsPaid',
  'ifrs-full:NumberofSharesIssued': 'sharesOutstanding',
  'ifrs-full:Assets': 'totalAssets',
  'ifrs-full:CurrentAssets': 'currentAssets',
  'ifrs-full:NoncurrentAssets': 'nonCurrentAssets',
  'ifrs-full:CashAndCashEquivalents': 'cash',
  'ifrs-full:TradeAndOtherReceivables': 'receivables',
  'ifrs-full:TradeAndOtherCurrentReceivables': 'receivables',
  'ifrs-full:Inventories': 'inventory',
  'ifrs-full:PropertyPlantAndEquipment': 'ppe',
  'ifrs-full:Goodwill': 'goodwill',
  'ifrs-full:IntangibleAssets': 'intangibleAssets',
  'ifrs-full:IntangibleAssetsOtherThanGoodwill': 'intangibleAssets',
  'ifrs-full:Liabilities': 'totalLiabilities',
  'ifrs-full:CurrentLiabilities': 'currentLiabilities',
  'ifrs-full:NoncurrentLiabilities': 'nonCurrentLiabilities',
  'ifrs-full:Equity': 'totalEquity',
  'ifrs-full:EquityAttributableToOwnersOfParent': 'totalEquity',
  'ifrs-full:TradeAndOtherPayables': 'accountsPayable',
  'ifrs-full:TradeAndOtherCurrentPayables': 'accountsPayable',
  'ifrs-full:ShorttermBorrowings': 'shortTermDebt',
  'ifrs-full:LongtermBorrowings': 'longTermDebt',
  'ifrs-full:CurrentLeaseLiabilities': 'shortTermDebt',
  'ifrs-full:NoncurrentLeaseLiabilities': 'longTermDebt',
  'ifrs-full:DatedSubordinatedLiabilities': 'longTermDebt',
  'ifrs-full:UnsecuredBankLoansReceived': 'longTermDebt',
  'ifrs-full:RetainedEarnings': 'retainedEarnings',
  'ifrs-full:IssuedCapital': 'issuedCapital',
  'ifrs-full:RevenueFromInterest': 'revenue',
  'ifrs-full:InsuranceRevenue': 'revenue',
  'ifrs-full:PremiumRevenue': 'revenue',
  'ifrs-full:NetInvestmentIncome': 'revenue',
  'ifrs-full:IncomeArisingFromInsuranceContracts': 'revenue',
  'ifrs-full:InsuranceRevenueOtherAmounts': 'revenue',
  'ifrs-full:InterestExpenseClassifiedAsOperatingActivities': 'interestExpense',
  'ifrs-full:InsuranceFinanceExpense': 'interestExpense',
  'ifrs-full:FinanceIncomeCost': 'interestExpense',
  'ifrs-full:InterestIncome': 'interestIncome',
  'ifrs-full:InsuranceFinanceIncome': 'interestIncome',
  'ifrs-full:FeeAndCommissionIncome': 'feeIncome',
  'ifrs-full:FeeAndCommissionExpense': 'feeExpense',
  'ifrs-full:InsuranceServiceExpense': 'costOfRevenue',
  'ifrs-full:IncurredClaimsExpense': 'costOfRevenue',
  'ifrs-full:InsuranceServiceExpensesFromInsuranceContractsIssued': 'costOfRevenue',
  'ifrs-full:BasicEarningsLossPerShare': 'epsBasic',
  'ifrs-full:DilutedEarningsLossPerShare': 'epsDiluted',
  'ifrs-full:ResearchAndDevelopmentExpense': 'rdExpense',
  'ifrs-full:SellingAndMarketingExpense': 'sgaExpense',
  'ifrs-full:AdministrativeExpense': 'sgaExpense',
  'ifrs-full:AcquisitionAndAdministrationExpenseRelatedToInsuranceContracts': 'operatingExpenses',
  'ifrs-full:OtherExpenseByFunction': 'operatingExpenses',
  'ifrs-full:PaymentsForRepurchaseOfOwnEquity': 'shareRepurchases',
  'ifrs-full:AcquisitionsOfPropertyPlantAndEquipment': 'capex',
  'ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities': 'capex',
  'ifrs-full:PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities': 'capex',
  'ifrs-full:TotalAssets': 'totalAssets',
  'ifrs-full:IncreaseDecreaseInWorkingCapital': 'workingCapitalChange',
  'ifrs-full:AdjustmentsForReconcileProfitLoss': 'cashAdjustments',
  'ifrs-full:OtherAdjustmentsToReconcileProfitLoss': 'otherCashAdjustments',
  'ifrs-full:CashFlowsFromUsedInOperatingActivitiesDirectMethod': 'operatingCashFlow',
  'ifrs-full:CashFlowsFromUsedInOperations': 'operatingCashFlow',
  'ifrs-full:DepreciationAmortisationImpairmentLoss': 'depreciation',
  'ifrs-full:DepreciationOfPropertyPlantAndEquipment': 'depreciation',
  'ifrs-full:AmortisationExpense': 'depreciation',
  'ifrs-full:ProfitLossBeforeTax': 'ebit',
  // Spanish IFRS / custom Acciona tags (depreciation + provisions)
  'Acciona:DotacionAmortizacionYVariacionDeProvisiones': 'depreciation',
  'Acciona:OtherExpenseByNature': 'sgaExpense',
  'Acciona:RAndDExpense': 'rdExpense',
};

const IFRS_ALIASES: Record<string, string> = {
  'ifrs-full:OperatingIncome': 'ebit',
  'ifrs-full:FinanceIncome': 'interestIncome',
  'ifrs-full:Borrowings': 'totalDebt',
  'ifrs-full:TotalBorrowings': 'totalDebt',
  'ifrs-full:ShareofProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod': 'equityMethodIncome',
  'ifrs-full:InsuranceContractAssets': 'totalAssets',
  'ifrs-full:InsuranceContractLiabilities': 'totalLiabilities',
  'ifrs-full:PolicyholderLiabilities': 'totalLiabilities',
  'ifrs-full:ReinsuranceContractAssets': 'receivables',
  'ifrs-full:InsuranceContractsThatAreAssets': 'totalAssets',
  'ifrs-full:InsuranceContractsThatAreLiabilities': 'totalLiabilities',
  'ifrs-full:OtherFinancialLiabilities': 'totalLiabilities',
  'ifrs-full:OtherAssets': 'totalAssets',
  'ifrs-full:CurrentTaxLiabilities': 'currentLiabilities',
  'ifrs-full:DeferredTaxLiabilities': 'nonCurrentLiabilities',
  'ifrs-full:LoansAndReceivables': 'receivables',
};

const CAPEX_PATTERN = /Purchase.*PropertyPlant|Purchase.*IntangibleAsset|Payment.*Investment.*Property|PurchasesAndSales.*PropertyPlant/i;

export interface EuropeanFinancialData {
  year: number;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  sgaExpense: number | null;
  rdExpense: number | null;
  netIncome: number | null;
  ebit: number | null;
  ebitda: number | null;
  interestExpense: number | null;
  taxExpense: number | null;
  depreciation: number | null;
  capex: number | null;
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
  dividendsPaid: number | null;
  shareRepurchases: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cash: number | null;
  currentAssets: number | null;
  nonCurrentAssets: number | null;
  currentLiabilities: number | null;
  nonCurrentLiabilities: number | null;
  inventory: number | null;
  receivables: number | null;
  ppe: number | null;
  goodwill: number | null;
  intangibleAssets: number | null;
  accountsPayable: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  totalDebt: number | null;
  retainedEarnings: number | null;
  sharesOutstanding: number | null;
  interestIncome: number | null;
  feeIncome: number | null;
  feeExpense: number | null;
}

function parseNum(val: string | number | undefined): number | null {
  if (val == null || val === '' || val === 'inf') return null;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

function getYearFromPeriod(period: string): number | null {
  const match = period.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

function getFiscalYear(period: string): number | null {
  if (period.includes('/')) {
    const start = period.split('/')[0];
    const match = start.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }
  const match = period.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

function isAnnualPeriod(period: string): boolean {
  if (period.includes('/')) {
    const [start, end] = period.split('/');
    const startDate = new Date(start);
    const endDate = new Date(end);
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 330 && daysDiff <= 400;
  }
  return period.includes('12-31') || period.includes('01-01') || period.includes('03-31') || period.length === 10;
}

function cleanCompanyName(name: string): string {
  return name
    .replace(/\s+ACT\.[A-Z]+\s*$/i, '')
    .replace(/\s+ORD\s+EUR[\d.]*\s*$/i, '')
    .replace(/\s+ORD\s+GBP[\d.]*\s*$/i, '')
    .replace(/\s+ORD\s+[\d.]*\s*$/i, '')
    .replace(/\s+SHS\s+[\d.]*\s*$/i, '')
    .replace(/\s+REG\s+[\d.]*\s*$/i, '')
    .replace(/\s+NEW\s*$/i, '')
    .replace(/\s+[A-Z]\s*$/i, '')
    .replace(/,\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getYearFromJsonUrl(url: string): number | null {
  const filename = url.split('/').pop() || '';
  const match = filename.match(/(\d{4})-\d{2}-\d{2}/);
  return match ? parseInt(match[1], 10) : null;
}

export type EuropeanResult = {
  data: EuropeanFinancialData[];
  availableTags: string[];
};

export async function fetchEuropeanFinancials(ticker: string, countryCode: string, companyName?: string): Promise<EuropeanResult> {
  if (countryCode === 'DE' || countryCode === 'IE') {
    console.log(`[European] ${ticker} (${countryCode}): skipping ESEF — country has no filings on filings.xbrl.org`);
    return { data: [], availableTags: [] };
  }

  const rawName = companyName || ticker;
  const searchName = cleanCompanyName(rawName.replace(/\s*\([^)]*\)\s*$/, '').trim());

  const customMap = await loadCustomEuropeanTags();

  const leiCandidates = await resolveLEICandidates(searchName);
  if (leiCandidates.length === 0) {
    console.log(`[European] No LEI found for ${searchName} (${ticker})`);
    return { data: [], availableTags: [] };
  }
  console.log(`[European] Found ${leiCandidates.length} LEI candidates for ${searchName}: ${leiCandidates.slice(0, 3).join(', ')}`);

  for (const lei of leiCandidates) {
    let filings: XBRLFiling[];
    try {
      const response = await axios.get<XBRLFilingsResponse>(`${XBRL_BASE}/entities/${lei}/filings`, {
        params: {
          'page[size]': 10,
          'sort': '-period_end',
        },
        headers: { Accept: 'application/vnd.api+json' },
        timeout: 15000,
      });
      filings = response.data?.data || [];
    } catch {
      console.log(`[European] LEI ${lei}: API request failed`);
      continue;
    }

    if (filings.length === 0) {
      console.log(`[European] LEI ${lei}: no filings found`);
      continue;
    }
    console.log(`[European] LEI ${lei}: ${filings.length} filings`);

    const results: EuropeanFinancialData[] = [];
    const allTags = new Set<string>();

    for (const filing of filings.slice(0, 5)) {
      const jsonUrl = filing.attributes.json_url;
      if (!jsonUrl) continue;

      const year = getYearFromJsonUrl(jsonUrl) ?? getYearFromPeriod(filing.attributes.period_end);
      if (!year || year < 2015) continue;
      if (results.some((r) => r.year === year)) continue;

      const fullUrl = jsonUrl.startsWith('http') ? jsonUrl : `https://filings.xbrl.org${jsonUrl}`;

      try {
        const response = await axios.get<XBRLJsonFiling>(fullUrl, { timeout: 15000 });
        const facts = response.data?.facts;
        if (!facts) continue;

        for (const fact of Object.values(facts)) {
          if (fact.dimensions?.concept) allTags.add(fact.dimensions.concept);
        }

        const mapped = await mapJsonFactsToFiscalData(facts, year, customMap);
        if ((mapped.revenue != null && mapped.revenue > 0) || (mapped.totalAssets != null && mapped.totalAssets > 0)) {
          results.push(mapped);
        }
      } catch (e) {
        console.log(`[European] LEI ${lei}: error fetching ${fullUrl}: ${e instanceof Error ? e.message : e}`);
      }
    }

    if (results.length > 0) {
      console.log(`[European] LEI ${lei}: ${results.length} years extracted for ${ticker}`);
      return {
        data: results.sort((a, b) => b.year - a.year),
        availableTags: Array.from(allTags).sort(),
      };
    }
    console.log(`[European] LEI ${lei}: no extractable data — trying next LEI`);
  }

  console.log(`[European] No XBRL data found across ${leiCandidates.length} LEI candidates for ${ticker}`);
  return { data: [], availableTags: [] };
}

function normalizeConcept(concept: string): string {
  const colonIdx = concept.indexOf(':');
  return colonIdx >= 0 ? concept.substring(colonIdx + 1) : concept;
}

async function mapJsonFactsToFiscalData(
  facts: Record<string, XBRLJsonFact>,
  year: number,
  customMap: Map<string, string[]> = new Map(),
): Promise<EuropeanFinancialData> {
  const mergedLookup: Record<string, string> = { ...IFRS_MAP, ...IFRS_ALIASES };

  for (const [fullTag, fieldName] of Object.entries(IFRS_MAP)) {
    const normalized = normalizeConcept(fullTag);
    if (!mergedLookup[normalized]) mergedLookup[normalized] = fieldName;
  }
  for (const [fullTag, fieldName] of Object.entries(IFRS_ALIASES)) {
    const normalized = normalizeConcept(fullTag);
    if (!mergedLookup[normalized]) mergedLookup[normalized] = fieldName;
  }

  for (const [fieldName, customConcepts] of customMap) {
    for (const concept of customConcepts) {
      if (!mergedLookup[concept]) mergedLookup[concept] = fieldName;
      const normalized = normalizeConcept(concept);
      if (!mergedLookup[normalized]) mergedLookup[normalized] = fieldName;
    }
  }

  const learnedMappings = await loadConceptMappings();
  for (const [concept, fieldName] of learnedMappings) {
    if (!mergedLookup[concept]) mergedLookup[concept] = fieldName;
  }

  const fields: Record<string, number | null> = {};
  let capexAccumulator = 0;
  let capexFound = false;

  for (const fact of Object.values(facts)) {
    const concept = fact.dimensions?.concept;
    const period = fact.dimensions?.period;
    if (!concept || !period) continue;

    if (!isAnnualPeriod(period)) continue;

    const factYear = getFiscalYear(period);
    if (factYear !== year) continue;

    const val = parseNum(fact.value as string);

    const fieldName = mergedLookup[concept] || mergedLookup[normalizeConcept(concept)];
    if (fieldName) {
      if (fieldName === 'capex') {
        if (val != null) {
          capexAccumulator += Math.abs(val);
          capexFound = true;
        }
      } else if (val != null) {
        const existing = fields[fieldName];
        if (existing == null || Math.abs(val) > Math.abs(existing)) {
          fields[fieldName] = val;
        }
      }
    } else if (CAPEX_PATTERN.test(concept)) {
      if (val != null) {
        capexAccumulator += Math.abs(val);
        capexFound = true;
      }
    }
  }

  const rawMaterials = fields.rawMaterialsUsed ?? null;
  const employeeExp = fields.employeeExpense ?? null;
  const otherExp = fields.otherExpenseByNature ?? null;
  const otherInc = fields.otherIncome ?? null;

  const costOfRevenue = fields.costOfRevenue ?? rawMaterials;
  const operatingExpenses = fields.operatingExpenses ?? (
    employeeExp != null && otherExp != null
      ? employeeExp + otherExp - (otherInc ?? 0)
      : null
  );
  const grossProfit = fields.grossProfit ?? (
    fields.revenue != null && costOfRevenue != null
      ? fields.revenue - costOfRevenue
      : null
  );
// Compute depreciation as fallback for nature-based IFRS filings (no explicit depreciation tag)
  const hasWorkingCapitalChange = 'workingCapitalChange' in fields && fields.workingCapitalChange != null;
  const hasOtherCashAdjustments = 'otherCashAdjustments' in fields && fields.otherCashAdjustments != null;
  const workingCapitalChange = fields.workingCapitalChange ?? 0;
  const otherCashAdjustments = fields.otherCashAdjustments ?? 0;
  const depreciation = fields.depreciation ?? (
    fields.operatingCashFlow != null && fields.netIncome != null && hasWorkingCapitalChange
      ? Math.max(0, fields.operatingCashFlow - fields.netIncome - workingCapitalChange - otherCashAdjustments)
      : null
  );

  const ebitda = fields.ebitda ?? (
    fields.ebit != null && depreciation != null
      ? fields.ebit + depreciation
      : null
  );

  const totalLiabilities = fields.totalLiabilities ?? (
    fields.currentLiabilities != null && fields.nonCurrentLiabilities != null
      ? fields.currentLiabilities + fields.nonCurrentLiabilities
      : null
  );
  const nonCurrentAssets = fields.nonCurrentAssets ?? (
    fields.totalAssets != null && fields.currentAssets != null
      ? fields.totalAssets - fields.currentAssets
      : null
  );

  // Aggregate SGA from multiple IFRS concepts
  const sgaVal = fields.sgaExpense ?? (
    fields.operatingExpenses != null && fields.sgaExpense == null ? fields.operatingExpenses : null
  );
  const rdVal = fields.rdExpense ?? null;

  const result: EuropeanFinancialData = {
    year,
    revenue: fields.revenue ?? null,
    costOfRevenue,
    grossProfit,
    operatingExpenses,
    sgaExpense: sgaVal,
    rdExpense: rdVal,
    netIncome: fields.netIncome ?? null,
    ebit: fields.ebit ?? fields.operatingIncome ?? null,
    ebitda,
    interestExpense: fields.interestExpense ?? null,
    taxExpense: fields.taxExpense ?? null,
    depreciation,
    capex: capexFound ? capexAccumulator : null,
    operatingCashFlow: fields.operatingCashFlow ?? null,
    investingCashFlow: fields.investingCashFlow ?? null,
    financingCashFlow: fields.financingCashFlow ?? null,
    dividendsPaid: fields.dividendsPaid != null ? Math.abs(fields.dividendsPaid) : null,
    shareRepurchases: fields.shareRepurchases != null ? Math.abs(fields.shareRepurchases) : null,
    totalAssets: fields.totalAssets ?? null,
    totalLiabilities,
    totalEquity: fields.totalEquity ?? null,
    cash: fields.cash ?? null,
    currentAssets: fields.currentAssets ?? null,
    nonCurrentAssets,
    currentLiabilities: fields.currentLiabilities ?? null,
    nonCurrentLiabilities: fields.nonCurrentLiabilities ?? null,
    inventory: fields.inventory ?? null,
    receivables: fields.receivables ?? null,
    ppe: fields.ppe ?? null,
    goodwill: fields.goodwill ?? null,
    intangibleAssets: fields.intangibleAssets ?? null,
    accountsPayable: fields.accountsPayable ?? null,
    shortTermDebt: fields.shortTermDebt ?? null,
    longTermDebt: fields.longTermDebt ?? null,
    totalDebt: fields.totalDebt ?? null,
    retainedEarnings: fields.retainedEarnings ?? null,
    sharesOutstanding: (() => {
      if (fields.sharesOutstanding != null && fields.sharesOutstanding > 0) return fields.sharesOutstanding;
      if (fields.netIncome != null && fields.epsBasic != null && fields.epsBasic !== 0
          && Math.sign(fields.netIncome!) === Math.sign(fields.epsBasic!)) {
        let computed = Math.round(Math.abs(fields.netIncome! / fields.epsBasic!));
        console.log(`[XBRL] shares heuristic: netIncome=${fields.netIncome}, epsBasic=${fields.epsBasic}, raw=${computed}`);
        if (fields.revenue != null && fields.revenue > 1_000_000 && computed > 0) {
          const rawAdequate = computed * 0.5 >= fields.revenue * 0.01;
          if (!rawAdequate) {
            for (const factor of [1_000, 1_000_000]) {
              const scaled = computed * factor;
              if (scaled * 0.5 >= fields.revenue * 0.01) { computed = scaled; break; }
            }
          }
        }
        if (computed >= 1_000 && computed <= 100_000_000_000) {
          console.log(`[XBRL] shares heuristic result: ${computed}`);
          return computed;
        }
        console.log(`[XBRL] shares heuristic: ${computed} out of range`);
      }
      return null;
    })(),
    interestIncome: fields.interestIncome ?? null,
    feeIncome: fields.feeIncome ?? null,
    feeExpense: fields.feeExpense ?? null,
  };

  const warnings = validateFinancialData(result);
  if (warnings.length > 0) {
    logValidationWarnings(`year=${year}`, warnings, 'European-XBRL');
  }

  return result;
}
