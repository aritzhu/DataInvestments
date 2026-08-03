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
  'operatingCashFlow', 'capex', 'totalEquity',
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
      await prisma.stockMetric.update({ where: { id: stock.id }, data: stockUpdates });
      applied += Object.keys(stockUpdates).length;
      console.log(`[Override] ${ticker}: StockMetric ${Object.keys(stockUpdates).join(', ')}`);
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
    const fd = await prisma.financialData.findFirst({
      where: { companyId },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });
    if (fd) {
      await prisma.financialData.update({ where: { id: fd.id }, data: financialUpdates });
      applied += Object.keys(financialUpdates).length;
      console.log(`[Override] ${ticker}: FinancialData ${Object.keys(financialUpdates).join(', ')}`);
    }
  }

  return applied;
}
