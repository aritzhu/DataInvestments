import prisma from '../infrastructure/prisma/client';
import { resolveCompanyMeta } from '../services/companyMeta';

const MISMATCHED_NAMES = new Set([
  'DTE.DE', 'MRK.DE', 'ENR.DE', 'HEI.DE', 'NEM.DE',
  'ALV.DE', 'CBK.DE', 'CON.DE', 'ELE.MC', 'IAG.MC',
  'IDR.MC', 'ITX.MC', 'MAP.MC', 'BKT.MC',
]);

const DELAY_MS = 250;

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { logoUrl: null },
        { website: null },
        { sector: null },
        { industry: null },
        { ticker: { in: Array.from(MISMATCHED_NAMES) } },
      ],
    },
    select: { id: true, ticker: true, name: true, sector: true, industry: true, website: true, logoUrl: true },
  });

  console.log(`Found ${companies.length} companies with missing metadata`);

  let updated = 0;
  for (const c of companies) {
    const meta = await resolveCompanyMeta(c.ticker);

    const data: Record<string, string> = {};
    if (!c.sector && meta.sector) data.sector = meta.sector;
    if (!c.industry && meta.industry) data.industry = meta.industry;
    if (!c.website && meta.website) data.website = meta.website;
    if (!c.logoUrl && meta.logoUrl) data.logoUrl = meta.logoUrl;
    if (MISMATCHED_NAMES.has(c.ticker) && meta.name && meta.name !== c.name) data.name = meta.name;

    if (Object.keys(data).length > 0) {
      await prisma.company.update({ where: { id: c.id }, data });
      updated++;
      console.log(`  ${c.ticker} → ${JSON.stringify(data)}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const stillMissing = await prisma.company.findMany({
    where: {
      OR: [
        { logoUrl: null },
        { website: null },
        { sector: null },
        { industry: null },
      ],
    },
    select: { ticker: true },
  });

  console.log(`\nDone. Updated ${updated}/${companies.length} companies.`);
  console.log(`Still missing: ${stillMissing.length}`);
  for (const s of stillMissing) console.log(`  - ${s.ticker}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
