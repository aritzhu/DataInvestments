import prisma from '../infrastructure/prisma/client';

// Normaliza ROE/ROA a fracción (0.36 → 36%) en filas existentes guardadas
// como porcentaje (yahoo/finnhub las almacenaban ×100).
// Heurística: los valores reales en fracción son ≤ 3; los de porcentaje son > 3.
async function main() {
  const rows = await prisma.stockMetric.findMany({
    where: { OR: [{ roe: { gt: 3 } }, { roa: { gt: 3 } }] },
    select: { id: true, roe: true, roa: true },
  });

  let updated = 0;
  for (const row of rows) {
    const data: { roe?: number; roa?: number } = {};
    if (row.roe != null && row.roe > 3) data.roe = row.roe / 100;
    if (row.roa != null && row.roa > 3) data.roa = row.roa / 100;
    if (Object.keys(data).length > 0) {
      await prisma.stockMetric.update({ where: { id: row.id }, data });
      updated++;
    }
  }

  console.log(`ROE/ROA normalizados a fracción en ${updated} filas.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
