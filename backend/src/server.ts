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
import { getRecommendedModel } from './services/valuationService';
import { requireAuth, requireAdmin, type AuthRequest } from './middleware/jwt';

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
    const { sector, search, country } = req.query;
    const where: any = {};

    if (sector && sector !== 'null' && sector !== 'undefined') {
      where.sector = sector as string;
    }
    if (country && country !== 'null' && country !== 'undefined' && country !== '') {
      where.country = country as string;
    }
    if (search && search !== 'null' && search !== 'undefined') {
      where.OR = [
        { ticker: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
        { sector: { contains: search as string, mode: 'insensitive' } },
        { industry: { contains: search as string, mode: 'insensitive' } },
      ];
    }

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
      orderBy: { ticker: 'asc' },
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching companies' });
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

async function getRecommendedValuations() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      ticker: true,
      name: true,
      logoUrl: true,
      website: true,
      sector: true,
      industry: true,
      stockMetrics: { orderBy: { date: 'desc' }, take: 1 },
    },
  });

  return companies
    .filter(c => c.stockMetrics.length > 0)
    .map(c => {
      const m = c.stockMetrics[0];
      return {
        ticker: c.ticker,
        name: c.name,
        logoUrl: c.logoUrl,
        website: c.website,
        sector: c.sector,
        currentPrice: m.currentPrice,
        intrinsicValue: m.intrinsicValue,
        marginOfSafety: m.marginOfSafety,
        recommendedModel: getRecommendedModel(c.sector, c.industry),
      };
    });
}

app.get('/api/companies/undervalued', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const data = (await getRecommendedValuations())
      .filter(v => v.marginOfSafety != null && v.marginOfSafety > 0)
      .sort((a, b) => (b.marginOfSafety ?? 0) - (a.marginOfSafety ?? 0))
      .slice(0, limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching undervalued companies' });
  }
});

app.get('/api/companies/overvalued', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const data = (await getRecommendedValuations())
      .filter(v => v.marginOfSafety != null && v.marginOfSafety < 0)
      .sort((a, b) => (a.marginOfSafety ?? 0) - (b.marginOfSafety ?? 0))
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
