import { Router, type Router as ExpressRouter } from 'express';
import { addCompanyFromTicker, syncCompanyData, bulkImportCompanies, getSP500StockList, batchResyncCompanies } from '../services/dataAggregator';
import prisma from '../infrastructure/prisma/client';
import { buildCoverageReport } from '../services/coverageReporter';
import { buildComprehensiveYearReport, getImportTimeline } from '../services/adminReporting';
import { TICKER_SECTORS } from '../data/sectors';
import { SP500_SECTORS } from '../data/sp500';
import { STOXX600_UNIQUE_TICKERS } from '../data/europeanTickers/stoxx600';
import { STOXX_SECTOR_INDUSTRY, resolveCompanyMeta } from '../services/companyMeta';
import { EUROPEAN_INDICES } from '../data/europeanTickers';
import { requireAdmin } from '../middleware/auth';
import { getRecommendedModel } from '../services/valuationService';
import { parsePagination, paginate } from '../utils/pagination';

const router: ExpressRouter = Router();

router.use(requireAdmin);

// GET /api/admin/companies — list companies with sync status (paginated)
router.get('/companies', async (req, res) => {
  try {
    const { search } = req.query as Record<string, string>;
    const { page, pageSize, skip, take } = parsePagination(req.query, 50);
    const where: any = {};

    if (search && search.trim() !== '') {
      where.OR = [
        { ticker: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { sector: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, grandTotal, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.count(),
      prisma.company.findMany({
        where,
        include: {
          dataSync: true,
          _count: { select: { financialData: true, stockMetrics: true } },
        },
        orderBy: { ticker: 'asc' },
        skip,
        take,
      }),
    ]);

    res.json({
      ...paginate({
        data: companies.map((c) => ({
          id: c.id,
          ticker: c.ticker,
          name: c.name,
          sector: c.sector,
          industry: c.industry,
          cik: c.cik,
          createdAt: c.createdAt,
          financialRecords: c._count.financialData,
          stockRecords: c._count.stockMetrics,
          sync: c.dataSync
            ? {
                lastSyncAt: c.dataSync.lastSyncAt,
                yearsFetched: c.dataSync.yearsFetched,
                secSync: c.dataSync.secSync,
                finnhubSync: c.dataSync.finnhubSync,
                errorMessage: c.dataSync.errorMessage,
              }
            : null,
        })),
        total,
        page,
        pageSize,
      }),
      grandTotal,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching companies' });
  }
});

// POST /api/admin/companies — add company by ticker + auto-sync
router.post('/companies', async (req, res) => {
  try {
    const { ticker, years = 5 } = req.body;
    if (!ticker) {
      res.status(400).json({ error: 'Ticker is required' });
      return;
    }

    const company = await addCompanyFromTicker(ticker);
    if (!company) {
      res.status(404).json({ error: 'Empresa no encontrada. Verifica el ticker.' });
      return;
    }

    // Auto-sync financial data
    let syncResult = null;
    try {
      console.log(`[Admin] Auto-syncing ${company.ticker}...`);
      syncResult = await syncCompanyData(company.ticker, Math.min(Math.max(parseInt(years) || 5, 1), 10));
      console.log(`[Admin] Auto-sync completed for ${company.ticker}:`, syncResult);
    } catch (err) {
      console.error(`[Admin] Auto-sync failed for ${company.ticker}:`, err instanceof Error ? err.message : err);
    }

    res.status(201).json({ ...company, sync: syncResult });
  } catch (error) {
    res.status(500).json({ error: 'Error adding company' });
  }
});

// DELETE /api/admin/companies/:id — remove company
router.delete('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.company.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting company' });
  }
});

// POST /api/admin/sync/:ticker — sync company data from APIs
router.post('/sync/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const years = parseInt(req.body.years || '5', 10);

    if (years < 1 || years > 10) {
      res.status(400).json({ error: 'Years must be between 1 and 10' });
      return;
    }

    console.log(`[Sync] Starting sync for ${ticker} with ${years} years...`);
    const result = await syncCompanyData(ticker, years);
    console.log(`[Sync] Completed for ${ticker}:`, result);

    res.json(result);
  } catch (error) {
    console.error('[Sync] Error:', error);
    res.status(500).json({ error: 'Error syncing company data' });
  }
});

// GET /api/admin/sync/:ticker/status — get sync status
router.get('/sync/:ticker/status', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
      include: { dataSync: true },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json({
      ticker: company.ticker,
      name: company.name,
      sync: company.dataSync,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching sync status' });
  }
});

// GET /api/admin/sync/:ticker/coverage — legacy coverage report for a sync (FinancialData only)
router.get('/sync/:ticker/coverage', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const year = parseInt(req.query.year as string) || 0;

    const company = await prisma.company.findUnique({ where: { ticker } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Find latest year if not specified
    let reportYear = year;
    if (reportYear === 0) {
      const latest = await prisma.financialData.findFirst({
        where: { companyId: company.id },
        orderBy: { year: 'desc' },
        select: { year: true },
      });
      if (!latest) {
        res.status(404).json({ error: 'No financial data found for this company' });
        return;
      }
      reportYear = latest.year;
    }

    const report = await buildCoverageReport(ticker, reportYear);
    if (!report) {
      res.status(404).json({ error: 'Could not build coverage report' });
      return;
    }

    res.json(report);
  } catch (error) {
    console.error('[Coverage] Error:', error);
    res.status(500).json({ error: 'Error building coverage report' });
  }
});

// GET /api/admin/companies/:ticker/year-data — comprehensive yearly data report
router.get('/companies/:ticker/year-data', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();

    const company = await prisma.company.findUnique({ where: { ticker } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const report = await buildComprehensiveYearReport(ticker);
    if (!report) {
      res.status(404).json({ error: 'Could not build comprehensive report' });
      return;
    }

    res.json(report);
  } catch (error) {
    console.error('[Year Data] Error:', error);
    res.status(500).json({ error: 'Error fetching year data' });
  }
});

// GET /api/admin/companies/:ticker/import-timeline — import timeline for a company
router.get('/companies/:ticker/import-timeline', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();

    const company = await prisma.company.findUnique({ where: { ticker } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const timeline = await getImportTimeline(ticker, company.id);
    if (!timeline) {
      res.status(404).json({ error: 'Could not fetch import timeline' });
      return;
    }

    res.json(timeline);
  } catch (error) {
    console.error('[Import Timeline] Error:', error);
    res.status(500).json({ error: 'Error fetching import timeline' });
  }
});

// GET /api/admin/sp500-list — fetch S&P 500 stock list
router.get('/sp500-list', async (_req, res) => {
  try {
    const stocks = await getSP500StockList();
    res.json({ stocks, total: stocks.length });
  } catch (error) {
    console.error('[Admin] Error fetching S&P 500 list:', error);
    res.status(500).json({ error: 'Error fetching S&P 500 list' });
  }
});

// GET /api/admin/european-tickers — list European indices
router.get('/european-tickers', (_req, res) => {
  res.json({ indices: EUROPEAN_INDICES });
});

// POST /api/admin/companies/bulk-import — import multiple companies via SSE stream
router.post('/companies/bulk-import', async (req, res) => {
  const { tickers, years = 5 } = req.body;

  if (!Array.isArray(tickers) || tickers.length === 0) {
    res.status(400).json({ error: 'tickers array is required' });
    return;
  }

  if (tickers.length > 500) {
    res.status(400).json({ error: 'Maximum 500 tickers per batch' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'start', total: tickers.length })}\n\n`);
  (res as any).flush?.();

  try {
    const result = await bulkImportCompanies(
      tickers,
      Math.min(Math.max(parseInt(years) || 5, 1), 10),
      (progress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
        (res as any).flush?.();
      },
    );

    res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
    (res as any).flush?.();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin] Bulk import error:', msg);
    res.write(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`);
    (res as any).flush?.();
  }

  res.end();
});

// POST /api/admin/companies/batch-resync — re-sync all existing companies via SSE stream
router.post('/companies/batch-resync', async (req, res) => {
  const { years = 5 } = req.body;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Count total companies first
  const totalCompanies = await prisma.company.count();
  res.write(`data: ${JSON.stringify({ type: 'start', total: totalCompanies })}\n\n`);
  (res as any).flush?.();

  try {
    const result = await batchResyncCompanies(
      Math.min(Math.max(parseInt(years) || 5, 1), 10),
      (progress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
        (res as any).flush?.();
      },
    );

    res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
    (res as any).flush?.();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin] Batch resync error:', msg);
    res.write(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`);
    (res as any).flush?.();
  }

  res.end();
});

// POST /api/admin/companies/fix-sectors — bulk update missing sectors from hardcoded mappings + yfinance
router.post('/companies/fix-sectors', async (_req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { sector: null },
      select: { id: true, ticker: true, industry: true },
    });

    let updated = 0;
    for (const c of companies) {
      const upper = c.ticker.toUpperCase();
      const known = TICKER_SECTORS[upper];
      const sp500 = SP500_SECTORS[upper];
      const stoxxEntry = STOXX600_UNIQUE_TICKERS.find(t => t.ticker === upper);

      let sector = known?.sector || sp500 || stoxxEntry?.sector || null;
      let industry = known?.industry || (stoxxEntry?.sector ? STOXX_SECTOR_INDUSTRY[stoxxEntry.sector] : null) || null;

      if (!sector) {
        const meta = await resolveCompanyMeta(upper);
        sector = meta.sector || null;
        industry = meta.industry || null;
        await new Promise(r => setTimeout(r, 250));
      }

      if (sector) {
        await prisma.company.update({
          where: { id: c.id },
          data: { sector, industry: industry || c.industry },
        });
        updated++;
      }
    }

    res.json({ total: companies.length, updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// GET /api/admin/api-status — check which APIs are configured
router.get('/api-status', (_req, res) => {
  res.json({
    finnhub: { available: !!process.env.FINNHUB_API_KEY, type: 'env-var', note: 'FINNHUB_API_KEY in .env' },
    sec: { available: true, type: 'free', note: 'SEC EDGAR — no key needed' },
    yahoo: { available: true, type: 'free', note: 'Yahoo Finance — scraping' },
  });
});

// GET /api/admin/data-stats — field coverage, origin, tool availability
router.get('/data-stats', async (_req, res) => {
  try {
    const totalCompanies = await prisma.company.count();
    const totalFinancial = await prisma.financialData.count();
    const totalBalanceSheets = await prisma.balanceSheet.count();
    const totalStockMetrics = await prisma.stockMetric.count();
    const totalSegments = await prisma.revenueSegment.count();
    const totalProductSegments = await prisma.revenueSegment.count({ where: { segmentType: 'product' } });
    const totalGeoSegments = await prisma.revenueSegment.count({ where: { segmentType: 'geography' } });

    // Sync origin counts
    const secSynced = await prisma.dataSync.count({ where: { secSync: true } });
    const finnhubSynced = await prisma.dataSync.count({ where: { finnhubSync: true } });
    const withSync = await prisma.dataSync.count();
    const withoutSync = totalCompanies - withSync;

    // Field coverage via raw SQL for performance
    const fdNullableFields = [
      'grossProfit', 'ebitda', 'ebit', 'operatingCashFlow', 'investingCashFlow',
      'financingCashFlow', 'freeCashFlow', 'dividendsPaid', 'shareRepurchases',
      'totalAssets', 'totalLiabilities', 'totalEquity',
    ] as const;

    const bsNullableFields = [
      'cashAndCashEquivalents', 'shortTermInvestments', 'accountsReceivable', 'inventory',
      'totalCurrentAssets', 'propertyPlantEquipment', 'goodwill', 'intangibleAssets',
      'totalNonCurrentAssets', 'totalAssets', 'accountsPayable', 'shortTermDebt',
      'totalCurrentLiabilities', 'longTermDebt', 'totalNonCurrentLiabilities',
      'totalLiabilities', 'totalStockholdersEquity', 'retainedEarnings', 'treasuryStock',
    ] as const;

    const smNullableFields = [
      'peRatio', 'pbRatio', 'psRatio', 'dividendYield', 'marketCap', 'enterpriseValue',
      'sharesOutstanding', 'roe', 'roa', 'roic', 'currentRatio', 'debtToEquity',
      'altmanZ', 'piotroskiScore', 'intrinsicValue', 'marginOfSafety',
    ] as const;

    const coNullableFields = [
      'sector', 'industry', 'description', 'cik', 'ceo', 'employees', 'country', 'exchange', 'website',
    ] as const;

    const buildCoverageQuery = (table: string, fields: readonly string[], idColumn = 'companyId') => {
      const selectParts = fields.map(
        (f) => `COUNT(DISTINCT CASE WHEN "${f}" IS NOT NULL THEN "${idColumn}" END) AS "${f}_populated"`
      );
      return `SELECT ${selectParts.join(', ')} FROM "${table}"`;
    };

    const [fdCoverage, bsCoverage, smCoverage, coCoverage] = await Promise.all([
      prisma.$queryRawUnsafe<{ [key: string]: bigint }[]>(buildCoverageQuery('FinancialData', fdNullableFields)),
      prisma.$queryRawUnsafe<{ [key: string]: bigint }[]>(buildCoverageQuery('BalanceSheet', bsNullableFields)),
      prisma.$queryRawUnsafe<{ [key: string]: bigint }[]>(buildCoverageQuery('StockMetric', smNullableFields)),
      prisma.$queryRawUnsafe<{ [key: string]: bigint }[]>(buildCoverageQuery('Company', coNullableFields, 'id')),
    ]);

    const buildCoverage = (rows: { [key: string]: bigint }[], fields: readonly string[]) => {
      const result: Record<string, { populated: number; total: number; pct: number }> = {};
      for (const f of fields) {
        const populated = Number(rows[0]?.[`${f}_populated`] ?? 0);
        result[f] = {
          populated,
          total: totalCompanies,
          pct: totalCompanies > 0 ? Math.round((populated / totalCompanies) * 1000) / 10 : 0,
        };
      }
      return result;
    };

    // Tool availability — count companies with sufficient data for each valuation model
    const toolQueries = await Promise.all([
      // DCF: needs freeCashFlow OR (operatingCashFlow + capex) + sharesOutstanding
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT fd."companyId") AS count FROM "FinancialData" fd
        JOIN "StockMetric" sm ON sm."companyId" = fd."companyId"
        WHERE (fd."freeCashFlow" IS NOT NULL OR (fd."operatingCashFlow" IS NOT NULL AND fd."capex" > 0))
        AND sm."sharesOutstanding" IS NOT NULL AND sm."sharesOutstanding" > 0
      `),
      // P/E: netIncome > 0 + sharesOutstanding
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT fd."companyId") AS count FROM "FinancialData" fd
        JOIN "StockMetric" sm ON sm."companyId" = fd."companyId"
        WHERE fd."netIncome" > 0 AND sm."sharesOutstanding" IS NOT NULL AND sm."sharesOutstanding" > 0
      `),
      // P/B: totalStockholdersEquity > 0 + sharesOutstanding
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT bs."companyId") AS count FROM "BalanceSheet" bs
        JOIN "StockMetric" sm ON sm."companyId" = bs."companyId"
        WHERE bs."totalStockholdersEquity" IS NOT NULL AND bs."totalStockholdersEquity" > 0
        AND sm."sharesOutstanding" IS NOT NULL AND sm."sharesOutstanding" > 0
      `),
      // P/S: revenue > 0 + sharesOutstanding
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT fd."companyId") AS count FROM "FinancialData" fd
        JOIN "StockMetric" sm ON sm."companyId" = fd."companyId"
        WHERE fd."revenue" > 0 AND sm."sharesOutstanding" IS NOT NULL AND sm."sharesOutstanding" > 0
      `),
      // EV/EBITDA: ebitda > 0 + enterpriseValue
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT fd."companyId") AS count FROM "FinancialData" fd
        JOIN "StockMetric" sm ON sm."companyId" = fd."companyId"
        WHERE fd."ebitda" IS NOT NULL AND fd."ebitda" > 0
        AND sm."enterpriseValue" IS NOT NULL AND sm."enterpriseValue" > 0
      `),
      // EV/EBIT: ebit > 0 + enterpriseValue
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT fd."companyId") AS count FROM "FinancialData" fd
        JOIN "StockMetric" sm ON sm."companyId" = fd."companyId"
        WHERE fd."ebit" IS NOT NULL AND fd."ebit" > 0
        AND sm."enterpriseValue" IS NOT NULL AND sm."enterpriseValue" > 0
      `),
      // DDM: dividendsPaid > 0 + sharesOutstanding
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT fd."companyId") AS count FROM "FinancialData" fd
        JOIN "StockMetric" sm ON sm."companyId" = fd."companyId"
        WHERE fd."dividendsPaid" IS NOT NULL AND fd."dividendsPaid" > 0
        AND sm."sharesOutstanding" IS NOT NULL AND sm."sharesOutstanding" > 0
      `),
      // Graham: netIncome > 0 + (totalStockholdersEquity OR totalEquity) > 0 + sharesOutstanding
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT fd."companyId") AS count FROM "FinancialData" fd
        JOIN "StockMetric" sm ON sm."companyId" = fd."companyId"
        LEFT JOIN "BalanceSheet" bs ON bs."companyId" = fd."companyId" AND bs."year" = fd."year"
        WHERE fd."netIncome" > 0
        AND COALESCE(bs."totalStockholdersEquity", fd."totalEquity") IS NOT NULL
        AND COALESCE(bs."totalStockholdersEquity", fd."totalEquity") > 0
        AND sm."sharesOutstanding" IS NOT NULL AND sm."sharesOutstanding" > 0
      `),
      // FCF Yield: freeCashFlow > 0 + sharesOutstanding + currentPrice
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT fd."companyId") AS count FROM "FinancialData" fd
        JOIN "StockMetric" sm ON sm."companyId" = fd."companyId"
        WHERE (fd."freeCashFlow" IS NOT NULL AND fd."freeCashFlow" > 0)
        AND sm."sharesOutstanding" IS NOT NULL AND sm."sharesOutstanding" > 0
        AND sm."currentPrice" > 0
      `),
      // Net-Net: cash + AR + inventory + totalLiabilities + sharesOutstanding
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT bs."companyId") AS count FROM "BalanceSheet" bs
        JOIN "StockMetric" sm ON sm."companyId" = bs."companyId"
        WHERE bs."cashAndCashEquivalents" IS NOT NULL
        AND bs."totalLiabilities" IS NOT NULL
        AND sm."sharesOutstanding" IS NOT NULL AND sm."sharesOutstanding" > 0
      `),
      // Sankey CashFlow: operatingCashFlow + investingCashFlow + financingCashFlow
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT "companyId") AS count FROM "FinancialData"
        WHERE "operatingCashFlow" IS NOT NULL
        AND "investingCashFlow" IS NOT NULL
        AND "financingCashFlow" IS NOT NULL
      `),
      // CompareTab: peRatio + pbRatio + psRatio
      prisma.$queryRawUnsafe<[{ count: bigint }[]]>(`
        SELECT COUNT(DISTINCT "companyId") AS count FROM "StockMetric"
        WHERE "peRatio" IS NOT NULL AND "pbRatio" IS NOT NULL AND "psRatio" IS NOT NULL
      `),
    ]);

    const toolNames = ['dcf', 'per', 'pb', 'ps', 'evEbitda', 'evEbit', 'ddm', 'graham', 'fcfYield', 'netnet', 'sankeyCashflow', 'compareTab'] as const;
    const toolAvailability: Record<string, { available: number; total: number; pct: number }> = {};
    for (let i = 0; i < toolNames.length; i++) {
      const row = toolQueries[i] as unknown as { count: bigint }[];
      const available = Number(row[0]?.count ?? 0);
      toolAvailability[toolNames[i]] = {
        available,
        total: totalCompanies,
        pct: totalCompanies > 0 ? Math.round((available / totalCompanies) * 1000) / 10 : 0,
      };
    }

    // Per-company missing fields (lightweight: just counts of missing key fields)
    const companies = await prisma.company.findMany({
      select: {
        ticker: true,
        name: true,
        sector: true,
        industry: true,
        dataSync: { select: { secSync: true, finnhubSync: true } },
        financialData: {
          select: {
            ebitda: true, ebit: true, operatingCashFlow: true, investingCashFlow: true,
            financingCashFlow: true, freeCashFlow: true, dividendsPaid: true, totalEquity: true,
          },
          orderBy: { year: 'desc' },
          take: 1,
        },
        stockMetrics: {
          select: {
            peRatio: true, pbRatio: true, psRatio: true, enterpriseValue: true,
            sharesOutstanding: true, marketCap: true, dividendYield: true,
            altmanZ: true, piotroskiScore: true,
          },
          orderBy: { date: 'desc' },
          take: 1,
        },
        balanceSheets: {
          select: {
            cashAndCashEquivalents: true, accountsReceivable: true, inventory: true,
            totalLiabilities: true, totalStockholdersEquity: true,
            shortTermDebt: true, longTermDebt: true,
          },
          orderBy: { year: 'desc' },
          take: 1,
        },
        _count: { select: { segments: true } },
      },
      orderBy: { ticker: 'asc' },
    });

    const companiesWithMissing = companies.map((c) => {
      const latestFd = c.financialData[0];
      const latestSm = c.stockMetrics[0];
      const latestBs = c.balanceSheets[0];

      const missingFd: string[] = [];
      if (!latestFd?.ebitda) missingFd.push('ebitda');
      if (!latestFd?.ebit) missingFd.push('ebit');
      if (!latestFd?.operatingCashFlow) missingFd.push('operatingCashFlow');
      if (!latestFd?.investingCashFlow) missingFd.push('investingCashFlow');
      if (!latestFd?.financingCashFlow) missingFd.push('financingCashFlow');
      if (!latestFd?.freeCashFlow) missingFd.push('freeCashFlow');
      if (!latestFd?.dividendsPaid) missingFd.push('dividendsPaid');
      if (!latestFd?.totalEquity) missingFd.push('totalEquity');

      const missingSm: string[] = [];
      if (!latestSm) {
        missingSm.push('ALL_STOCK_METRICS');
      } else {
        if (!latestSm.peRatio) missingSm.push('peRatio');
        if (!latestSm.pbRatio) missingSm.push('pbRatio');
        if (!latestSm.psRatio) missingSm.push('psRatio');
        if (!latestSm.enterpriseValue) missingSm.push('enterpriseValue');
        if (!latestSm.sharesOutstanding) missingSm.push('sharesOutstanding');
        if (!latestSm.marketCap) missingSm.push('marketCap');
        if (!latestSm.altmanZ) missingSm.push('altmanZ');
        if (!latestSm.piotroskiScore) missingSm.push('piotroskiScore');
      }

      const missingBs: string[] = [];
      if (!latestBs) {
        missingBs.push('ALL_BALANCE_SHEET');
      } else {
        if (!latestBs.cashAndCashEquivalents) missingBs.push('cash');
        if (!latestBs.accountsReceivable) missingBs.push('receivables');
        if (!latestBs.inventory) missingBs.push('inventory');
        if (!latestBs.totalLiabilities) missingBs.push('totalLiabilities');
        if (!latestBs.totalStockholdersEquity) missingBs.push('totalEquity');
        if (!latestBs.shortTermDebt) missingBs.push('shortTermDebt');
        if (!latestBs.longTermDebt) missingBs.push('longTermDebt');
      }

      // Valuation readiness for the recommended model
      const recommendedModel = getRecommendedModel(c.sector, c.industry);
      const readyInputs: Record<string, string[]> = {
        dcf: ['freeCashFlow'],
        per: ['netIncome', 'sharesOutstanding'],
        pb: ['totalStockholdersEquity', 'sharesOutstanding'],
        ps: ['revenue', 'sharesOutstanding'],
        ev_ebitda: ['ebitda', 'longTermDebt', 'cashAndCashEquivalents', 'sharesOutstanding'],
        ev_ebit: ['ebit', 'longTermDebt', 'cashAndCashEquivalents', 'sharesOutstanding'],
        ddm: ['dividendsPaid', 'sharesOutstanding'],
        fcf_yield: ['freeCashFlow', 'sharesOutstanding'],
      };
      const needed = readyInputs[recommendedModel] ?? readyInputs.dcf;
      const missingReady = needed.filter((f) => {
        if (f === 'sharesOutstanding') return !latestSm?.sharesOutstanding;
        if (f === 'revenue' || f === 'netIncome') return !latestFd || !(latestFd as any)[f];
        if (f === 'ebitda' || f === 'ebit' || f === 'freeCashFlow') return !latestFd || !(latestFd as any)[f];
        if (f === 'dividendsPaid') return !latestFd || !(latestFd as any)[f];
        return !latestBs || !(latestBs as any)[f];
      });

      return {
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        industry: c.industry,
        sync: c.dataSync,
        segments: c._count.segments,
        recommendedModel,
        ready: missingReady.length === 0,
        missingReady,
        missingFinancialData: missingFd,
        missingStockMetrics: missingSm,
        missingBalanceSheet: missingBs,
      };
    });

    res.json({
      summary: {
        totalCompanies,
        totalFinancialRecords: totalFinancial,
        totalBalanceSheets,
        totalStockMetrics,
        totalSegments,
        totalProductSegments,
        totalGeoSegments,
        syncOrigin: { secSynced, finnhubSynced, withSync, withoutSync },
      },
      fieldCoverage: {
        financialData: buildCoverage(fdCoverage, fdNullableFields),
        balanceSheet: buildCoverage(bsCoverage, bsNullableFields),
        stockMetric: buildCoverage(smCoverage, smNullableFields),
        company: buildCoverage(coCoverage, coNullableFields),
      },
      toolAvailability,
      companies: companiesWithMissing,
    });
  } catch (error) {
    console.error('[Admin] Data stats error:', error);
    res.status(500).json({ error: 'Error fetching data statistics' });
  }
});

export default router;
