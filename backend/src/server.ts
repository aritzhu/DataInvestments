import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import statementsRoutes from './routes/statements';
import portfolioRoutes from './routes/portfolio';
import coursesRoutes from './routes/courses';
import analyticsRoutes from './routes/analytics.routes';
import subscriptionRoutes from './routes/subscription';
import commodityRoutes from './routes/commodities';
import stripeWebhookRoutes from './routes/stripeWebhook';
import { fetchYahooQuote, fetchMarketTape, type MarketTapeItem } from './services/yahoo';
import { getMarketAverages } from './services/marketAverages';
import { getMetricVariations } from './services/metricVariations';
import { getRecommendedModel, getRecommendedFairValue, getSectorConfigs, computeAll, inferBusinessModel, dcfSeedRates, isConsumerCyclical, type BusinessModelInference, type ValuationInput } from './services/valuationService';
import { getMappedCommodity } from './data/commodityMap';
import { requireAuth, requireAdmin, verifyToken, type AuthRequest } from './middleware/jwt';
import { parsePagination, paginate } from './utils/pagination';

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://datainvestments.dionestudio.es',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Rate Limiters ──────────────────────────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de autenticación' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req: any) => req.user?.id || req.ip,
  message: { error: 'Límite de subidas alcanzado' },
});

const settingsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => req.user?.id || req.ip,
  message: { error: 'Límite de actualizaciones alcanzado' },
});

app.use(globalLimiter);
app.use(compression({
  filter: (req, res) => {
    if (res.getHeader('Content-Type') === 'text/event-stream') return false;
    return compression.filter(req, res);
  },
}));
app.set('trust proxy', 2);

// Stripe webhook — must receive the raw body, so it is registered
// BEFORE the global express.json() parser.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

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
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Usa JPG, PNG, WebP o PDF.'));
    }
  },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.post('/api/admin/upload', requireAdmin, uploadLimiter, (req: AuthRequest, res: any) => {
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
      where: { active: true },
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
    const { sector, country, sort, fav, sortBy } = query;
    const businessModel = query.businessModel;
    const search = query.search || query.q;
    const { page, pageSize, skip, take } = parsePagination(req.query, 24);
    const where: any = { active: true };

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

    const minNetMargin = parseFloatParam(query.minNetMargin);
    const maxPe = parseFloatParam(query.maxPe);
    const minFcfYield = parseFloatParam(query.minFcfYield);
    const maxNetDebtEbitda = parseFloatParam(query.maxNetDebtEbitda);
    const activeBusinessModel = businessModel && businessModel !== 'all' && businessModel !== 'null' && businessModel !== 'undefined' ? businessModel : null;
    const screeningActive = sortBy != null || minNetMargin != null || maxPe != null || minFcfYield != null || maxNetDebtEbitda != null || activeBusinessModel != null;

    const baseSelect = {
      id: true,
      ticker: true,
      name: true,
      sector: true,
      industry: true,
      country: true,
      website: true,
      logoUrl: true,
    };

    if (!screeningActive) {
      const total = await prisma.company.count({ where });
      const companies = await prisma.company.findMany({
        where,
        select: baseSelect,
        orderBy: { ticker: sort === 'desc' ? 'desc' : 'asc' },
        skip,
        take,
      });
      if (companies.length) {
        const mm = await getCompanyMetrics(companies);
        return res.json(paginate({
          data: companies.map((c) => ({ ...c, businessModel: mm.get(c.id)?.businessModel ?? null })),
          total,
          page,
          pageSize,
        }));
      }
      return res.json(paginate({ data: companies, total, page, pageSize }));
    }

    // Screening path: compute per-company fundamentals and filter/sort on them
    const allCompanies = await prisma.company.findMany({ where, select: baseSelect });
    const metrics = await getCompanyMetrics(allCompanies);

    let rows = allCompanies
      .map((c) => {
        const mm = metrics.get(c.id);
        return { ...c, metrics: mm?.metrics ?? null, businessModel: mm?.businessModel ?? null };
      })
      .filter((r) => {
        const m = r.metrics;
        if (!m) return false;
        if (minNetMargin != null && (m.netMargin == null || m.netMargin < minNetMargin)) return false;
        if (maxPe != null && (m.pe == null || m.pe <= 0 || m.pe > maxPe)) return false;
        if (minFcfYield != null && (m.fcfYield == null || m.fcfYield < minFcfYield)) return false;
        if (maxNetDebtEbitda != null && (m.ndEbitda == null || m.ndEbitda > maxNetDebtEbitda)) return false;
        if (activeBusinessModel != null) {
          if (activeBusinessModel === 'none') {
            if (r.businessModel?.model != null) return false;
          } else {
            if (r.businessModel?.model !== activeBusinessModel) return false;
          }
        }
        return true;
      });

    const dir = sort === 'desc' ? -1 : 1;
    const metricVal = (r: (typeof rows)[number], key: string): number => {
      const v = r.metrics?.[key];
      if (v == null) return dir > 0 ? Infinity : -Infinity;
      return v;
    };
    if (sortBy === 'pe' || sortBy === 'fcfYield' || sortBy === 'netMargin' || sortBy === 'ndEbitda') {
      rows = [...rows].sort((a, b) => metricVal(a, sortBy) - metricVal(b, sortBy));
    } else {
      rows = [...rows].sort((a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0) * (sort === 'desc' ? -1 : 1));
    }

    const total = rows.length;
    res.json(paginate({ data: rows.slice(skip, skip + take), total, page, pageSize }));
  } catch (error) {
    res.status(500).json({ error: 'Error fetching companies' });
  }
});

function parseFloatParam(value: string | undefined): number | null {
  if (value == null || value === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

// Latest fundamentals per company for screening: P/E, net margin, FCF yield
// and net-debt/EBITDA from the most recent stock/financial/balance rows.
async function getCompanyMetrics(
  companies: Array<{ id: string; sector?: string | null; industry?: string | null }>,
): Promise<Map<string, { metrics: Record<string, number | null>; businessModel: BusinessModelInference | null }>> {
  const ids = companies.map((c) => c.id);
  const [stocks, financials, balanceSheets] = await Promise.all([
    prisma.stockMetric.findMany({ where: { companyId: { in: ids } }, orderBy: { date: 'desc' } }),
    prisma.financialData.findMany({ where: { companyId: { in: ids } }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
    prisma.balanceSheet.findMany({ where: { companyId: { in: ids } }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
  ]);

  const latestBy = <T extends { companyId: string }>(rows: T[]): Map<string, T> => {
    const map = new Map<string, T>();
    for (const row of rows) if (!map.has(row.companyId)) map.set(row.companyId, row);
    return map;
  };
  const latestStock = latestBy(stocks);
  const latestFin = latestBy(financials);
  const latestBs = latestBy(balanceSheets);

  const out = new Map<string, { metrics: Record<string, number | null>; businessModel: BusinessModelInference | null }>();
  for (const comp of companies) {
    const id = comp.id;
    const st = latestStock.get(id);
    const fin = latestFin.get(id);
    if (!st || !fin) continue;
    const m: Record<string, number | null> = {
      pe: st.peRatio ?? null,
      netMargin: fin.revenue != null && fin.revenue > 0 ? (fin.netIncome ?? 0) / fin.revenue : null,
      fcfYield: st.marketCap && st.marketCap > 0 && fin.freeCashFlow != null ? fin.freeCashFlow / st.marketCap : null,
      ndEbitda: null,
    };
    const bs = latestBs.get(id);
    if (bs && fin.ebitda && fin.ebitda > 0) {
      const cash = (bs.cashAndCashEquivalents ?? 0) + (bs.shortTermInvestments ?? 0);
      const debt = (bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0);
      m.ndEbitda = (debt - cash) / fin.ebitda;
    }
    let businessModel: BusinessModelInference | null = null;
    try {
      businessModel = inferBusinessModel(
        { financials: [fin], balanceSheets: bs ? [bs] : [], stock: st } as any,
        comp.sector,
        comp.industry,
      );
    } catch {
      businessModel = null;
    }
    out.set(id, { metrics: m, businessModel });
  }
  return out;
}

app.get('/api/companies/business-model-counts', async (_req, res) => {
  try {
    const companies = await prisma.company.findMany({ where: { active: true }, select: { id: true, sector: true, industry: true } });
    const mm = await getCompanyMetrics(companies);
    const counts: Record<string, number> = {};
    for (const c of companies) {
      const bm = mm.get(c.id)?.businessModel;
      const key = bm?.model ?? 'none';
      counts[key] = (counts[key] || 0) + 1;
    }
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching business model counts' });
  }
});

app.get('/api/companies/facets', async (_req, res) => {
  try {
    const [sectorRows, countryRows] = await Promise.all([
      prisma.company.findMany({
        where: { active: true, sector: { not: null } },
        select: { sector: true },
        distinct: ['sector'],
        orderBy: { sector: 'asc' },
      }),
      prisma.company.findMany({
        where: { active: true, country: { not: null } },
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
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });

    const stockMetrics = await prisma.stockMetric.findMany({
      where: { companyId: company.id },
      orderBy: { date: 'desc' },
    });

    const balanceSheets = await prisma.balanceSheet.findMany({
      where: { companyId: company.id },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });

    const segments = await prisma.revenueSegment.findMany({
      where: { companyId: company.id },
      orderBy: { year: 'desc' },
    });

    const dataSync = await prisma.dataSync.findUnique({
      where: { companyId: company.id },
    });

    res.json({ company, financials, stockMetrics, balanceSheets, segments, dataSync });
  } catch (error) {
    console.error('[Companies] Error fetching profile:', error);
    res.status(500).json({ error: 'Error fetching company profile' });
  }
});

app.get('/api/companies/:ticker/metric-variations', async (req, res) => {
  try {
    const { ticker } = req.params;
    const company = await prisma.company.findUnique({ where: { ticker: ticker.toUpperCase() } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const variations = await getMetricVariations(company.id, company.ticker);
    res.json({ ticker: company.ticker, variations });
  } catch (error) {
    console.error('[Companies] Error fetching metric variations:', error);
    res.status(500).json({ error: 'Error fetching metric variations' });
  }
});

// ── Company valuation (single source of truth) ────────────────────────────

const VALUATION_ENDPOINT_TTL_MS = 30 * 1000;
const valuationEndpointCache = new Map<string, { at: number; data: unknown }>();

app.get('/api/companies/:ticker/valuation', async (req, res) => {
  try {
    const { ticker } = req.params;
    const q = req.query as Record<string, string>;
    const qs = Object.keys(q).sort().map((k) => `${k}=${q[k]}`).join('&');
    const cacheKey = `${ticker.toUpperCase()}|${qs}`;
    const cached = valuationEndpointCache.get(cacheKey);
    if (cached && Date.now() - cached.at < VALUATION_ENDPOINT_TTL_MS) {
      res.json(cached.data);
      return;
    }

    const company = await prisma.company.findUnique({ where: { ticker: ticker.toUpperCase() } });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const [financials, balanceSheets, stockMetrics] = await Promise.all([
      prisma.financialData.findMany({ where: { companyId: company.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
      prisma.balanceSheet.findMany({ where: { companyId: company.id }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
      prisma.stockMetric.findMany({ where: { companyId: company.id }, orderBy: { date: 'desc' } }),
    ]);

    const stock = stockMetrics[0];
    if (!stock) {
      res.status(400).json({ error: 'Sin datos de mercado para esta empresa' });
      return;
    }

    const input: ValuationInput = {
      financials: financials as any,
      balanceSheets: balanceSheets as any,
      stock: stock as any,
      currency: company.currency || 'USD',
    };

    const configs = getSectorConfigs(company.sector, company.industry);
    if (isConsumerCyclical(company.sector, company.industry)) {
      const seed = dcfSeedRates(input, { growthRate: configs.dcf.growthRate, discountRate: configs.dcf.discountRate }, company.sector, company.industry);
      if (seed.growthApplied) {
        configs.dcf.growthRate = seed.growthRate;
        configs.dcf.discountRate = seed.discountRate;
      }
    }
    if (stock.pbRatio && stock.pbRatio >= 0.2 && stock.pbRatio <= 20) {
      configs.pb.targetPB = stock.pbRatio;
    }

    const growth = parseFloatParam(q.growth);
    const discount = parseFloatParam(q.discount);
    if (growth != null) configs.dcf.growthRate = growth;
    if (discount != null) configs.dcf.discountRate = discount;
    const horizon = parseFloatParam(q.horizon);
    if (horizon != null) configs.dcf.horizonYears = horizon;
    const per = parseFloatParam(q.per);
    if (per != null) configs.per.targetPE = per;
    const pb = parseFloatParam(q.pb);
    if (pb != null) configs.pb.targetPB = pb;
    const ps = parseFloatParam(q.ps);
    if (ps != null) configs.ps.targetPS = ps;
    const evEbitda = parseFloatParam(q.evEbitda);
    if (evEbitda != null) configs.evEbitda.targetMultiple = evEbitda;
    const evEbit = parseFloatParam(q.evEbit);
    if (evEbit != null) configs.evEbit.targetMultiple = evEbit;
    const ddmGrowth = parseFloatParam(q.ddmGrowth);
    if (ddmGrowth != null) configs.ddm.growthRate = ddmGrowth;
    const ddmReturn = parseFloatParam(q.ddmReturn);
    if (ddmReturn != null) configs.ddm.requiredReturn = ddmReturn;
    const fcfYield = parseFloatParam(q.fcfYield);
    if (fcfYield != null) configs.fcfYield.targetYield = fcfYield;

    const flag = (v: string | undefined): boolean => v === '1' || v === 'true';
    const ccOverride = { growth: growth != null || flag(q.ccGrowth), discount: discount != null || flag(q.ccDiscount) };

    const results = computeAll(input, configs, company.sector, company.industry, ccOverride);
    const recommended = getRecommendedFairValue(results, input, company.sector, company.industry);
    const businessModel = recommended.businessModel ?? getRecommendedModel(input, company.sector, company.industry).businessModel ?? null;
    const currentPrice = stock.currentPrice ?? 0;
    const verdict: { verdict: 'buy' | 'hold' | 'sell' | 'na'; upside: number | null; label: string } = (() => {
      const fv = recommended.fairValue;
      if (fv == null || currentPrice <= 0) return { verdict: 'na', upside: null, label: 'Sin datos' };
      const upside = (fv - currentPrice) / currentPrice;
      if (upside > 0.15) return { verdict: 'buy', upside, label: 'Infravalorada' };
      if (upside < -0.15) return { verdict: 'sell', upside, label: 'Sobrevalorada' };
      return { verdict: 'hold', upside, label: 'Justa' };
    })();

    const payload = {
      ticker: company.ticker,
      asOf: stock.date,
      currentPrice,
      results,
      recommended,
      businessModel,
      verdict,
      configs,
    };
    valuationEndpointCache.set(cacheKey, { at: Date.now(), data: payload });
    res.json(payload);
  } catch (error) {
    console.error('[Companies] Error computing valuation:', error);
    res.status(500).json({ error: 'Error computing valuation' });
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
    where: { active: true },
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
      const valInput = {
        financials: companyFinancials,
        balanceSheets: balanceByCompany.get(c.id) ?? [],
        stock,
      } as any;
      const results = computeAll(
        valInput,
        getSectorConfigs(c.sector, c.industry),
        c.sector,
        c.industry,
      );
      const recommended = results.find((r) => r.id === getRecommendedModel(valInput, c.sector, c.industry).id);
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

app.get('/api/market/sector-averages', async (req, res) => {
  try {
    const sector = (req.query.sector as string) || 'Technology';
    const averages = await getMarketAverages(sector);
    res.json(averages);
  } catch {
    res.status(500).json({ error: 'Error fetching sector averages' });
  }
});

// ── Mount routes ──────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/alarms', alarmsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/field-config', fieldConfigRoutes);
app.use('/api/admin/statements', statementsRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/commodities', commodityRoutes);

app.get('/api/commodities/mapping', async (req, res) => {
  try {
    const { ticker, industry, sector } = req.query as Record<string, string>;
    if (!ticker) {
      res.status(400).json({ error: 'Missing ticker' });
      return;
    }
    const mapping = getMappedCommodity(ticker, industry ?? null, sector ?? null);
    res.json(mapping);
  } catch (error) {
    console.error('[Commodities] Error resolving mapping:', error);
    res.status(500).json({ error: 'Error resolving commodity mapping' });
  }
});

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

app.put('/api/settings', requireAdmin, settingsLimiter, async (req: AuthRequest, res) => {
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

// ── Sitemap ────────────────────────────────────────────────────────────────

app.get('/sitemap.xml', async (_req, res) => {
  try {
    res.header('Content-Type', 'application/xml');
    const companies = await prisma.company.findMany({
      where: { active: true },
      select: { ticker: true },
      orderBy: { ticker: 'asc' },
    });

    const urls = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/formacion', priority: '0.8', changefreq: 'weekly' },
      { loc: '/plans', priority: '0.7', changefreq: 'monthly' },
      { loc: '/legal/terminos', priority: '0.3', changefreq: 'monthly' },
      { loc: '/legal/privacidad', priority: '0.3', changefreq: 'monthly' },
      { loc: '/legal/cookies', priority: '0.3', changefreq: 'monthly' },
      { loc: '/legal/riesgos', priority: '0.3', changefreq: 'monthly' },
      ...companies.map(c => ({
        loc: `/empresa/${c.ticker}`,
        priority: '0.7',
        changefreq: 'weekly' as const,
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>https://datainvestments.dionestudio.es${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

    res.send(xml);
  } catch (error) {
    console.error('[Sitemap] Error:', error);
    res.status(500).send('<?xml version="1.0"?><urlset/>');
  }
});

// ── Error handler ─────────────────────────────────────────────────────────

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[FATAL]', err);
  const requestId = crypto.randomUUID();
  console.error(`[FATAL] Request ID: ${requestId}`);
  res.status(500).json({ error: 'Error interno del servidor', requestId });
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
