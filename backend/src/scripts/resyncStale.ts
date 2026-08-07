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
}

export async function resyncStaleCompanies(options: ResyncStaleOptions = {}): Promise<{ checked: number; ok: number; failed: number }> {
  const staleDays = options.staleDays ?? DEFAULT_STALE_DAYS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const candidates = await prisma.company.findMany({
    where: {
      OR: [{ dataSync: null }, { dataSync: { lastSyncAt: { lt: cutoff } } }],
    },
    select: { id: true, ticker: true },
    orderBy: { ticker: 'asc' },
  });

  const companies = options.maxCompanies ? candidates.slice(0, options.maxCompanies) : candidates;

  console.log(`[resyncStale] ${companies.length} empresas a sincronizar (de ${candidates.length} candidatas, ultimo sync < ${staleDays}d)`);

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
