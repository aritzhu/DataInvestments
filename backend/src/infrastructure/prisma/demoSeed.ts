import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedCourses } from './coursesDemo';
import { computeAll, getSectorConfigs, getRecommendedModel } from '../../services/valuationService';

const prisma = new PrismaClient();

const YEARS = [2020, 2021, 2022, 2023, 2024];

interface FinTemplate {
  grossMargin: number;
  opMargin: number;
  ebitdaMargin: number;
  netMargin: number;
  ocfMargin: number;
  capexMargin: number;
  divMargin: number;
  buybackPct: number;
}

interface BalTemplate {
  cashRatio: number;
  equityRatio: number;
  debtRatio: number;
  arDays: number;
  invDays: number;
}

interface DemoCompany {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  ceo: string;
  employees: number;
  country: string;
  exchange: string;
  currency: string;
  website: string;
  ipoDate: string;
  revenue2020: number;
  growth: [number, number, number, number];
  assetTurnover: number;
  shares: number;
  beta: number;
  targetMargin: number;
  piotroski: number;
  fin: FinTemplate;
  bal: BalTemplate;
  segments: { name: string; type: string; pct: number }[];
}

const COMPANIES: DemoCompany[] = [
  {
    ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics',
    description: 'Apple Inc. diseña, fabrica y comercializa smartphones, ordenadores, tabletas y wearables en todo el mundo.',
    ceo: 'Tim Cook', employees: 164000, country: 'US', exchange: 'NASDAQ', currency: 'USD',
    website: 'https://www.apple.com', ipoDate: '1980-12-12',
    revenue2020: 274515000000, growth: [0.333, 0.078, -0.028, 0.02],
    assetTurnover: 1.1, shares: 15170000000, beta: 1.25, targetMargin: 0.05, piotroski: 8,
    fin: { grossMargin: 0.45, opMargin: 0.29, ebitdaMargin: 0.32, netMargin: 0.24, ocfMargin: 0.28, capexMargin: 0.026, divMargin: 0.039, buybackPct: 1.0 },
    bal: { cashRatio: 0.18, equityRatio: 0.16, debtRatio: 0.29, arDays: 55, invDays: 10 },
    segments: [
      { name: 'iPhone', type: 'product', pct: 52 },
      { name: 'Mac', type: 'product', pct: 11 },
      { name: 'iPad', type: 'product', pct: 8 },
      { name: 'Servicios', type: 'product', pct: 22 },
      { name: 'Wearables y otros', type: 'product', pct: 7 },
    ],
  },
  {
    ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software',
    description: 'Microsoft desarrolla y da soporte a software, servicios, dispositivos y soluciones en todo el mundo.',
    ceo: 'Satya Nadella', employees: 228000, country: 'US', exchange: 'NASDAQ', currency: 'USD',
    website: 'https://www.microsoft.com', ipoDate: '1986-03-13',
    revenue2020: 143015000000, growth: [0.175, 0.18, 0.069, 0.157],
    assetTurnover: 0.5, shares: 7430000000, beta: 0.9, targetMargin: 0.42, piotroski: 8,
    fin: { grossMargin: 0.68, opMargin: 0.44, ebitdaMargin: 0.53, netMargin: 0.34, ocfMargin: 0.49, capexMargin: 0.18, divMargin: 0.089, buybackPct: 0.21 },
    bal: { cashRatio: 0.22, equityRatio: 0.5, debtRatio: 0.39, arDays: 80, invDays: 4 },
    segments: [
      { name: 'Nube (Azure)', type: 'product', pct: 42 },
      { name: 'Productivity (Office, LinkedIn)', type: 'product', pct: 34 },
      { name: 'Windows y hardware', type: 'product', pct: 24 },
    ],
  },
  {
    ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors',
    description: 'NVIDIA diseña GPUs y plataformas de computación acelerada para IA, gaming y centros de datos.',
    ceo: 'Jensen Huang', employees: 29600, country: 'US', exchange: 'NASDAQ', currency: 'USD',
    website: 'https://www.nvidia.com', ipoDate: '1999-01-22',
    revenue2020: 16675000000, growth: [0.614, 0.002, 0.217, 1.259],
    assetTurnover: 0.6, shares: 24600000000, beta: 1.7, targetMargin: 0.38, piotroski: 8,
    fin: { grossMargin: 0.72, opMargin: 0.6, ebitdaMargin: 0.63, netMargin: 0.55, ocfMargin: 0.58, capexMargin: 0.05, divMargin: 0.004, buybackPct: 0.9 },
    bal: { cashRatio: 0.2, equityRatio: 0.7, debtRatio: 0.15, arDays: 55, invDays: 30 },
    segments: [
      { name: 'Centros de datos', type: 'product', pct: 78 },
      { name: 'Gaming', type: 'product', pct: 14 },
      { name: 'Profesional y automoción', type: 'product', pct: 8 },
    ],
  },
  {
    ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Content & Information',
    description: 'Alphabet ofrece buscador, publicidad digital, nube y plataformas de video y mapas en todo el mundo.',
    ceo: 'Sundar Pichai', employees: 183000, country: 'US', exchange: 'NASDAQ', currency: 'USD',
    website: 'https://abc.xyz', ipoDate: '2004-08-19',
    revenue2020: 182527000000, growth: [0.412, 0.098, 0.087, 0.136],
    assetTurnover: 0.85, shares: 12300000000, beta: 1.05, targetMargin: 0.33, piotroski: 8,
    fin: { grossMargin: 0.56, opMargin: 0.28, ebitdaMargin: 0.32, netMargin: 0.28, ocfMargin: 0.36, capexMargin: 0.092, divMargin: 0.0, buybackPct: 0.6 },
    bal: { cashRatio: 0.42, equityRatio: 0.72, debtRatio: 0.18, arDays: 55, invDays: 15 },
    segments: [
      { name: 'Publicidad Google', type: 'product', pct: 77 },
      { name: 'Google Cloud', type: 'product', pct: 13 },
      { name: 'Otras apuestas', type: 'product', pct: 10 },
    ],
  },
  {
    ticker: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Discretionary', industry: 'Internet Retail',
    description: 'Amazon opera comercio electrónico, publicidad, suscripciones y la nube AWS a escala global.',
    ceo: 'Andy Jassy', employees: 1541000, country: 'US', exchange: 'NASDAQ', currency: 'USD',
    website: 'https://www.amazon.com', ipoDate: '1997-05-15',
    revenue2020: 386064000000, growth: [0.217, 0.094, 0.118, 0.111],
    assetTurnover: 1.0, shares: 10600000000, beta: 1.15, targetMargin: -0.05, piotroski: 7,
    fin: { grossMargin: 0.4, opMargin: 0.05, ebitdaMargin: 0.13, netMargin: 0.09, ocfMargin: 0.14, capexMargin: 0.07, divMargin: 0.0, buybackPct: 0.0 },
    bal: { cashRatio: 0.1, equityRatio: 0.3, debtRatio: 0.2, arDays: 45, invDays: 50 },
    segments: [
      { name: 'Tienda online', type: 'product', pct: 50 },
      { name: 'AWS', type: 'product', pct: 15 },
      { name: 'Publicidad', type: 'product', pct: 8 },
      { name: 'Otros', type: 'product', pct: 27 },
    ],
  },
  {
    ticker: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer Discretionary', industry: 'Auto Manufacturers',
    description: 'Tesla diseña, fabrica y vende vehículos eléctricos, baterías y soluciones de energía solar.',
    ceo: 'Elon Musk', employees: 140473, country: 'US', exchange: 'NASDAQ', currency: 'USD',
    website: 'https://www.tesla.com', ipoDate: '2010-06-29',
    revenue2020: 31536000000, growth: [0.707, 0.514, 0.188, 0.009],
    assetTurnover: 0.8, shares: 3200000000, beta: 2.1, targetMargin: -0.45, piotroski: 6,
    fin: { grossMargin: 0.18, opMargin: 0.06, ebitdaMargin: 0.12, netMargin: 0.06, ocfMargin: 0.12, capexMargin: 0.09, divMargin: 0.0, buybackPct: 0.0 },
    bal: { cashRatio: 0.2, equityRatio: 0.35, debtRatio: 0.1, arDays: 35, invDays: 22 },
    segments: [
      { name: 'Automoción', type: 'product', pct: 84 },
      { name: 'Generación y almacenamiento de energía', type: 'product', pct: 12 },
      { name: 'Servicios y otros', type: 'product', pct: 4 },
    ],
  },
  {
    ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', industry: 'Banks—Diversified',
    description: 'JPMorgan es un banco y holding financiero global con banca de inversión, consumo y gestión de activos.',
    ceo: 'Jamie Dimon', employees: 309926, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.jpmorganchase.com', ipoDate: '1969-01-02',
    revenue2020: 119543000000, growth: [0.04, 0.04, 0.21, 0.08],
    assetTurnover: 0.08, shares: 2850000000, beta: 1.1, targetMargin: -0.15, piotroski: 7,
    fin: { grossMargin: 0.6, opMargin: 0.35, ebitdaMargin: 0.4, netMargin: 0.29, ocfMargin: 0.3, capexMargin: 0.02, divMargin: 0.08, buybackPct: 0.3 },
    bal: { cashRatio: 0.12, equityRatio: 0.12, debtRatio: 0.3, arDays: 20, invDays: 0 },
    segments: [
      { name: 'Banca de consumo', type: 'product', pct: 38 },
      { name: 'Banca corporativa e inversión', type: 'product', pct: 42 },
      { name: 'Gestión de activos y patrimonio', type: 'product', pct: 20 },
    ],
  },
  {
    ticker: 'WFC', name: 'Wells Fargo & Company', sector: 'Financial Services', industry: 'Banks—Diversified',
    description: 'Wells Fargo ofrece banca minorista, comercial y corporativa en Estados Unidos.',
    ceo: 'Charlie Scharf', employees: 238000, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.wellsfargo.com', ipoDate: '1962-01-02',
    revenue2020: 78531000000, growth: [0.01, -0.05, 0.15, 0.04],
    assetTurnover: 0.07, shares: 3600000000, beta: 1.2, targetMargin: -0.18, piotroski: 6,
    fin: { grossMargin: 0.55, opMargin: 0.3, ebitdaMargin: 0.35, netMargin: 0.22, ocfMargin: 0.26, capexMargin: 0.01, divMargin: 0.09, buybackPct: 0.3 },
    bal: { cashRatio: 0.1, equityRatio: 0.11, debtRatio: 0.3, arDays: 20, invDays: 0 },
    segments: [
      { name: 'Banca de consumo', type: 'product', pct: 40 },
      { name: 'Banca comercial', type: 'product', pct: 35 },
      { name: 'Banca corporativa e inversión', type: 'product', pct: 25 },
    ],
  },
  {
    ticker: 'V', name: 'Visa Inc.', sector: 'Financial Services', industry: 'Financial Data & Stock Exchanges',
    description: 'Visa opera la mayor red de pagos electrónicos del mundo entre comercios, bancos y consumidores.',
    ceo: 'Ryan McInerney', employees: 28500, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.visa.com', ipoDate: '2008-03-19',
    revenue2020: 21846000000, growth: [0.1, 0.216, 0.111, 0.094],
    assetTurnover: 0.35, shares: 2050000000, beta: 0.95, targetMargin: 0.03, piotroski: 8,
    fin: { grossMargin: 0.8, opMargin: 0.63, ebitdaMargin: 0.66, netMargin: 0.49, ocfMargin: 0.6, capexMargin: 0.04, divMargin: 0.022, buybackPct: 0.5 },
    bal: { cashRatio: 0.15, equityRatio: 0.55, debtRatio: 0.3, arDays: 25, invDays: 0 },
    segments: [
      { name: 'Servicios de pago', type: 'product', pct: 54 },
      { name: 'Procesamiento de datos', type: 'product', pct: 32 },
      { name: 'Transacciones internacionales', type: 'product', pct: 14 },
    ],
  },
  {
    ticker: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Defensive', industry: 'Household & Personal Products',
    description: 'P&G fabrica productos de consumo para el hogar, el cuidado personal y la salud.',
    ceo: 'Jon Moeller', employees: 107000, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.pg.com', ipoDate: '1970-01-02',
    revenue2020: 71094000000, growth: [0.053, -0.012, 0.022, 0.026],
    assetTurnover: 0.7, shares: 2360000000, beta: 0.45, targetMargin: -0.12, piotroski: 8,
    fin: { grossMargin: 0.5, opMargin: 0.21, ebitdaMargin: 0.25, netMargin: 0.18, ocfMargin: 0.21, capexMargin: 0.03, divMargin: 0.07, buybackPct: 0.4 },
    bal: { cashRatio: 0.12, equityRatio: 0.42, debtRatio: 0.35, arDays: 45, invDays: 30 },
    segments: [
      { name: 'Belleza y cuidado personal', type: 'product', pct: 45 },
      { name: 'Cuidado del hogar', type: 'product', pct: 35 },
      { name: 'Salud y bienestar', type: 'product', pct: 20 },
    ],
  },
  {
    ticker: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Defensive', industry: 'Beverages—Non-Alcoholic',
    description: 'Coca-Cola produce y distribuye refrescos, aguas y zumos en más de 200 países.',
    ceo: 'James Quincey', employees: 79100, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.coca-cola.com', ipoDate: '1919-09-05',
    revenue2020: 33014000000, growth: [0.167, 0.112, 0.057, 0.026],
    assetTurnover: 0.55, shares: 4300000000, beta: 0.6, targetMargin: 0.18, piotroski: 8,
    fin: { grossMargin: 0.6, opMargin: 0.27, ebitdaMargin: 0.32, netMargin: 0.22, ocfMargin: 0.28, capexMargin: 0.04, divMargin: 0.18, buybackPct: 0.5 },
    bal: { cashRatio: 0.12, equityRatio: 0.3, debtRatio: 0.4, arDays: 40, invDays: 28 },
    segments: [
      { name: 'Bebidas con gas', type: 'product', pct: 68 },
      { name: 'Hidratación y deporte', type: 'product', pct: 20 },
      { name: 'Zumos y tés', type: 'product', pct: 12 },
    ],
  },
  {
    ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Drug Manufacturers—General',
    description: 'Johnson & Johnson desarrolla fármacos, dispositivos médicos y productos de salud para el consumidor.',
    ceo: 'Joaquin Duato', employees: 131900, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.jnj.com', ipoDate: '1944-09-25',
    revenue2020: 82584000000, growth: [0.136, 0.013, 0.065, 0.043],
    assetTurnover: 0.6, shares: 2400000000, beta: 0.55, targetMargin: 0.3, piotroski: 8,
    fin: { grossMargin: 0.68, opMargin: 0.22, ebitdaMargin: 0.29, netMargin: 0.16, ocfMargin: 0.26, capexMargin: 0.045, divMargin: 0.12, buybackPct: 0.2 },
    bal: { cashRatio: 0.13, equityRatio: 0.42, debtRatio: 0.35, arDays: 60, invDays: 40 },
    segments: [
      { name: 'Medicamentos innovadores', type: 'product', pct: 58 },
      { name: 'Tecnología médica', type: 'product', pct: 42 },
    ],
  },
  {
    ticker: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Drug Manufacturers—General',
    description: 'Pfizer desarrolla y comercializa vacunas y medicamentos en todo el mundo.',
    ceo: 'Albert Bourla', employees: 88000, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.pfizer.com', ipoDate: '1942-01-02',
    revenue2020: 41908000000, growth: [0.92, 0.234, -0.41, 0.02],
    assetTurnover: 0.5, shares: 5650000000, beta: 0.65, targetMargin: -0.35, piotroski: 6,
    fin: { grossMargin: 0.62, opMargin: 0.25, ebitdaMargin: 0.32, netMargin: 0.19, ocfMargin: 0.3, capexMargin: 0.04, divMargin: 0.12, buybackPct: 0.1 },
    bal: { cashRatio: 0.15, equityRatio: 0.45, debtRatio: 0.25, arDays: 60, invDays: 45 },
    segments: [
      { name: 'Vacunas', type: 'product', pct: 42 },
      { name: 'Oncología', type: 'product', pct: 25 },
      { name: 'Hospital', type: 'product', pct: 18 },
      { name: 'Otros', type: 'product', pct: 15 },
    ],
  },
  {
    ticker: 'T', name: 'AT&T Inc.', sector: 'Communication Services', industry: 'Telecom Services',
    description: 'AT&T ofrece conectividad móvil y de fibra, y opera redes de telecomunicaciones en Estados Unidos.',
    ceo: 'John Stankey', employees: 160300, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.att.com', ipoDate: '1984-01-02',
    revenue2020: 171760000000, growth: [-0.024, -0.009, -0.024, -0.005],
    assetTurnover: 0.4, shares: 7200000000, beta: 0.65, targetMargin: -0.28, piotroski: 5,
    fin: { grossMargin: 0.55, opMargin: 0.11, ebitdaMargin: 0.32, netMargin: 0.07, ocfMargin: 0.24, capexMargin: 0.19, divMargin: 0.05, buybackPct: 0.1 },
    bal: { cashRatio: 0.04, equityRatio: 0.28, debtRatio: 0.42, arDays: 40, invDays: 0 },
    segments: [
      { name: 'Movilidad', type: 'product', pct: 58 },
      { name: 'Fibra y banda ancha', type: 'product', pct: 25 },
      { name: 'Negocios', type: 'product', pct: 17 },
    ],
  },
  {
    ticker: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas',
    description: 'ExxonMobil explora, produce y refina petróleo y gas natural a escala global.',
    ceo: 'Darren Woods', employees: 62500, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.exxonmobil.com', ipoDate: '1920-01-02',
    revenue2020: 178574000000, growth: [0.576, 0.452, -0.168, 0.017],
    assetTurnover: 0.8, shares: 4400000000, beta: 0.9, targetMargin: 0.28, piotroski: 7,
    fin: { grossMargin: 0.3, opMargin: 0.15, ebitdaMargin: 0.22, netMargin: 0.1, ocfMargin: 0.17, capexMargin: 0.09, divMargin: 0.05, buybackPct: 0.3 },
    bal: { cashRatio: 0.05, equityRatio: 0.45, debtRatio: 0.2, arDays: 35, invDays: 25 },
    segments: [
      { name: 'Upstream', type: 'product', pct: 62 },
      { name: 'Downstream y química', type: 'product', pct: 38 },
    ],
  },
  {
    ticker: 'SHEL', name: 'Shell plc', sector: 'Energy', industry: 'Oil & Gas',
    description: 'Shell opera exploración y producción de hidrocarburos, y comercialización de energía en todo el mundo.',
    ceo: 'Wael Sawan', employees: 90000, country: 'NL', exchange: 'AMS', currency: 'EUR',
    website: 'https://www.shell.com', ipoDate: '2005-07-20',
    revenue2020: 180543000000, growth: [0.494, 0.29, -0.18, -0.02],
    assetTurnover: 0.8, shares: 6200000000, beta: 0.85, targetMargin: -0.02, piotroski: 7,
    fin: { grossMargin: 0.28, opMargin: 0.13, ebitdaMargin: 0.2, netMargin: 0.09, ocfMargin: 0.16, capexMargin: 0.08, divMargin: 0.04, buybackPct: 0.3 },
    bal: { cashRatio: 0.06, equityRatio: 0.45, debtRatio: 0.22, arDays: 40, invDays: 22 },
    segments: [
      { name: 'Exploración y producción', type: 'product', pct: 55 },
      { name: 'Comercialización y renovables', type: 'product', pct: 30 },
      { name: 'Química', type: 'product', pct: 15 },
    ],
  },
  {
    ticker: 'RYAAY', name: 'Ryanair Holdings plc', sector: 'Industrials', industry: 'Airlines',
    description: 'Ryanair es la aerolínea low-cost más grande de Europa por número de pasajeros.',
    ceo: 'Michael O\'Leary', employees: 18500, country: 'IE', exchange: 'NASDAQ', currency: 'USD',
    website: 'https://www.ryanair.com', ipoDate: '1997-05-23',
    revenue2020: 8500000000, growth: [-0.02, 0.62, 0.29, 0.08],
    assetTurnover: 0.5, shares: 1140000000, beta: 1.35, targetMargin: 0.2, piotroski: 7,
    fin: { grossMargin: 0.25, opMargin: 0.14, ebitdaMargin: 0.2, netMargin: 0.12, ocfMargin: 0.18, capexMargin: 0.07, divMargin: 0.0, buybackPct: 0.5 },
    bal: { cashRatio: 0.15, equityRatio: 0.35, debtRatio: 0.25, arDays: 20, invDays: 0 },
    segments: [
      { name: 'Venta de billetes', type: 'product', pct: 72 },
      { name: 'Ingresos auxiliares', type: 'product', pct: 28 },
    ],
  },
  {
    ticker: 'DTE', name: 'DTE Energy Company', sector: 'Utilities', industry: 'Regulated Electric',
    description: 'DTE Energy genera y distribuye electricidad y gas natural en el estado de Michigan.',
    ceo: 'Jerry Norcia', employees: 11000, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.dteenergy.com', ipoDate: '1948-01-02',
    revenue2020: 12746000000, growth: [0.05, 0.04, 0.07, 0.06],
    assetTurnover: 0.28, shares: 206000000, beta: 0.5, targetMargin: 0.24, piotroski: 7,
    fin: { grossMargin: 0.3, opMargin: 0.16, ebitdaMargin: 0.32, netMargin: 0.1, ocfMargin: 0.25, capexMargin: 0.19, divMargin: 0.12, buybackPct: 0.0 },
    bal: { cashRatio: 0.02, equityRatio: 0.38, debtRatio: 0.42, arDays: 35, invDays: 25 },
    segments: [
      { name: 'Electricidad', type: 'product', pct: 62 },
      { name: 'Gas natural', type: 'product', pct: 38 },
    ],
  },
  {
    ticker: 'NEE', name: 'NextEra Energy, Inc.', sector: 'Utilities', industry: 'Regulated Electric',
    description: 'NextEra es una de las mayores productoras de energía renovable del mundo.',
    ceo: 'John Ketchum', employees: 15100, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.nexteraenergy.com', ipoDate: '1950-01-02',
    revenue2020: 17998000000, growth: [0.06, 0.1, 0.08, 0.06],
    assetTurnover: 0.28, shares: 2050000000, beta: 0.55, targetMargin: -0.22, piotroski: 7,
    fin: { grossMargin: 0.32, opMargin: 0.15, ebitdaMargin: 0.34, netMargin: 0.1, ocfMargin: 0.26, capexMargin: 0.2, divMargin: 0.1, buybackPct: 0.0 },
    bal: { cashRatio: 0.02, equityRatio: 0.36, debtRatio: 0.45, arDays: 35, invDays: 20 },
    segments: [
      { name: 'Electricidad regulada (FPL)', type: 'product', pct: 55 },
      { name: 'Energía limpia', type: 'product', pct: 45 },
    ],
  },
  {
    ticker: 'O', name: 'Realty Income Corporation', sector: 'Real Estate', industry: 'REIT',
    description: 'Realty Income es un REIT propietario de miles de inmuebles comerciales alquilados a largo plazo.',
    ceo: 'Sumit Roy', employees: 400, country: 'US', exchange: 'NYSE', currency: 'USD',
    website: 'https://www.realtyincome.com', ipoDate: '1994-10-18',
    revenue2020: 1760000000, growth: [0.24, 0.36, 0.12, 0.07],
    assetTurnover: 0.15, shares: 700000000, beta: 0.75, targetMargin: 0.32, piotroski: 6,
    fin: { grossMargin: 0.9, opMargin: 0.35, ebitdaMargin: 0.6, netMargin: 0.25, ocfMargin: 0.5, capexMargin: 0.05, divMargin: 0.5, buybackPct: 0.0 },
    bal: { cashRatio: 0.02, equityRatio: 0.35, debtRatio: 0.5, arDays: 10, invDays: 0 },
    segments: [
      { name: 'Comercio minorista', type: 'product', pct: 74 },
      { name: 'Industrial', type: 'product', pct: 18 },
      { name: 'Otros usos', type: 'product', pct: 8 },
    ],
  },
  {
    ticker: 'SAN', name: 'Banco Santander S.A.', sector: 'Financial Services', industry: 'Banks—Diversified',
    description: 'Santander es un banco global con negocios minoristas en Europa, Latinoamérica y Estados Unidos.',
    ceo: 'Héctor Grisi', employees: 205800, country: 'ES', exchange: 'BMAD', currency: 'EUR',
    website: 'https://www.santander.com', ipoDate: '1999-01-01',
    revenue2020: 52530000000, growth: [0.02, 0.03, 0.12, 0.06],
    assetTurnover: 0.045, shares: 15100000000, beta: 1.1, targetMargin: 0.15, piotroski: 7,
    fin: { grossMargin: 0.55, opMargin: 0.3, ebitdaMargin: 0.35, netMargin: 0.19, ocfMargin: 0.22, capexMargin: 0.01, divMargin: 0.05, buybackPct: 0.2 },
    bal: { cashRatio: 0.1, equityRatio: 0.09, debtRatio: 0.3, arDays: 30, invDays: 0 },
    segments: [
      { name: 'Banca minorista', type: 'product', pct: 55 },
      { name: 'Consumer finance', type: 'product', pct: 25 },
      { name: 'Banca corporativa', type: 'product', pct: 20 },
    ],
  },
  {
    ticker: 'BBVA', name: 'Banco Bilbao Vizcaya Argentaria S.A.', sector: 'Financial Services', industry: 'Banks—Diversified',
    description: 'BBVA opera banca minorista y digital en España, México, Turquía y Sudamérica.',
    ceo: 'Onur Genç', employees: 121500, country: 'ES', exchange: 'BMAD', currency: 'EUR',
    website: 'https://www.bbva.com', ipoDate: '1988-10-01',
    revenue2020: 24600000000, growth: [0.03, 0.05, 0.15, 0.08],
    assetTurnover: 0.04, shares: 6000000000, beta: 1.15, targetMargin: -0.2, piotroski: 7,
    fin: { grossMargin: 0.55, opMargin: 0.32, ebitdaMargin: 0.37, netMargin: 0.3, ocfMargin: 0.24, capexMargin: 0.01, divMargin: 0.05, buybackPct: 0.25 },
    bal: { cashRatio: 0.1, equityRatio: 0.1, debtRatio: 0.3, arDays: 30, invDays: 0 },
    segments: [
      { name: 'España', type: 'geographic', pct: 35 },
      { name: 'México', type: 'geographic', pct: 45 },
      { name: 'Sudamérica y otros', type: 'geographic', pct: 20 },
    ],
  },
  {
    ticker: 'ITX', name: 'Industria de Diseño Textil S.A.', sector: 'Consumer Cyclical', industry: 'Specialty Retail',
    description: 'Inditex es un grupo de moda que opera marcas como Zara, Pull&Bear, Massimo Dutti y Bershka.',
    ceo: 'Óscar García Maceiras', employees: 165000, country: 'ES', exchange: 'BMAD', currency: 'EUR',
    website: 'https://www.inditex.com', ipoDate: '2001-05-23',
    revenue2020: 20362000000, growth: [0.358, 0.175, 0.104, 0.075],
    assetTurnover: 1.0, shares: 3100000000, beta: 0.9, targetMargin: 0.16, piotroski: 8,
    fin: { grossMargin: 0.57, opMargin: 0.18, ebitdaMargin: 0.24, netMargin: 0.14, ocfMargin: 0.2, capexMargin: 0.05, divMargin: 0.13, buybackPct: 0.1 },
    bal: { cashRatio: 0.18, equityRatio: 0.65, debtRatio: 0.15, arDays: 25, invDays: 45 },
    segments: [
      { name: 'Zara', type: 'product', pct: 73 },
      { name: 'Bershka y Pull&Bear', type: 'product', pct: 15 },
      { name: 'Massimo Dutti y otros', type: 'product', pct: 12 },
    ],
  },
  {
    ticker: 'SAP', name: 'SAP SE', sector: 'Technology', industry: 'Software—Application',
    description: 'SAP desarrolla software empresarial (ERP, CRM y cloud) para grandes organizaciones.',
    ceo: 'Christian Klein', employees: 107600, country: 'DE', exchange: 'XETRA', currency: 'EUR',
    website: 'https://www.sap.com', ipoDate: '1988-11-04',
    revenue2020: 27342000000, growth: [0.01, 0.109, 0.061, 0.104],
    assetTurnover: 0.6, shares: 1170000000, beta: 0.95, targetMargin: 0.26, piotroski: 7,
    fin: { grossMargin: 0.72, opMargin: 0.14, ebitdaMargin: 0.24, netMargin: 0.09, ocfMargin: 0.24, capexMargin: 0.06, divMargin: 0.05, buybackPct: 0.3 },
    bal: { cashRatio: 0.15, equityRatio: 0.5, debtRatio: 0.25, arDays: 60, invDays: 0 },
    segments: [
      { name: 'Cloud', type: 'product', pct: 42 },
      { name: 'Licencias de software', type: 'product', pct: 28 },
      { name: 'Servicios y soporte', type: 'product', pct: 30 },
    ],
  },
  {
    ticker: 'SIE', name: 'Siemens AG', sector: 'Industrials', industry: 'Specialty Industrial Machinery',
    description: 'Siemens es un conglomerado industrial y tecnológico que opera en automatización, movilidad e infraestructura.',
    ceo: 'Roland Busch', employees: 320000, country: 'DE', exchange: 'XETRA', currency: 'EUR',
    website: 'https://www.siemens.com', ipoDate: '1961-01-02',
    revenue2020: 57140000000, growth: [0.11, 0.15, 0.1, 0.03],
    assetTurnover: 0.75, shares: 800000000, beta: 1.0, targetMargin: 0.08, piotroski: 7,
    fin: { grossMargin: 0.3, opMargin: 0.11, ebitdaMargin: 0.15, netMargin: 0.1, ocfMargin: 0.13, capexMargin: 0.03, divMargin: 0.05, buybackPct: 0.3 },
    bal: { cashRatio: 0.15, equityRatio: 0.45, debtRatio: 0.2, arDays: 70, invDays: 55 },
    segments: [
      { name: 'Digital Industries', type: 'product', pct: 40 },
      { name: 'Smart Infrastructure', type: 'product', pct: 35 },
      { name: 'Mobility', type: 'product', pct: 25 },
    ],
  },
  {
    ticker: 'ASML', name: 'ASML Holding N.V.', sector: 'Technology', industry: 'Semiconductors',
    description: 'ASML fabrica las máquinas de litografía más avanzadas del mundo, esenciales para los chips.',
    ceo: 'Christophe Fouquet', employees: 42000, country: 'NL', exchange: 'AMS', currency: 'EUR',
    website: 'https://www.asml.com', ipoDate: '1995-03-15',
    revenue2020: 13979000000, growth: [0.332, 0.138, 0.302, 0.026],
    assetTurnover: 0.6, shares: 393000000, beta: 1.3, targetMargin: 0.22, piotroski: 8,
    fin: { grossMargin: 0.51, opMargin: 0.31, ebitdaMargin: 0.35, netMargin: 0.27, ocfMargin: 0.32, capexMargin: 0.04, divMargin: 0.03, buybackPct: 0.5 },
    bal: { cashRatio: 0.15, equityRatio: 0.55, debtRatio: 0.2, arDays: 70, invDays: 100 },
    segments: [
      { name: 'EUV', type: 'product', pct: 41 },
      { name: 'DUV (ArFi)', type: 'product', pct: 48 },
      { name: 'Instalaciones y servicios', type: 'product', pct: 11 },
    ],
  },
];

const DEFAULT_BOOKS = [
  { title: 'The Intelligent Investor', author: 'Benjamin Graham', isbn: '9780060555665', desc: 'El manual clásico del value investing: margen de seguridad y valor intrínseco.' },
  { title: 'Security Analysis', author: 'Benjamin Graham y David Dodd', isbn: '9780071592536', desc: 'La obra fundacional del análisis de valores y las finanzas.' },
  { title: 'Common Stocks and Uncommon Profits', author: 'Philip Fisher', isbn: '9780471445500', desc: 'Análisis cualitativo: ventajas competitivas, gestión y crecimiento.' },
  { title: 'One Up on Wall Street', author: 'Peter Lynch', isbn: '9780743200400', desc: 'Invertir en lo que conoces con método, paciencia y sentido común.' },
  { title: 'The Snowball', author: 'Alice Schroeder', isbn: '9780553384611', desc: 'La biografía definitiva de Warren Buffett, el inversor más famoso del mundo.' },
  { title: 'Margin of Safety', author: 'Seth A. Klarman', isbn: '9780887305108', desc: 'El libro más buscado del value investing: riesgo y descuento.' },
  { title: 'Value Investing', author: 'Bruce C. N. Greenwald', isbn: '9780471463399', desc: 'La evolución del value investing desde Graham hasta Buffett.' },
  { title: 'The Little Book That Beats the Market', author: 'Joel Greenblatt', isbn: '9780470624159', desc: 'La fórmula mágica: buenas empresas a precios atractivos.' },
  { title: 'The Dhandho Investor', author: 'Mohnish Pabrai', isbn: '9780470289634', desc: 'Inversiones de bajo riesgo y alto retorno inspiradas en Buffett.' },
  { title: 'You Can Be a Stock Market Genius', author: 'Joel Greenblatt', isbn: '9780684840079', desc: 'Oportunidades especiales y enfoques no convencionales.' },
];

function netDebtValue(bs: { shortTermDebt?: number | null; longTermDebt?: number | null; cashAndCashEquivalents?: number | null }): number {
  return (bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0) - (bs.cashAndCashEquivalents ?? 0);
}

function computeValuation(tpl: DemoCompany, financials: any[], balanceSheets: any[]) {
  const shares = tpl.shares;
  const latest = financials[financials.length - 1];
  const bs = balanceSheets[balanceSheets.length - 1];
  const eps = latest.netIncome / shares;
  const bvps = bs.totalStockholdersEquity / shares;
  const sps = latest.revenue / shares;
  const divPerShare = (latest.dividendsPaid ?? 0) / shares;

  const provisional = {
    currentPrice: 100,
    sharesOutstanding: shares,
    marketCap: 100 * shares,
    enterpriseValue: 100 * shares + netDebtValue(bs),
    peRatio: null,
    pbRatio: null,
    psRatio: null,
    dividendYield: 0,
  } as any;

  const valInput = { financials, balanceSheets, stock: provisional };
  const results0 = computeAll(valInput, getSectorConfigs(tpl.sector, tpl.industry), tpl.sector, tpl.industry);
  const model = getRecommendedModel(valInput, tpl.sector, tpl.industry).id;
  const rec0 = results0.find((r) => r.id === model);
  if (!rec0 || rec0.fairValue == null) {
    throw new Error(`${tpl.ticker}: no recommended valuation for model ${model}`);
  }

  const price = Math.max(0.01, rec0.fairValue * (1 - tpl.targetMargin));

  const final = {
    ...provisional,
    currentPrice: price,
    marketCap: price * shares,
    enterpriseValue: price * shares + netDebtValue(bs),
    peRatio: eps > 0 ? price / eps : null,
    pbRatio: bvps > 0 ? price / bvps : null,
    psRatio: sps > 0 ? price / sps : null,
    dividendYield: price > 0 ? divPerShare / price : 0,
  } as any;

  const results1 = computeAll({ financials, balanceSheets, stock: final }, getSectorConfigs(tpl.sector, tpl.industry), tpl.sector, tpl.industry);
  const rec1 = results1.find((r) => r.id === model);

  const fairValue = rec1?.fairValue ?? rec0.fairValue;
  const confidence = rec1?.confidence ?? rec0.confidence;
  const margin = (fairValue - price) / price;

  return { stock: final, fairValue, confidence, margin, model };
}

function round(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

async function main() {
  console.log('Seeding demo database...');

  // ── Preserve existing site settings (hero content customised by the user) ──
  const previousSettings = await prisma.siteSetting.findMany();
  const settingsMap = new Map(previousSettings.map((s) => [s.key, s.value]));

  // ── Clean everything (dependencies first) ──
  console.log('Cleaning database...');
  await prisma.portfolioSnapshot.deleteMany();
  await prisma.holding.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.alarm.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companyOverride.deleteMany();
  await prisma.dataSync.deleteMany();
  await prisma.revenueSegment.deleteMany();
  await prisma.stockMetric.deleteMany();
  await prisma.balanceSheet.deleteMany();
  await prisma.financialData.deleteMany();
  await prisma.company.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.fieldConfig.deleteMany();
  await prisma.conceptMapping.deleteMany();
  await prisma.xbrlTagMapping.deleteMany();

  // ── Users ──
  const admin = await prisma.user.create({
    data: { email: 'admin@datainvestments.com', name: 'Admin', passwordHash: await bcrypt.hash('admin123', 10), role: 'admin' },
  });
  const demo = await prisma.user.create({
    data: { email: 'demo@datainvestments.com', name: 'Usuario Demo', passwordHash: await bcrypt.hash('demo123', 10), role: 'user' },
  });
  console.log(`Users created: admin@datainvestments.com / admin123, demo@datainvestments.com / demo123`);

  // ── Companies ──
  const companyIds = new Map<string, string>();
  const companies = await prisma.company.createMany({
    data: COMPANIES.map((c) => ({
      ticker: c.ticker, name: c.name, sector: c.sector, industry: c.industry, description: c.description,
      ceo: c.ceo, employees: c.employees, country: c.country, exchange: c.exchange, currency: c.currency,
      website: c.website, ipoDate: c.ipoDate, active: true,
    })),
  });
  console.log(`Companies created: ${companies.count}`);

  const created = await prisma.company.findMany({ where: { active: true }, select: { id: true, ticker: true } });
  for (const c of created) companyIds.set(c.ticker, c.id);

  const valuationLog: string[] = [];
  const metricDate = new Date('2025-01-15');

  for (const tpl of COMPANIES) {
    const companyId = companyIds.get(tpl.ticker)!;
    const financials: any[] = [];
    const balanceSheets: any[] = [];

    let rev = tpl.revenue2020;
    for (let i = 0; i < YEARS.length; i++) {
      const year = YEARS[i];
      if (i > 0) rev *= 1 + tpl.growth[i - 1];

      const ta = rev / tpl.assetTurnover;
      const cash = ta * tpl.bal.cashRatio;
      const stInv = ta * 0.02;
      const ar = rev * (tpl.bal.arDays / 365);
      const inv = rev * (tpl.bal.invDays / 365);
      const totalCurrentAssets = cash + stInv + ar + inv;
      const nonCurrent = ta - totalCurrentAssets;
      const equity = ta * tpl.bal.equityRatio;
      const totalLiabilities = ta - equity;
      const ap = rev * 0.1;
      const std = ta * tpl.bal.debtRatio * 0.25;
      const ltd = ta * tpl.bal.debtRatio * 0.75;
      const totalCurrentLiabilities = ap + std;
      const totalNonCurrentLiabilities = totalLiabilities - totalCurrentLiabilities;

      const grossProfit = rev * tpl.fin.grossMargin;
      const ebit = rev * tpl.fin.opMargin;
      const ebitda = rev * tpl.fin.ebitdaMargin;
      const netIncome = rev * tpl.fin.netMargin;
      const ocf = rev * tpl.fin.ocfMargin;
      const capex = rev * tpl.fin.capexMargin;
      const dividendsPaid = rev * tpl.fin.divMargin;
      const shareRepurchases = netIncome * tpl.fin.buybackPct;
      const operatingExpenses = grossProfit - ebit;

      financials.push({
        companyId, year, quarter: 0,
        revenue: round(rev), costOfRevenue: round(rev - grossProfit), grossProfit: round(grossProfit),
        operatingExpenses: round(operatingExpenses), sgaExpense: round(operatingExpenses * 0.6), rdExpense: round(operatingExpenses * 0.4),
        interestExpense: round(ebit * 0.05), taxExpense: round(ebit * 0.18),
        ebitda: round(ebitda), ebit: round(ebit),
        capex: round(capex), depreciation: round(ebitda - ebit),
        operatingCashFlow: round(ocf), investingCashFlow: round(-capex - rev * 0.02), financingCashFlow: round(-dividendsPaid - shareRepurchases + ta * 0.005),
        freeCashFlow: round(ocf - capex), dividendsPaid: round(dividendsPaid), shareRepurchases: round(shareRepurchases),
        totalAssets: round(ta), totalLiabilities: round(totalLiabilities), totalEquity: round(equity),
        netIncome: round(netIncome), source: 'demo', tier: 'demo',
      });

      balanceSheets.push({
        companyId, year, quarter: 0,
        cashAndCashEquivalents: round(cash), shortTermInvestments: round(stInv),
        accountsReceivable: round(ar), inventory: round(inv), totalCurrentAssets: round(totalCurrentAssets),
        propertyPlantEquipment: round(nonCurrent * 0.55), goodwill: round(nonCurrent * 0.22), intangibleAssets: round(nonCurrent * 0.08),
        totalNonCurrentAssets: round(nonCurrent), totalAssets: round(ta),
        accountsPayable: round(ap), shortTermDebt: round(std), totalCurrentLiabilities: round(totalCurrentLiabilities),
        longTermDebt: round(ltd), totalNonCurrentLiabilities: round(totalNonCurrentLiabilities), totalLiabilities: round(totalLiabilities),
        totalStockholdersEquity: round(equity), retainedEarnings: round(equity * 0.6), treasuryStock: round(-equity * 0.15),
        source: 'demo', tier: 'demo',
      });
    }

    await prisma.financialData.createMany({ data: financials });
    await prisma.balanceSheet.createMany({ data: balanceSheets });

    const latest = financials[financials.length - 1];
    const bs = balanceSheets[balanceSheets.length - 1];
    const { stock, fairValue, confidence, margin, model } = computeValuation(tpl, financials, balanceSheets);

    const equity = bs.totalStockholdersEquity;
    const netIncome = latest.netIncome;
    const ebit = latest.ebit;
    const wc = bs.totalCurrentAssets - bs.totalCurrentLiabilities;
    const altmanZ = 1.2 * (wc / bs.totalAssets) + 1.4 * (bs.retainedEarnings / bs.totalAssets) + 3.3 * (ebit / bs.totalAssets) + 0.6 * ((stock.currentPrice * tpl.shares) / bs.totalLiabilities) + 1.0 * (latest.revenue / bs.totalAssets);

    const recommendationKey = margin > 0.15 ? 'buy' : margin < -0.15 ? 'sell' : 'hold';

    await prisma.stockMetric.create({
      data: {
        companyId, date: metricDate,
        currentPrice: round(stock.currentPrice),
        peRatio: stock.peRatio != null ? round(stock.peRatio) : null,
        pbRatio: stock.pbRatio != null ? round(stock.pbRatio) : null,
        psRatio: stock.psRatio != null ? round(stock.psRatio) : null,
        dividendYield: round(stock.dividendYield, 4),
        marketCap: round(stock.marketCap), enterpriseValue: round(stock.enterpriseValue),
        sharesOutstanding: tpl.shares,
        roe: round(netIncome / equity), roa: round(netIncome / bs.totalAssets), roic: round((ebit * 0.82) / equity),
        currentRatio: round(bs.totalCurrentAssets / bs.totalCurrentLiabilities),
        debtToEquity: round(((bs.shortTermDebt ?? 0) + (bs.longTermDebt ?? 0)) / equity),
        altmanZ: round(altmanZ, 3), piotroskiScore: tpl.piotroski,
        beta: tpl.beta,
        forwardPE: stock.peRatio != null ? round(stock.peRatio * 0.95) : null,
        targetMeanPrice: round(fairValue), targetHighPrice: round(fairValue * 1.15), targetLowPrice: round(fairValue * 0.85),
        recommendationKey, recommendationMean: recommendationKey === 'buy' ? 2.1 : recommendationKey === 'sell' ? 4.0 : 3.0,
        numberOfAnalystOpinions: 28,
        payoutRatio: netIncome > 0 ? round((latest.dividendsPaid ?? 0) / netIncome) : null,
        dividendRate: round((latest.dividendsPaid ?? 0) / tpl.shares),
        intrinsicValue: round(fairValue), marginOfSafety: round(margin),
      },
    });

    for (const year of [2024, 2023]) {
      await prisma.revenueSegment.createMany({
        data: tpl.segments.map((s) => ({
          companyId, year, quarter: 0, segmentName: s.name, segmentType: s.type, revenue: round(latest.revenue * (s.pct / 100)), percentage: s.pct / 100,
        })),
      });
    }

    await prisma.dataSync.create({
      data: {
        companyId,
        lastSyncAt: metricDate,
        yearsFetched: 5,
        secSync: tpl.country === 'US',
        finnhubSync: false,
        europeanSync: tpl.country !== 'US',
        availableTags: ['revenue', 'netIncome', 'totalAssets'],
        validationWarnings: [],
        dataGaps: [],
      },
    });

    valuationLog.push(`${tpl.ticker.padEnd(6)} model=${model.padEnd(10)} price=${round(stock.currentPrice).toString().padStart(9)} fairValue=${round(fairValue).toString().padStart(9)} margin=${round(margin, 3).toString().padStart(6)} confidence=${confidence}`);
  }

  console.log('Valuation per company:');
  for (const line of valuationLog) console.log('  ' + line);

  // ── Site settings ──
  const settings: Record<string, string> = {
    hero_badge: settingsMap.get('hero_badge') ?? 'Análisis fundamental',
    hero_title: settingsMap.get('hero_title') ?? 'Encuentra el valor real de las empresas cotizadas',
    hero_subtitle: settingsMap.get('hero_subtitle') ?? 'Valoración por descuento de flujos, múltiplos y solidez financiera con datos de fuentes oficiales.',
    hero_cta_primary: settingsMap.get('hero_cta_primary') ?? 'Ver empresas',
    hero_cta_primary_link: settingsMap.get('hero_cta_primary_link') ?? '/empresas',
    hero_cta_secondary: settingsMap.get('hero_cta_secondary') ?? 'Cómo funciona',
    hero_cta_secondary_link: settingsMap.get('hero_cta_secondary_link') ?? '/formacion',
    hero_bg_url: settingsMap.get('hero_bg_url') ?? '',
    site_logo_url: settingsMap.get('site_logo_url') ?? '',
    site_favicon_url: settingsMap.get('site_favicon_url') ?? '',
    books: JSON.stringify(DEFAULT_BOOKS),
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`Site settings created: ${Object.keys(settings).length} (incl. books)`);

  // ── Demo user data ──
  const favMsft = companyIds.get('MSFT')!;
  const favNvda = companyIds.get('NVDA')!;
  await prisma.favorite.createMany({
    data: [
      { userId: demo.id, companyId: favMsft },
      { userId: demo.id, companyId: favNvda },
    ],
  });

  const carteraDemo = await prisma.portfolio.create({
    data: { userId: demo.id, name: 'Cartera Demo', description: 'Cartera de ejemplo a largo plazo', currency: 'USD' },
  });
  const carteraIberica = await prisma.portfolio.create({
    data: { userId: demo.id, name: 'Cartera Ibérica', description: 'Ejemplo con valores europeos', currency: 'EUR' },
  });

  await prisma.holding.createMany({
    data: [
      { portfolioId: carteraDemo.id, companyId: companyIds.get('MSFT')!, quantity: '15', averageCost: '360.00' },
      { portfolioId: carteraDemo.id, companyId: companyIds.get('GOOGL')!, quantity: '30', averageCost: '170.00' },
      { portfolioId: carteraDemo.id, companyId: companyIds.get('XOM')!, quantity: '20', averageCost: '105.00' },
      { portfolioId: carteraDemo.id, companyId: companyIds.get('KO')!, quantity: '25', averageCost: '60.00' },
      { portfolioId: carteraIberica.id, companyId: companyIds.get('SAN')!, quantity: '200', averageCost: '4.20' },
      { portfolioId: carteraIberica.id, companyId: companyIds.get('ITX')!, quantity: '10', averageCost: '38.50' },
      { portfolioId: carteraIberica.id, companyId: companyIds.get('ASML')!, quantity: '5', averageCost: '780.00' },
    ],
  });

  await prisma.alarm.create({
    data: { userId: demo.id, companyId: companyIds.get('NVDA')!, alarmType: 'verdict', targetVerdict: 'buy', lastVerdict: 'sell', lastPrice: 1, lastCheckedAt: metricDate },
  });

  // ── Courses ──
  await seedCourses(prisma, admin.id);

  // ── Mapping tables ──
  await prisma.fieldConfig.createMany({
    data: [
      { fieldName: 'revenue', source: 'esef', customTags: ['Revenue', 'SalesRevenueNet', 'RevenuesNotIncludingFinancialIncome'], active: true },
      { fieldName: 'netIncome', source: 'esef', customTags: ['ProfitLoss', 'NetIncomeLoss', 'ProfitLossAttributableToOwnersOfParent'], active: true },
      { fieldName: 'totalAssets', source: 'esef', customTags: ['Assets'], active: true },
    ],
  });

  await prisma.conceptMapping.createMany({
    data: [
      { conceptName: 'RevenuesNotIncludingFinancialIncome', fieldName: 'revenue', source: 'esef', confirmedBy: 'seed' },
      { conceptName: 'ProfitLossAttributableToOwnersOfParent', fieldName: 'netIncome', source: 'esef', confirmedBy: 'seed' },
      { conceptName: 'Assets', fieldName: 'totalAssets', source: 'esef', confirmedBy: 'seed' },
    ],
  });

  await prisma.xbrlTagMapping.createMany({
    data: [
      { fieldName: 'revenue', source: 'esef', tag: 'RevenuesNotIncludingFinancialIncome', priority: 10 },
      { fieldName: 'netIncome', source: 'esef', tag: 'ProfitLossAttributableToOwnersOfParent', priority: 10 },
      { fieldName: 'netIncome', source: 'esef', tag: 'ProfitLoss', priority: 20 },
      { fieldName: 'totalAssets', source: 'esef', tag: 'Assets', priority: 10 },
      { fieldName: 'revenue', source: 'us-gaap', tag: 'RevenueFromContractWithCustomerExcludingAssessedTax', priority: 10 },
    ],
  });

  const counts = {
    companies: await prisma.company.count(),
    financials: await prisma.financialData.count(),
    balances: await prisma.balanceSheet.count(),
    metrics: await prisma.stockMetric.count(),
    segments: await prisma.revenueSegment.count(),
    courses: await prisma.course.count(),
    settings: await prisma.siteSetting.count(),
    users: await prisma.user.count(),
    favorites: await prisma.favorite.count(),
    portfolios: await prisma.portfolio.count(),
    holdings: await prisma.holding.count(),
    alarms: await prisma.alarm.count(),
  };
  console.log('Demo database seeded:', JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
