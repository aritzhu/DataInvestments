import prisma from '../infrastructure/prisma/client';
import { syncCompanyData } from '../services/dataAggregator';

const TICKERS = process.argv.slice(2);

async function main() {
  for (const ticker of TICKERS) {
    console.log(`\n===== Resync ${ticker} =====`);
    const result = await syncCompanyData(ticker, 5);
    console.log(`[${ticker}] done:`, {
      financialRecords: result.financialRecords,
      balanceSheets: result.balanceSheets,
      yfinanceSync: result.yfinanceSync,
      europeanSync: result.europeanSync,
      error: result.error,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
