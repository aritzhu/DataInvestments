import prisma from '../infrastructure/prisma/client';
import { resolveCompanyMeta, isEuropeanTicker } from '../services/companyMeta';
import { syncCompanyData, type SyncResult } from '../services/dataAggregator';

const DELAY_MS = 400;

const TICKER_COUNTRY: Record<string, string> = {
  DE: 'DE', F: 'DE', D: 'DE',
  PA: 'FR', L: 'GB', MC: 'ES', AS: 'NL', BR: 'BE',
  HE: 'FI', ST: 'SE', CO: 'DK', MI: 'IT', LS: 'PT',
  VI: 'AT', SW: 'CH', OL: 'NO', IR: 'IE', LU: 'LU',
};

function countryFromTicker(ticker: string): string | null {
  const upper = ticker.toUpperCase();
  const suffix = upper.includes('.') ? upper.split('.').pop() ?? '' : '';
  return TICKER_COUNTRY[suffix] ?? null;
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

async function fixCompany(c: {
  id: string;
  ticker: string;
  name: string;
  country: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  cik: string | null;
}): Promise<{ changes: string[]; deleted: number; sync: SyncResult }> {
  const meta = await resolveCompanyMeta(c.ticker);

  const data: Record<string, string | null> = {};
  if (meta.name && norm(meta.name) !== norm(c.name)) data.name = meta.name;
  const country = countryFromTicker(c.ticker);
  if (country && c.country !== country) data.country = country;
  if (meta.sector && c.sector !== meta.sector) data.sector = meta.sector;
  if (meta.industry && c.industry !== meta.industry) data.industry = meta.industry;
  if (meta.website && c.website !== meta.website) data.website = meta.website;
  if (meta.logoUrl && c.logoUrl !== meta.logoUrl) data.logoUrl = meta.logoUrl;
  if (c.cik) data.cik = null;

  if (Object.keys(data).length > 0) {
    await prisma.company.update({ where: { id: c.id }, data });
  }

  const del = await prisma.$transaction([
    prisma.financialData.deleteMany({ where: { companyId: c.id } }),
    prisma.balanceSheet.deleteMany({ where: { companyId: c.id } }),
    prisma.stockMetric.deleteMany({ where: { companyId: c.id } }),
    prisma.revenueSegment.deleteMany({ where: { companyId: c.id } }),
  ]);

  const sync = await syncCompanyData(c.ticker, 5);

  return {
    changes: Object.keys(data),
    deleted: del.reduce((acc, d) => acc + d.count, 0),
    sync,
  };
}

async function main() {
  const tickerArg = process.argv.find((a) => a.startsWith('--ticker='))?.split('=')[1];

  const companies = await prisma.company.findMany({
    where: { cik: { not: null } },
    select: { id: true, ticker: true, name: true, country: true, sector: true, industry: true, website: true, logoUrl: true, cik: true },
    orderBy: { ticker: 'asc' },
  });

  const affected = companies.filter((c) => isEuropeanTicker(c.ticker));
  const targets = tickerArg ? affected.filter((c) => c.ticker.toUpperCase() === tickerArg.toUpperCase()) : affected;

  if (tickerArg && targets.length === 0) {
    console.error(`No se encontró "${tickerArg}" entre las europeas con CIK.`);
    process.exit(1);
  }

  console.log(`Empresas europeas con CIK: ${affected.length}. A procesar: ${targets.length}`);

  const results: Array<
    | { ticker: string; ok: true; changes: string[]; deleted: number; sync: SyncResult }
    | { ticker: string; ok: false; error: string }
  > = [];
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    try {
      const r = await fixCompany(c);
      results.push({ ticker: c.ticker, ok: true, ...r });
      console.log(
        `[${i + 1}/${targets.length}] ${c.ticker} changes=[${r.changes.join(',') || 'none'}] deleted=${r.deleted} sync=${r.sync.yfinanceSync ? 'yfinance' : r.sync.europeanSync ? 'european' : 'FAILED'} records=${r.sync.financialRecords} bs=${r.sync.balanceSheets}`,
      );
      if (r.sync.error) console.log(`  sync.error: ${r.sync.error}`);
    } catch (err) {
      results.push({ ticker: c.ticker, ok: false, error: err instanceof Error ? err.message : String(err) });
      console.error(`[${i + 1}/${targets.length}] ${c.ticker} FAILED: ${err instanceof Error ? err.message : err}`);
    }
    if (i < targets.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const ok = results.filter((r) => r.ok && r.sync?.yfinanceSync).length;
  const failed = results.length - ok;
  console.log(`\nDone. yfinance ok: ${ok}/${results.length}, failed: ${failed}`);
  for (const r of results) {
    if (!r.ok || !r.sync?.yfinanceSync) {
      console.log(`  - ${r.ticker}: ${r.ok ? r.sync?.error || 'no yfinance sync' : r.error}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
