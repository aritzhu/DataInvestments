import prisma from '../infrastructure/prisma/client';
import { syncCompanyData } from '../services/dataAggregator';

// Full re-sync of every company with the (fixed) pipeline.
async function main() {
  const companies = await prisma.company.findMany({
    select: { ticker: true },
    orderBy: { ticker: 'asc' },
  });

  console.log(`Re-sincronizando ${companies.length} empresas...`);

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < companies.length; i++) {
    const ticker = companies[i].ticker;
    console.log(`\n===== [${i + 1}/${companies.length}] ${ticker} =====`);
    try {
      const result = await syncCompanyData(ticker, 5);
      const success = result.yfinanceSync || result.secSync || result.europeanSync;
      if (success) ok++;
      else failed++;
      console.log(`[${ticker}] financialRecords=${result.financialRecords} balanceSheets=${result.balanceSheets} yfinance=${result.yfinanceSync} european=${result.europeanSync} error=${result.error ?? 'none'}`);
    } catch (e) {
      failed++;
      console.error(`[${ticker}] FAILED: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nDone. con datos: ${ok}, sin datos/fallos: ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
