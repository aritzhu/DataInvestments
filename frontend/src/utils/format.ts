/** Shared formatting utilities for all views */

/** Format a large number with $ prefix and T/B/M suffix */
export function formatNum(n: number | null | undefined): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return n.toLocaleString();
}

/** Format a large number without $ prefix */
export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return n.toLocaleString();
}

/** Format a decimal ratio as percentage (0.15 → "15.0%") */
export function formatPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

/** Format a division as percentage (a/b → "xx.x%") */
export function pctOf(a: number, b: number): string {
  if (b === 0) return '—';
  return `${((a / b) * 100).toFixed(1)}%`;
}

/** Format value as USD currency with up to 2 decimals */
export function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—';
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Format a raw number with optional decimals (no prefix) */
export function fmtPlain(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/** Format a number with minus sign for negatives */
export function fmtSigned(n: number | null | undefined): string {
  if (n == null) return '—';
  const prefix = n < 0 ? '−' : '';
  return `${prefix}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

/** Format Euro currency */
export function fmtEuro(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—';
  return `${n.toLocaleString(undefined, { maximumFractionDigits: decimals })} €`;
}

/** Format Euro with $ prefix for AnimatedNumber compatibility */
export function fmtEuroAnimated(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} €`;
}

/** Safe division guard */
export function safeDiv(a: number, b: number): number | null {
  if (!b || b === 0) return null;
  return a / b;
}
