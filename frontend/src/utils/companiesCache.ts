export interface CompanyFromAPI {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  logoUrl: string | null;
  metrics?: {
    pe: number | null;
    netMargin: number | null;
    fcfYield: number | null;
    ndEbitda: number | null;
  } | null;
}

export interface LandingCacheEntry {
  key: string;
  companies: CompanyFromAPI[];
  total: number;
  facets: { sectors: string[]; countries: string[] };
  heroSettings: Record<string, string | null>;
  valuationLimits: { u: string; o: string } | null;
  undervalued: unknown[];
  overvalued: unknown[];
  savedAt: number;
}

const MAX_ENTRIES = 6;

const cache = new Map<string, LandingCacheEntry>();

export function getLandingCache(key: string): LandingCacheEntry | null {
  return cache.get(key) || null;
}

export function setLandingCache(key: string, partial: Partial<Omit<LandingCacheEntry, 'key' | 'savedAt'>>): void {
  const existing = cache.get(key);
  cache.set(key, {
    companies: existing?.companies ?? [],
    total: existing?.total ?? 0,
    facets: existing?.facets ?? { sectors: [], countries: [] },
    heroSettings: existing?.heroSettings ?? {},
    valuationLimits: existing?.valuationLimits ?? null,
    undervalued: existing?.undervalued ?? [],
    overvalued: existing?.overvalued ?? [],
    ...partial,
    key,
    savedAt: Date.now(),
  });
  if (cache.size > MAX_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}
