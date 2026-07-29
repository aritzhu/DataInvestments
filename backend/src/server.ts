import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import cron from 'node-cron';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import favoritesRoutes from './routes/favorites';
import alarmsRoutes, { checkAllAlarms } from './routes/alarms';
import adminRoutes from './routes/admin';
import fieldConfigRoutes from './routes/fieldConfig';
import portfolioRoutes from './routes/portfolio';
import { fetchYahooQuote } from './services/yahoo';
import { getCikForTicker, fetchCompanyFacts, extractSharesOutstanding } from './services/sec';
import { getMarketAverages } from './services/marketAverages';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

const PgSession = ConnectPgSimple(session);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(compression());
app.set('trust proxy', 2);
app.use(express.json());

app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
  },
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files — uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Image upload (admin only)
const uploadStorage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Usa JPG, PNG o WebP.'));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.post('/api/admin/upload', (req: any, res: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  const user = req.session.role;
  if (user !== 'admin') {
    return res.status(403).json({ error: 'Se requiere rol de administrador' });
  }
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Favorites routes
app.use('/api/favorites', favoritesRoutes);

// Alarms routes
app.use('/api/alarms', alarmsRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Field config + concept mapping routes
app.use('/api/admin', fieldConfigRoutes);

// Portfolio routes
app.use('/api/portfolios', portfolioRoutes);

// Companies endpoints
app.get('/api/companies', async (_req, res) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { ticker: 'asc' },
      include: { stockMetrics: { take: 1, orderBy: { date: 'desc' } } },
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching companies' });
  }
});

app.get('/api/companies/undervalued', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const companies = await prisma.$queryRawUnsafe(`
      SELECT c.id, c.ticker, c.name, c.sector, c.industry, c.country, c."logoUrl", c.website,
             sm."currentPrice", sm."intrinsicValue", sm."marginOfSafety", sm."peRatio", sm."marketCap"
      FROM "Company" c
      JOIN "StockMetric" sm ON sm."companyId" = c.id
      WHERE sm.id = (
        SELECT id FROM "StockMetric" WHERE "companyId" = c.id ORDER BY date DESC LIMIT 1
      )
      AND sm."marginOfSafety" IS NOT NULL
      AND sm."marginOfSafety" > 0
      ORDER BY sm."marginOfSafety" DESC
      LIMIT ${limit}
    `);
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching undervalued companies' });
  }
});

app.get('/api/companies/overvalued', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const companies = await prisma.$queryRawUnsafe(`
      SELECT c.id, c.ticker, c.name, c.sector, c.industry, c.country, c."logoUrl", c.website,
             sm."currentPrice", sm."intrinsicValue", sm."marginOfSafety", sm."peRatio", sm."marketCap"
      FROM "Company" c
      JOIN "StockMetric" sm ON sm."companyId" = c.id
      WHERE sm.id = (
        SELECT id FROM "StockMetric" WHERE "companyId" = c.id ORDER BY date DESC LIMIT 1
      )
      AND sm."marginOfSafety" IS NOT NULL
      AND sm."marginOfSafety" < 0
      ORDER BY sm."marginOfSafety" ASC
      LIMIT ${limit}
    `);
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching overvalued companies' });
  }
});

app.get('/api/companies/:ticker', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching company' });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { ticker, name, sector, industry, description } = req.body;
    const company = await prisma.company.create({
      data: { ticker: ticker.toUpperCase(), name, sector, industry, description },
    });
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: 'Error creating company' });
  }
});

// Financial Data endpoints
app.get('/api/companies/:ticker/financials', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const financials = await prisma.financialData.findMany({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });
    res.json(financials);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching financial data' });
  }
});

app.post('/api/companies/:ticker/financials', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const financial = await prisma.financialData.create({
      data: { ...req.body, companyId: company.id },
    });
    res.status(201).json(financial);
  } catch (error) {
    res.status(500).json({ error: 'Error creating financial data' });
  }
});

// Stock Metrics endpoints
app.get('/api/companies/:ticker/stock', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const metrics = await prisma.stockMetric.findMany({
      where: { companyId: company.id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stock metrics' });
  }
});

app.post('/api/companies/:ticker/stock', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const metric = await prisma.stockMetric.create({
      data: { ...req.body, companyId: company.id },
    });
    res.status(201).json(metric);
  } catch (error) {
    res.status(500).json({ error: 'Error creating stock metric' });
  }
});

// Balance Sheet endpoint
app.get('/api/companies/:ticker/balancesheet', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const sheets = await prisma.balanceSheet.findMany({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });
    res.json(sheets);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching balance sheets' });
  }
});

// Revenue Segments endpoint
app.get('/api/companies/:ticker/segments', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const segments = await prisma.revenueSegment.findMany({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { segmentType: 'asc' }, { revenue: 'desc' }],
    });
    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching segments' });
  }
});

// Company full profile endpoint (financials + stock + balance sheets + segments)
app.get('/api/companies/:ticker/profile', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const [financials, stockMetrics, balanceSheets, segments] = await Promise.all([
      prisma.financialData.findMany({
        where: { companyId: company.id },
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      }),
      prisma.stockMetric.findMany({
        where: { companyId: company.id },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      prisma.balanceSheet.findMany({
        where: { companyId: company.id },
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      }),
      prisma.revenueSegment.findMany({
        where: { companyId: company.id },
        orderBy: [{ year: 'desc' }, { revenue: 'desc' }],
      }),
    ]);

    res.json({
      company,
      financials,
      stockMetrics,
      balanceSheets,
      segments,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching company profile' });
  }
});

// Sankey data endpoint - Cash Flow
app.get('/api/companies/:ticker/sankey/cashflow', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const latestFinancial = await prisma.financialData.findFirst({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });

    if (!latestFinancial) {
      res.status(404).json({ error: 'No financial data available' });
      return;
    }

    const f = latestFinancial;
    const otherOpex = Math.max(0, f.operatingExpenses - f.sgaExpense - f.rdExpense);

    const nodes = [
      { id: 'revenue', label: 'Ingresos', value: f.revenue },
      { id: 'cogs', label: 'Costo de Ventas', value: f.costOfRevenue },
      { id: 'sga', label: 'Gastos Comerciales', value: f.sgaExpense },
      { id: 'rd', label: 'I+D', value: f.rdExpense },
      { id: 'other_opex', label: 'Otros Gastos Op.', value: otherOpex },
      { id: 'interest', label: 'Intereses', value: f.interestExpense },
      { id: 'tax', label: 'Impuestos', value: f.taxExpense },
      { id: 'net_income', label: 'Beneficio Neto', value: f.netIncome },
      { id: 'capex', label: 'Inversión (CapEx)', value: f.capex },
      { id: 'depreciation', label: 'Amortización', value: f.depreciation },
    ];

    const links = [
      { source: 'revenue', target: 'cogs', value: f.costOfRevenue },
      { source: 'revenue', target: 'sga', value: f.sgaExpense },
      { source: 'revenue', target: 'rd', value: f.rdExpense },
      { source: 'revenue', target: 'other_opex', value: otherOpex },
      { source: 'revenue', target: 'interest', value: f.interestExpense },
      { source: 'revenue', target: 'tax', value: f.taxExpense },
      { source: 'revenue', target: 'net_income', value: f.netIncome },
      { source: 'net_income', target: 'capex', value: f.capex },
      { source: 'net_income', target: 'depreciation', value: f.depreciation },
    ];

    res.json({
      company: { ticker: company.ticker, name: company.name },
      period: { year: latestFinancial.year, quarter: latestFinancial.quarter },
      nodes,
      links,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error building Sankey data' });
  }
});

// Market averages endpoint — sector PE + historical averages
app.get('/api/market/sector-averages', async (req, res) => {
  try {
    const sector = (req.query.sector as string) || 'Technology';
    const averages = await getMarketAverages(sector);
    res.json(averages);
  } catch (error) {
    console.error('[Market] Error fetching sector averages:', error);
    res.status(500).json({ error: 'Error fetching sector averages' });
  }
});

// Valuation endpoint - Yahoo Finance + DCF
app.get('/api/companies/:ticker/valuation', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { ticker: req.params.ticker.toUpperCase() },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Get latest financial data
    const latestFinancial = await prisma.financialData.findFirst({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });

    if (!latestFinancial) {
      res.status(404).json({ error: 'No financial data available' });
      return;
    }

    // Fetch current price from Yahoo Finance
    const yahooQuote = await fetchYahooQuote(company.ticker);

    if (!yahooQuote) {
      res.status(503).json({ error: 'Could not fetch market data from Yahoo Finance' });
      return;
    }

    // Get shares outstanding: try SEC → DB StockMetric → Yahoo
    let sharesOutstanding = 0;
    const cik = await getCikForTicker(company.ticker);
    if (cik) {
      const facts = await fetchCompanyFacts(cik);
      if (facts) {
        const shares = extractSharesOutstanding(facts);
        if (shares && shares > 0) {
          sharesOutstanding = shares;
        }
      }
    }

    // Fallback: try StockMetric from DB (populated by sync)
    if (sharesOutstanding <= 0) {
      const stockMetric = await prisma.stockMetric.findFirst({
        where: { companyId: company.id },
        orderBy: { date: 'desc' },
      });
      if (stockMetric && stockMetric.sharesOutstanding && stockMetric.sharesOutstanding > 0) {
        sharesOutstanding = stockMetric.sharesOutstanding;
      }
    }

    // Fallback: derive from Yahoo market cap
    const marketCap = yahooQuote.marketCap > 0
      ? yahooQuote.marketCap
      : (sharesOutstanding > 0 ? yahooQuote.currentPrice * sharesOutstanding : null);

    if (sharesOutstanding <= 0 && marketCap && marketCap > 0 && yahooQuote.currentPrice > 0) {
      sharesOutstanding = Math.round(marketCap / yahooQuote.currentPrice);
    }

    // Get balance sheet for additional data
    const latestBalance = await prisma.balanceSheet.findFirst({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });

    // Calculate Free Cash Flow
    const fcf = latestFinancial.netIncome + latestFinancial.depreciation - latestFinancial.capex;

    // DCF parameters (defaults)
    const growthRate = parseFloat(req.query.growth as string) || 0.05;
    const discountRate = parseFloat(req.query.discount as string) || 0.10;
    const years = parseInt(req.query.years as string) || 10;

    // Calculate intrinsic value using DCF
    let totalPV = 0;
    for (let n = 1; n <= years; n++) {
      const futureFCF = fcf * Math.pow(1 + growthRate, n);
      const presentValue = futureFCF / Math.pow(1 + discountRate, n);
      totalPV += presentValue;
    }

    // Terminal value (Gordon Growth Model)
    const terminalGrowth = 0.03; // Long-term GDP growth
    const terminalValue = (fcf * Math.pow(1 + growthRate, years) * (1 + terminalGrowth)) /
      (discountRate - terminalGrowth);
    const terminalPV = terminalValue / Math.pow(1 + discountRate, years);

    const intrinsicValueTotal = totalPV + terminalPV;
    const intrinsicValuePerShare = sharesOutstanding > 0
      ? intrinsicValueTotal / sharesOutstanding
      : 0;

    const marginOfSafety = yahooQuote.currentPrice > 0
      ? (intrinsicValuePerShare - yahooQuote.currentPrice) / yahooQuote.currentPrice
      : 0;

    // Enterprise value from balance sheet
    const totalDebt = (latestBalance?.shortTermDebt ?? 0) + (latestBalance?.longTermDebt ?? 0);
    const cash = latestBalance?.cashAndCashEquivalents ?? 0;
    const ev = marketCap != null ? marketCap + totalDebt - cash : null;

    res.json({
      company: { ticker: company.ticker, name: company.name },
      market: {
        currentPrice: yahooQuote.currentPrice,
        marketCap: marketCap ?? 0,
        sharesOutstanding,
        enterpriseValue: ev,
        currency: yahooQuote.currency,
        exchange: yahooQuote.exchange,
      },
      financials: {
        fcf,
        revenue: latestFinancial.revenue,
        netIncome: latestFinancial.netIncome,
        depreciation: latestFinancial.depreciation,
        capex: latestFinancial.capex,
      },
      dcf: {
        growthRate,
        discountRate,
        years,
        terminalGrowth,
        intrinsicValuePerShare,
        intrinsicValueTotal,
        marginOfSafety,
      },
    });
  } catch (error) {
    console.error('[Valuation] Error:', error);
    res.status(500).json({ error: 'Error calculating valuation' });
  }
});

// Cron job: check alarms every hour during market hours (Mon-Fri 9:00-16:00 UTC)
cron.schedule('0 9-16 * * 1-5', async () => {
  console.log('[Alarm] Running alarm check...');
  try {
    const result = await checkAllAlarms();
    console.log(`[Alarm] Checked ${result.checked}, triggered ${result.triggered}`);
  } catch (error) {
    console.error('[Alarm] Error:', error);
  }
});

// ── Site Settings (public read, admin write) ────────────────────────────────

app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    const map: Record<string, string | null> = {};
    for (const s of settings) map[s.key] = s.value;
    res.json(map);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user || user.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }

  try {
    const entries = Object.entries(req.body as Record<string, string>) as [string, string][];
    for (const [key, value] of entries) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error saving settings' });
  }
});



app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[FATAL]', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`DataInvestments API running on port ${PORT}`);
});
