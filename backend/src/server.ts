import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cron from 'node-cron';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import prisma from './infrastructure/prisma/client';
import authRoutes from './routes/auth';
import favoritesRoutes from './routes/favorites';
import alarmsRoutes, { checkAllAlarms } from './routes/alarms';
import adminRoutes from './routes/admin';
import fieldConfigRoutes from './routes/fieldConfig';
import portfolioRoutes from './routes/portfolio';
import { fetchYahooQuote, fetchMarketTape, type MarketTapeItem } from './services/yahoo';
import { getRecommendedModel, getSectorConfigs, computeAll } from './services/valuationService';
import { requireAuth, requireAdmin, verifyToken, type AuthRequest } from './middleware/jwt';
import { parsePagination, paginate } from './utils/pagination';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(compression());
app.set('trust proxy', 2);
app.use(express.json());

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

app.post('/api/admin/upload', requireAdmin, (req: AuthRequest, res: any) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// ── Companies ─────────────────────────────────────────────────────────────

app.get('/api/companies/search', async (_req, res) => {
  try {
    const companies = await prisma.company.findMany({
      select: { id: true, ticker: true, name: true, sector: true, industry: true },
      orderBy: { ticker: 'asc' },
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching companies' });
  }
});

app.get('/api/companies', async (req, res) => {
  try {
    const query = req.query as Record<string, string>;
    const { sector, country, sort, fav } = query;
    const search = query.search || query.q;
    const { page, pageSize, skip, take } = parsePagination(req.query, 24);
    const where: any = {};

    if (sector && sector !== 'null' && sector !== 'undefined') {
      where.sector = sector;
    }
    if (country && country !== 'null' && country !== 'undefined' && country !== '') {
      where.country = country;
    }
    if (search && search !== 'null' && search !== 'undefined') {
      where.OR = [
        { ticker: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { sector: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fav === '1') {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        try {
          const decoded = verifyToken(header.slice(7));
          const favorites = await prisma.favorite.findMany({
            where: { userId: decoded.id },
            select: { companyId: true },
          });
          where.id = { in: favorites.map((f) => f.companyId) };
        } catch {
          return res.json(paginate({ data: [], total: 0, page, pageSize }));
        }
      } else {
        return res.json(paginate({ data: [], total: 0, page, pageSize }));
      }
    }

    const total = await prisma.company.count({ where });
    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        ticker: true,
        name: true,
        sector: true,
        industry: true,
        country: true,
        website: true,
        logoUrl: true,
      },
      orderBy: { ticker: sort === 'desc' ? 'desc' : 'asc' },
      skip,
      take,
    });
    res.json(paginate({ data: companies, total, page, pageSize }));
  } catch (error) {
    res.status(500).json({ error: 'Error fetching companies' });
  }
});

app.get('/api/companies/facets', async (_req, res) => {
  try {
    const [sectorRows, countryRows] = await Promise.all([
      prisma.company.findMany({
        where: { sector: { not: null } },
        select: { sector: true },
        distinct: ['sector'],
        orderBy: { sector: 'asc' },
      }),
      prisma.company.findMany({
        where: { country: { not: null } },
        select: { country: true },
        distinct: ['country'],
        orderBy: { country: 'asc' },
      }),
    ]);
    res.json({
      sectors: sectorRows.map((r) => r.sector as string),
      countries: countryRows.map((r) => r.country as string),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching facets' });
  }
});

app.get('/api/companies/:ticker/profile', async (req, res) => {
  try {
    const { ticker } = req.params;

    const company = await prisma.company.findUnique({ where: { ticker: ticker.toUpperCase() } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const financials = await prisma.financialData.findMany({
      where: { companyId: company.id },
      orderBy: { year: 'desc' },
    });

    const stockMetrics = await prisma.stockMetric.findMany({
      where: { companyId: company.id },
      orderBy: { date: 'desc' },
    });

    const balanceSheets = await prisma.balanceSheet.findMany({
      where: { companyId: company.id },
      orderBy: { year: 'desc' },
    });

    const segments = await prisma.revenueSegment.findMany({
      where: { companyId: company.id },
      orderBy: { year: 'desc' },
    });

    res.json({ company, financials, stockMetrics, balanceSheets, segments });
  } catch (error) {
    console.error('[Companies] Error fetching profile:', error);
    res.status(500).json({ error: 'Error fetching company profile' });
  }
});

// ── Sector companies ──────────────────────────────────────────────────────

interface RecommendedValuation {
  ticker: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  sector: string | null;
  country: string | null;
  currency: string | null;
  currentPrice: number;
  intrinsicValue: number;
  marginOfSafety: number;
  recommendedModel: string;
  asOf: string | null;
}

const MAX_VALUATION_MARGIN = Math.abs(parseFloat(process.env.VALUATION_MAX_MARGIN || '1')) || 1;
const MAX_FINANCIAL_AGE_YEARS = Math.max(1, parseInt(process.env.VALUATION_MAX_DATA_AGE || '2', 10) || 2);
const VALUATIONS_TTL_MS = 10 * 60 * 1000;
let valuationsCache: { at: number; data: RecommendedValuation[] } | null = null;

async function computeRecommendedValuations(): Promise<RecommendedValuation[]> {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      ticker: true,
      name: true,
      logoUrl: true,
      website: true,
      sector: true,
      industry: true,
      country: true,
      currency: true,
      stockMetrics: { orderBy: { date: 'desc' }, take: 1 },
    },
  });

  const ids = companies.map((c) => c.id);
  const [financials, balanceSheets] = await Promise.all([
    prisma.financialData.findMany({ where: { companyId: { in: ids } } }),
    prisma.balanceSheet.findMany({ where: { companyId: { in: ids } } }),
  ]);

  const financialByCompany = new Map<string, typeof financials>();
  for (const f of financials) {
    const list = financialByCompany.get(f.companyId);
    if (list) list.push(f);
    else financialByCompany.set(f.companyId, [f]);
  }

  const balanceByCompany = new Map<string, typeof balanceSheets>();
  for (const b of balanceSheets) {
    const list = balanceByCompany.get(b.companyId);
    if (list) list.push(b);
    else balanceByCompany.set(b.companyId, [b]);
  }

  const out: RecommendedValuation[] = [];
  for (const c of companies) {
    const stock = c.stockMetrics[0];
    if (!stock || stock.currentPrice <= 0) continue;
    try {
      const companyFinancials = financialByCompany.get(c.id) ?? [];
      const latestYear = companyFinancials.reduce((m, f) => Math.max(m, f.year), 0);
      if (latestYear < new Date().getFullYear() - MAX_FINANCIAL_AGE_YEARS) continue;
      const results = computeAll(
        {
          financials: companyFinancials,
          balanceSheets: balanceByCompany.get(c.id) ?? [],
          stock,
        } as any,
        getSectorConfigs(c.sector, c.industry),
      );
      const recommended = results.find((r) => r.id === getRecommendedModel(c.sector, c.industry));
      if (!recommended || recommended.fairValue == null || recommended.fairValue <= 0) continue;
      if (recommended.confidence !== 'high' && recommended.confidence !== 'medium') continue;
      out.push({
        ticker: c.ticker,
        name: c.name,
        logoUrl: c.logoUrl,
        website: c.website,
        sector: c.sector,
        country: c.country,
        currency: c.currency,
        currentPrice: stock.currentPrice,
        intrinsicValue: recommended.fairValue,
        marginOfSafety: (recommended.fairValue - stock.currentPrice) / stock.currentPrice,
        recommendedModel: recommended.id,
        asOf: stock.date ? new Date(stock.date).toISOString().slice(0, 10) : null,
      });
    } catch (err) {
      console.error(`[Valuations] ${c.ticker} skipped: ${err instanceof Error ? err.message : err}`);
    }
  }
  return out;
}

async function getRecommendedValuations(): Promise<RecommendedValuation[]> {
  if (valuationsCache && Date.now() - valuationsCache.at < VALUATIONS_TTL_MS) {
    return valuationsCache.data;
  }
  const data = await computeRecommendedValuations();
  valuationsCache = { at: Date.now(), data };
  return data;
}

function parseCountry(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const c = value.trim().toUpperCase();
  return c || undefined;
}

app.get('/api/companies/undervalued', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const country = parseCountry(req.query.country);
    const data = (await getRecommendedValuations())
      .filter(v => (!country || v.country === country) && v.marginOfSafety > 0 && v.marginOfSafety <= MAX_VALUATION_MARGIN)
      .sort((a, b) => b.marginOfSafety - a.marginOfSafety)
      .slice(0, limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching undervalued companies' });
  }
});

app.get('/api/companies/overvalued', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const country = parseCountry(req.query.country);
    const data = (await getRecommendedValuations())
      .filter(v => (!country || v.country === country) && v.marginOfSafety < 0 && v.marginOfSafety >= -MAX_VALUATION_MARGIN)
      .sort((a, b) => a.marginOfSafety - b.marginOfSafety)
      .slice(0, limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching overvalued companies' });
  }
});

// ── Yahoo Quote ───────────────────────────────────────────────────────────

app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const quote = await fetchYahooQuote(req.params.ticker);
    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }
    res.json(quote);
  } catch {
    res.status(500).json({ error: 'Error fetching quote' });
  }
});

// ── Market tape (live indices + forex + gold) ────────────────────────────

const TAPE_SYMBOLS = [
  '^GSPC', '^IXIC', '^DJI',
  '^IBEX', '^GDAXI', '^FCHI', '^FTSE',
  'EURUSD=X', 'GBPUSD=X', 'EURGBP=X', 'USDJPY=X',
  'GC=F',
];

let tapeCache: { at: number; data: MarketTapeItem[] } | null = null;
const TAPE_TTL_MS = 60_000;

app.get('/api/market/tape', async (_req, res) => {
  try {
    if (tapeCache && Date.now() - tapeCache.at < TAPE_TTL_MS) {
      res.json(tapeCache.data);
      return;
    }
    const data = await fetchMarketTape(TAPE_SYMBOLS);
    tapeCache = { at: Date.now(), data };
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Error fetching market tape' });
  }
});

// ── Mount routes ──────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/alarms', alarmsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/field-config', fieldConfigRoutes);
app.use('/api/portfolios', portfolioRoutes);

// ── Site Settings ─────────────────────────────────────────────────────────

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

app.put('/api/settings', requireAdmin, async (req: AuthRequest, res) => {
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

// ── Error handler ─────────────────────────────────────────────────────────

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[FATAL]', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`DataInvestments API running on port ${PORT}`);
});

// ── Cron: Alarm check ─────────────────────────────────────────────────────

cron.schedule('0 9-16 * * 1-5', async () => {
  console.log('[Alarm] Running alarm check...');
  try {
    const result = await checkAllAlarms();
    console.log(`[Alarm] Checked ${result.checked}, triggered ${result.triggered}`);
  } catch (error) {
    console.error('[Alarm] Error:', error);
  }
});
