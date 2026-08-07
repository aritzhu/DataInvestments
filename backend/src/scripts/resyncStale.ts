import prisma from '../infrastructure/prisma/client';
import { syncCompanyData } from '../services/dataAggregator';

const DEFAULT_STALE_DAYS = 7;
const DEFAULT_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface ResyncStaleOptions {
  staleDays?: number;
  delayMs?: number;
  maxCompanies?: number;
  includeIncomplete?: boolean;
  purgeZeroRows?: boolean;
}

// Empresas con datos trimestrales pero sin ninguna fila anual (quarter=0).
// Suelen ser sincronizadas por un pipeline que solo escribió trimestres; aunque
// lastSyncAt sea reciente están incompletas y deben re-sincronizarse.
async function fetchIncompleteCompanies(): Promise<{ id: string; ticker: string }[]> {
  return prisma.$queryRawUnsafe<{ id: string; ticker: string }[]>(`
    SELECT c.id, c.ticker
    FROM "Company" c
    JOIN "FinancialData" fd ON fd."companyId" = c.id
    GROUP BY c.id, c.ticker
    HAVING COUNT(*) FILTER (WHERE fd.quarter > 0) > 0
       AND COUNT(*) FILTER (WHERE fd.quarter = 0) = 0
    ORDER BY c.ticker ASC
  `);
}

// Limpia filas trimestrales vacías (placeholders a cero) que distorsionan los
// agregados TTM y las valoraciones si no se re-escriben con datos reales.
async function purgeZeroRows(): Promise<number> {
  return prisma.$executeRawUnsafe(`
    DELETE FROM "FinancialData"
    WHERE quarter > 0 AND revenue = 0 AND "netIncome" = 0 AND ebitda IS NULL
  `);
}

export async function resyncStaleCompanies(options: ResyncStaleOptions = {}): Promise<{ checked: number; ok: number; failed: number }> {
  const staleDays = options.staleDays ?? DEFAULT_STALE_DAYS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const includeIncomplete = options.includeIncomplete ?? true;
  const purgeZero = options.purgeZeroRows ?? true;
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const staleCandidates = await prisma.company.findMany({
    where: {
      OR: [{ dataSync: null }, { dataSync: { lastSyncAt: { lt: cutoff } } }],
    },
    select: { id: true, ticker: true },
    orderBy: { ticker: 'asc' },
  });

  let incomplete: { id: string; ticker: string }[] = [];
  if (includeIncomplete) {
    incomplete = await fetchIncompleteCompanies();
    console.log(`[resyncStale] ${incomplete.length} empresas incompletas (trimestres sin anuales)`);
  }

  const byId = new Map<string, { id: string; ticker: string }>();
  for (const c of staleCandidates) byId.set(c.id, c);
  for (const c of incomplete) byId.set(c.id, c);
  const candidates = [...byId.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));

  if (purgeZero) {
    const purged = await purgeZeroRows();
    if (purged > 0) console.log(`[resyncStale] purged ${purged} filas trimestrales vacías (revenue=0, netIncome=0, ebitda null)`);
  }

  const companies = options.maxCompanies ? candidates.slice(0, options.maxCompanies) : candidates;

  console.log(`[resyncStale] ${companies.length} empresas a sincronizar (${candidates.length} candidatas: ${staleCandidates.length} por antiguedad < ${staleDays}d + ${incomplete.length} incompletas)`);

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    try {
      const result = await syncCompanyData(c.ticker, 5);
      const success = result.yfinanceSync || result.secSync || result.europeanSync;
      if (success) ok++;
      else failed++;
      console.log(`[resyncStale] [${i + 1}/${companies.length}] ${c.ticker} ok=${success} financials=${result.financialRecords} error=${result.error ?? 'none'}`);
    } catch (e) {
      failed++;
      console.error(`[resyncStale] [${i + 1}/${companies.length}] ${c.ticker} FAILED: ${e instanceof Error ? e.message : e}`);
    }
    await sleep(delayMs);
  }

  console.log(`[resyncStale] Done. ok=${ok}, failed=${failed}`);
  return { checked: companies.length, ok, failed };
}

async function main() {
  await resyncStaleCompanies();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
