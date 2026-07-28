import { PrismaClient } from '@prisma/client';
import { fetchYFinanceInfo } from '../services/yfinanceSidecar';

const prisma = new PrismaClient();

function buildLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!domain) return null;
  return `https://logos.hunter.io/${domain}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const companies = await prisma.company.findMany({
    where: { website: null },
    select: { id: true, ticker: true },
  });

  console.log(`Found ${companies.length} companies without website`);

  let updated = 0;
  let failed = 0;

  for (const c of companies) {
    try {
      const info = await fetchYFinanceInfo(c.ticker);
      const website = info?.info?.website || null;

      if (website) {
        const logoUrl = buildLogoUrl(website);
        await prisma.company.update({
          where: { id: c.id },
          data: { website, logoUrl },
        });
        updated++;
        console.log(`  ✓ ${c.ticker} → ${website} → ${logoUrl}`);
      } else {
        console.log(`  ✗ ${c.ticker} → no website found`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${c.ticker} → error: ${err instanceof Error ? err.message : err}`);
    }

    await sleep(1000);
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}, Total: ${companies.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
