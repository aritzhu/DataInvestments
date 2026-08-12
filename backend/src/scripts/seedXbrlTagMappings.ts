import prisma from '../infrastructure/prisma/client';

// ESEF concept overrides with explicit priority. Lower priority wins when
// several concepts map to the same field (see loadXbrlTagMappings + the
// priority comparison in mapJsonFactsToFiscalData).

const MAPPINGS: { fieldName: string; tag: string; priority: number; source: string }[] = [
  { fieldName: 'revenue', tag: 'melia:RevenuesNotIncludingFinancialIncome', priority: 10, source: 'esef' },
  { fieldName: 'netIncome', tag: 'ifrs-full:ProfitLossAttributableToOwnersOfParent', priority: 90, source: 'esef' },
];

async function main() {
  let created = 0;
  let updated = 0;
  for (const m of MAPPINGS) {
    const existing = await prisma.xbrlTagMapping.findFirst({
      where: { fieldName: m.fieldName, tag: m.tag },
    });
    if (existing) {
      if (existing.priority !== m.priority || existing.active !== true) {
        await prisma.xbrlTagMapping.update({
          where: { id: existing.id },
          data: { priority: m.priority, active: true },
        });
        updated++;
      }
    } else {
      await prisma.xbrlTagMapping.create({ data: m });
      created++;
    }
  }
  console.log(`XbrlTagMapping seed done: ${created} created, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
