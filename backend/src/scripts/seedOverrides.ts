import prisma from '../infrastructure/prisma/client';

// Seed known company overrides. These are values the data sources get wrong
// or don't cover, verified manually. Upserts with update:{} so that later
// admin edits via the UI/API are never overwritten by re-running the seed.
const SEED: Array<{ ticker: string; field: string; value: number; source: string }> = [
  // VOW3.DE: Yahoo reports only the preferred share class (~206M) while the
  // consolidated statements cover the whole company (~2.95B shares).
  { ticker: 'VOW3.DE', field: 'sharesOutstanding', value: 2_950_000_000, source: 'seed:manual' },
  // BMW.DE: yfinance balance excludes most of the financial-services arm debt.
  // Consolidated LT debt ≈ 112B → net debt ≈ 93B (cash ≈ 19B).
  { ticker: 'BMW.DE', field: 'longTermDebt', value: 112_000_000_000, source: 'seed:manual' },
];

async function main() {
  for (const s of SEED) {
    const company = await prisma.company.findUnique({ where: { ticker: s.ticker } });
    if (!company) {
      console.log(`[OverrideSeed] ${s.ticker} not found, skipping`);
      continue;
    }
    await prisma.companyOverride.upsert({
      where: { companyId_field: { companyId: company.id, field: s.field } },
      update: {},
      create: {
        companyId: company.id,
        field: s.field,
        value: s.value,
        source: s.source,
      },
    });
    console.log(`[OverrideSeed] ${s.ticker} ${s.field} = ${s.value}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
