import { PrismaClient } from '@prisma/client';
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
import {
  fetchCompanyProfile,
  fetchIncomeStatements,
  fetchCashFlows,
  fetchBalanceSheets,
  fetchKeyMetrics,
  fetchEnterpriseValues,
  fetchFinancialRatios,
  fetchFinancialScores,
  fetchRevenueByProduct,
  fetchRevenueByGeography,
  fetchSP500List,
} from './fmp';
import { fetchYahooQuote, fetchYahooProfile } from './yahoo';
import { fetchFinnhubMetrics } from './finnhub';
import { fetchEuropeanFinancials } from './europeanData';
import { SP500_SECTORS } from '../data/sp500';
import { TICKER_SECTORS } from '../data/sectors';

const prisma = new PrismaClient();

function safeInt(val: unknown): number | null {
  if (val == null) return null;
  const n = typeof val === 'number' ? val : parseInt(String(val), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface SyncResult {
  ticker: string;
  secSync: boolean;
  fmpSync: boolean;
  finnhubSync: boolean;
  europeanSync: boolean;
  yearsSynced: number;
  financialRecords: number;
  balanceSheets: number;
  segments: number;
  error?: string;
}

export async function syncCompanyData(ticker: string, years: number, fmpApiKey?: string): Promise<SyncResult> {
  const result: SyncResult = {
    ticker,
    secSync: false,
    fmpSync: false,
    finnhubSync: false,
    europeanSync: false,
    yearsSynced: years,
    financialRecords: 0,
    balanceSheets: 0,
    segments: 0,
  };

  if (fmpApiKey) {
    console.log(`[FMP] Starting sync for ${ticker} with ${years} years...`);
    try {
      const [incomeStatements, cashFlows, balanceSheets, profile, keyMetrics, enterpriseValues, ratios, scores, productSegments, geoSegments] = await Promise.all([
        fetchIncomeStatements(ticker, years, fmpApiKey),
        fetchCashFlows(ticker, years, fmpApiKey),
        fetchBalanceSheets(ticker, years, fmpApiKey),
        fetchCompanyProfile(ticker, fmpApiKey),
        fetchKeyMetrics(ticker, fmpApiKey),
        fetchEnterpriseValues(ticker, years, fmpApiKey),
        fetchFinancialRatios(ticker, years, fmpApiKey),
        fetchFinancialScores(ticker, fmpApiKey),
        fetchRevenueByProduct(ticker, years, fmpApiKey).catch(() => []),
        fetchRevenueByGeography(ticker, years, fmpApiKey).catch(() => []),
      ]);

      if (incomeStatements.length > 0) {
        let company = await prisma.company.findUnique({
          where: { ticker: ticker.toUpperCase() },
        });

        if (!company) {
          company = await prisma.company.create({
            data: {
              ticker: ticker.toUpperCase(),
              name: profile?.companyName || ticker.toUpperCase(),
              sector: profile?.sector || null,
              industry: profile?.industry || null,
              description: profile?.description || null,
              cik: profile?.cik || null,
              ceo: profile?.ceo || null,
              employees: safeInt(profile?.fullTimeEmployees),
              country: profile?.country || null,
              exchange: profile?.exchangeShortName || null,
              website: profile?.website || null,
            },
          });
        } else if (profile) {
          company = await prisma.company.update({
            where: { id: company.id },
            data: {
              name: profile.companyName || company.name,
              sector: profile.sector || company.sector,
              industry: profile.industry || company.industry,
              description: profile.description || company.description,
              cik: profile.cik || company.cik,
              ceo: profile.ceo || company.ceo,
              employees: safeInt(profile.fullTimeEmployees) ?? company.employees,
              country: profile.country || company.country,
              exchange: profile.exchangeShortName || company.exchange,
              website: profile.website || company.website,
            },
          });
        }

        const cashFlowMap = new Map(cashFlows.map((cf) => [new Date(cf.date).getFullYear(), cf]));
        const balanceSheetMap = new Map(balanceSheets.map((bs) => [new Date(bs.date).getFullYear(), bs]));
        const evMap = new Map(enterpriseValues.map((ev) => [new Date(ev.date).getFullYear(), ev]));
        const ratiosMap = new Map(ratios.map((r) => [new Date(r.date).getFullYear(), r]));

        for (const stmt of incomeStatements) {
          const year = new Date(stmt.date).getFullYear();
          const cf = cashFlowMap.get(year);
          const bs = balanceSheetMap.get(year);
          const ev = evMap.get(year);
          const ratio = ratiosMap.get(year);

          const existing = await prisma.financialData.findUnique({
            where: { companyId_year_quarter: { companyId: company.id, year, quarter: 0 } },
          });

          const data = {
            companyId: company.id,
            year,
            quarter: 0,
            revenue: stmt.revenue || 0,
            costOfRevenue: stmt.costOfRevenue || 0,
            grossProfit: stmt.grossProfit || null,
            operatingExpenses: stmt.operatingExpenses || 0,
            sgaExpense: stmt.sellingGeneralAndAdministrativeExpenses || 0,
            rdExpense: stmt.researchAndDevelopmentExpenses || 0,
            interestExpense: stmt.interestExpense || 0,
            taxExpense: stmt.taxExpense || 0,
            netIncome: stmt.netIncome || 0,
            ebitda: stmt.ebitda || null,
            ebit: stmt.ebit || null,
            depreciation: cf?.depreciationAndAmortization || stmt.depreciationAndAmortization || 0,
            capex: cf?.capitalExpenditure ? Math.abs(cf.capitalExpenditure) : 0,
            operatingCashFlow: cf?.operatingCashFlow || null,
            investingCashFlow: cf?.netCashUsedForInvestingActivites || null,
            financingCashFlow: cf?.netCashUsedProvidedByFinancingActivities || null,
            freeCashFlow: cf?.freeCashFlow || null,
            dividendsPaid: cf?.dividendsPaid ? Math.abs(cf.dividendsPaid) : null,
            shareRepurchases: cf?.commonStockRepurchased ? Math.abs(cf.commonStockRepurchased) : null,
            totalAssets: bs?.totalAssets || null,
            totalLiabilities: bs?.totalLiabilities || null,
            totalEquity: bs?.totalStockholdersEquity || null,
          };

          if (existing) {
            await prisma.financialData.update({ where: { id: existing.id }, data });
          } else {
            await prisma.financialData.create({ data });
          }
          result.financialRecords++;

          // Sync detailed balance sheet
          if (bs) {
            const bsExisting = await prisma.balanceSheet.findUnique({
              where: { companyId_year_quarter: { companyId: company.id, year, quarter: 0 } },
            });

            const bsData = {
              companyId: company.id,
              year,
              quarter: 0,
              cashAndCashEquivalents: bs.cashAndCashEquivalents || null,
              shortTermInvestments: bs.shortTermInvestments || null,
              accountsReceivable: bs.receivables || null,
              inventory: bs.inventory || null,
              totalCurrentAssets: bs.totalCurrentAssets || null,
              propertyPlantEquipment: bs.propertyPlantEquipmentNet || null,
              goodwill: bs.goodwill || null,
              intangibleAssets: bs.intangibleAssets || null,
              totalNonCurrentAssets: bs.totalNonCurrentAssets || null,
              totalAssets: bs.totalAssets || null,
              accountsPayable: bs.accountsPayable || null,
              shortTermDebt: bs.shortTermDebt || null,
              totalCurrentLiabilities: bs.totalCurrentLiabilities || null,
              longTermDebt: bs.longTermDebt || null,
              totalNonCurrentLiabilities: bs.totalNonCurrentLiabilities || null,
              totalLiabilities: bs.totalLiabilities || null,
              totalStockholdersEquity: bs.totalStockholdersEquity || null,
              retainedEarnings: bs.retainedEarnings || null,
              treasuryStock: bs.treasuryStock || null,
            };

            if (bsExisting) {
              await prisma.balanceSheet.update({ where: { id: bsExisting.id }, data: bsData });
            } else {
              await prisma.balanceSheet.create({ data: bsData });
            }
            result.balanceSheets++;
          }
        }

        // Sync revenue segments
        const syncSegments = async (segments: Array<{ date: string; revenue: number; segment: string }>, type: string) => {
          for (const seg of segments) {
            const year = new Date(seg.date).getFullYear();
            const existing = await prisma.revenueSegment.findFirst({
              where: { companyId: company!.id, year, quarter: 0, segmentName: seg.segment, segmentType: type },
            });

            const yearRevenue = incomeStatements.find((s) => new Date(s.date).getFullYear() === year)?.revenue || 0;
            const percentage = yearRevenue > 0 ? (seg.revenue / yearRevenue) * 100 : null;

            const segData = {
              companyId: company!.id,
              year,
              quarter: 0,
              segmentName: seg.segment,
              segmentType: type,
              revenue: seg.revenue,
              percentage,
            };

            if (existing) {
              await prisma.revenueSegment.update({ where: { id: existing.id }, data: segData });
            } else {
              await prisma.revenueSegment.create({ data: segData });
            }
            result.segments++;
          }
        };

        if (productSegments.length > 0) await syncSegments(productSegments, 'product');
        if (geoSegments.length > 0) await syncSegments(geoSegments, 'geography');

        // Sync stock metrics from key metrics + scores
        if (keyMetrics) {
          const latestFinancial = incomeStatements[0];
          const latestYear = latestFinancial ? new Date(latestFinancial.date).getFullYear() : new Date().getFullYear();

          const stockExisting = await prisma.stockMetric.findFirst({
            where: { companyId: company!.id },
            orderBy: { date: 'desc' },
          });

          const stockData = {
            companyId: company!.id,
            date: new Date(),
            currentPrice: keyMetrics.currentPrice || stockExisting?.currentPrice || 0,
            peRatio: keyMetrics.peRatio || null,
            pbRatio: keyMetrics.pbRatio || null,
            psRatio: keyMetrics.psRatio || null,
            dividendYield: keyMetrics.dividendYield || null,
            marketCap: keyMetrics.currentPrice && keyMetrics.numberOfShares ? keyMetrics.currentPrice * keyMetrics.numberOfShares : stockExisting?.marketCap || null,
            enterpriseValue: evMap.get(latestYear)?.enterpriseValue || stockExisting?.enterpriseValue || null,
            sharesOutstanding: keyMetrics.numberOfShares || null,
            roe: keyMetrics.returnOnEquity || null,
            roa: keyMetrics.returnOnAssets || null,
            roic: ratiosMap.get(latestYear)?.returnOnCapitalEmployed || null,
            currentRatio: ratiosMap.get(latestYear)?.currentRatio || null,
            debtToEquity: keyMetrics.debtToEquity || null,
            altmanZ: scores?.altmanZScore || null,
            piotroskiScore: scores?.piotroskiScore ?? null,
          };

          if (stockExisting) {
            await prisma.stockMetric.update({ where: { id: stockExisting.id }, data: stockData });
          } else {
            await prisma.stockMetric.create({ data: stockData });
          }
        }

        if (result.financialRecords > 0) {
          result.fmpSync = true;
        }

        console.log(`[FMP] Completed for ${ticker}: ${result.financialRecords} records, ${result.balanceSheets} balance sheets, ${result.segments} segments`);
      }
    } catch (error) {
      console.error(`[FMP] Error for ${ticker}:`, error);
      result.error = `FMP error: ${error instanceof Error ? error.message : 'unknown'}`;
    }
  }

  // Fallback to SEC if FMP didn't produce results
  if (!result.fmpSync) {
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
        const shares = sharesOutstanding ?? (yahooQuote.sharesOutstanding > 0 ? yahooQuote.sharesOutstanding : null);
        const mcap = yahooQuote.marketCap && yahooQuote.marketCap > 0
          ? yahooQuote.marketCap
          : (shares && yahooQuote.currentPrice > 0 ? yahooQuote.currentPrice * shares : null);

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
  }

  // European fallback: if FMP and SEC didn't produce data, try European XBRL
  let europeanAvailableTags: string[] | undefined;
  if (!result.fmpSync && !result.secSync) {
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

    if (countryCode) {
      try {
        const yahooQuote = await fetchYahooQuote(ticker);
        const yahooName = yahooQuote?.name;
        const hasTruncatedName = yahooName?.includes('...');
        const stoxxEntry = STOXX600_UNIQUE_TICKERS.find(t => t.ticker === ticker);
        const companyName = (!yahooName || hasTruncatedName)
          ? (stoxxEntry?.name || undefined)
          : yahooName;

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
              },
            });
            console.log(`[European] Created company ${ticker} (id: ${company.id})`);
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
            : (europeanData.data[0]?.sharesOutstanding ?? 0);

            const mcap = yahooQuote.marketCap > 0
              ? yahooQuote.marketCap
              : (stockSharesOutstanding > 0 && yahooQuote.currentPrice > 0
                ? yahooQuote.currentPrice * stockSharesOutstanding
                : null);

            console.log(`[European] ${ticker}: Yahoo quote price=${yahooQuote.currentPrice}, shares=${yahooQuote.sharesOutstanding}, mcap=${mcap}`);

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

  // Calculate intrinsic value from available financial data + stock metrics
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
        const fcfValues = allFinancials
          .map(f => f.freeCashFlow ?? (f.operatingCashFlow != null ? f.operatingCashFlow - f.capex : null))
          .filter((v): v is number => v !== null && v > 0);
        if (fcfValues.length > 0) {
          const avgFcf = fcfValues.reduce((a, b) => a + b, 0) / fcfValues.length;
          const growthRate = 0.05;
          const discountRate = 0.10;
          const horizonYears = 10;
          const terminalGrowth = 0.03;

          let totalPV = 0;
          for (let n = 1; n <= horizonYears; n++) {
            totalPV += (avgFcf * Math.pow(1 + growthRate, n)) / Math.pow(1 + discountRate, n);
          }
          const terminalValue = (avgFcf * Math.pow(1 + growthRate, horizonYears) * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
          const terminalPV = terminalValue / Math.pow(1 + discountRate, horizonYears);
          const totalValue = totalPV + terminalPV;
          const intrinsicPerShare = totalValue / stockForValuation.sharesOutstanding;

          const marginOfSafety = stockForValuation.currentPrice > 0
            ? (intrinsicPerShare - stockForValuation.currentPrice) / stockForValuation.currentPrice
            : null;

          await prisma.stockMetric.update({
            where: { id: stockForValuation.id },
            data: { intrinsicValue: intrinsicPerShare, marginOfSafety },
          });
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
    // If European sync was successful, store available tags for coverage reporting
    const tagsToStore = result.europeanSync && europeanAvailableTags ? europeanAvailableTags : [];

    await prisma.dataSync.upsert({
      where: { companyId: company.id },
      update: {
        lastSyncAt: new Date(),
        yearsFetched: years,
        fmpSync: result.fmpSync,
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
        fmpSync: result.fmpSync,
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

export async function addCompanyFromTicker(ticker: string, fmpApiKey?: string) {
  const upperTicker = ticker.toUpperCase();
  const existing = await prisma.company.findUnique({
    where: { ticker: upperTicker },
  });
  if (existing) {
    console.log(`[AddCompany] ${upperTicker} already exists, skipping`);
    return existing;
  }

  if (fmpApiKey) {
    try {
      console.log(`[AddCompany] Trying FMP for ${upperTicker}...`);
      const profile = await fetchCompanyProfile(ticker, fmpApiKey);
      if (profile) {
        console.log(`[AddCompany] FMP profile found: ${profile.companyName}`);
        let cik: string | null = null;
        try {
          cik = await getCikForTicker(ticker);
        } catch { /* non-critical */ }
        const company = await prisma.company.create({
          data: {
            ticker: upperTicker,
            name: profile.companyName,
            sector: profile.sector || null,
            industry: profile.industry || null,
            description: profile.description || null,
            cik: cik || profile.cik || null,
            ceo: profile.ceo || null,
            employees: safeInt(profile.fullTimeEmployees),
            country: profile.country || null,
            exchange: profile.exchangeShortName || null,
            website: profile.website || null,
          },
        });
        console.log(`[AddCompany] Created ${upperTicker} via FMP (id: ${company.id})`);
        return company;
      }
      console.log(`[AddCompany] FMP returned no profile for ${upperTicker}`);
    } catch (error) {
      console.error(`[AddCompany] FMP error for ${upperTicker}:`, error instanceof Error ? error.message : error);
    }
  }

  try {
    const cik = await getCikForTicker(ticker);
    if (cik) {
      const facts = await fetchCompanyFacts(cik);
      if (facts) {
        return prisma.company.create({
          data: {
            ticker: ticker.toUpperCase(),
            name: facts.entityName,
            cik,
          },
        });
      }
    }
  } catch (error) {
    console.error(`[SEC] Error fetching data for ${ticker}:`, error instanceof Error ? error.message : error);
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

  if (countryCode) {
    try {
      const yahooQuote = await fetchYahooQuote(ticker);
      const companyName = yahooQuote?.name || undefined;
      console.log(`[AddCompany] Trying European data for ${upperTicker} (${countryCode})...`);

      const company = await prisma.company.create({
        data: {
          ticker: upperTicker,
          name: companyName || upperTicker,
          country: countryCode,
          exchange: yahooQuote?.exchange || null,
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

export async function getSP500StockList(fmpApiKey: string): Promise<Array<{ ticker: string; name: string; sector: string; marketCap: number }>> {
  return fetchSP500List(fmpApiKey);
}

export async function bulkImportCompanies(
  tickers: string[],
  fmpApiKey: string | undefined,
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

      const company = await addCompanyFromTicker(ticker, fmpApiKey);
      if (!company) {
        result.failed.push({ ticker, error: 'Empresa no encontrada' });
        onProgress({ current: i + 1, total: tickers.length, ticker, status: 'error', message: 'Empresa no encontrada' });
        continue;
      }

      // Auto-sync financial data
      onProgress({ current: i + 1, total: tickers.length, ticker, status: 'syncing', message: company.name });
      try {
        await syncCompanyData(ticker, years, fmpApiKey);
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
  fmpApiKey: string | undefined,
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
      const syncResult = await syncCompanyData(company.ticker, years, fmpApiKey);
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
