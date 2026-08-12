import prisma from '../infrastructure/prisma/client';
import { isEuropeanTicker } from '../services/companyMeta';
import { fetchEuropeanFinancials } from '../services/europeanData';

const TICKER_COUNTRY: Record<string, string> = {
  DE: 'DE', F: 'DE', D: 'DE',
  PA: 'FR', L: 'GB', MC: 'ES', AS: 'NL',
  BR: 'BE', HE: 'FI', ST: 'SE', CO: 'DK',
  MI: 'IT', LS: 'PT', VI: 'AT', SW: 'CH',
  OL: 'NO', IR: 'IE', LU: 'LU',
};

// filings.xbrl.org does not index these countries.
const SKIP_COUNTRIES = new Set(['DE', 'IE']);

async function main() {
  const companies = await prisma.company.findMany({
    where: { ticker: { not: { equals: '' } } },
    select: { ticker: true, name: true, sector: true },
    orderBy: { ticker: 'asc' },
  });

  const eligible = companies.filter((c) => isEuropeanTicker(c.ticker));

  let dataOk = 0;
  let noData = 0;
  const flags: string[] = [];

  for (const comp of eligible) {
    const ticker = comp.ticker.toUpperCase();
    const suffix = ticker.includes('.') ? ticker.split('.').pop()! : '';
    const countryCode = TICKER_COUNTRY[suffix] || '';

    if (!countryCode || SKIP_COUNTRIES.has(countryCode)) {
      console.log(`[SKIP] ${ticker} country=${countryCode} — not ESEF-eligible`);
      continue;
    }

    let res;
    try {
      res = await fetchEuropeanFinancials(ticker, countryCode, comp.name, comp.sector || undefined);
    } catch (e) {
      console.log(`[ERROR] ${ticker}: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    const rows = res.data;
    const lastTwo = rows.slice(0, 2).map((r) => ({
      year: r.year,
      revenue: r.revenue ?? '·',
      netIncome: r.netIncome ?? '·',
      totalAssets: r.totalAssets ?? '·',
    }));

    const lr = rows[0];
    const missing: string[] = [];
    if (rows.length === 0) {
      noData++;
      missing.push('NO DATA');
    } else {
      dataOk++;
      if (lr.revenue == null) missing.push('NO REV');
      if (lr.netIncome == null) missing.push('NO NI');
      if (lr.totalAssets == null) missing.push('NO TA');
      if (rows.length < 3) missing.push(`ONLY ${rows.length}Y`);
    }

    console.log(`[${rows.length}Y] ${ticker}${missing.length ? '  ' + missing.join(' ') : ''}`);
    for (const y of lastTwo) {
      const fmt = (v: string | number) => (typeof v === 'number' ? v.toLocaleString('en-US') : v);
      console.log(`     ${y.year}: rev=${fmt(y.revenue)}  ni=${fmt(y.netIncome)}  ta=${fmt(y.totalAssets)}`);
    }
    for (const m of missing) flags.push(`${ticker} ${m}`);
  }

  console.log('\n===== RESUMEN =====');
  console.log(`empresas europeas en DB: ${eligible.length}`);
  console.log(`con datos ESEF: ${dataOk}  | sin datos: ${noData}`);
  console.log(`flags (${flags.length}):`);
  for (const f of flags) console.log(`  - ${f}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
