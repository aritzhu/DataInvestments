import { PrismaClient } from '@prisma/client';
import { FIELD_MAPPING_CATALOG } from '../data/fieldMappingCatalog';

const prisma = new PrismaClient();

export interface FieldCoverageEntry {
  fieldName: string;
  label: string;
  category: string;
  populated: boolean;
  value: number | null;
}

export interface UnusedConceptEntry {
  concept: string;
  count: number;
}

export interface SyncCoverageReport {
  ticker: string;
  companyName: string;
  year: number;
  source: string;
  populatedFields: FieldCoverageEntry[];
  missingFields: FieldCoverageEntry[];
  unusedConcepts: UnusedConceptEntry[];
  totalConceptsExtracted: number;
  mappedConcepts: number;
}

const FINANCIAL_DATA_FIELDS = FIELD_MAPPING_CATALOG.map((f) => f.fieldName);

/**
 * Build a coverage report for a specific company and year.
 * Compares what's stored in FinancialData against what the catalog expects.
 */
export async function buildCoverageReport(
  ticker: string,
  year: number,
  availableTags?: string[],
): Promise<SyncCoverageReport | null> {
  const company = await prisma.company.findUnique({
    where: { ticker: ticker.toUpperCase() },
  });
  if (!company) return null;

  const financial = await prisma.financialData.findUnique({
    where: {
      companyId_year_quarter: { companyId: company.id, year, quarter: 0 },
    },
  });

  const ds = await prisma.dataSync.findUnique({
    where: { companyId: company.id },
  });

  // If availableTags not provided, try to load from DataSync record
  if (!availableTags && ds?.availableTags && ds.availableTags.length > 0) {
    availableTags = ds.availableTags;
  }

  const source = ds?.europeanSync
    ? 'european'
    : ds?.secSync
      ? 'sec'
      : ds?.fmpSync
        ? 'fmp'
        : 'unknown';

  const populatedFields: FieldCoverageEntry[] = [];
  const missingFields: FieldCoverageEntry[] = [];

  for (const entry of FIELD_MAPPING_CATALOG) {
    const fieldName = entry.fieldName;

    // Skip fields not in FinancialData (e.g. sharesOutstanding is in StockMetric, not FinancialData)
    const expectedInFinancial = [
      'revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses',
      'sgaExpense', 'rdExpense', 'interestExpense', 'taxExpense', 'netIncome',
      'ebit', 'ebitda', 'capex', 'depreciation', 'operatingCashFlow',
      'investingCashFlow', 'financingCashFlow', 'freeCashFlow',
      'dividendsPaid', 'shareRepurchases', 'totalAssets', 'totalLiabilities',
      'totalEquity',
    ];

    if (!expectedInFinancial.includes(fieldName)) continue;

    const val = financial ? (financial as Record<string, unknown>)[fieldName] : undefined;
    const isPopulated = val != null && val !== 0;

    const coverageEntry: FieldCoverageEntry = {
      fieldName,
      label: entry.label,
      category: entry.category,
      populated: isPopulated,
      value: isPopulated ? (val as number) : null,
    };

    if (isPopulated) {
      populatedFields.push(coverageEntry);
    } else {
      missingFields.push(coverageEntry);
    }
  }

  // Determine unused concepts from available XBRL tags
  const unusedConcepts: UnusedConceptEntry[] = [];
  if (availableTags && availableTags.length > 0) {
    // Collect all known IFRS/European tags from the catalog
    const knownTags = new Set<string>();
    for (const entry of FIELD_MAPPING_CATALOG) {
      for (const tag of entry.sources.european || []) {
        knownTags.add(tag);
      }
    }

    // Also check custom tags from FieldConfig
    const configs = await prisma.fieldConfig.findMany({
      where: { source: 'european' },
    });
    for (const c of configs) {
      for (const tag of c.customTags) {
        knownTags.add(tag);
      }
    }

    // Check concept mappings
    const mappings = await prisma.conceptMapping.findMany();
    for (const m of mappings) {
      knownTags.add(m.conceptName);
    }

    // Tag usage frequency
    const tagCount = new Map<string, number>();
    for (const tag of availableTags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }

    for (const [tag, count] of tagCount) {
      if (!knownTags.has(tag)) {
        unusedConcepts.push({ concept: tag, count });
      }
    }

    unusedConcepts.sort((a, b) => b.count - a.count);
  }

  return {
    ticker: company.ticker,
    companyName: company.name,
    year,
    source,
    populatedFields,
    missingFields,
    unusedConcepts,
    totalConceptsExtracted: availableTags?.length || 0,
    mappedConcepts: availableTags ? availableTags.length - unusedConcepts.length : 0,
  };
}
