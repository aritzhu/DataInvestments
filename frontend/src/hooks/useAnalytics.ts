import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function initGA(measurementId: string) {
  if (typeof document === 'undefined') return;
  if (document.getElementById('ga-script')) return;

  const win = window as any;
  win.dataLayer = win.dataLayer || [];
  win.gtag = function () { win.dataLayer.push(arguments); };
  win.gtag('js', new Date());
  win.gtag('config', measurementId, { anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.id = 'ga-script';
  document.head.appendChild(script);
}

export function trackEvent(action: string, params?: Record<string, unknown>) {
  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', action, params);
  }

  try {
    fetch(`${API_BASE}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: action,
        page: window.location.pathname,
        params: params ? JSON.stringify(params) : null,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    trackEvent('page_view');
  }, [location.pathname]);
}

export function useInitAnalytics() {
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        const id = data.analytics_id;
        if (id && typeof id === 'string' && id.startsWith('G-')) {
          initGA(id);
        }
      })
      .catch(() => {});
  }, []);
}
