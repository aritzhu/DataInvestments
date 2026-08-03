import prisma from '../infrastructure/prisma/client';
import { getRecommendedModel } from '../services/valuationService';

// Per-company data-quality audit focused on the inputs the recommended
// valuation model needs. Exits non-zero when critical issues are found so it
// can be used as a gate (CI / post-deploy).
const MODEL_INPUTS: Record<string, { fd?: string[]; bs?: string[]; sm?: string[]; fdFallback?: { ocf: string; capex: string } }> = {
  dcf: { fd: ['freeCashFlow'], sm: ['sharesOutstanding'], fdFallback: { ocf: 'operatingCashFlow', capex: 'capex' } },
  per: { fd: ['netIncome'], sm: ['sharesOutstanding'] },
  pb: { bs: ['totalStockholdersEquity'], sm: ['sharesOutstanding'] },
  ps: { fd: ['revenue'], sm: ['sharesOutstanding'] },
  ev_ebitda: { fd: ['ebitda'], bs: ['longTermDebt', 'cashAndCashEquivalents'], sm: ['sharesOutstanding'] },
  ev_ebit: { fd: ['ebit'], bs: ['longTermDebt', 'cashAndCashEquivalents'], sm: ['sharesOutstanding'] },
  ddm: { fd: ['dividendsPaid'], sm: ['sharesOutstanding'] },
  fcf_yield: { fd: ['freeCashFlow'], sm: ['sharesOutstanding'] },
};

function latest<T extends { year: number; quarter?: number | null }>(arr: T[]): T | undefined {
  return [...arr].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.quarter ?? 0) - (a.quarter ?? 0);
  })[0];
}

function latestAnnual<T extends { year: number; quarter?: number | null }>(arr: T[]): T | undefined {
  return [...arr.filter((x) => (x.quarter ?? 0) === 0)].sort((a, b) => b.year - a.year)[0];
}

// Reads a model-input field preferring the most recent row, falling back to the
// latest annual (quarter=0) row — mirrors the TTM/annual-fill used by the
// valuation service, since Yahoo quarterly rows often leave these null.
function fieldVal<T extends { year: number; quarter?: number | null }>(rows: T[], f: keyof T, skipZero = true): number | null {
  const tryRow = (r: T | undefined): number | null => {
    if (!r) return null;
    const v = (r[f] as number | null);
    if (v == null) return null;
    if (skipZero && v === 0) return null;
    return v;
  };
  return tryRow(latest(rows)) ?? tryRow(latestAnnual(rows)) ?? null;
}

function hasVal(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v !== 0;
}

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, ticker: true, sector: true, industry: true },
    orderBy: { ticker: 'asc' },
  });

  let criticalCount = 0;
  const warnings: string[] = [];

  for (const c of companies) {
    const [financials, balanceSheets, stockMetrics] = await Promise.all([
      prisma.financialData.findMany({ where: { companyId: c.id } }),
      prisma.balanceSheet.findMany({ where: { companyId: c.id } }),
      prisma.stockMetric.findMany({ where: { companyId: c.id }, orderBy: { date: 'desc' }, take: 1 }),
    ]);

    const fd = latest(financials);
    const bs = latest(balanceSheets);
    const sm = stockMetrics[0];
    const model = getRecommendedModel(c.sector, c.industry);
    const issues: string[] = [];

    if (!sm) {
      issues.push('NO_STOCK_METRIC');
    } else if (!sm.sharesOutstanding || sm.sharesOutstanding <= 0) {
      issues.push('sharesOutstanding');
    }

    if (!fd) {
      issues.push('NO_FINANCIALS');
    } else {
      if (fd.revenue === 0 && fd.netIncome === 0 && fd.ebitda == null && fd.operatingCashFlow == null) {
        issues.push('zero-filled row');
      }
      if (fd.revenue > 0 && fd.revenue < 10_000_000) {
        issues.push('revenue scale suspicious');
      }
      if (fd.revenue === 0) {
        issues.push('revenue=0');
      }
      const cfg = MODEL_INPUTS[model];
      if (cfg) {
        const missingFd = (cfg.fd ?? []).filter((f) => !hasVal(fieldVal(financials, f as any)));
        const hasFallback = cfg.fdFallback && hasVal(fieldVal(financials, cfg.fdFallback.ocf as any)) && hasVal(fieldVal(financials, cfg.fdFallback.capex as any));
        for (const f of missingFd) {
          if (!(cfg.fdFallback && f === 'freeCashFlow' && hasFallback)) issues.push(`fd.${f}`);
        }
      }
    }

    if (!bs) {
      issues.push('NO_BALANCE_SHEET');
    } else {
      const cfg = MODEL_INPUTS[model];
      if (cfg?.bs) {
        for (const f of cfg.bs) {
          // Debt/cash can legitimately be 0, so only a null value is a gap.
          if (fieldVal(balanceSheets, f as any, false) == null) issues.push(`bs.${f}`);
        }
      }
    }

    if (sm) {
      const ageDays = (Date.now() - new Date(sm.date).getTime()) / 86400000;
      if (ageDays > 3) issues.push(`price stale ${ageDays.toFixed(0)}d`);
      if (!sm.currentPrice || sm.currentPrice <= 0) issues.push('currentPrice');
      if (sm.intrinsicValue == null) issues.push('intrinsicValue=null');
    }

    const critical = issues.filter((i) => !i.startsWith('intrinsicValue=null'));
    const line = `[${c.ticker}] model=${model} issues=[${issues.join(', ')}]`;
    if (critical.length > 0) {
      criticalCount++;
      warnings.push(line);
    } else if (issues.length > 0) {
      console.log('  OK  ' + line);
    } else {
      console.log('  OK  ' + `[${c.ticker}] model=${model} sin issues`);
    }
  }

  console.log(`\nEmpresas con issues críticos: ${criticalCount}/${companies.length}`);
  for (const w of warnings) console.log('  CRIT ' + w);

  if (criticalCount > 0) {
    console.log('\nRESULTADO: FALLIDO (hay issues críticos)');
    process.exit(1);
  }
  console.log('\nRESULTADO: OK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
