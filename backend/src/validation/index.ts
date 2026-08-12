import {
  FinancialRow,
  Severity,
  StockRow,
  ValidationContext,
  ValidationResult,
} from './types';
import { checkIdentityRules } from './identityRules';
import { checkUnitRules } from './unitRules';
import { checkRangeRules } from './rangeRules';
import { checkSharesRules } from './sharesRules';

export type { FinancialRow, StockRow, ValidationContext, ValidationResult, Severity };
export { checkIdentityRules, checkUnitRules, checkRangeRules, checkSharesRules };

export interface CompanyVerdict {
  results: ValidationResult[];
  severity: Severity;
  errors: ValidationResult[];
  warnings: ValidationResult[];
}

export function latestAnnual(rows: FinancialRow[]): FinancialRow | undefined {
  return rows.filter((r) => (r.quarter ?? 0) === 0).sort((a, b) => b.year - a.year)[0];
}

export function validateCompany(
  financials: FinancialRow[],
  stock: StockRow | null,
  ctx: ValidationContext,
): CompanyVerdict {
  const results: ValidationResult[] = [
    ...checkIdentityRules(financials, ctx.sector),
    ...checkUnitRules(financials, ctx.sector),
    ...checkRangeRules(financials, ctx),
  ];
  if (stock) {
    results.push(...checkSharesRules(stock, latestAnnual(financials)?.revenue ?? null));
  }
  const errors = results.filter((r) => r.severity === 'error');
  const warnings = results.filter((r) => r.severity === 'warn');
  return {
    results,
    severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warn' : 'ok',
    errors,
    warnings,
  };
}

export function worstSeverity(a: Severity, b: Severity): Severity {
  const rank: Record<Severity, number> = { ok: 0, warn: 1, error: 2 };
  return rank[a] >= rank[b] ? a : b;
}
