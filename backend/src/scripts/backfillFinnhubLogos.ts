import prisma from '../infrastructure/prisma/client';
import { fetchFinnhubProfile } from '../services/finnhub';

async function main() {
  const companies = await prisma.company.findMany({
    where: { logoUrl: null },
    select: { id: true, ticker: true },
  });

  console.log(`Found ${companies.length} companies without logoUrl`);

  let updated = 0;
  let failed = 0;

  for (const c of companies) {
    try {
      const profile = await fetchFinnhubProfile(c.ticker);
      if (profile) {
        const data: Record<string, string> = {};
        if (profile.logo) data.logoUrl = profile.logo;
        if (profile.weburl && !profile.logo) data.website = profile.weburl;
        if (data.logoUrl || data.website) {
          await prisma.company.update({
            where: { id: c.id },
            data,
          });
          updated++;
          console.log(`  ${c.ticker} → ${data.logoUrl || '(website only)'}`);
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Failed/skipped: ${failed}/${companies.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
