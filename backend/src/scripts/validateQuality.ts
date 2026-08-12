import prisma from '../infrastructure/prisma/client';
import { FinancialRow, StockRow, validateCompany } from '../validation';
import { Severity, ValidationResult } from '../validation/types';

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v !== 0 ? v : null;
}

function toFinancialRow(r: any): FinancialRow {
  return {
    year: r.year,
    quarter: r.quarter,
    revenue: num(r.revenue),
    costOfRevenue: num(r.costOfRevenue),
    grossProfit: num(r.grossProfit),
    ebitda: num(r.ebitda),
    ebit: num(r.ebit),
    depreciation: num(r.depreciation),
    operatingCashFlow: num(r.operatingCashFlow),
    capex: num(r.capex),
    freeCashFlow: num(r.freeCashFlow),
    totalAssets: num(r.totalAssets),
    totalLiabilities: num(r.totalLiabilities),
    totalEquity: num(r.totalEquity),
    netIncome: num(r.netIncome),
  };
}

function toStockRow(s: any | null): StockRow | null {
  if (!s) return null;
  return {
    sharesOutstanding: num(s.sharesOutstanding),
    currentPrice: num(s.currentPrice),
    marketCap: num(s.marketCap),
  };
}

function median(vals: number[]): number {
  if (vals.length === 0) return NaN;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, ticker: true, sector: true },
    orderBy: { ticker: 'asc' },
  });

  const allFd = await prisma.financialData.findMany();
  const allSm = await prisma.stockMetric.findMany({ orderBy: { date: 'desc' } });
  const byCompany = new Map<string, FinancialRow[]>();
  for (const r of allFd) {
    const arr = byCompany.get(r.companyId) ?? [];
    arr.push(toFinancialRow(r));
    byCompany.set(r.companyId, arr);
  }
  const latestSm = new Map<string, any>();
  for (const s of allSm) {
    if (!latestSm.has(s.companyId)) latestSm.set(s.companyId, s);
  }

  const sectorRevs = new Map<string, number[]>();
  for (const c of companies) {
    const rows = byCompany.get(c.id) ?? [];
    const latest = [...rows].sort((a, b) => b.year - a.year)[0];
    if (latest?.revenue && c.sector) {
      const arr = sectorRevs.get(c.sector) ?? [];
      arr.push(latest.revenue);
      sectorRevs.set(c.sector, arr);
    }
  }
  const sectorMedianRev = new Map<string, number>();
  for (const [s, vals] of sectorRevs) sectorMedianRev.set(s, median(vals));

  const ruleCounts: Record<string, Record<Severity, number>> = {};
  const companyLines: string[] = [];
  let nError = 0;
  let nWarn = 0;
  let nOk = 0;

  const bump = (rule: string, sev: Severity) => {
    const rec = (ruleCounts[rule] ??= { ok: 0, warn: 0, error: 0 });
    rec[sev] += 1;
  };

  for (const c of companies) {
    const rows = byCompany.get(c.id) ?? [];
    const sm = latestSm.get(c.id) ?? null;
    const verdict = validateCompany(rows, toStockRow(sm), {
      sector: c.sector,
      peers: c.sector ? { revenueMedian: sectorMedianRev.get(c.sector) } : {},
    });
    const details = verdict.results
      .filter((r) => r.severity !== 'ok')
      .map((r) => `${r.severity}:${r.rule}${r.year ? `[${r.year}]` : ''} ${r.message}`)
      .join(' | ');
    companyLines.push(`[${c.ticker}] ${verdict.severity.toUpperCase()} (${verdict.errors.length}E/${verdict.warnings.length}W)${details ? '  ' + details : ''}`);
    if (verdict.severity === 'error') nError++;
    else if (verdict.severity === 'warn') nWarn++;
    else nOk++;
    for (const r of verdict.results) bump(r.rule, r.severity);
  }

  console.log('=== VALIDACIÓN DE CALIDAD DE DATOS ===');
  console.log(`Empresas: ${nOk} OK / ${nWarn} WARN / ${nError} ERROR\n`);
  for (const l of companyLines) console.log(l);
  console.log('\n=== RESUMEN POR REGLA ===');
  for (const [rule, rec] of Object.entries(ruleCounts).sort()) {
    if (rec.error || rec.warn) console.log(`  ${rule}: ${rec.error} error / ${rec.warn} warn / ${rec.ok} ok`);
  }
  console.log(`\nTOTAL: ${nError} empresas con ERROR, ${nWarn} con WARN`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
