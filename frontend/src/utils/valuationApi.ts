import type { ValuationResult, BusinessModelInference, CommodityMapping } from './valuation';

export interface ValuationConfigs {
  dcf: { growthRate: number; discountRate: number; horizonYears: number };
  per: { targetPE: number };
  pb: { targetPB: number };
  ps: { targetPS: number };
  evEbitda: { targetMultiple: number };
  evEbit: { targetMultiple: number };
  ddm: { growthRate: number; requiredReturn: number };
  fcfYield: { targetYield: number };
}

export interface ValuationApiResponse {
  ticker: string;
  asOf: string | null;
  currentPrice: number;
  results: ValuationResult[];
  recommended: { model: string; fairValue: number | null; businessModel?: BusinessModelInference };
  businessModel: BusinessModelInference | null;
  verdict: { verdict: 'buy' | 'hold' | 'sell' | 'na'; upside: number | null; label: string };
  configs: ValuationConfigs;
}

export interface ValuationQueryParams {
  growth?: number;
  discount?: number;
  horizon?: number;
  per?: number;
  pb?: number;
  ps?: number;
  evEbitda?: number;
  evEbit?: number;
  ddmGrowth?: number;
  ddmReturn?: number;
  fcfYield?: number;
  ccGrowth?: boolean;
  ccDiscount?: boolean;
}

export async function fetchValuation(ticker: string, params: ValuationQueryParams = {}, options?: { signal?: AbortSignal }): Promise<ValuationApiResponse> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    qs.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  const query = qs.toString();
  const res = await fetch(`/api/companies/${encodeURIComponent(ticker)}/valuation${query ? `?${query}` : ''}`, { signal: options?.signal });
  if (!res.ok) throw new Error(`Valuation API ${res.status}`);
  return res.json();
}

export async function fetchCommodityMapping(ticker: string, industry?: string | null, sector?: string | null): Promise<CommodityMapping | null> {
  const qs = new URLSearchParams({ ticker });
  if (industry) qs.set('industry', industry);
  if (sector) qs.set('sector', sector);
  const res = await fetch(`/api/commodities/mapping?${qs.toString()}`);
  if (!res.ok) return null;
  const data: CommodityMapping | null = await res.json();
  return data ?? null;
}