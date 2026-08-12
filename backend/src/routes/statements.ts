import { Router, type Router as ExpressRouter } from 'express';
import { requireAdmin } from '../middleware/auth';
import prisma from '../infrastructure/prisma/client';
import { recomputeIntrinsic } from '../services/refreshQuotes';

const router: ExpressRouter = Router();

router.use(requireAdmin);

const FINANCIAL_FIELDS = [
  'year', 'quarter',
  'revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses',
  'sgaExpense', 'rdExpense', 'interestExpense', 'taxExpense',
  'ebitda', 'ebit', 'capex', 'depreciation',
  'operatingCashFlow', 'investingCashFlow', 'financingCashFlow', 'freeCashFlow',
  'dividendsPaid', 'shareRepurchases',
  'totalAssets', 'totalLiabilities', 'totalEquity', 'netIncome',
] as const;

const BALANCE_FIELDS = [
  'year', 'quarter',
  'cashAndCashEquivalents', 'shortTermInvestments', 'accountsReceivable', 'inventory',
  'totalCurrentAssets', 'propertyPlantEquipment', 'goodwill', 'intangibleAssets',
  'totalNonCurrentAssets', 'totalAssets', 'accountsPayable', 'shortTermDebt',
  'totalCurrentLiabilities', 'longTermDebt', 'totalNonCurrentLiabilities',
  'totalLiabilities', 'totalStockholdersEquity', 'retainedEarnings', 'treasuryStock',
] as const;

function pickNumber(fields: readonly string[], body: Record<string, unknown>): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const f of fields) {
    if (f === 'year' || f === 'quarter') continue;
    if (!(f in body)) continue;
    const v = body[f];
    if (v === null || v === undefined || v === '') {
      out[f] = null;
      continue;
    }
    const n = Number(v);
    out[f] = Number.isFinite(n) ? n : null;
  }
  return out;
}

function pickInt(body: Record<string, unknown>, key: string): number | null {
  const v = body[key];
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

// GET /api/admin/statements/companies/:ticker — all statements for a company
router.get('/companies/:ticker', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { ticker: req.params.ticker.toUpperCase() } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const [financials, balanceSheets] = await Promise.all([
      prisma.financialData.findMany({
        where: { companyId: company.id },
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      }),
      prisma.balanceSheet.findMany({
        where: { companyId: company.id },
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      }),
    ]);
    res.json({ company, financials, balanceSheets });
  } catch (error) {
    console.error('[Statements] Error fetching:', error);
    res.status(500).json({ error: 'Error fetching statements' });
  }
});

// POST /api/admin/statements/financial — create a FinancialData row (manual)
router.post('/financial', async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { companyId } = body as { companyId?: string };
    const year = pickInt(body, 'year');
    const quarter = pickInt(body, 'quarter');
    if (!companyId || year == null) {
      res.status(400).json({ error: 'companyId and year are required' });
      return;
    }

    const exists = await prisma.financialData.findUnique({
      where: { companyId_year_quarter: { companyId, year, quarter: quarter ?? 0 } },
    });
    if (exists) {
      res.status(409).json({ error: 'Ya existe una fila para ese año/trimestre' });
      return;
    }

    const numeric = pickNumber(FINANCIAL_FIELDS, body);
    const row = await prisma.financialData.create({
      data: {
        companyId,
        year,
        quarter: quarter ?? 0,
        source: 'manual',
        ...numeric,
      },
    });
    res.status(201).json({ row });
  } catch (error) {
    console.error('[Statements] Error creating financial:', error);
    res.status(500).json({ error: 'Error creating financial row' });
  }
});

// PUT /api/admin/statements/financial/:id — edit a FinancialData row (marks manual)
router.put('/financial/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const existing = await prisma.financialData.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Row not found' });
      return;
    }
    const data = pickNumber(FINANCIAL_FIELDS, body);
    const year = pickInt(body, 'year');
    const quarter = pickInt(body, 'quarter');
    const row = await prisma.financialData.update({
      where: { id },
      data: {
        ...data,
        ...(year != null ? { year } : {}),
        ...(quarter != null ? { quarter } : {}),
        source: 'manual',
      },
    });
    res.json({ row });
  } catch (error) {
    console.error('[Statements] Error updating financial:', error);
    res.status(500).json({ error: 'Error updating financial row' });
  }
});

// DELETE /api/admin/statements/financial/:id
router.delete('/financial/:id', async (req, res) => {
  try {
    await prisma.financialData.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting financial row' });
  }
});

// POST /api/admin/statements/balance — create a BalanceSheet row (manual)
router.post('/balance', async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { companyId } = body as { companyId?: string };
    const year = pickInt(body, 'year');
    const quarter = pickInt(body, 'quarter');
    if (!companyId || year == null) {
      res.status(400).json({ error: 'companyId and year are required' });
      return;
    }

    const exists = await prisma.balanceSheet.findUnique({
      where: { companyId_year_quarter: { companyId, year, quarter: quarter ?? 0 } },
    });
    if (exists) {
      res.status(409).json({ error: 'Ya existe una fila para ese año/trimestre' });
      return;
    }

    const row = await prisma.balanceSheet.create({
      data: {
        companyId,
        year,
        quarter: quarter ?? 0,
        source: 'manual',
        ...pickNumber(BALANCE_FIELDS, body),
      },
    });
    res.status(201).json({ row });
  } catch (error) {
    console.error('[Statements] Error creating balance:', error);
    res.status(500).json({ error: 'Error creating balance row' });
  }
});

// PUT /api/admin/statements/balance/:id — edit a BalanceSheet row (marks manual)
router.put('/balance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const existing = await prisma.balanceSheet.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Row not found' });
      return;
    }
    const data = pickNumber(BALANCE_FIELDS, body);
    const year = pickInt(body, 'year');
    const quarter = pickInt(body, 'quarter');
    const row = await prisma.balanceSheet.update({
      where: { id },
      data: {
        ...data,
        ...(year != null ? { year } : {}),
        ...(quarter != null ? { quarter } : {}),
        source: 'manual',
      },
    });
    res.json({ row });
  } catch (error) {
    console.error('[Statements] Error updating balance:', error);
    res.status(500).json({ error: 'Error updating balance row' });
  }
});

// DELETE /api/admin/statements/balance/:id
router.delete('/balance/:id', async (req, res) => {
  try {
    await prisma.balanceSheet.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting balance row' });
  }
});

// POST /api/admin/statements/recompute/:ticker — recompute stored valuation
router.post('/recompute/:ticker', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { ticker: req.params.ticker.toUpperCase() } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    await recomputeIntrinsic(company.id, company.ticker, company.sector, company.industry);
    res.json({ success: true });
  } catch (error) {
    console.error('[Statements] Error recomputing:', error);
    res.status(500).json({ error: 'Error recomputing valuation' });
  }
});

export default router;
