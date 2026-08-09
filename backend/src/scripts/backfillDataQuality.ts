import prisma from '../infrastructure/prisma/client';
import { computeQualityIssues } from '../services/dataAggregator';

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, ticker: true } });
  let updated = 0;
  let withGaps = 0;
  for (const c of companies) {
    const { warnings, gaps } = await computeQualityIssues(c.id);
    const res = await prisma.dataSync.updateMany({
      where: { companyId: c.id },
      data: { validationWarnings: warnings, dataGaps: gaps },
    });
    if (res.count > 0) {
      updated++;
      if (gaps.length > 0) withGaps++;
    }
  }
  console.log(`Backfilled ${updated} dataSync rows (${withGaps} con gaps)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
