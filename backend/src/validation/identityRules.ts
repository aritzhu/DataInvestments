import { FinancialRow, ValidationResult, isNum } from './types';

const FINANCIAL_SECTOR = /bank|financ|insur|seguro|banco/i;

function isFinancial(sector: string | null): boolean {
  return !!sector && FINANCIAL_SECTOR.test(sector);
}

export function checkIdentityRules(rows: FinancialRow[], sector: string | null): ValidationResult[] {
  const out: ValidationResult[] = [];
  const annual = rows.filter((r) => (r.quarter ?? 0) === 0).sort((a, b) => a.year - b.year);
  const financial = isFinancial(sector);

  for (const r of annual) {
    const { year } = r;

    if (isNum(r.totalAssets)) {
      const A = r.totalAssets!;
      if (A > 10_000_000) {
        const residual = A - (r.totalLiabilities ?? 0) - (r.totalEquity ?? 0);
        const ratio = Math.abs(residual) / A;
        let sev: ValidationResult['severity'] | null = null;
        if (financial) {
          if (ratio > 0.30) sev = 'error';
          else if (ratio > 0.05) sev = 'warn';
        } else {
          if (ratio > 0.03) sev = 'error';
          else if (ratio > 0.01) sev = 'warn';
        }
        if (sev) {
          out.push({
            rule: 'bs_identity',
            severity: sev,
            message: `A-L-E=${(residual / 1e6).toFixed(0)}M (${(ratio * 100).toFixed(1)}% de A${financial ? ', sector financiero: minoritarios' : ''})`,
            field: 'totalAssets',
            year,
          });
        }
      }
    }

    if (isNum(r.revenue) && isNum(r.costOfRevenue) && isNum(r.grossProfit) && !financial) {
      const expected = r.revenue! - r.costOfRevenue!;
      const ratio = Math.abs(r.grossProfit! - expected) / Math.max(Math.abs(r.revenue!), 1);
      let sev: ValidationResult['severity'] | null = null;
      if (ratio > 0.05) sev = 'error';
      else if (ratio > 0.01) sev = 'warn';
      if (sev) {
        out.push({
          rule: 'gp_identity',
          severity: sev,
          message: `grossProfit=${(r.grossProfit! / 1e6).toFixed(0)}M vs rev-COGS=${(expected / 1e6).toFixed(0)}M`,
          field: 'grossProfit',
          year,
        });
      }
    }

    if (isNum(r.ebitda) && isNum(r.ebit) && isNum(r.depreciation)) {
      const expected = r.ebit! + r.depreciation!;
      const ratio = Math.abs(r.ebitda! - expected) / Math.max(Math.abs(r.ebitda!), 1);
      let sev: ValidationResult['severity'] | null = null;
      if (ratio > 0.25) sev = 'error';
      else if (ratio > 0.10) sev = 'warn';
      if (sev) {
        out.push({
          rule: 'ebitda_identity',
          severity: sev,
          message: `ebitda=${(r.ebitda! / 1e6).toFixed(0)}M vs ebit+dep=${(expected / 1e6).toFixed(0)}M`,
          field: 'ebitda',
          year,
        });
      }
    }

    if (isNum(r.freeCashFlow) && isNum(r.operatingCashFlow) && isNum(r.capex)) {
      const expected = r.operatingCashFlow! - r.capex!;
      const ratio = Math.abs(r.freeCashFlow! - expected) / Math.max(Math.abs(r.freeCashFlow!), 1);
      let sev: ValidationResult['severity'] | null = null;
      if (ratio > 0.20) sev = 'error';
      else if (ratio > 0.05) sev = 'warn';
      if (sev) {
        out.push({
          rule: 'fcf_identity',
          severity: sev,
          message: `fcf=${(r.freeCashFlow! / 1e6).toFixed(0)}M vs ocf-capex=${(expected / 1e6).toFixed(0)}M`,
          field: 'freeCashFlow',
          year,
        });
      }
    }
  }

  return out;
}
