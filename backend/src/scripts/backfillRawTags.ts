import prisma from '../infrastructure/prisma/client';
import {
  getCikForTicker,
  fetchCompanyFacts,
  extractRevenue,
  extractNetIncome,
  extractCostOfRevenue,
  extractOperatingExpenses,
  extractSGA,
  extractRD,
  extractInterestExpense,
  extractTaxExpense,
  extractCapex,
  extractDepreciation,
  extractTotalAssets,
  extractTotalLiabilities,
  extractTotalEquity,
  extractGrossProfit,
  extractOperatingIncome,
  extractOperatingCashFlow,
  extractInvestingCashFlow,
  extractFinancingCashFlow,
  extractDividendsPaid,
  extractShareRepurchases,
  extractCash,
  extractReceivables,
  extractInventory,
  extractCurrentAssets,
  extractPPE,
  extractGoodwill,
  extractIntangibles,
  extractAccountsPayable,
  extractShortTermDebt,
  extractLongTermDebt,
  extractRetainedEarnings,
  extractCurrentLiabilities,
  extractShortTermInvestments,
  extractTreasuryStock,
  type ExtractedValues,
} from '../services/sec';
import { fetchEuropeanFinancials } from '../services/europeanData';

const args = process.argv.slice(2);
const getArg = (name: string): string | null => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : null;
};
const tickerFilter = getArg('ticker');
const limit = getArg('limit') ? parseInt(getArg('limit')!, 10) : null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildSecFinancialTags(facts: Awaited<ReturnType<typeof fetchCompanyFacts>>): Record<string, string> {
  const tags: Record<string, string> = {};
  const put = (field: string, arr: ExtractedValues) => {
    if (arr.tag) tags[field] = arr.tag;
  };
  if (!facts) return tags;
  put('revenue', extractRevenue(facts));
  put('costOfRevenue', extractCostOfRevenue(facts));
  put('grossProfit', extractGrossProfit(facts));
  put('operatingExpenses', extractOperatingExpenses(facts));
  put('sgaExpense', extractSGA(facts));
  put('rdExpense', extractRD(facts));
  put('interestExpense', extractInterestExpense(facts));
  put('taxExpense', extractTaxExpense(facts));
  put('netIncome', extractNetIncome(facts));
  put('ebit', extractOperatingIncome(facts));
  put('capex', extractCapex(facts));
  put('depreciation', extractDepreciation(facts));
  put('operatingCashFlow', extractOperatingCashFlow(facts));
  put('investingCashFlow', extractInvestingCashFlow(facts));
  put('financingCashFlow', extractFinancingCashFlow(facts));
  put('dividendsPaid', extractDividendsPaid(facts));
  put('shareRepurchases', extractShareRepurchases(facts));
  put('totalAssets', extractTotalAssets(facts));
  put('totalLiabilities', extractTotalLiabilities(facts));
  put('totalEquity', extractTotalEquity(facts));
  return tags;
}

function buildSecBalanceTags(facts: Awaited<ReturnType<typeof fetchCompanyFacts>>): Record<string, string> {
  const tags: Record<string, string> = {};
  const put = (field: string, arr: ExtractedValues) => {
    if (arr.tag) tags[field] = arr.tag;
  };
  if (!facts) return tags;
  put('cash', extractCash(facts));
  put('receivables', extractReceivables(facts));
  put('inventory', extractInventory(facts));
  put('currentAssets', extractCurrentAssets(facts));
  put('ppe', extractPPE(facts));
  put('goodwill', extractGoodwill(facts));
  put('intangibleAssets', extractIntangibles(facts));
  put('accountsPayable', extractAccountsPayable(facts));
  put('shortTermDebt', extractShortTermDebt(facts));
  put('longTermDebt', extractLongTermDebt(facts));
  put('retainedEarnings', extractRetainedEarnings(facts));
  put('currentLiabilities', extractCurrentLiabilities(facts));
  put('shortTermInvestments', extractShortTermInvestments(facts));
  put('treasuryStock', extractTreasuryStock(facts));
  put('totalAssets', extractTotalAssets(facts));
  put('totalLiabilities', extractTotalLiabilities(facts));
  put('totalEquity', extractTotalEquity(facts));
  return tags;
}

async function backfillSec(company: { id: string; ticker: string; cik: string | null }): Promise<boolean> {
  let cik = company.cik;
  if (!cik) {
    cik = await getCikForTicker(company.ticker);
    if (!cik) return false;
  }
  const facts = await fetchCompanyFacts(cik);
  if (!facts) return false;

  const financialTags = buildSecFinancialTags(facts);
  const balanceTags = buildSecBalanceTags(facts);

  const fin = await prisma.financialData.updateMany({
    where: { companyId: company.id, source: 'sec-xbrl' },
    data: { rawTags: financialTags },
  });
  const bs = await prisma.balanceSheet.updateMany({
    where: { companyId: company.id, source: 'sec-xbrl' },
    data: { rawTags: balanceTags },
  });
  console.log(`[backfillRawTags] ${company.ticker}: SEC ok (financial=${fin.count}, balance=${bs.count})`);
  return true;
}

async function backfillEuropean(company: { id: string; ticker: string; name: string | null; country: string | null; sector: string | null }): Promise<boolean> {
  const result = await fetchEuropeanFinancials(
    company.ticker,
    company.country ?? '',
    company.name ?? undefined,
    company.sector,
  );
  if (result.data.length === 0) return false;

  let finCount = 0;
  let bsCount = 0;
  for (const ed of result.data) {
    if (!ed.rawTags || Object.keys(ed.rawTags).length === 0) continue;
    const fin = await prisma.financialData.updateMany({
      where: { companyId: company.id, year: ed.year, source: 'esef-xbrl' },
      data: { rawTags: ed.rawTags },
    });
    const bs = await prisma.balanceSheet.updateMany({
      where: { companyId: company.id, year: ed.year, source: 'esef-xbrl' },
      data: { rawTags: ed.rawTags },
    });
    finCount += fin.count;
    bsCount += bs.count;
  }
  console.log(`[backfillRawTags] ${company.ticker}: European ok (financial=${finCount}, balance=${bsCount})`);
  return true;
}

async function main() {
  const where = tickerFilter ? { ticker: tickerFilter.toUpperCase() } : {};
  const companies = await prisma.company.findMany({
    where,
    select: { id: true, ticker: true, cik: true, name: true, country: true, sector: true },
    orderBy: { ticker: 'asc' },
    take: limit ?? undefined,
  });

  console.log(`[backfillRawTags] ${companies.length} empresas a procesar`);
  let done = 0;
  let processed = 0;

  for (const company of companies) {
    try {
      let ok = false;
      if (company.cik) {
        ok = await backfillSec(company);
      } else {
        const cik = await getCikForTicker(company.ticker);
        if (cik) {
          ok = await backfillSec({ id: company.id, ticker: company.ticker, cik });
        } else if (company.country) {
          ok = await backfillEuropean(company);
        }
      }
      if (ok) done++;
      processed++;
      console.log(`[backfillRawTags] Progreso ${processed}/${companies.length}`);
      await sleep(300);
    } catch (err) {
      console.error(`[backfillRawTags] Error en ${company.ticker}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[backfillRawTags] Completado: ${done}/${companies.length} empresas con rawTags`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
