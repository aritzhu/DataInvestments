import prisma from '../infrastructure/prisma/client';
import { computeAll, getRecommendedFairValue, getSectorConfigs } from '../services/valuationService';

async function main() {
  const companies = await prisma.company.findMany({
    where: { stockMetrics: { some: {} } },
    select: { id: true, ticker: true, name: true, sector: true, industry: true },
    orderBy: { ticker: 'asc' },
  });

  console.log(`Empresas con métricas de bolsa: ${companies.length}`);

  let updated = 0;
  let cleared = 0;
  let skipped = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    try {
      const [financials, balanceSheets, stockMetrics] = await Promise.all([
        prisma.financialData.findMany({ where: { companyId: c.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
        prisma.balanceSheet.findMany({ where: { companyId: c.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
        prisma.stockMetric.findMany({ where: { companyId: c.id }, orderBy: { date: 'desc' }, take: 1 }),
      ]);

      const stock = stockMetrics[0];
      if (!stock || financials.length === 0) {
        skipped++;
        continue;
      }

      const configs = getSectorConfigs(c.sector, c.industry);
      const results = computeAll({ financials: financials as any, balanceSheets: balanceSheets as any, stock }, configs);
      const { fairValue: avg } = getRecommendedFairValue(results, c.sector, c.industry);

      const intrinsicValue = avg != null && avg > 0 ? avg : null;
      const marginOfSafety =
        intrinsicValue != null && stock.currentPrice > 0
          ? (intrinsicValue - stock.currentPrice) / stock.currentPrice
          : null;

      await prisma.stockMetric.update({
        where: { id: stock.id },
        data: { intrinsicValue, marginOfSafety },
      });

      if (intrinsicValue != null) updated++;
      else cleared++;

      console.log(
        `[${i + 1}/${companies.length}] ${c.ticker} price=${stock.currentPrice?.toFixed(2) ?? 'N/A'} fair=${intrinsicValue?.toFixed(2) ?? 'null'} mos=${marginOfSafety != null ? (marginOfSafety * 100).toFixed(0) + '%' : 'null'}`,
      );
    } catch (err) {
      console.error(`[${i + 1}/${companies.length}] ${c.ticker} FAILED: ${err instanceof Error ? err.message : err}`);
      skipped++;
    }
  }

  console.log(`\nDone. con valor: ${updated}, sin valor (null): ${cleared}, saltadas: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
