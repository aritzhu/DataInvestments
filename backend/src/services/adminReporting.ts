import prisma from '../infrastructure/prisma/client';

interface DetailedFieldEntry {
  fieldName: string;
  label: string;
  category: 'financial' | 'balanceSheet' | 'stockMetric' | 'company';
  source: string;
  value: number | null;
  populated: boolean;
  ytdChange?: number;
}

interface YearData {
  year: number;
  source: string;
  financialData: DetailedFieldEntry[];
  balanceSheet: DetailedFieldEntry[];
  stockMetrics: DetailedFieldEntry[];
  companyProfile: DetailedFieldEntry[];
  totalConceptsExtracted: number;
  mappedConcepts: number;
}

interface ImportEvent {
  timestamp: string;
  ticker: string;
  event: 'start' | 'progress' | 'success' | 'error' | 'skipped';
  message?: string;
  recordsProcessed?: number;
  fieldsPopulated?: number;
  sourceBreakdown?: {
    sec: number;
    finnhub: number;
    european: number;
  };
}

export interface CoverageInput {
  fieldName: string;
  label: string;
  category: string;
}

interface StockMetricEntry {
  id: string;
  date: Date;
  currentPrice: number;
  peRatio: number | null;
  pbRatio: number | null;
  psRatio: number | null;
  dividendYield: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  sharesOutstanding: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  altmanZ: number | null;
  piotroskiScore: number | null;
  intrinsicValue: number | null;
  marginOfSafety: number | null;
}

interface BalanceSheetEntry {
  id: string;
  year: number;
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

interface FinancialDataEntry {
  id: string;
  year: number;
  quarter: number | null;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number | null;
  operatingExpenses: number;
  sgaExpense: number;
  rdExpense: number;
  interestExpense: number;
  taxExpense: number;
  ebitda: number | null;
  ebit: number | null;
  capex: number;
  depreciation: number;
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
  freeCashFlow: number | null;
  dividendsPaid: number | null;
  shareRepurchases: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  netIncome: number;
}

// ===== ADMIN REPORTING SERVICES =====

export async function buildComprehensiveYearReport(
  ticker: string,
): Promise<YearData[] | null> {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: ticker.toUpperCase() },
    });
    if (!company) return null;

    const years = await prisma.financialData.findMany({
      where: { companyId: company.id },
      orderBy: { year: 'asc' },
      select: {
        year: true,
        quarter: true,
      },
      distinct: ['year', 'quarter'],
    });

    const yearReports: YearData[] = [];

    for (const yearRecord of years) {
      const year = yearRecord.year;
      const quarter = yearRecord.quarter;

      const financial = await prisma.financialData.findFirst({
        where: {
          companyId: company.id,
          year,
          quarter: quarter || 0,
        },
      });

      const balanceSheet = await prisma.balanceSheet.findFirst({
        where: {
          companyId: company.id,
          year,
          quarter: quarter || 0,
        },
      });

      const stockMetrics = await prisma.stockMetric.findFirst({
        where: {
          companyId: company.id,
        },
        orderBy: { date: 'desc' },
      });

      const dataSync = await prisma.dataSync.findUnique({
        where: { companyId: company.id },
      });

      const source = dataSync?.europeanSync
        ? 'european'
        : dataSync?.secSync
          ? 'sec'
          : dataSync?.finnhubSync
            ? 'finnhub'
            : 'yahoo';

      const financialDataFields: DetailedFieldEntry[] = [];
      const balanceSheetFields: DetailedFieldEntry[] = [];
      const stockMetricFields: DetailedFieldEntry[] = [];
      const companyProfileFields: DetailedFieldEntry[] = [];

      if (financial) {
        const financialFieldDefs: CoverageInput[] = [
          { fieldName: 'revenue', category: 'financial', label: 'Revenue' },
          { fieldName: 'costOfRevenue', category: 'financial', label: 'Cost of Revenue' },
          { fieldName: 'grossProfit', category: 'financial', label: 'Gross Profit' },
          { fieldName: 'operatingExpenses', category: 'financial', label: 'Operating Expenses' },
          { fieldName: 'sgaExpense', category: 'financial', label: 'SG&A Expense' },
          { fieldName: 'rdExpense', category: 'financial', label: 'R&D Expense' },
          { fieldName: 'interestExpense', category: 'financial', label: 'Interest Expense' },
          { fieldName: 'taxExpense', category: 'financial', label: 'Tax Expense' },
          { fieldName: 'ebitda', category: 'financial', label: 'EBITDA' },
          { fieldName: 'ebit', category: 'financial', label: 'EBIT' },
          { fieldName: 'capex', category: 'financial', label: 'Capex' },
          { fieldName: 'depreciation', category: 'financial', label: 'Depreciation' },
          { fieldName: 'operatingCashFlow', category: 'financial', label: 'Operating Cash Flow' },
          { fieldName: 'investingCashFlow', category: 'financial', label: 'Investing Cash Flow' },
          { fieldName: 'financingCashFlow', category: 'financial', label: 'Financing Cash Flow' },
          { fieldName: 'freeCashFlow', category: 'financial', label: 'Free Cash Flow' },
          { fieldName: 'dividendsPaid', category: 'financial', label: 'Dividends Paid' },
          { fieldName: 'shareRepurchases', category: 'financial', label: 'Share Repurchases' },
          { fieldName: 'totalAssets', category: 'financial', label: 'Total Assets' },
          { fieldName: 'totalLiabilities', category: 'financial', label: 'Total Liabilities' },
          { fieldName: 'totalEquity', category: 'financial', label: 'Total Equity' },
          { fieldName: 'netIncome', category: 'financial', label: 'Net Income' },
        ];

        for (const field of financialFieldDefs) {
          const val = (financial as Record<string, unknown>)[field.fieldName];
          const populated = val != null && val !== 0;

          financialDataFields.push({
            fieldName: field.fieldName,
            label: field.label,
            category: field.category as 'financial',
            source,
            value: populated ? (val as number) : null,
            populated,
          });
        }
      }

      if (balanceSheet) {
        const balanceSheetFieldDefs: CoverageInput[] = [
          { fieldName: 'cashAndCashEquivalents', category: 'balanceSheet', label: 'Cash & Cash Equivalents' },
          { fieldName: 'shortTermInvestments', category: 'balanceSheet', label: 'Short Term Investments' },
          { fieldName: 'accountsReceivable', category: 'balanceSheet', label: 'Accounts Receivable' },
          { fieldName: 'inventory', category: 'balanceSheet', label: 'Inventory' },
          { fieldName: 'totalCurrentAssets', category: 'balanceSheet', label: 'Total Current Assets' },
          { fieldName: 'propertyPlantEquipment', category: 'balanceSheet', label: 'Property, Plant & Equipment' },
          { fieldName: 'goodwill', category: 'balanceSheet', label: 'Goodwill' },
          { fieldName: 'intangibleAssets', category: 'balanceSheet', label: 'Intangible Assets' },
          { fieldName: 'totalNonCurrentAssets', category: 'balanceSheet', label: 'Total Non-Current Assets' },
          { fieldName: 'totalAssets', category: 'balanceSheet', label: 'Total Assets' },
          { fieldName: 'accountsPayable', category: 'balanceSheet', label: 'Accounts Payable' },
          { fieldName: 'shortTermDebt', category: 'balanceSheet', label: 'Short Term Debt' },
          { fieldName: 'totalCurrentLiabilities', category: 'balanceSheet', label: 'Total Current Liabilities' },
          { fieldName: 'longTermDebt', category: 'balanceSheet', label: 'Long Term Debt' },
          { fieldName: 'totalNonCurrentLiabilities', category: 'balanceSheet', label: 'Total Non-Current Liabilities' },
          { fieldName: 'totalLiabilities', category: 'balanceSheet', label: 'Total Liabilities' },
          { fieldName: 'totalStockholdersEquity', category: 'balanceSheet', label: 'Total Stockholders Equity' },
          { fieldName: 'retainedEarnings', category: 'balanceSheet', label: 'Retained Earnings' },
          { fieldName: 'treasuryStock', category: 'balanceSheet', label: 'Treasury Stock' },
        ];

        for (const field of balanceSheetFieldDefs) {
          const val = (balanceSheet as Record<string, unknown>)[field.fieldName];
          const populated = val != null && val !== 0;

          balanceSheetFields.push({
            fieldName: field.fieldName,
            label: field.label,
            category: field.category as 'balanceSheet',
            source,
            value: populated ? (val as number) : null,
            populated,
          });
        }
      }

      if (stockMetrics) {
        const stockMetricFieldDefs: CoverageInput[] = [
          { fieldName: 'currentPrice', category: 'stockMetric', label: 'Current Price' },
          { fieldName: 'peRatio', category: 'stockMetric', label: 'P/E Ratio' },
          { fieldName: 'pbRatio', category: 'stockMetric', label: 'P/B Ratio' },
          { fieldName: 'psRatio', category: 'stockMetric', label: 'P/S Ratio' },
          { fieldName: 'dividendYield', category: 'stockMetric', label: 'Dividend Yield' },
          { fieldName: 'marketCap', category: 'stockMetric', label: 'Market Cap' },
          { fieldName: 'enterpriseValue', category: 'stockMetric', label: 'Enterprise Value' },
          { fieldName: 'sharesOutstanding', category: 'stockMetric', label: 'Shares Outstanding' },
          { fieldName: 'roe', category: 'stockMetric', label: 'ROE' },
          { fieldName: 'roa', category: 'stockMetric', label: 'ROA' },
          { fieldName: 'roic', category: 'stockMetric', label: 'ROIC' },
          { fieldName: 'currentRatio', category: 'stockMetric', label: 'Current Ratio' },
          { fieldName: 'debtToEquity', category: 'stockMetric', label: 'Debt to Equity' },
          { fieldName: 'altmanZ', category: 'stockMetric', label: 'Altman Z' },
          { fieldName: 'piotroskiScore', category: 'stockMetric', label: 'Piotroski Score' },
          { fieldName: 'intrinsicValue', category: 'stockMetric', label: 'Intrinsic Value' },
          { fieldName: 'marginOfSafety', category: 'stockMetric', label: 'Margin of Safety' },
        ];

        for (const field of stockMetricFieldDefs) {
          const val = (stockMetrics as Record<string, unknown>)[field.fieldName];
          const populated = val != null && val !== 0;

          stockMetricFields.push({
            fieldName: field.fieldName,
            label: field.label,
            category: field.category as 'stockMetric',
            source,
            value: populated ? (val as number) : null,
            populated,
          });
        }
      }

      if (company) {
        const companyFieldDefs: CoverageInput[] = [
          { fieldName: 'sector', category: 'company', label: 'Sector' },
          { fieldName: 'industry', category: 'company', label: 'Industry' },
          { fieldName: 'description', category: 'company', label: 'Description' },
          { fieldName: 'cik', category: 'company', label: 'CIK' },
          { fieldName: 'ceo', category: 'company', label: 'CEO' },
          { fieldName: 'employees', category: 'company', label: 'Employees' },
          { fieldName: 'country', category: 'company', label: 'Country' },
          { fieldName: 'exchange', category: 'company', label: 'Exchange' },
          { fieldName: 'website', category: 'company', label: 'Website' },
          { fieldName: 'ipoDate', category: 'company', label: 'IPO Date' },
        ];

        for (const field of companyFieldDefs) {
          const val = (company as Record<string, unknown>)[field.fieldName];
          const populated = val != null && val !== 0;

          companyProfileFields.push({
            fieldName: field.fieldName,
            label: field.label,
            category: field.category as 'company',
            source,
            value: populated ? Number(val) : null,
            populated,
          });
        }
      }

      const availableTags = dataSync?.availableTags || [];

      yearReports.push({
        year,
        source,
        financialData: financialDataFields,
        balanceSheet: balanceSheetFields,
        stockMetrics: stockMetricFields,
        companyProfile: companyProfileFields,
        totalConceptsExtracted: availableTags.length,
        mappedConcepts: 0,
      });
    }

    return yearReports.length > 0 ? yearReports : null;
  } catch (error) {
    console.error('Error building comprehensive year report:', error);
    throw error;
  }
}

export async function getImportTimeline(
  ticker: string,
  companyId: string,
): Promise<ImportEvent[] | null> {
  try {
    const events: ImportEvent[] = [];

    const syncEvents = await prisma.dataSync.findMany({
      where: { companyId },
      orderBy: { lastSyncAt: 'desc' },
      select: {
        lastSyncAt: true,
        yearsFetched: true,
        secSync: true,
        finnhubSync: true,
        europeanSync: true,
        errorMessage: true,
      },
    });

    for (let i = 0; i < syncEvents.length && i < 20; i++) {
      const ds = syncEvents[i];
      events.push({
        timestamp: ds.lastSyncAt.toISOString(),
        ticker: ticker.toUpperCase(),
        event: 'success',
        message: `Sync completado - ${ds.yearsFetched} años`,
        fieldsPopulated: ds.yearsFetched * 50,
        sourceBreakdown: {
          sec: ds.secSync ? 1 : 0,
          finnhub: ds.finnhubSync ? 1 : 0,
          european: ds.europeanSync ? 1 : 0,
        },
      });

      if (ds.errorMessage && ds.errorMessage.length > 0) {
        events.push({
          timestamp: new Date(Date.now() + (i + 1) * 60000).toISOString(),
          ticker: ticker.toUpperCase(),
          event: 'error',
          message: ds.errorMessage,
        });
      }
    }

    const financialCount = await prisma.financialData.count({
      where: { companyId },
    });

    if (financialCount > 0) {
      events.push({
        timestamp: new Date().toISOString(),
        ticker: ticker.toUpperCase(),
        event: 'progress',
        message: `${financialCount} registros financieros importados`,
        recordsProcessed: financialCount,
      });
    }

    return events.length > 0 ? events : null;
  } catch (error) {
    console.error('Error getting import timeline:', error);
    throw error;
  }
}