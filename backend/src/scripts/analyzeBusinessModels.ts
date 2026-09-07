import prisma from '../infrastructure/prisma/client';
import {
  computeAll,
  getRecommendedFairValue,
  getSectorConfigs,
  inferBusinessModel,
  computeRoic,
  trailing12Months,
  type ValuationInput,
} from '../services/valuationService';

interface Row {
  ticker: string;
  sector: string | null;
  industry: string | null;
  model: { model: string; fairValue: number | null; businessModel?: { model: string | null; label: string; reason: string } };
  bmModel: string | null;
  fairValuePresent: boolean;
  roic: number | null;
  roe: number | null;
  ps: number | null;
  payout: number | null;
  divYield: number | null;
  beta: number | null;
  capexIntensity: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  assetTurnover: number | null;
  epsCagr: number | null;
  revenueCagr: number | null;
  revenueTtm: number;
  revenueAnnual: number | null;
  ytdWarning: boolean;
}

function group(rows: Row[], keyOf: (r: Row) => string): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of rows) map.set(keyOf(r), (map.get(keyOf(r)) ?? 0) + 1);
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

async function main() {
  const companies = await prisma.company.findMany({
    where: { active: true, stockMetrics: { some: {} } },
    select: { id: true, ticker: true, name: true, sector: true, industry: true },
    orderBy: { ticker: 'asc' },
  });

  console.log(`\n=== ANÁLISIS DE MODELOS DE NEGOCIO (${companies.length} empresas) ===\n`);

  const rows: Row[] = [];

  for (const c of companies) {
    const [financials, balanceSheets, stockMetrics] = await Promise.all([
      prisma.financialData.findMany({ where: { companyId: c.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
      prisma.balanceSheet.findMany({ where: { companyId: c.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
      prisma.stockMetric.findMany({ where: { companyId: c.id }, orderBy: { date: 'desc' }, take: 1 }),
    ]);

    const stock = stockMetrics[0] as any;
    if (!stock || financials.length === 0) continue;

    const configs = getSectorConfigs(c.sector, c.industry);
    const valInput: ValuationInput = { financials: financials as any, balanceSheets: balanceSheets as any, stock };
    const results = computeAll(valInput, configs, c.sector, c.industry);
    const recommended = getRecommendedFairValue(results, valInput, c.sector, c.industry);

    const ttm = trailing12Months(financials as any, balanceSheets as any);
    const bs = ttm?.balanceSheet;
    const revenue = ttm?.revenue ?? 0;
    const roic = computeRoic(valInput);

    const annual = [...(financials as any[])].filter((x) => (x.quarter ?? 0) === 0).sort((a, b) => b.year - a.year)[0];
    const revenueAnnual = annual?.revenue ?? null;

    const capexIntensity = revenue > 0 ? (ttm?.capex ?? 0) / revenue : null;
    const grossMargin = revenue > 0 && ttm?.grossProfit != null ? ttm.grossProfit / revenue : null;
    const netMargin = revenue > 0 ? (ttm?.netIncome ?? 0) / revenue : null;
    const assetTurnover = bs?.totalAssets != null && bs.totalAssets > 0 && revenue > 0 ? revenue / bs.totalAssets : null;

    const epsSeries = (financials as any[])
      .filter((x) => (x.quarter == null || x.quarter === 0) && typeof x.netIncome === 'number' && (x.netIncome ?? 0) > 0)
      .map((x) => ({ year: x.year, eps: (x.netIncome ?? 0) / (stock.sharesOutstanding ?? 0) }))
      .filter((e) => e.eps > 0)
      .sort((a, b) => b.year - a.year);
    const epsCagr = epsCagrOf(epsSeries, 5);

    const revSeries = (financials as any[])
      .filter((x) => (x.quarter == null || x.quarter === 0) && (x.revenue ?? 0) > 0)
      .sort((a, b) => a.year - b.year);
    let revenueCagr: number | null = null;
    if (revSeries.length >= 2) {
      const last = revSeries[revSeries.length - 1];
      const target = revSeries.find((x) => x.year === last.year - 5) ?? revSeries[0];
      const span = last.year - target.year;
      if (span > 0 && target.revenue! > 0) revenueCagr = Math.pow(last.revenue! / target.revenue!, 1 / span) - 1;
    }

    const ytdWarning = Boolean(revenueAnnual != null && revenueAnnual > 0 && ttm?.isTTM && revenue > revenueAnnual * 1.25);

    const bm = recommended.businessModel?.model ?? null;

    rows.push({
      ticker: c.ticker,
      sector: c.sector,
      industry: c.industry,
      model: recommended,
      bmModel: bm,
      fairValuePresent: recommended.fairValue != null,
      roic,
      roe: stock.roe ?? null,
      ps: stock.psRatio ?? null,
      payout: stock.payoutRatio ?? null,
      divYield: stock.dividendYield ?? null,
      beta: stock.beta ?? null,
      capexIntensity,
      grossMargin,
      netMargin,
      assetTurnover,
      epsCagr,
      revenueCagr,
      revenueTtm: revenue,
      revenueAnnual,
      ytdWarning,
    });
  }

  const bmRows = rows.filter((r) => r.bmModel != null);
  const noBm = rows.filter((r) => r.bmModel == null);

  console.log(`Modelo de negocio:`);
  for (const g of group(rows, (r) => r.bmModel ?? 'No determinado')) console.log(`  ${g.key.padEnd(16)} ${g.count}`);
  console.log(`\nMétodo recomendado:`);
  for (const g of group(rows, (r) => r.model.model)) console.log(`  ${g.key.padEnd(12)} ${g.count}`);

  console.log(`\nCobertura de datos (n=${rows.length}):`);
  const cnt = (pred: (r: Row) => boolean) => rows.filter(pred).length;
  console.log(`  roic  calculado: ${cnt((r) => r.roic != null)} / ${rows.length}`);
  console.log(`  roe   presente : ${cnt((r) => r.roe != null)} / ${rows.length}`);
  console.log(`  capex intensidad: ${cnt((r) => r.capexIntensity != null)} / ${rows.length}`);
  console.log(`  grossMargin  : ${cnt((r) => r.grossMargin != null)} / ${rows.length}`);
  console.log(`  assetTurnover: ${cnt((r) => r.assetTurnover != null)} / ${rows.length}`);
  console.log(`  divYield     : ${cnt((r) => r.divYield != null)} / ${rows.length}`);
  console.log(`  epsCagr      : ${cnt((r) => r.epsCagr != null)} / ${rows.length}`);
  console.log(`  sin fv recomendado: ${cnt((r) => !r.fairValuePresent)}`);

  console.log(`\nWarnings YTD (TTM > 1.25× anual): ${cnt((r) => r.ytdWarning)}`);
  for (const r of rows.filter((x) => x.ytdWarning)) {
    console.log(`  ${r.ticker} TTM=${Math.round(r.revenueTtm / 1e6)}M anual=${r.revenueAnnual != null ? Math.round(r.revenueAnnual / 1e6) + 'M' : '—'} bm=${r.bmModel ?? 'null'}`);
  }

  console.log(`\nEmpresas 'No determinado' (${noBm.length}):`);
  for (const r of noBm) {
    console.log(
      `  ${r.ticker.padEnd(6)} ${r.model.model.padEnd(10)} gm=${r.grossMargin != null ? (r.grossMargin * 100).toFixed(0) + '%' : '—'} nm=${r.netMargin != null ? (r.netMargin * 100).toFixed(0) + '%' : '—'} capex=${r.capexIntensity != null ? (r.capexIntensity * 100).toFixed(0) + '%' : '—'} roic=${r.roic != null ? (r.roic * 100).toFixed(0) + '%' : '—'} ps=${r.ps?.toFixed(1) ?? '—'} yld=${r.divYield != null ? (r.divYield * 100).toFixed(1) + '%' : '—'} payout=${r.payout?.toFixed(2) ?? '—'} beta=${r.beta?.toFixed(2) ?? '—'} epsCagr=${r.epsCagr != null ? (r.epsCagr * 100).toFixed(0) + '%' : '—'} revCagr=${r.revenueCagr != null ? (r.revenueCagr * 100).toFixed(0) + '%' : '—'} turn=${r.assetTurnover?.toFixed(2) ?? '—'} fv=${r.fairValuePresent ? 'yes' : 'NO'}`,
    );
  }

  console.log(`\nEmpresas con modelo (${bmRows.length}):`);
  for (const r of rows.filter((x) => x.bmModel != null).sort((a, b) => (a.bmModel ?? '').localeCompare(b.bmModel ?? ''))) {
    console.log(`  ${r.ticker.padEnd(6)} ${r.model.model.padEnd(10)} ${(r.bmModel ?? '').padEnd(12)} ${r.model.businessModel?.reason ?? ''}`);
  }
}

function epsCagrOf(rows: Array<{ year: number; eps: number }>, yearsBack: number): number | null {
  if (rows.length < 2) return null;
  const last = rows[0];
  const target = rows.find((r) => r.year === last.year - yearsBack) ?? rows[rows.length - 1];
  const span = last.year - target.year;
  if (span <= 0 || target.eps <= 0 || last.eps <= 0) return null;
  return Math.pow(last.eps / target.eps, 1 / span) - 1;
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());