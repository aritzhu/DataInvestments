import axios from 'axios';
import { fetchEuropeanFinancials } from '../services/europeanData';
import { resolveEsefLei } from '../services/europeanData';
import prisma from '../infrastructure/prisma/client';

async function dumpRevenueCandidates(ticker: string, country: string) {
  const lei = await resolveEsefLei(ticker);
  if (!lei) return;
  const filingsResp = await axios.get<{ data: { attributes: { json_url: string | null; period_end: string } }[] }>(
    `https://filings.xbrl.org/api/entities/${lei}/filings`,
    { params: { 'page[size]': 5, 'sort': '-period_end' }, headers: { Accept: 'application/vnd.api+json' }, timeout: 15000 },
  );
  for (const filing of filingsResp.data.data.slice(0, 2)) {
    const jurl = filing.attributes.json_url;
    if (!jurl) continue;
    const fullUrl = jurl.startsWith('http') ? jurl : `https://filings.xbrl.org${jurl}`;
    const resp = await axios.get<{ facts: Record<string, { value: string | number; dimensions: { concept: string; period: string; unit?: string } }> }>(fullUrl, { timeout: 15000 });
    console.log(`\n===== ${ticker} ${filing.attributes.period_end} — candidate revenue/sales concepts =====`);
    const candidates: { concept: string; value: string | number; period: string }[] = [];
    for (const fact of Object.values(resp.data.facts ?? {})) {
      const concept = fact.dimensions?.concept || '';
      if (/Revenue|Sales|GrossProfit|NetIncome|Income/.test(concept) && concept.includes(':')) {
        candidates.push({ concept, value: fact.value, period: fact.dimensions?.period || '' });
      }
    }
    candidates.sort((a, b) => String(a.period).localeCompare(String(b.period)));
    for (const c of candidates) {
      console.log(`${c.concept}  ${c.period}  = ${c.value}`);
    }
  }
}

async function main() {
  const ticker = process.argv[2] || 'REP.MC';
  const country = process.argv[3] || 'ES';
  const name = process.argv[4];
  const sector = process.argv[5] || 'Energy';

  const result = await fetchEuropeanFinancials(ticker, country, name, sector);

  console.log(`\n===== ESEF discovery: ${ticker} =====`);
  console.log(`years extracted: ${result.data.length}`);
  console.log(`availableTags: ${result.availableTags.length}`);
  console.log('---- mapped rows ----');
  for (const r of result.data) {
    console.log(JSON.stringify(r));
  }
  console.log('---- tags (all concepts found in filings) ----');
  for (const t of result.availableTags) {
    console.log(t);
  }
  await dumpRevenueCandidates(ticker, country);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
