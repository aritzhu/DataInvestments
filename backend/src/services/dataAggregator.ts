import { buildLogoUrl, isEuropeanTicker, resolveCompanyMeta } from './companyMeta';

function inferCurrency(ticker: string): string {
  const t = ticker.toUpperCase();
  if (t.endsWith('.DE') || t.endsWith('.AS') || t.endsWith('.MC') || t.endsWith('.PA') || t.endsWith('.MI') || t.endsWith('.BR') || t.endsWith('.SW') || t.endsWith('.SI')) return 'EUR';
  if (t.endsWith('.L')) return 'GBP';
  if (t.endsWith('.TO') || t.endsWith('.V')) return 'CAD';
  if (t.endsWith('.AX')) return 'AUD';
  if (t.endsWith('.HK')) return 'HKD';
  if (t.endsWith('.T')) return 'JPY';
  return 'USD';
}

import { STOXX600_UNIQUE_TICKERS } from '../data/europeanTickers/stoxx600';
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
  extractSharesOutstanding,
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
} from './sec';

import { fetchYahooQuote, fetchYahooProfile } from './yahoo';
import { fetchFinnhubMetrics, fetchFinnhubProfile } from './finnhub';
import { fetchEuropeanFinancials } from './europeanData';
import {
  fetchYFinanceQuarterly,
  fetchYFinanceInfo,
  parseYFinanceDate,
  mapIncomeRecord,
  mapCashflowRecord,
  mapBalanceRecord,
  type YFinanceRecord,
} from './yfinanceSidecar';
import axios from 'axios';
import { SP500_SECTORS } from '../data/sp500';
import { TICKER_SECTORS } from '../data/sectors';
import { validateFinancialData, validateBalanceSheet, logValidationWarnings } from '../utils/financialValidation';
import { computeAll, getSectorConfigs, getRecommendedFairValue } from './valuationService';
import prisma from '../infrastructure/prisma/client';

function safeInt(val: unknown): number | null {
  if (val == null) return null;
  const n = typeof val === 'number' ? val : parseInt(String(val), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface SyncResult {
  ticker: string;
  secSync: boolean;
  finnhubSync: boolean;
  europeanSync: boolean;
  yfinanceSync: boolean;
  yearsSynced: number;
  financialRecords: number;
  balanceSheets: number;
  segments: number;
  error?: string;
}

export async function syncCompanyData(ticker: string, years: number): Promise<SyncResult> {
  const result: SyncResult = {
    ticker,
    secSync: false,
    finnhubSync: false,
    europeanSync: false,
    yfinanceSync: false,
    yearsSynced: years,
    financialRecords: 0,
    balanceSheets: 0,
    segments: 0,
  };

  console.log(`[SEC] Starting sync for ${ticker} with ${years} years...`);

  const cik = await getCikForTicker(ticker);
  const facts = cik ? await fetchCompanyFacts(cik) : null;

  if (!cik) {
    if (!result.error) {
      result.error = `No se encontró CIK para ${ticker} en SEC EDGAR`;
    }
  } else if (!facts) {
    if (!result.error) {
      result.error = `No se pudieron obtener datos XBRL para ${ticker}`;
    }
  }

  if (cik && facts) {
    let company = await prisma.company.findUnique({
      where: { ticker: ticker.toUpperCase() },
    });

    if (!company) {
      // Priority: hardcoded mapping > S&P 500 list > Yahoo profile
      const known = TICKER_SECTORS[ticker.toUpperCase()];
      const sp500Sector = SP500_SECTORS[ticker.toUpperCase()];
      const yahooProfile = (!known && !sp500Sector) ? await fetchYahooProfile(ticker) : null;
      company = await prisma.company.create({
        data: {
          ticker: ticker.toUpperCase(),
          name: facts.entityName,
          cik: cik,
          country: 'US',
          sector: known?.sector || sp500Sector || yahooProfile?.sector || null,
          industry: known?.industry || yahooProfile?.industry || null,
        },
      });
    } else if (!company.sector) {
      // Fill in sector/industry if missing
      const known = TICKER_SECTORS[ticker.toUpperCase()];
      const sp500Sector = SP500_SECTORS[ticker.toUpperCase()];
      const yahooProfile = (!known && !sp500Sector && !company.industry) ? await fetchYahooProfile(ticker) : null;
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          name: facts.entityName,
          cik: company.cik || cik,
          country: company.country === 'United States' ? 'US' : (company.country || 'US'),
          sector: known?.sector || sp500Sector || yahooProfile?.sector || null,
          industry: company.industry || known?.industry || yahooProfile?.industry || null,
        },
      });
    } else {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          name: facts.entityName,
          cik: company.cik || cik,
          country: company.country === 'United States' ? 'US' : (company.country || 'US'),
        },
      });
    }

    // Extract all available XBRL fields
    const revenue = extractRevenue(facts);
    const netIncome = extractNetIncome(facts);
    const costOfRevenue = extractCostOfRevenue(facts);
    const operatingExpenses = extractOperatingExpenses(facts);
    const sga = extractSGA(facts);
    const rd = extractRD(facts);
    const interest = extractInterestExpense(facts);
    const tax = extractTaxExpense(facts);
    const capex = extractCapex(facts);
    const depreciation = extractDepreciation(facts);
    const totalAssets = extractTotalAssets(facts);
    const totalLiabilities = extractTotalLiabilities(facts);
    const totalEquity = extractTotalEquity(facts);
    const grossProfit = extractGrossProfit(facts);
    const operatingIncome = extractOperatingIncome(facts);
    const operatingCashFlow = extractOperatingCashFlow(facts);
    const investingCashFlow = extractInvestingCashFlow(facts);
    const financingCashFlow = extractFinancingCashFlow(facts);
    const dividendsPaid = extractDividendsPaid(facts);
    const shareRepurchases = extractShareRepurchases(facts);
    const sharesOutstanding = extractSharesOutstanding(facts);
    // Balance sheet detail
    const cash = extractCash(facts);
    const receivables = extractReceivables(facts);
    const inventory = extractInventory(facts);
    const currentAssets = extractCurrentAssets(facts);
    const ppe = extractPPE(facts);
    const goodwill = extractGoodwill(facts);
    const intangibles = extractIntangibles(facts);
    const accountsPayable = extractAccountsPayable(facts);
    const shortTermDebt = extractShortTermDebt(facts);
    const longTermDebt = extractLongTermDebt(facts);
    const retainedEarnings = extractRetainedEarnings(facts);
    const currentLiabilities = extractCurrentLiabilities(facts);
    const shortTermInvestments = extractShortTermInvestments(facts);
    const treasuryStock = extractTreasuryStock(facts);

    const makeMap = (arr: { year: number; value: number }[]) => new Map(arr.map((v) => [v.year, v.value]));
    const revenueMap = makeMap(revenue);
    const netIncomeMap = makeMap(netIncome);
    const costOfRevenueMap = makeMap(costOfRevenue);
    const operatingExpensesMap = makeMap(operatingExpenses);
    const sgaMap = makeMap(sga);
    const rdMap = makeMap(rd);
    const interestMap = makeMap(interest);
    const taxMap = makeMap(tax);
    const capexMap = makeMap(capex);
    const depreciationMap = makeMap(depreciation);
    const totalAssetsMap = makeMap(totalAssets);
    const totalLiabilitiesMap = makeMap(totalLiabilities);
    const totalEquityMap = makeMap(totalEquity);
    const grossProfitMap = makeMap(grossProfit);
    const operatingIncomeMap = makeMap(operatingIncome);
    const operatingCashFlowMap = makeMap(operatingCashFlow);
    const investingCashFlowMap = makeMap(investingCashFlow);
    const financingCashFlowMap = makeMap(financingCashFlow);
    const dividendsPaidMap = makeMap(dividendsPaid);
  const shareRepurchasesMap = makeMap(shareRepurchases);
  const cashMap = makeMap(cash);
  const receivablesMap = makeMap(receivables);
  const inventoryMap = makeMap(inventory);
  const currentAssetsMap = makeMap(currentAssets);
  const ppeMap = makeMap(ppe);
  const goodwillMap = makeMap(goodwill);
  const intangiblesMap = makeMap(intangibles);
  const accountsPayableMap = makeMap(accountsPayable);
  const shortTermDebtMap = makeMap(shortTermDebt);
  const longTermDebtMap = makeMap(longTermDebt);
  const retainedEarningsMap = makeMap(retainedEarnings);
  const currentLiabilitiesMap = makeMap(currentLiabilities);
  const shortTermInvestmentsMap = makeMap(shortTermInvestments);
  const treasuryStockMap = makeMap(treasuryStock);

  const allYears = revenue.map((r) => r.year).sort((a, b) => b - a).slice(0, years);

  for (const year of allYears) {
    const rev = revenueMap.get(year) || 0;
    if (rev === 0) continue;

    // Compute derived fields
    const costRev = costOfRevenueMap.get(year) || 0;
    const opExp = operatingExpensesMap.get(year) || 0;
    const gp = grossProfitMap.get(year) || (rev > 0 && costRev > 0 ? rev - costRev : null);
    const oi = operatingIncomeMap.get(year) || (gp != null && opExp > 0 ? gp - opExp : null);
    const dep = depreciationMap.get(year) || 0;
    const ebit = oi;
    const ebitda = oi != null ? oi + dep : null;
    const ocf = operatingCashFlowMap.get(year) || null;
    const fcf = ocf != null ? ocf - (capexMap.get(year) || 0) : null;

    const existing = await prisma.financialData.findUnique({
      where: { companyId_year_quarter: { companyId: company.id, year, quarter: 0 } },
    });

    const data = {
      companyId: company.id,
      year,
      quarter: 0,
      revenue: rev,
      costOfRevenue: costRev,
      grossProfit: gp,
      operatingExpenses: opExp,
      sgaExpense: sgaMap.get(year) || 0,
      rdExpense: rdMap.get(year) || 0,
      interestExpense: interestMap.get(year) || 0,
      taxExpense: taxMap.get(year) || 0,
      netIncome: netIncomeMap.get(year) || 0,
      ebitda,
      ebit,
      capex: capexMap.get(year) || 0,
      depreciation: dep,
      operatingCashFlow: ocf,
      investingCashFlow: investingCashFlowMap.get(year) || null,
      financingCashFlow: financingCashFlowMap.get(year) || null,
      freeCashFlow: fcf,
      dividendsPaid: dividendsPaidMap.get(year) || null,
      shareRepurchases: shareRepurchasesMap.get(year) || null,
      totalAssets: totalAssetsMap.get(year) || null,
      totalLiabilities: totalLiabilitiesMap.get(year) || null,
      totalEquity: totalEquityMap.get(year) || null,
    };

    const secWarnings = validateFinancialData(data);
    logValidationWarnings(ticker, secWarnings, 'SEC');

    if (existing) {
      await prisma.financialData.update({ where: { id: existing.id }, data });
    } else {
      await prisma.financialData.create({ data });
    }
    result.financialRecords++;

    // Build BalanceSheet from SEC data
    const bsExisting = await prisma.balanceSheet.findUnique({
      where: { companyId_year_quarter: { companyId: company.id, year, quarter: 0 } },
    });

    const totalAssetsVal = totalAssetsMap.get(year) || null;
    const totalLiabsVal = totalLiabilitiesMap.get(year) || null;
    const currentAssetsVal = currentAssetsMap.get(year) || null;
    const currentLiabsVal = currentLiabilitiesMap.get(year) || null;

    const bsData = {
      companyId: company.id,
      year,
      quarter: 0,
      cashAndCashEquivalents: cashMap.get(year) || null,
      shortTermInvestments: shortTermInvestmentsMap.get(year) || null,
      accountsReceivable: receivablesMap.get(year) || null,
      inventory: inventoryMap.get(year) || null,
      totalCurrentAssets: currentAssetsVal,
      propertyPlantEquipment: ppeMap.get(year) || null,
      goodwill: goodwillMap.get(year) || null,
      intangibleAssets: intangiblesMap.get(year) || null,
      totalNonCurrentAssets: totalAssetsVal != null && currentAssetsVal != null ? totalAssetsVal - currentAssetsVal : null,
      totalAssets: totalAssetsVal,
      accountsPayable: accountsPayableMap.get(year) || null,
      shortTermDebt: shortTermDebtMap.get(year) || null,
      totalCurrentLiabilities: currentLiabsVal,
      longTermDebt: longTermDebtMap.get(year) || null,
      totalNonCurrentLiabilities: totalLiabsVal != null && currentLiabsVal != null ? totalLiabsVal - currentLiabsVal : null,
      totalLiabilities: totalLiabsVal,
      totalStockholdersEquity: totalEquityMap.get(year) || null,
      retainedEarnings: retainedEarningsMap.get(year) || null,
      treasuryStock: treasuryStockMap.get(year) || null,
    };

    const secBsWarnings = validateBalanceSheet(bsData);
    logValidationWarnings(ticker, secBsWarnings, 'SEC');

    if (bsExisting) {
      await prisma.balanceSheet.update({ where: { id: bsExisting.id }, data: bsData });
    } else {
      await prisma.balanceSheet.create({ data: bsData });
    }
    result.balanceSheets++;
  }

  // Build StockMetric from Yahoo Finance + SEC computed data
  const latestYear = allYears[0];
  const latestRevenue = latestYear ? revenueMap.get(latestYear) || 0 : 0;
  const latestNetIncome = latestYear ? netIncomeMap.get(latestYear) || 0 : 0;
  const latestEquity = latestYear ? totalEquityMap.get(latestYear) || null : null;
  const latestAssets = latestYear ? totalAssetsMap.get(latestYear) || null : null;
  const latestLiabilities = latestYear ? totalLiabilitiesMap.get(latestYear) || null : null;
  const latestCurrentAssets = latestYear ? currentAssetsMap.get(latestYear) || null : null;
  const latestCurrentLiabilities = latestYear ? currentLiabilitiesMap.get(latestYear) || null : null;

  try {
    const yahooQuote = await fetchYahooQuote(ticker);
    if (yahooQuote && yahooQuote.currentPrice > 0) {
      const shares = sharesOutstanding ?? (yahooQuote.sharesOutstanding > 0 ? yahooQuote.sharesOutstanding
        : (yahooQuote.marketCap > 0 && yahooQuote.currentPrice > 0 ? Math.round(yahooQuote.marketCap / yahooQuote.currentPrice) : null));
      const mcap = shares && yahooQuote.currentPrice > 0
        ? yahooQuote.currentPrice * shares
        : (yahooQuote.marketCap && yahooQuote.marketCap > 0 ? yahooQuote.marketCap : null);

      const stockExisting = await prisma.stockMetric.findFirst({
        where: { companyId: company.id },
        orderBy: { date: 'desc' },
      });

      const stockData = {
        companyId: company.id,
        date: new Date(),
        currentPrice: yahooQuote.currentPrice,
        peRatio: latestNetIncome > 0 && mcap ? mcap / latestNetIncome : null,
        pbRatio: latestEquity && latestEquity > 0 && mcap ? mcap / latestEquity : null,
        psRatio: latestRevenue > 0 && mcap ? mcap / latestRevenue : null,
        dividendYield: null,
        marketCap: mcap,
        enterpriseValue: mcap != null
          ? mcap + (latestLiabilities || 0) - (cashMap.get(latestYear || 0) || 0)
          : null,
        sharesOutstanding: shares,
        roe: latestNetIncome > 0 && latestEquity && latestEquity > 0 ? (latestNetIncome / latestEquity) * 100 : null,
        roa: latestNetIncome > 0 && latestAssets && latestAssets > 0 ? (latestNetIncome / latestAssets) * 100 : null,
        roic: null,
        currentRatio: latestCurrentAssets != null && latestCurrentLiabilities != null && latestCurrentLiabilities > 0 ? latestCurrentAssets / latestCurrentLiabilities : null,
        debtToEquity: latestLiabilities && latestEquity && latestEquity > 0 ? latestLiabilities / latestEquity : null,
        altmanZ: null,
        piotroskiScore: null,
      };

      if (stockExisting) {
        await prisma.stockMetric.update({ where: { id: stockExisting.id }, data: stockData });
      } else {
        await prisma.stockMetric.create({ data: stockData });
      }
    }
  } catch (err) {
    console.error(`[SEC] Yahoo enrichment failed for ${ticker}:`, err instanceof Error ? err.message : err);
  }

  if (result.financialRecords > 0) {
    result.secSync = true;
  }

  console.log(`[SEC] Completed for ${ticker}: ${result.financialRecords} records, ${result.balanceSheets} balance sheets`);
  } // end-if cik && facts

  // European fallback: if SEC didn't produce data, try European XBRL.
  // For European-suffixed tickers always run it, even if SEC produced data,
  // so the correct European metadata overrides any misresolved US data.
  let europeanAvailableTags: string[] | undefined;
  if (!result.secSync || isEuropeanTicker(ticker)) {
    console.log(`[European] Trying European data for ${ticker}...`);

    const suffix = ticker.includes('.') ? ticker.split('.').pop()?.toUpperCase() : '';
    const TICKER_COUNTRY: Record<string, string> = {
      DE: 'DE', F: 'DE', D: 'DE', // Germany (FRA/XETRA)
      PA: 'FR',                                        // France (Euronext Paris)
      L: 'GB',                                         // UK (London)
      MC: 'ES',                                        // Spain (Madrid)
      AS: 'NL',                                        // Netherlands (Amsterdam)
      BR: 'BE',                                        // Belgium (Brussels)
      HE: 'FI',                                        // Finland (Helsinki)
      ST: 'SE',                                        // Sweden (Stockholm)
      CO: 'DK',                                        // Denmark (Copenhagen)
      MI: 'IT',                                        // Italy (Milan)
      LS: 'PT',                                        // Portugal (Lisbon)
      VI: 'AT',                                        // Austria (Vienna)
      SW: 'CH',                                        // Switzerland
      OL: 'NO',                                        // Norway (Oslo)
      IR: 'IE',                                        // Ireland
      LU: 'LU',                                        // Luxembourg
    };
    const countryCode = (suffix ? TICKER_COUNTRY[suffix] : '') || '';

    const STOXX_SECTOR_INDUSTRY: Record<string, string> = {
      'Financial Services': 'Banks - Diversified',
      'Technology': 'Software - Infrastructure',
      'Industrials': 'Aerospace & Defense',
      'Consumer Cyclical': 'Auto Manufacturers',
      'Consumer Defensive': 'Consumer Staples',
      'Healthcare': 'Drug Manufacturers',
      'Energy': 'Oil & Gas Integrated',
      'Utilities': 'Utilities - Regulated Electric',
      'Real Estate': 'REIT - Diversified',
      'Communication Services': 'Telecom Services',
      'Basic Materials': 'Specialty Chemicals',
    };

    if (countryCode) {
      try {
        const yahooQuote = await fetchYahooQuote(ticker);
        const yahooName = yahooQuote?.name;
        const hasTruncatedName = yahooName?.includes('...');
        const stoxxEntry = STOXX600_UNIQUE_TICKERS.find(t => t.ticker === ticker);
        const companyName = (!yahooName || hasTruncatedName)
          ? (stoxxEntry?.name || undefined)
          : yahooName;

        // --- Try yfinance quarterly data first ---
        const yfData = await fetchYFinanceQuarterly(ticker);
        const yfInfo = await fetchYFinanceInfo(ticker);
        const yfHasData = yfData?.hasQuarterly && yfData.income.length > 0;

        if (yfHasData && yfData) {
          console.log(`[yFinance] ${ticker}: ${yfData.income.length} income, ${yfData.balance.length} balance, ${yfData.cashflow.length} cashflow records`);

          let company = await prisma.company.findUnique({
            where: { ticker: ticker.toUpperCase() },
          });

          if (!company) {
            const yfSector = yfInfo?.info?.sector || null;
            const yfIndustry = yfInfo?.info?.industry || null;
            const yfWebsite = yfInfo?.info?.website || null;
            company = await prisma.company.create({
              data: {
                ticker: ticker.toUpperCase(),
                name: companyName || yfInfo?.info?.shortName || yfInfo?.info?.longName || ticker.toUpperCase(),
                country: countryCode,
                exchange: yahooQuote?.exchange || null,
                currency: inferCurrency(ticker),
                sector: stoxxEntry?.sector || yfSector,
                industry: stoxxEntry?.sector ? (STOXX_SECTOR_INDUSTRY[stoxxEntry.sector] || yfIndustry) : yfIndustry,
                website: yfWebsite,
                logoUrl: buildLogoUrl(yfWebsite),
              },
            });
            console.log(`[yFinance] Created company ${ticker} (id: ${company.id})`);
          } else if (!company.sector) {
            const yfSector = yfInfo?.info?.sector || null;
            const yfIndustry = yfInfo?.info?.industry || null;
            const sectorData = stoxxEntry?.sector
              ? { sector: stoxxEntry.sector, industry: STOXX_SECTOR_INDUSTRY[stoxxEntry.sector] || null }
              : yfSector
                ? { sector: yfSector, industry: yfIndustry }
                : TICKER_SECTORS[ticker.toUpperCase()]
                  ? { sector: TICKER_SECTORS[ticker.toUpperCase()].sector, industry: TICKER_SECTORS[ticker.toUpperCase()].industry }
                  : null;
            if (sectorData) {
              await prisma.company.update({ where: { id: company.id }, data: sectorData });
              console.log(`[yFinance] Updated ${ticker} sector → ${sectorData.sector}`);
            }
          }

          // Build lookup maps for cashflow and balance by date
          const cashflowByDate = new Map<string, YFinanceRecord>();
          for (const cf of yfData.cashflow) cashflowByDate.set(cf.date, cf);
          const balanceByDate = new Map<string, YFinanceRecord>();
          for (const bs of yfData.balance) balanceByDate.set(bs.date, bs);

          for (const inc of yfData.income) {
            const { year, quarter } = parseYFinanceDate(inc.date);
            const mapped = mapIncomeRecord(inc);
            const cfRec = cashflowByDate.get(inc.date);
            const cfMapped = cfRec ? mapCashflowRecord(cfRec) : null;
            const bsRec = balanceByDate.get(inc.date);
            const bsMapped = bsRec ? mapBalanceRecord(bsRec) : null;

            const finData = {
              companyId: company.id,
              year,
              quarter,
              revenue: mapped.revenue,
              costOfRevenue: mapped.costOfRevenue,
              grossProfit: mapped.grossProfit,
              operatingExpenses: mapped.operatingExpenses ?? 0,
              sgaExpense: mapped.sgaExpense,
              rdExpense: mapped.rdExpense,
              interestExpense: mapped.interestExpense,
              taxExpense: mapped.taxExpense,
              netIncome: mapped.netIncome,
              ebitda: mapped.ebitda,
              ebit: mapped.ebit,
              capex: cfMapped?.capex ?? 0,
              depreciation: mapped.depreciation,
              operatingCashFlow: cfMapped?.operatingCashFlow ?? null,
              investingCashFlow: cfMapped?.investingCashFlow ?? null,
              financingCashFlow: cfMapped?.financingCashFlow ?? null,
              freeCashFlow: cfMapped?.freeCashFlow ?? null,
              dividendsPaid: cfMapped?.dividendsPaid ?? null,
              shareRepurchases: cfMapped?.shareRepurchases ?? null,
              totalAssets: bsMapped?.totalAssets ?? null,
              totalLiabilities: bsMapped?.totalLiabilities ?? null,
              totalEquity: bsMapped?.totalStockholdersEquity ?? null,
            };

            const existing = await prisma.financialData.findUnique({
              where: { companyId_year_quarter: { companyId: company.id, year, quarter } },
            });
            const yfWarnings = validateFinancialData(finData);
            logValidationWarnings(ticker, yfWarnings, 'yFinance');
            if (existing) {
              await prisma.financialData.update({ where: { id: existing.id }, data: finData });
            } else {
              await prisma.financialData.create({ data: finData });
            }
            result.financialRecords++;
          }

          // Balance sheets from yfinance
          for (const bsRec of yfData.balance) {
            const { year, quarter } = parseYFinanceDate(bsRec.date);
            const bsMapped = mapBalanceRecord(bsRec);
            if (bsMapped.totalAssets == null && bsMapped.totalLiabilities == null) continue;

            const bsExisting = await prisma.balanceSheet.findUnique({
              where: { companyId_year_quarter: { companyId: company.id, year, quarter } },
            });
            const bsData = { companyId: company.id, year, quarter, ...bsMapped };
            const yfBsWarnings = validateBalanceSheet(bsData);
            logValidationWarnings(ticker, yfBsWarnings, 'yFinance');
            if (bsExisting) {
              await prisma.balanceSheet.update({ where: { id: bsExisting.id }, data: bsData });
            } else {
              await prisma.balanceSheet.create({ data: bsData });
            }
            result.balanceSheets++;
          }

          // StockMetric from yfinance info (richer than Yahoo quote)
          if (yfInfo?.info && (yfInfo.info.sharesOutstanding > 0 || yfInfo.info.marketCap > 0)) {
            const stockExisting = await prisma.stockMetric.findFirst({
              where: { companyId: company.id },
              orderBy: { date: 'desc' },
            });

            const rawPrice = yahooQuote?.currentPrice ?? yfInfo.info.currentPrice ?? 0;
            const isGbPence = (yfInfo.info.currency ?? '').toUpperCase() === 'GBP';
            const currentPrice = rawPrice > 0 && isGbPence ? rawPrice / 100 : rawPrice;
            const stockData = {
              companyId: company.id,
              date: new Date(),
              currentPrice,
              sharesOutstanding: yfInfo.info.sharesOutstanding ?? 0,
              marketCap: yfInfo.info.marketCap > 0 ? yfInfo.info.marketCap : (currentPrice * (yfInfo.info.sharesOutstanding ?? 0)) || null,
              enterpriseValue: yfInfo.info.enterpriseValue ?? null,
              peRatio: yfInfo.info.trailingPE ?? null,
              pbRatio: yfInfo.info.priceToBook ?? null,
              psRatio: yfInfo.info.priceToSalesTrailing12Months ?? null,
              dividendYield: yfInfo.info.dividendYield ?? null,
              roe: yfInfo.info.returnOnEquity != null ? yfInfo.info.returnOnEquity * 100 : null,
              roa: yfInfo.info.returnOnAssets != null ? yfInfo.info.returnOnAssets * 100 : null,
              currentRatio: yfInfo.info.currentRatio ?? null,
              debtToEquity: yfInfo.info.debtToEquity != null ? yfInfo.info.debtToEquity / 100 : null,
              roic: null,
              altmanZ: null,
              piotroskiScore: null,
            };

            if (stockExisting) {
              await prisma.stockMetric.update({ where: { id: stockExisting.id }, data: stockData });
            } else {
              await prisma.stockMetric.create({ data: stockData });
            }
            console.log(`[yFinance] ${ticker}: StockMetric saved (shares=${stockData.sharesOutstanding}, mcap=${stockData.marketCap})`);
          }

          result.yfinanceSync = true;
          result.europeanSync = true;
          console.log(`[yFinance] Completed for ${ticker}: ${result.financialRecords} financial records, ${result.balanceSheets} balance sheets`);
        } else {
        // --- Fallback: XBRL/ESEF data ---
        const europeanResult = await fetchEuropeanFinancials(ticker, countryCode, companyName);
        const europeanData = europeanResult;
        europeanAvailableTags = europeanResult.availableTags;

        console.log(`[European] ${ticker}: fetched ${europeanData.data.length} fiscal records, availableTags: ${europeanAvailableTags?.length ?? 0}`);

        if (europeanData.data.length > 0) {
          let company = await prisma.company.findUnique({
            where: { ticker: ticker.toUpperCase() },
          });

          if (!company) {
            company = await prisma.company.create({
              data: {
                ticker: ticker.toUpperCase(),
                name: companyName || ticker.toUpperCase(),
                country: countryCode,
                exchange: yahooQuote?.exchange || null,
                currency: inferCurrency(ticker),
                sector: stoxxEntry?.sector || null,
                industry: stoxxEntry?.sector ? (STOXX_SECTOR_INDUSTRY[stoxxEntry.sector] || null) : null,
              },
            });
            console.log(`[European] Created company ${ticker} (id: ${company.id})`);
          } else if (!company.sector) {
            const sectorData = stoxxEntry?.sector
              ? { sector: stoxxEntry.sector, industry: STOXX_SECTOR_INDUSTRY[stoxxEntry.sector] || null }
              : TICKER_SECTORS[ticker.toUpperCase()]
                ? { sector: TICKER_SECTORS[ticker.toUpperCase()].sector, industry: TICKER_SECTORS[ticker.toUpperCase()].industry }
                : null;
            if (sectorData) {
              await prisma.company.update({
                where: { id: company.id },
                data: sectorData,
              });
              console.log(`[European] Updated ${ticker} sector → ${sectorData.sector}`);
            }
          }

          for (const ed of europeanData.data) {
            const existing = await prisma.financialData.findUnique({
              where: { companyId_year_quarter: { companyId: company.id, year: ed.year, quarter: 0 } },
            });

            const costRev = ed.costOfRevenue ?? null;
            const opExp = ed.operatingExpenses ?? null;
            const grossP = ed.grossProfit ?? (ed.revenue != null && costRev != null ? ed.revenue - costRev : null);
            const ebitda = ed.ebitda ?? (ed.ebit != null && ed.depreciation != null ? ed.ebit + ed.depreciation : null);
            const ocf = ed.operatingCashFlow ?? null;
            const fcf = ocf != null && ed.capex != null ? ocf - Math.abs(ed.capex) : null;

            const data = {
              companyId: company.id,
              year: ed.year,
              quarter: 0,
              revenue: ed.revenue ?? 0,
              costOfRevenue: ed.costOfRevenue ?? 0,
              grossProfit: ed.grossProfit ?? null,
              operatingExpenses: ed.operatingExpenses ?? 0,
              sgaExpense: ed.sgaExpense ?? 0,
              rdExpense: ed.rdExpense ?? 0,
              interestExpense: ed.interestExpense ?? 0,
              taxExpense: ed.taxExpense ?? 0,
              netIncome: ed.netIncome ?? 0,
              ebitda,
              ebit: ed.ebit ?? null,
              capex: ed.capex ?? 0,
              depreciation: ed.depreciation ?? 0,
              operatingCashFlow: ocf,
              investingCashFlow: ed.investingCashFlow ?? null,
              financingCashFlow: ed.financingCashFlow ?? null,
              freeCashFlow: fcf,
              dividendsPaid: ed.dividendsPaid ?? null,
              shareRepurchases: ed.shareRepurchases ?? null,
              totalAssets: ed.totalAssets ?? null,
              totalLiabilities: ed.totalLiabilities ?? null,
              totalEquity: ed.totalEquity ?? null,
            };

            const euWarnings = validateFinancialData(data);
            logValidationWarnings(ticker, euWarnings, 'European');

            if (existing) {
              await prisma.financialData.update({ where: { id: existing.id }, data });
            } else {
              await prisma.financialData.create({ data });
            }
            result.financialRecords++;

            // BalanceSheet
            if (ed.totalAssets != null || ed.totalLiabilities != null) {
              const bsExisting = await prisma.balanceSheet.findUnique({
                where: { companyId_year_quarter: { companyId: company.id, year: ed.year, quarter: 0 } },
              });

              const totalLiabs = ed.totalLiabilities ?? (ed.currentLiabilities != null && ed.nonCurrentLiabilities != null ? ed.currentLiabilities + ed.nonCurrentLiabilities : null);

              const bsData = {
                companyId: company.id,
                year: ed.year,
                quarter: 0,
                cashAndCashEquivalents: ed.cash ?? null,
                shortTermInvestments: null,
                accountsReceivable: ed.receivables ?? null,
                inventory: ed.inventory ?? null,
                totalCurrentAssets: ed.currentAssets ?? null,
                propertyPlantEquipment: ed.ppe ?? null,
                goodwill: ed.goodwill ?? null,
                intangibleAssets: ed.intangibleAssets ?? null,
                totalNonCurrentAssets: ed.nonCurrentAssets ?? null,
                totalAssets: ed.totalAssets ?? null,
                accountsPayable: ed.accountsPayable ?? null,
                shortTermDebt: ed.shortTermDebt ?? null,
                totalCurrentLiabilities: ed.currentLiabilities ?? null,
                longTermDebt: ed.longTermDebt ?? null,
                totalNonCurrentLiabilities: ed.nonCurrentLiabilities ?? null,
                totalLiabilities: totalLiabs,
                totalStockholdersEquity: ed.totalEquity ?? null,
                retainedEarnings: ed.retainedEarnings ?? null,
                treasuryStock: null,
              };

              const euBsWarnings = validateBalanceSheet(bsData);
              logValidationWarnings(ticker, euBsWarnings, 'European');

              if (bsExisting) {
                await prisma.balanceSheet.update({ where: { id: bsExisting.id }, data: bsData });
              } else {
                await prisma.balanceSheet.create({ data: bsData });
              }
              result.balanceSheets++;
            }
          }

          // StockMetric from Yahoo Quote
          if (yahooQuote && yahooQuote.currentPrice > 0) {
            const stockExisting = await prisma.stockMetric.findFirst({
              where: { companyId: company.id },
              orderBy: { date: 'desc' },
            });

            const firstRecord = europeanData.data[0];
            const latestRevenue = firstRecord?.revenue ?? 0;
            const latestNetIncome = firstRecord?.netIncome ?? 0;
            const latestEquity = firstRecord?.totalEquity ?? null;
            const latestAssets = firstRecord?.totalAssets ?? null;
            const latestLiabilities = firstRecord?.totalLiabilities ?? null;
            const stockSharesOutstanding = yahooQuote.sharesOutstanding > 0
            ? yahooQuote.sharesOutstanding
            : (yahooQuote.marketCap > 0 && yahooQuote.currentPrice > 0
              ? Math.round(yahooQuote.marketCap / yahooQuote.currentPrice)
              : (europeanData.data.find(d => d.sharesOutstanding != null && d.sharesOutstanding > 0)?.sharesOutstanding ?? 0));

            const priceIsGbPence = (yahooQuote.currency ?? '').toUpperCase() === 'GBP';
            const stockPrice = yahooQuote.currentPrice > 0 && priceIsGbPence
              ? yahooQuote.currentPrice / 100
              : yahooQuote.currentPrice;

            const mcap = yahooQuote.marketCap > 0
              ? yahooQuote.marketCap
              : (stockSharesOutstanding > 0 && stockPrice > 0 ? stockPrice * stockSharesOutstanding : null);

            console.log(`[European] ${ticker}: Yahoo quote price=${yahooQuote.currentPrice}, shares=${yahooQuote.sharesOutstanding}, mcap=${mcap}`);
            console.log(`[European] ${ticker}: XBRL shares=${europeanData.data[0]?.sharesOutstanding}, computed stockSharesOutstanding=${stockSharesOutstanding}`);

            const stockData = {
              companyId: company.id,
              date: new Date(),
              currentPrice: stockPrice,
              peRatio: latestNetIncome > 0 && mcap ? mcap / latestNetIncome : null,
              pbRatio: latestEquity && latestEquity > 0 && mcap ? mcap / latestEquity : null,
              psRatio: latestRevenue > 0 && mcap ? mcap / latestRevenue : null,
              dividendYield: null,
              marketCap: mcap,
              enterpriseValue: mcap != null
                ? mcap + (latestLiabilities || 0) - (firstRecord?.cash || 0)
                : null,
              sharesOutstanding: stockSharesOutstanding,
              roe: latestNetIncome > 0 && latestEquity && latestEquity > 0 ? (latestNetIncome / latestEquity) * 100 : null,
              roa: latestNetIncome > 0 && latestAssets && latestAssets > 0 ? (latestNetIncome / latestAssets) * 100 : null,
              roic: null,
              currentRatio: firstRecord?.currentAssets != null && firstRecord?.currentLiabilities != null && firstRecord.currentLiabilities > 0 ? firstRecord.currentAssets / firstRecord.currentLiabilities : null,
              debtToEquity: latestLiabilities && latestEquity && latestEquity > 0 ? latestLiabilities / latestEquity : null,
              altmanZ: null,
              piotroskiScore: null,
            };

            if (stockExisting) {
              await prisma.stockMetric.update({ where: { id: stockExisting.id }, data: stockData });
            } else {
              await prisma.stockMetric.create({ data: stockData });
            }
            console.log(`[European] ${ticker}: StockMetric saved (sharesOutstanding=${stockData.sharesOutstanding}, mcap=${stockData.marketCap})`);
          }

          result.europeanSync = true;
          console.log(`[European] Completed for ${ticker}: ${result.financialRecords} financial records, ${result.balanceSheets} balance sheets, stockMetric=${yahooQuote ? 'yes' : 'no'}`);
        } else {
          console.log(`[European] No XBRL data found for ${ticker}`);

          const existingCompany = await prisma.company.findUnique({ where: { ticker: ticker.toUpperCase() } });
          if (existingCompany && !existingCompany.sector) {
            const sectorData = stoxxEntry?.sector
              ? { sector: stoxxEntry.sector, industry: STOXX_SECTOR_INDUSTRY[stoxxEntry.sector] || null }
              : TICKER_SECTORS[ticker.toUpperCase()]
                ? { sector: TICKER_SECTORS[ticker.toUpperCase()].sector, industry: TICKER_SECTORS[ticker.toUpperCase()].industry }
                : null;
            if (sectorData) {
              await prisma.company.update({
                where: { id: existingCompany.id },
                data: sectorData,
              });
              console.log(`[European] Updated ${ticker} sector → ${sectorData.sector}`);
            }
          }
        }
      }
      } catch (error) {
        console.error(`[European] Error for ${ticker}:`, error instanceof Error ? error.message : error);
        result.error = `European error: ${error instanceof Error ? error.message : 'unknown'}`;
      }
    } else {
      console.log(`[European] ${ticker} has no recognized European ticker suffix, skipping`);
    }
  }

  // Finnhub enrichment: fill in missing fields from Finnhub metrics
  if (process.env.FINNHUB_API_KEY) {
    try {
      const finnhubMetrics = await fetchFinnhubMetrics(ticker);
      const companyForFinhub = await prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
      });
      if (finnhubMetrics && companyForFinhub) {
        const existingStock = await prisma.stockMetric.findFirst({
          where: { companyId: companyForFinhub.id },
          orderBy: { date: 'desc' },
        });

        if (existingStock) {
          const finnhubData: Record<string, unknown> = {};
          if (!existingStock.enterpriseValue && finnhubMetrics.enterpriseValueTTM) finnhubData.enterpriseValue = finnhubMetrics.enterpriseValueTTM;
          if (!existingStock.peRatio && finnhubMetrics.peBasicExclExtraTTM) finnhubData.peRatio = finnhubMetrics.peBasicExclExtraTTM;
          if (!existingStock.pbRatio && finnhubMetrics.pbQuarterly) finnhubData.pbRatio = finnhubMetrics.pbQuarterly;
          if (!existingStock.psRatio && finnhubMetrics.psTTM) finnhubData.psRatio = finnhubMetrics.psTTM;
          if (!existingStock.dividendYield && finnhubMetrics.dividendYieldIndicatedAnnual) finnhubData.dividendYield = finnhubMetrics.dividendYieldIndicatedAnnual;
          if (!existingStock.roe && finnhubMetrics.ROETTM) finnhubData.roe = finnhubMetrics.ROETTM;
          if (!existingStock.roa && finnhubMetrics.ROATTM) finnhubData.roa = finnhubMetrics.ROATTM;
          if (!existingStock.currentRatio && finnhubMetrics.currentRatioQuarterly) finnhubData.currentRatio = finnhubMetrics.currentRatioQuarterly;
          if (!existingStock.debtToEquity && finnhubMetrics.totalDebtToTotalEquityQuarterly) finnhubData.debtToEquity = finnhubMetrics.totalDebtToTotalEquityQuarterly;

          if (Object.keys(finnhubData).length > 0) {
            await prisma.stockMetric.update({ where: { id: existingStock.id }, data: finnhubData });
            result.finnhubSync = true;
            console.log(`[Finnhub] Enriched ${ticker} with ${Object.keys(finnhubData).length} fields`);
          }
        }

        // Also fill FinancialData gaps if available
        if (finnhubMetrics.freeCashFlowTTM) {
          const latestFinancial = await prisma.financialData.findFirst({
            where: { companyId: companyForFinhub.id },
            orderBy: { year: 'desc' },
          });
          if (latestFinancial && !latestFinancial.freeCashFlow) {
            await prisma.financialData.update({
              where: { id: latestFinancial.id },
              data: { freeCashFlow: finnhubMetrics.freeCashFlowTTM },
            });
          }
        }
      }
    } catch (err) {
      console.error(`[Finnhub] Enrichment failed for ${ticker}:`, err instanceof Error ? err.message : err);
    }
  }

  // Finnhub profile enrichment (outside API key guard — fetchFinnhubProfile handles errors gracefully)
  try {
    const companyForProfile = await prisma.company.findUnique({
      where: { ticker: ticker.toUpperCase() },
      select: { id: true, logoUrl: true, website: true, name: true },
    });
    if (companyForProfile && !companyForProfile.logoUrl) {
      const finnhubProfile = await fetchFinnhubProfile(ticker);
      if (finnhubProfile) {
        const profileData: Record<string, string> = {};
        if (finnhubProfile.logo) profileData.logoUrl = finnhubProfile.logo;
        if (finnhubProfile.weburl) profileData.website = finnhubProfile.weburl;
        if (Object.keys(profileData).length > 0) {
          await prisma.company.update({
            where: { id: companyForProfile.id },
            data: profileData,
          });
          console.log(`[Finnhub] Enriched ${ticker} profile with website/logo`);
        }
        // Rate limit: 1.5s between Finnhub calls
        await new Promise(r => setTimeout(r, 1500));
      } else {
        // Finnhub fallback: try Yahoo Finance for website + hunter.io logo
        const yahooProfile = await fetchYahooProfile(ticker);
        if (yahooProfile?.website) {
          await prisma.company.update({
            where: { id: companyForProfile.id },
            data: {
              website: yahooProfile.website,
              logoUrl: buildLogoUrl(yahooProfile.website),
            },
          });
          console.log(`[Yahoo] Enriched ${ticker} with website/logo`);
        }
      }

      // Fallback final: deducir dominio desde el nombre de la empresa
      const name = companyForProfile.name;
      if (name && !companyForProfile.website) {
        let domain = name.toLowerCase().trim();
        domain = domain.replace(/^(the\s+)/i, '');
        domain = domain.replace(/\b(inc|corp|ltd|plc|llc|sa|ag|se|nv|gmbh|limited|corporation|company|group|holdings|holding|co\.|class\s+[ab])\b\.?$/gi, '');
        domain = domain.replace(/[&]/g, 'and');
        domain = domain.replace(/[^a-z0-9\s-]/g, '');
        domain = domain.replace(/\s+/g, '');
        if (domain && domain.length >= 3) {
          const website = `https://www.${domain}.com`;
          await prisma.company.update({
            where: { id: companyForProfile.id },
            data: { website, logoUrl: buildLogoUrl(website) },
          });
          console.log(`[Guess] Enriched ${ticker} → ${website}`);
        }
      }
    }
  } catch (err) {
    console.error(`[Profile] Enrichment failed for ${ticker}:`, err instanceof Error ? err.message : err);
  }

  // Calculate intrinsic value using the recommended valuation method for the sector
  try {
    const stockForValuation = await prisma.stockMetric.findFirst({
      where: { company: { ticker: ticker.toUpperCase() } },
      orderBy: { date: 'desc' },
    });
    if (stockForValuation && stockForValuation.sharesOutstanding && stockForValuation.sharesOutstanding > 0) {
      const companyForVal = await prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
      });
      if (companyForVal) {
        const allFinancials = await prisma.financialData.findMany({
          where: { companyId: companyForVal.id },
          orderBy: { year: 'desc' },
        });
        const allBalanceSheets = await prisma.balanceSheet.findMany({
          where: { companyId: companyForVal.id },
          orderBy: { year: 'desc' },
        });
        if (allFinancials.length > 0) {
          const configs = getSectorConfigs(companyForVal.sector, companyForVal.industry);
          const results = computeAll({ financials: allFinancials as any, balanceSheets: allBalanceSheets as any, stock: stockForValuation }, configs);
          const { fairValue } = getRecommendedFairValue(results, companyForVal.sector, companyForVal.industry);
          if (fairValue != null && fairValue > 0) {
            const marginOfSafety = stockForValuation.currentPrice > 0
              ? (fairValue - stockForValuation.currentPrice) / stockForValuation.currentPrice
              : null;

            await prisma.stockMetric.update({
              where: { id: stockForValuation.id },
              data: { intrinsicValue: fairValue, marginOfSafety },
            });
          }
        }
      }
    }
  } catch (err) {
    console.error(`[Valuation] Error calculating intrinsic for ${ticker}:`, err instanceof Error ? err.message : err);
  }

  // Save/update DataSync record
  const company = await prisma.company.findUnique({
    where: { ticker: ticker.toUpperCase() },
  });

  if (company) {
    // If a European/yfinance sync succeeded, the missing-SEC-CIK message is not a failure
    if (result.yfinanceSync || result.europeanSync) {
      result.error = undefined;
    }

    // If European sync was successful, store available tags for coverage reporting
    const tagsToStore = result.europeanSync && europeanAvailableTags ? europeanAvailableTags : [];

    await prisma.dataSync.upsert({
      where: { companyId: company.id },
      update: {
        lastSyncAt: new Date(),
        yearsFetched: years,
        secSync: result.secSync,
        finnhubSync: result.finnhubSync,
        europeanSync: result.europeanSync,
        errorMessage: result.error || null,
        availableTags: tagsToStore,
      },
      create: {
        companyId: company.id,
        lastSyncAt: new Date(),
        yearsFetched: years,
        secSync: result.secSync,
        finnhubSync: result.finnhubSync,
        europeanSync: result.europeanSync,
        errorMessage: result.error || null,
        availableTags: tagsToStore,
      },
    });
  }

  return result;
}

export async function addCompanyFromTicker(ticker: string) {
  const upperTicker = ticker.toUpperCase();
  const existing = await prisma.company.findUnique({
    where: { ticker: upperTicker },
  });
  if (existing) {
    console.log(`[AddCompany] ${upperTicker} already exists, skipping`);
    return existing;
  }

  // SEC EDGAR only covers US-listed companies; European tickers go to the European path.
  if (!isEuropeanTicker(ticker)) {
    try {
      const cik = await getCikForTicker(ticker);
      if (cik) {
        const facts = await fetchCompanyFacts(cik);
        if (facts) {
          const company = await prisma.company.create({
            data: {
              ticker: ticker.toUpperCase(),
              name: facts.entityName,
              cik,
              country: 'US',
            },
          });

          // Enrich with Finnhub website and logo
          try {
            const finnhubProfile = await fetchFinnhubProfile(upperTicker);
            if (finnhubProfile && (finnhubProfile.weburl || finnhubProfile.logo)) {
              await prisma.company.update({
                where: { id: company.id },
                data: {
                  ...(finnhubProfile.weburl ? { website: finnhubProfile.weburl } : {}),
                  ...(finnhubProfile.logo ? { logoUrl: finnhubProfile.logo } : {}),
                },
              });
              console.log(`[AddCompany] Enriched ${upperTicker} with Finnhub website/logo`);
            }
          } catch {
            // Non-critical, company already created
          }

          return company;
        }
      }
    } catch (error) {
      console.error(`[SEC] Error fetching data for ${ticker}:`, error instanceof Error ? error.message : error);
    }
  }

  // Finnhub fallback: try to create company via Finnhub profile API
  try {
    const finnhubProfile = await fetchFinnhubProfile(upperTicker);
    if (finnhubProfile) {
      console.log(`[AddCompany] Creating ${upperTicker} via Finnhub fallback`);
      return prisma.company.create({
        data: {
          ticker: upperTicker,
          name: finnhubProfile.name,
          country: finnhubProfile.country,
          exchange: finnhubProfile.exchange,
          currency: finnhubProfile.currency,
          website: finnhubProfile.weburl,
          logoUrl: finnhubProfile.logo,
        },
      });
    }
  } catch (error) {
    console.error(`[Finnhub] Error fetching profile for ${ticker}:`, error instanceof Error ? error.message : error);
  }

  // European fallback: try to create company from European XBRL data
  const suffix = ticker.includes('.') ? ticker.split('.').pop()?.toUpperCase() : '';
  const TICKER_COUNTRY: Record<string, string> = {
    DE: 'DE', F: 'DE', D: 'DE',
    PA: 'FR', L: 'GB', MC: 'ES', AS: 'NL',
    BR: 'BE', HE: 'FI', ST: 'SE', CO: 'DK',
    MI: 'IT', LS: 'PT', VI: 'AT', SW: 'CH',
    OL: 'NO', IR: 'IE', LU: 'LU',
  };
  const countryCode = (suffix ? TICKER_COUNTRY[suffix] : '') || '';

  const STOXX_SECTOR_INDUSTRY: Record<string, string> = {
    'Financial Services': 'Banks - Diversified',
    'Technology': 'Software - Infrastructure',
    'Industrials': 'Aerospace & Defense',
    'Consumer Cyclical': 'Auto Manufacturers',
    'Consumer Defensive': 'Consumer Staples',
    'Healthcare': 'Drug Manufacturers',
    'Energy': 'Oil & Gas Integrated',
    'Utilities': 'Utilities - Regulated Electric',
    'Real Estate': 'REIT - Diversified',
    'Communication Services': 'Telecom Services',
    'Basic Materials': 'Specialty Chemicals',
  };

  if (countryCode) {
    try {
      const yahooQuote = await fetchYahooQuote(ticker);
      const yfInfo = await fetchYFinanceInfo(upperTicker);
      const info = yfInfo?.info || {};
      const companyName = yahooQuote?.name || info.longName || info.shortName || undefined;
      const stoxxEntry = STOXX600_UNIQUE_TICKERS.find(t => t.ticker === ticker);
      const website = info.website || null;
      console.log(`[AddCompany] Trying European data for ${upperTicker} (${countryCode})...`);

      const company = await prisma.company.create({
        data: {
          ticker: upperTicker,
          name: companyName || upperTicker,
          country: countryCode,
          exchange: yahooQuote?.exchange || null,
          currency: inferCurrency(upperTicker),
          sector: stoxxEntry?.sector || info.sector || null,
          industry: stoxxEntry?.sector ? (STOXX_SECTOR_INDUSTRY[stoxxEntry.sector] || null) : info.industry || null,
          website,
          logoUrl: buildLogoUrl(website),
        },
      });
      console.log(`[AddCompany] Created ${upperTicker} via European fallback (id: ${company.id})`);
      return company;
    } catch (error) {
      console.error(`[AddCompany] European fallback error for ${upperTicker}:`, error instanceof Error ? error.message : error);
    }
  }

  return null;
}

export interface BulkImportProgress {
  current: number;
  total: number;
  ticker: string;
  status: 'adding' | 'syncing' | 'done' | 'skipped' | 'error';
  message?: string;
}

export interface BulkImportResult {
  success: string[];
  skipped: string[];
  failed: Array<{ ticker: string; error: string }>;
}

export async function getSP500StockList(): Promise<Array<{ ticker: string; name: string; sector: string; marketCap: number }>> {
  const { SP500_TICKERS, SP500_SECTORS } = await import('../data/sp500.js');
  return SP500_TICKERS.map((ticker) => ({
    ticker,
    name: ticker,
    sector: SP500_SECTORS[ticker] || '',
    marketCap: 0,
  }));
}

export async function bulkImportCompanies(
  tickers: string[],
  years: number,
  onProgress: (progress: BulkImportProgress) => void,
): Promise<BulkImportResult> {
  const result: BulkImportResult = { success: [], skipped: [], failed: [] };

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i].toUpperCase().trim();
    if (!ticker) continue;

    onProgress({ current: i + 1, total: tickers.length, ticker, status: 'adding' });

    try {
      const existing = await prisma.company.findUnique({ where: { ticker } });
      if (existing) {
        result.skipped.push(ticker);
        onProgress({ current: i + 1, total: tickers.length, ticker, status: 'skipped', message: 'Ya existe' });
        continue;
      }

      const company = await addCompanyFromTicker(ticker);
      if (!company) {
        result.failed.push({ ticker, error: 'Empresa no encontrada' });
        onProgress({ current: i + 1, total: tickers.length, ticker, status: 'error', message: 'Empresa no encontrada' });
        continue;
      }

      // Auto-sync financial data
      onProgress({ current: i + 1, total: tickers.length, ticker, status: 'syncing', message: company.name });
      try {
        await syncCompanyData(ticker, years);
      } catch (err) {
        console.error(`[BulkImport] Sync failed for ${ticker}:`, err instanceof Error ? err.message : err);
      }

      result.success.push(ticker);
      onProgress({ current: i + 1, total: tickers.length, ticker, status: 'done', message: company.name });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      result.failed.push({ ticker, error: msg });
      onProgress({ current: i + 1, total: tickers.length, ticker, status: 'error', message: msg });
    }

    if (i < tickers.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`[BulkImport] Completed: ${result.success.length} added, ${result.skipped.length} skipped, ${result.failed.length} failed`);
  return result;
}

export interface ResyncProgress {
  current: number;
  total: number;
  ticker: string;
  status: 'syncing' | 'done' | 'error';
  message?: string;
}

export interface ResyncResult {
  succeeded: number;
  failed: number;
  errors: Array<{ ticker: string; error: string }>;
}

export async function batchResyncCompanies(
  years: number,
  onProgress: (progress: ResyncProgress) => void,
): Promise<ResyncResult> {
  const companies = await prisma.company.findMany({
    orderBy: { ticker: 'asc' },
  });

  const result: ResyncResult = { succeeded: 0, failed: 0, errors: [] };

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    onProgress({ current: i + 1, total: companies.length, ticker: company.ticker, status: 'syncing', message: company.name });

    try {
      const syncResult = await syncCompanyData(company.ticker, years);
      if (syncResult.error) {
        result.failed++;
        result.errors.push({ ticker: company.ticker, error: syncResult.error });
      } else {
        result.succeeded++;
      }
      onProgress({ current: i + 1, total: companies.length, ticker: company.ticker, status: syncResult.error ? 'error' : 'done', message: syncResult.error || company.name });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.failed++;
      result.errors.push({ ticker: company.ticker, error: msg });
      onProgress({ current: i + 1, total: companies.length, ticker: company.ticker, status: 'error', message: msg });
    }

    // Rate limit: 200ms between requests
    if (i < companies.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`[BatchResync] Completed: ${result.succeeded} succeeded, ${result.failed} failed`);
  return result;
}
