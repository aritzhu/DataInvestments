import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function buildLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!domain) return null;
  return `https://logos.hunter.io/${domain}`;
}

async function main() {
  const companies = await prisma.company.findMany({
    where: { logoUrl: null, website: { not: null } },
    select: { id: true, ticker: true, website: true },
  });

  console.log(`Found ${companies.length} companies with website but no logoUrl`);

  let updated = 0;
  for (const c of companies) {
    const logoUrl = buildLogoUrl(c.website);
    if (logoUrl) {
      await prisma.company.update({
        where: { id: c.id },
        data: { logoUrl },
      });
      updated++;
      console.log(`  ${c.ticker} → ${logoUrl}`);
    }
  }

  console.log(`\nDone. Updated ${updated}/${companies.length} companies.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
