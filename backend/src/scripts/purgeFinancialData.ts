import prisma from '../infrastructure/prisma/client';

// Deletes ALL FinancialData and BalanceSheet rows so a full re-sync can
// rebuild them from the (now fixed) data pipeline. Company and StockMetric
// are preserved; StockMetric is refreshed by the re-sync itself.
async function main() {
  const [finDel, bsDel] = await Promise.all([
    prisma.financialData.deleteMany(),
    prisma.balanceSheet.deleteMany(),
  ]);
  console.log(`Purged ${finDel.count} FinancialData rows and ${bsDel.count} BalanceSheet rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
