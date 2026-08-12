import { FinancialRow, ValidationContext, ValidationResult, isNum } from './types';

const BAND_MIN = 0.2;
const BAND_MAX = 5;
const PEER_MIN = 0.02;
const PEER_MAX = 50;
const FIELDS = ['revenue', 'netIncome', 'totalAssets'] as const;

function bandCheck(
  f: (typeof FIELDS)[number],
  prev: number,
  curr: number,
  prevYear: number,
  year: number,
  out: ValidationResult[],
): void {
  const ratio = curr / prev;
  if (ratio < BAND_MIN || ratio > BAND_MAX) {
    out.push({
      rule: 'yoy_band',
      severity: 'warn',
      message: `${f} ${prevYear}->${year}: x${ratio.toFixed(2)} fuera de banda [${BAND_MIN},${BAND_MAX}] (M&A u otros eventos pueden justificarlo)`,
      field: f,
      year,
    });
  }
}

export function checkRangeRules(rows: FinancialRow[], ctx: ValidationContext): ValidationResult[] {
  const out: ValidationResult[] = [];
  const annual = rows.filter((r) => (r.quarter ?? 0) === 0).sort((a, b) => a.year - b.year);

  for (const f of FIELDS) {
    let prev: { year: number; v: number } | null = null;
    for (const r of annual) {
      const v = r[f] as number | null;
      if (!isNum(v)) {
        prev = null;
        continue;
      }
      if (prev && Math.sign(prev.v) === Math.sign(v)) {
        bandCheck(f, Math.abs(prev.v), Math.abs(v), prev.year, r.year, out);
      }
      prev = { year: r.year, v };
    }
  }

  const rev = annual[annual.length - 1]?.revenue;
  const ta = annual[annual.length - 1]?.totalAssets;
  const peers = ctx.peers ?? {};

  if (isNum(rev) && isNum(peers.revenueMedian) && peers.revenueMedian! > 0) {
    const ratio = rev! / peers.revenueMedian!;
    if (ratio < PEER_MIN || ratio > PEER_MAX) {
      out.push({
        rule: 'peers_band',
        severity: 'warn',
        message: `revenue=${(rev! / 1e6).toFixed(0)}M vs mediana sector=${(peers.revenueMedian! / 1e6).toFixed(0)}M (x${ratio.toFixed(1)}), fuera de [${PEER_MIN},${PEER_MAX}]`,
        field: 'revenue',
        year: annual[annual.length - 1]?.year,
      });
    }
  }

  if (isNum(ta) && isNum(peers.totalAssetsMedian) && peers.totalAssetsMedian! > 0) {
    const ratio = ta! / peers.totalAssetsMedian!;
    if (ratio < PEER_MIN || ratio > PEER_MAX) {
      out.push({
        rule: 'peers_band',
        severity: 'warn',
        message: `totalAssets=${(ta! / 1e6).toFixed(0)}M vs mediana sector=${(peers.totalAssetsMedian! / 1e6).toFixed(0)}M (x${ratio.toFixed(1)}), fuera de [${PEER_MIN},${PEER_MAX}]`,
        field: 'totalAssets',
        year: annual[annual.length - 1]?.year,
      });
    }
  }

  return out;
}
