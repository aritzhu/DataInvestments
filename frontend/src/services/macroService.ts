import { apiFetch } from '../utils/api';

export type MacroPeriod = '1d' | '1w' | '1m' | '3m' | '6m' | 'ytd' | '1y' | '5y';
export type MacroRegion = 'us' | 'europe' | 'asia' | 'americas';

export interface MacroPoint {
  t: number;
  c: number;
}

export interface MacroIndex {
  symbol: string;
  name: string;
  region: MacroRegion;
  country: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  points: MacroPoint[];
  available: boolean;
}

export interface MacroResponse {
  period: MacroPeriod;
  updatedAt: string;
  source: string;
  stale?: boolean;
  indices: MacroIndex[];
}

export class PremiumRequiredError extends Error {
  constructor() {
    super('premium_required');
    this.name = 'PremiumRequiredError';
  }
}

export async function fetchMacroIndices(period: MacroPeriod): Promise<MacroResponse> {
  const res = await apiFetch(`/api/macro/indices?period=${period}`);

  if (res.status === 403) {
    throw new PremiumRequiredError();
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore malformed error responses
    }
    throw new Error(message);
  }

  return res.json() as Promise<MacroResponse>;
}
