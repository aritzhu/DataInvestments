import prisma from '../infrastructure/prisma/client';
import { syncCompanyData, type SyncResult } from '../services/dataAggregator';

const DELAY_MS = 400;

async function fixCompany(c: { id: string; ticker: string }): Promise<{ deleted: number; sync: SyncResult }> {
  const del = await prisma.$transaction([
    prisma.financialData.deleteMany({ where: { companyId: c.id } }),
    prisma.balanceSheet.deleteMany({ where: { companyId: c.id } }),
    prisma.stockMetric.deleteMany({ where: { companyId: c.id } }),
    prisma.revenueSegment.deleteMany({ where: { companyId: c.id } }),
  ]);

  const sync = await syncCompanyData(c.ticker, 5);

  return {
    deleted: del.reduce((acc, d) => acc + d.count, 0),
    sync,
  };
}

async function main() {
  const tickerArg = process.argv.find((a) => a.startsWith('--ticker='))?.split('=')[1];

  const companies = await prisma.company.findMany({
    where: tickerArg ? undefined : { cik: { not: null } },
    select: { id: true, ticker: true },
    orderBy: { ticker: 'asc' },
  });

  const targets = tickerArg
    ? companies.filter((c) => c.ticker.toUpperCase() === tickerArg.toUpperCase())
    : companies;

  if (tickerArg && targets.length === 0) {
    console.error(`No se encontró "${tickerArg}" entre las empresas con CIK.`);
    process.exit(1);
  }

  console.log(`Empresas con CIK: ${companies.length}. A procesar: ${targets.length}${tickerArg ? ` (--ticker=${tickerArg})` : ''}`);

  const results: Array<
    | { ticker: string; ok: true; deleted: number; sync: SyncResult }
    | { ticker: string; ok: false; error: string }
  > = [];
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    try {
      const r = await fixCompany(c);
      results.push({ ticker: c.ticker, ok: true, ...r });
      console.log(
        `[${i + 1}/${targets.length}] ${c.ticker} deleted=${r.deleted} sync=${r.sync.secSync ? 'sec' : r.sync.yfinanceSync ? 'yfinance' : r.sync.europeanSync ? 'european' : 'FAILED'} records=${r.sync.financialRecords} bs=${r.sync.balanceSheets}`,
      );
      if (r.sync.error) console.log(`  sync.error: ${r.sync.error}`);
    } catch (err) {
      results.push({ ticker: c.ticker, ok: false, error: err instanceof Error ? err.message : String(err) });
      console.error(`[${i + 1}/${targets.length}] ${c.ticker} FAILED: ${err instanceof Error ? err.message : err}`);
    }
    if (i < targets.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const ok = results.filter((r) => r.ok && (r.sync?.financialRecords ?? 0) > 0).length;
  const failed = results.length - ok;
  console.log(`\nDone. con datos: ${ok}/${results.length}, sin datos: ${failed}`);
  for (const r of results) {
    if (!r.ok || (r.sync?.financialRecords ?? 0) === 0) {
      console.log(`  - ${r.ticker}: ${r.ok ? r.sync?.error || 'sin datos financieros' : r.error}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
