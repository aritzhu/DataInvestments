import { FinancialRow, ValidationResult, isNum } from './types';

const FINANCIAL_SECTOR = /bank|financ|insur|seguro|banco/i;

// Catches scale errors (e.g. a value stored in millions vs units, the x1000/x1e6
// class of bugs): consecutive annual values differing by a factor outside
// [0.05, 20] are flagged as possible unit jumps. Operating cash flow is excluded
// for financial companies, where it is structurally volatile and meaningless.
export function checkUnitRules(rows: FinancialRow[], sector: string | null = null): ValidationResult[] {
  const financial = !!sector && FINANCIAL_SECTOR.test(sector);
  const fields = ['revenue', 'netIncome', 'totalAssets', ...(financial ? [] : ['operatingCashFlow'] as const)] as const;
  const out: ValidationResult[] = [];
  const annual = rows.filter((r) => (r.quarter ?? 0) === 0).sort((a, b) => a.year - b.year);

  for (const f of fields) {
    let prev: { year: number; v: number } | null = null;
    for (const r of annual) {
      const v = r[f] as number | null;
      if (!isNum(v)) {
        prev = null;
        continue;
      }
      if (prev && Math.sign(prev.v) === Math.sign(v)) {
        const ratio = Math.abs(v) / Math.abs(prev.v);
        if (ratio > 20 || ratio < 0.05) {
          out.push({
            rule: 'unit_jump',
            severity: 'error',
            message: `${f} ${prev.year}->${r.year}: ${(prev.v / 1e6).toFixed(0)}M -> ${(v / 1e6).toFixed(0)}M (x${ratio.toFixed(1)}), posible error de unidades`,
            field: f,
            year: r.year,
          });
        }
      }
      prev = { year: r.year, v };
    }
  }

  return out;
}
