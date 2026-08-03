import prisma from '../infrastructure/prisma/client';

// Corrección one-off de empresas europeas con datos ESEF erróneos.
// CON.DE: valores verificados por el usuario (revenue, EBITDA, deuda neta, equity, shares).
// ALV.DE: agregados TTM de yfinance info (fuente fiable, aprobada por el usuario).
// Convierte valores null a 0 donde la columna es NOT NULL.

const CON = {
  shares: 200_005_983,
  price: 72.82,
  rows: {
    2025: { revenue: 41_500_000_000, netIncome: 1_100_000_000, ebitda: 3_800_000_000, ebit: 2_800_000_000, ocf: 3_400_000_000, capex: 2_600_000_000, fcf: 800_000_000, equity: 14_500_000_000, assets: 37_500_000_000, liabilities: 23_000_000_000, cash: 1_380_000_000, ltd: 6_600_000_000, std: 0 },
    2024: { revenue: 39_500_000_000, netIncome: 1_170_000_000, ebitda: 3_700_000_000, ebit: 2_700_000_000, ocf: 3_400_000_000, capex: 2_700_000_000, fcf: 700_000_000, equity: 14_500_000_000, assets: 37_500_000_000, liabilities: 23_000_000_000, cash: 1_400_000_000, ltd: 6_500_000_000, std: 0 },
  },
};

const ALV = {
  shares: 379_286_270,
  price: 432.5,
  marketCap: 164_041_310_208,
  peRatio: 13.965,
  pbRatio: 2.489,
  psRatio: 1.42,
  roe: 18.706,
  dividendYield: 0.03,
  row2025: {
    revenue: 115_495_002_112, netIncome: 11_870_000_128, ebitda: 19_718_750_208,
    equity: 65_900_000_000, assets: 1_018_000_000_000, liabilities: 952_000_000_000,
    cash: 27_517_999_104, ltd: 0, std: 0,
  },
};

async function main() {
  // ---------- CON.DE ----------
  const con = await prisma.company.findUnique({ where: { ticker: 'CON.DE' } });
  if (con) {
    for (const [yearStr, v] of Object.entries(CON.rows)) {
      const year = Number(yearStr);
      await prisma.financialData.upsert({
        where: { companyId_year_quarter: { companyId: con.id, year, quarter: 0 } },
        create: {
          companyId: con.id, year, quarter: 0,
          revenue: v.revenue, netIncome: v.netIncome, ebitda: v.ebitda, ebit: v.ebit,
          operatingCashFlow: v.ocf, capex: v.capex, freeCashFlow: v.fcf,
          totalEquity: v.equity, totalAssets: v.assets, totalLiabilities: v.liabilities,
          costOfRevenue: 0, operatingExpenses: 0, sgaExpense: 0, rdExpense: 0,
          interestExpense: 0, taxExpense: 0, depreciation: 0,
        },
        update: {
          revenue: v.revenue, netIncome: v.netIncome, ebitda: v.ebitda, ebit: v.ebit,
          operatingCashFlow: v.ocf, capex: v.capex, freeCashFlow: v.fcf,
          totalEquity: v.equity, totalAssets: v.assets, totalLiabilities: v.liabilities,
        },
      });
      await prisma.balanceSheet.upsert({
        where: { companyId_year_quarter: { companyId: con.id, year, quarter: 0 } },
        create: {
          companyId: con.id, year, quarter: 0,
          totalStockholdersEquity: v.equity, totalAssets: v.assets, totalLiabilities: v.liabilities,
          cashAndCashEquivalents: v.cash, longTermDebt: v.ltd, shortTermDebt: v.std,
        },
        update: {
          totalStockholdersEquity: v.equity, totalAssets: v.assets, totalLiabilities: v.liabilities,
          cashAndCashEquivalents: v.cash, longTermDebt: v.ltd, shortTermDebt: v.std,
        },
      });
      console.log(`[CON.DE] ${year}: FinancialData + BalanceSheet corregidos`);
    }
    const netDebt = 6_600_000_000 - 1_380_000_000;
    const stock = await prisma.stockMetric.findFirst({ where: { companyId: con.id }, orderBy: { date: 'desc' } });
    if (stock) {
      await prisma.stockMetric.update({
        where: { id: stock.id },
        data: {
          sharesOutstanding: CON.shares,
          currentPrice: CON.price,
          marketCap: CON.price * CON.shares,
          enterpriseValue: CON.price * CON.shares + netDebt,
          pbRatio: 3.33,
          psRatio: 0.76,
          peRatio: null,
          dividendYield: 0.032,
        },
      });
      console.log(`[CON.DE] StockMetric: shares=${CON.shares} mcap=${(CON.price * CON.shares / 1e9).toFixed(2)}B EV=${((CON.price * CON.shares + netDebt) / 1e9).toFixed(2)}B`);
    }
  } else {
    console.log('[CON.DE] empresa no encontrada');
  }

  // ---------- ALV.DE ----------
  const alv = await prisma.company.findUnique({ where: { ticker: 'ALV.DE' } });
  if (alv) {
    const v = ALV.row2025;
    await prisma.financialData.upsert({
      where: { companyId_year_quarter: { companyId: alv.id, year: 2025, quarter: 0 } },
      create: {
        companyId: alv.id, year: 2025, quarter: 0,
        revenue: v.revenue, netIncome: v.netIncome, ebitda: v.ebitda,
        totalEquity: v.equity, totalAssets: v.assets, totalLiabilities: v.liabilities,
        costOfRevenue: 0, operatingExpenses: 0, sgaExpense: 0, rdExpense: 0,
        interestExpense: 0, taxExpense: 0, depreciation: 0, capex: 0,
      },
      update: {
        revenue: v.revenue, netIncome: v.netIncome, ebitda: v.ebitda,
        totalEquity: v.equity, totalAssets: v.assets, totalLiabilities: v.liabilities,
      },
    });
    await prisma.balanceSheet.upsert({
      where: { companyId_year_quarter: { companyId: alv.id, year: 2025, quarter: 0 } },
      create: {
        companyId: alv.id, year: 2025, quarter: 0,
        totalStockholdersEquity: v.equity, totalAssets: v.assets, totalLiabilities: v.liabilities,
        cashAndCashEquivalents: v.cash, longTermDebt: v.ltd, shortTermDebt: v.std,
      },
      update: {
        totalStockholdersEquity: v.equity, totalAssets: v.assets, totalLiabilities: v.liabilities,
        cashAndCashEquivalents: v.cash, longTermDebt: v.ltd, shortTermDebt: v.std,
      },
    });
    const stock = await prisma.stockMetric.findFirst({ where: { companyId: alv.id }, orderBy: { date: 'desc' } });
    if (stock) {
      await prisma.stockMetric.update({
        where: { id: stock.id },
        data: {
          sharesOutstanding: ALV.shares,
          currentPrice: ALV.price,
          marketCap: ALV.marketCap,
          peRatio: ALV.peRatio,
          pbRatio: ALV.pbRatio,
          psRatio: ALV.psRatio,
          roe: ALV.roe,
          dividendYield: ALV.dividendYield,
          enterpriseValue: ALV.marketCap,
        },
      });
      console.log(`[ALV.DE] StockMetric: shares=${ALV.shares} mcap=${(ALV.marketCap / 1e9).toFixed(2)}B`);
    }
    console.log('[ALV.DE] FinancialData 2025 + BalanceSheet 2025 corregidos');
  } else {
    console.log('[ALV.DE] empresa no encontrada');
  }

  console.log('\nEjecutar después: pnpm recompute:valuation');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
