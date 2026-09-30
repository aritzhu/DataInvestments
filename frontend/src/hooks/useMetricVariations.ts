import { useCallback, useEffect, useState } from 'react';

export interface VariationPoint {
  year: number;
  quarter: number;
  periodLabel: string;
  periodEnd: string;
  roe: number | null;
  pbRatio: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roa: number | null;
  roic: number | null;
  totalDebt: number | null;
  quickRatio: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  [key: string]: unknown;
}

export interface MetricVariationsState {
  data: VariationPoint[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  at: number;
  data: VariationPoint[];
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<VariationPoint[]>>();

function fetchVariations(ticker: string): Promise<VariationPoint[]> {
  const key = ticker.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Promise.resolve(hit.data);
  }
  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }
  const request = fetch(`/api/companies/${encodeURIComponent(ticker)}/metric-variations`)
    .then((r) => {
      if (!r.ok) throw new Error(`Error ${r.status}`);
      return r.json();
    })
    .then((d: { variations?: VariationPoint[] }) => {
      const data = d.variations ?? [];
      cache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

export function invalidateMetricVariations(ticker: string): void {
  cache.delete(ticker.toUpperCase());
}

/**
 * Shares one request across every card that needs metric variations. The fundamental
 * tab mounts four consumers of the same endpoint, which previously issued four
 * identical GETs because each card held its own independent state.
 */
export function useMetricVariations(ticker: string): MetricVariationsState {
  const [data, setData] = useState<VariationPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    fetchVariations(ticker)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error de red');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, nonce]);

  const reload = useCallback(() => {
    invalidateMetricVariations(ticker);
    setNonce((n) => n + 1);
  }, [ticker]);

  return { data, loading, error, reload };
}
