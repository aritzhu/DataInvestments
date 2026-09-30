import { useCallback, useEffect, useState } from 'react';

export type SiteSettings = Record<string, string | null>;

export interface SiteSettingsState {
  settings: SiteSettings | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const TTL_MS = 5 * 60 * 1000;

let cache: { at: number; data: SiteSettings } | null = null;
let inFlight: Promise<SiteSettings> | null = null;

function fetchSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return Promise.resolve(cache.data);
  }
  if (inFlight) {
    return inFlight;
  }
  inFlight = fetch('/api/settings')
    .then((r) => {
      if (!r.ok) throw new Error(`Error ${r.status}`);
      return r.json();
    })
    .then((data: SiteSettings) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Drops the cached copy so the next read goes to the server. Call after an admin PUT. */
export function invalidateSiteSettings(): void {
  cache = null;
}

/**
 * Single shared read of the site settings blob. This endpoint was previously fetched
 * independently from eight call sites, so every page load issued at least two
 * concurrent requests (App-level analytics init plus the Navbar) to read one field.
 */
export function useSiteSettings(): SiteSettingsState {
  const [settings, setSettings] = useState<SiteSettings | null>(cache?.data ?? null);
  const [loading, setLoading] = useState(cache == null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
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
  }, [nonce]);

  const reload = useCallback(() => {
    invalidateSiteSettings();
    setNonce((n) => n + 1);
  }, []);

  return { settings, loading, error, reload };
}
