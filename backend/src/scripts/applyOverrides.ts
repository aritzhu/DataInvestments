import prisma from '../infrastructure/prisma/client';
import { applyCompanyOverrides } from '../services/overrides';

// Re-applies all active DB overrides on top of the stored rows, then
// recomputes valuations (overrides must be applied before recompute).
async function main() {
  const companies = await prisma.company.findMany({
    where: { overrides: { some: { active: true } } },
    select: { id: true, ticker: true },
    orderBy: { ticker: 'asc' },
  });

  console.log(`Empresas con overrides activos: ${companies.length}`);

  for (const c of companies) {
    const applied = await applyCompanyOverrides(c.ticker, c.id);
    console.log(`[OverrideApply] ${c.ticker}: ${applied} field(s)`);
  }

  console.log('\nEjecutar después: pnpm recompute:valuation');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
