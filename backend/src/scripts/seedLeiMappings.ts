import axios from 'axios';
import prisma from '../infrastructure/prisma/client';

// Seeds Company.lei for European tickers from the filings.xbrl.org index.
// The GLEIF-based resolver in europeanData.ts is unreliable for parent issuers
// (returns subsidiaries / nothing for REP, IBE, ANA, CLNX, MEL, FER), so the
// authoritative LEI per issuer is captured here and later used as an override.

const XBRL_BASE = 'https://filings.xbrl.org/api';

interface EntityRec {
  lei: string;
  name: string;
}

const LEGAL_FORMS = new Set([
  'SA', 'SE', 'SPA', 'PLC', 'LTD', 'LIMITED', 'NV', 'AG', 'KGAA', 'OYJ',
  'AB', 'ASA', 'APS', 'GMBH', 'BV', 'CV', 'SCA', 'SGPS', 'SOCIMI', 'GROUP',
  'HOLDINGS', 'HOLDING', 'INC', 'CORP', 'CORPORATION', 'CO', 'KG', 'KGA',
  'AND', 'SME', 'SMDE',
]);

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeBase(name: string): string {
  const cleaned = stripAccents(name).toUpperCase().replace(/,/g, ' ').replace(/\./g, '');
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  while (tokens.length > 0 && LEGAL_FORMS.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(' ');
}

function scoreMatch(entityName: string, companyName: string): number {
  const baseE = normalizeBase(entityName);
  const baseC = normalizeBase(companyName);
  if (baseE.length > 0 && baseE === baseC) return 100;
  const normE = stripAccents(entityName).toUpperCase().replace(/\s+/g, ' ').trim();
  const normC = stripAccents(companyName).toUpperCase().replace(/\s+/g, ' ').trim();
  if (normE === normC) return 90;
  if (normE.startsWith(normC) || normC.startsWith(normE)) return 50;
  return 0;
}

async function fetchPage<T>(url: string, page: number): Promise<{ data: T[]; count: number }> {
  const response = await axios.get(url, {
    params: { 'page[size]': 100, 'page[number]': page },
    headers: { Accept: 'application/vnd.api+json' },
    timeout: 15000,
  });
  return { data: response.data?.data || [], count: response.data?.meta?.count ?? 0 };
}

async function fetchEntityName(lei: string): Promise<string | null> {
  try {
    const response = await axios.get<{ data: { attributes: { name: string } } }>(
      `${XBRL_BASE}/entities/${lei}`,
      { headers: { Accept: 'application/vnd.api+json' }, timeout: 15000 },
    );
    return response.data?.data?.attributes?.name || null;
  } catch {
    return null;
  }
}

async function collectEntities(country: string): Promise<EntityRec[]> {
  const leis = new Map<string, true>();
  const base = `${XBRL_BASE}/filings?filter[country]=${country}`;
  const totalPages = Math.ceil((await fetchPage<unknown>(base, 1)).count / 100);

  for (let page = 1; page <= Math.max(totalPages, 1); page++) {
    const res = await fetchPage<{ relationships: { entity: { links: { related: string } } } }>(base, page);
    if (res.data.length === 0) break;
    for (const f of res.data) {
      const lei = f.relationships?.entity?.links?.related?.split('/').pop();
      if (lei) leis.set(lei, true);
    }
    if (page % 10 === 0) console.log(`[seed] ${country}: fetched ${page}/${totalPages} pages (${leis.size} entities)`);
  }

  const entities: EntityRec[] = [];
  const leisArr = Array.from(leis.keys());
  const batchSize = 8;
  for (let i = 0; i < leisArr.length; i += batchSize) {
    const names = await Promise.all(
      leisArr.slice(i, i + batchSize).map((lei) => fetchEntityName(lei)),
    );
    for (let j = 0; j < names.length; j++) {
      const name = names[j];
      if (name) entities.push({ lei: leisArr[i + j], name });
    }
    if ((i / batchSize + 1) % 10 === 0) console.log(`[seed] ${country}: entity names ${Math.min(i + batchSize, leisArr.length)}/${leisArr.length}`);
  }

  console.log(`[seed] ${country}: ${entities.length} entities indexed`);
  return entities;
}

async function main() {
  const companies = await prisma.company.findMany({
    select: { ticker: true, name: true },
  });
  const byTicker = new Map(
    companies
      .filter((c) => /\.\w+$/.test(c.ticker))
      .map((c) => [c.ticker.toUpperCase(), c.name]),
  );

  // Countries with ESEF/UAIFRS filings that our ticker suffixes map to.
  const countries = ['ES', 'FR', 'GB', 'NL', 'IT', 'SE', 'FI', 'DK', 'NO', 'PT', 'AT', 'BE', 'LU'];
  const tickerBySuffix: Record<string, string> = {
    MC: 'ES', PA: 'FR', L: 'GB', AS: 'NL', MI: 'IT', ST: 'SE', HE: 'FI',
    CO: 'DK', OL: 'NO', LS: 'PT', VI: 'AT', BR: 'BE', LU: 'LU',
  };
  const suffixesOf = (country: string) => Object.keys(tickerBySuffix).filter((s) => tickerBySuffix[s] === country);

  const allEntities = new Map<string, EntityRec>();
  for (const country of countries) {
    const suffixes = suffixesOf(country);
    const relevantTickers = [...byTicker.keys()].filter((t) => suffixes.some((s) => t.endsWith(`.${s}`)));
    if (relevantTickers.length === 0) continue;
    const entities = await collectEntities(country);
    for (const e of entities) allEntities.set(e.lei, e);
  }

  console.log(`[seed] total entities collected: ${allEntities.size}`);

  const matched: { ticker: string; lei: string; entityName: string }[] = [];
  const unmatched: string[] = [];

  for (const [ticker, name] of byTicker) {
    let best: { lei: string; name: string; score: number } | null = null;
    for (const e of allEntities.values()) {
      const score = scoreMatch(e.name, name);
      if (score > (best?.score ?? 0)) best = { lei: e.lei, name: e.name, score };
    }
    if (best && best.score >= 80) {
      matched.push({ ticker, lei: best.lei, entityName: best.name });
    } else {
      unmatched.push(`${ticker} (${name})`);
    }
  }

  console.log('\n===== LEI SEED RESULTS =====');
  for (const m of matched.sort((a, b) => a.ticker.localeCompare(b.ticker))) {
    await prisma.company.update({
      where: { ticker: m.ticker },
      data: { lei: m.lei },
    });
    console.log(`  SET ${m.ticker} -> ${m.lei}  (${m.entityName})`);
  }
  console.log(`\nMatched: ${matched.length}, unmatched: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('UNMATCHED:');
    for (const u of unmatched.sort()) console.log(`  - ${u}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
