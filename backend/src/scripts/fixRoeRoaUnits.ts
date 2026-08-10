import prisma from '../infrastructure/prisma/client';

// Recalcula ROE/ROA como fracción (netIncome / equity, netIncome / assets)
// a partir de los estados financieros, que es la única fuente fiable:
// las vías SEC/Europea guardaban ×100 (porcentaje) y el heurístico >3 no
// cubre porcentajes bajos ni negativos. Las empresas sin datos financieros
// solo recibieron valores fracción (yahoo/finnhub), así que se dejan intactas.
async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, ticker: true } });

  let recomputed = 0;
  let skippedNoFinancials = 0;

  for (const company of companies) {
    const fd = await prisma.financialData.findFirst({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      select: { year: true, netIncome: true, totalEquity: true },
    });
    const bs = await prisma.balanceSheet.findFirst({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      select: { year: true, totalAssets: true },
    });

    if (!fd || fd.netIncome == null) {
      skippedNoFinancials++;
      continue;
    }

    const equity = fd.totalEquity ?? null;
    const assets = bs?.year === fd.year ? (bs.totalAssets ?? null) : null;

    const roe = fd.netIncome > 0 && equity && equity > 0 ? fd.netIncome / equity : null;
    const roa = fd.netIncome > 0 && assets && assets > 0 ? fd.netIncome / assets : null;

    const stock = await prisma.stockMetric.findFirst({
      where: { companyId: company.id },
      orderBy: { date: 'desc' },
      select: { id: true },
    });
    if (!stock) {
      skippedNoFinancials++;
      continue;
    }

    await prisma.stockMetric.update({ where: { id: stock.id }, data: { roe, roa } });
    recomputed++;
  }

  console.log(`ROE/ROA recalculados desde estados financieros en ${recomputed} filas (${skippedNoFinancials} sin datos financieros, intactas).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
