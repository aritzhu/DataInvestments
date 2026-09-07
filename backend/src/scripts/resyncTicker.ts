import prisma from '../infrastructure/prisma/client';
import { syncCompanyData } from '../services/dataAggregator';

// Targeted re-sync of a single ticker with the (fixed) pipeline.
async function main() {
  const ticker = process.argv[2];
  if (!ticker) {
    console.error('Uso: node dist/scripts/resyncTicker.js <TICKER>');
    process.exit(1);
  }

  const company = await prisma.company.findFirst({ where: { ticker: ticker.toUpperCase() } });
  if (!company) {
    console.error(`[resyncTicker] Ticker ${ticker} no encontrado`);
    process.exit(1);
  }

  console.log(`Re-sincronizando ${company.ticker}...`);
  const result = await syncCompanyData(company.ticker, 5);
  const success = result.yfinanceSync || result.secSync || result.europeanSync;
  console.log(`[${company.ticker}] financialRecords=${result.financialRecords} balanceSheets=${result.balanceSheets} yfinance=${result.yfinanceSync} european=${result.europeanSync} error=${result.error ?? 'none'}`);
  if (!success) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());