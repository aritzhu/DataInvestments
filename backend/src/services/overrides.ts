import prisma from '../infrastructure/prisma/client';

// Fields that live on StockMetric (ratio/share/price snapshot).
const STOCK_FIELDS = new Set([
  'sharesOutstanding', 'currentPrice', 'marketCap', 'enterpriseValue',
  'peRatio', 'pbRatio', 'psRatio', 'dividendYield', 'roe', 'roa',
  'currentRatio', 'debtToEquity',
]);

// Fields that live on BalanceSheet.
const BALANCE_FIELDS = new Set([
  'longTermDebt', 'shortTermDebt', 'cashAndCashEquivalents', 'totalAssets',
  'totalLiabilities', 'totalStockholdersEquity',
]);

// Fields that live on FinancialData (annual rows, quarter=0).
const FINANCIAL_FIELDS = new Set([
  'revenue', 'netIncome', 'ebitda', 'ebit', 'freeCashFlow',
  'operatingCashFlow', 'capex', 'totalEquity', 'dividendsPaid',
  'shareRepurchases',
]);

export async function getActiveOverrides(companyId: string) {
  return prisma.companyOverride.findMany({
    where: { companyId, active: true },
  });
}

// Applies a company's overrides on top of whatever a sync just wrote.
// Numeric fields map to the matching StockMetric / BalanceSheet /
// FinancialData (annual) columns; valueString fields are skipped for storage
// (they serve documentation purposes or non-numeric config).
export async function applyCompanyOverrides(ticker: string, companyId: string): Promise<number> {
  const overrides = await getActiveOverrides(companyId);
  if (overrides.length === 0) return 0;

  let applied = 0;

  const numeric = overrides.filter((o) => o.value != null);
  const stockUpdates: Record<string, number> = {};
  const balanceUpdates: Record<string, number> = {};
  const financialUpdates: Record<string, number> = {};

  for (const o of numeric) {
    if (o.value == null) continue;
    if (STOCK_FIELDS.has(o.field)) stockUpdates[o.field] = o.value;
    else if (BALANCE_FIELDS.has(o.field)) balanceUpdates[o.field] = o.value;
    else if (FINANCIAL_FIELDS.has(o.field)) financialUpdates[o.field] = o.value;
  }

  if (Object.keys(stockUpdates).length > 0) {
    const stock = await prisma.stockMetric.findFirst({
      where: { companyId },
      orderBy: { date: 'desc' },
    });
    if (stock) {
      const data: Record<string, number> = { ...stockUpdates };
      // Keep market cap consistent with overridden shares/price so valuation
      // engines (sharesOf implied-shares guard) don't diverge from the fix.
      if ('sharesOutstanding' in data && stock.currentPrice > 0) {
        data.marketCap = stock.currentPrice * data.sharesOutstanding;
      } else if ('currentPrice' in data && data.currentPrice > 0 && (stock.sharesOutstanding ?? 0) > 0) {
        data.marketCap = data.currentPrice * (stock.sharesOutstanding ?? 0);
      }
      await prisma.stockMetric.update({ where: { id: stock.id }, data });
      applied += Object.keys(data).length;
      console.log(`[Override] ${ticker}: StockMetric ${Object.keys(data).join(', ')}`);
    }
  }

  if (Object.keys(balanceUpdates).length > 0) {
    const bs = await prisma.balanceSheet.findFirst({
      where: { companyId },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });
    if (bs) {
      await prisma.balanceSheet.update({ where: { id: bs.id }, data: balanceUpdates });
      applied += Object.keys(balanceUpdates).length;
      console.log(`[Override] ${ticker}: BalanceSheet ${Object.keys(balanceUpdates).join(', ')}`);
    }
  }

  if (Object.keys(financialUpdates).length > 0) {
    // Financial fields are period totals (annual/quarter rows). Apply them to
    // the latest annual (quarter=0) row so period-based valuations (TTM fallback,
    // DDM, ratios) pick them up regardless of the freshest quarterly row.
    const fd = await prisma.financialData.findFirst({
      where: { companyId, quarter: 0 },
      orderBy: { year: 'desc' },
    });
    if (fd) {
      await prisma.financialData.update({ where: { id: fd.id }, data: financialUpdates });
      applied += Object.keys(financialUpdates).length;
      console.log(`[Override] ${ticker}: FinancialData ${Object.keys(financialUpdates).join(', ')}`);
    }
  }

  return applied;
}
