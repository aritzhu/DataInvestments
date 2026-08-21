import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Users, MapPin, Calendar, AlertTriangle, Heart, Briefcase, Bell, Plus, X, Trash2, Globe } from 'lucide-react';
import '../styles/company.css';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { Skeleton, SkeletonCard, SkeletonStats } from './ui/Skeleton';
import { formatPct, safeDiv } from '../utils/format';
import { computeAll, weightedAverage, getVerdict, VERDICT_COLORS, getSectorConfigs, trailing12Months, type ValuationInput } from '../utils/valuation';
import { InfoButton } from './ui/InfoButton';
import { INFO } from '../utils/infoContent';
import { FinancialStatementsTab } from './tabs/FinancialStatementsTab';
import { CashFlowSankeyTab } from './tabs/CashFlowSankeyTab';
import { ValuationTab } from './tabs/ValuationTab';
import { FundamentalTab } from './tabs/FundamentalTab';
import { RawDataTab } from './tabs/RawDataTab';
import { useAuth } from '../contexts/AuthContext';
import { RegistrationHookModal } from './RegistrationHookModal';
import { PaywallModal } from './PaywallModal';
import { listPortfolios, addHolding, createPortfolio } from '../services/portfolioService';
import type { Portfolio } from '../types/portfolio';
import { companyLogoUrl } from '../utils/companyLogoUrl';

export interface CompanyProfile {
  company: {
    id: string;
    ticker: string;
    name: string;
    sector: string | null;
    industry: string | null;
    description: string | null;
    cik: string | null;
    ceo: string | null;
    employees: number | null;
    country: string | null;
    exchange: string | null;
    currency: string | null;
    website: string | null;
    logoUrl: string | null;
    ipoDate: string | null;
  };
  financials: Array<{
    id: string;
    year: number;
    quarter: number | null;
    revenue: number;
    costOfRevenue: number;
    grossProfit: number | null;
    operatingExpenses: number;
    sgaExpense: number;
    rdExpense: number;
    interestExpense: number;
    taxExpense: number;
    netIncome: number;
    ebitda: number | null;
    ebit: number | null;
    capex: number;
    depreciation: number;
    operatingCashFlow: number | null;
    investingCashFlow: number | null;
    financingCashFlow: number | null;
    freeCashFlow: number | null;
    dividendsPaid: number | null;
    shareRepurchases: number | null;
    totalAssets: number | null;
    totalLiabilities: number | null;
    totalEquity: number | null;
    periodLabel?: string;
  }>;
  stockMetrics: Array<{
    id: string;
    date: string;
    currentPrice: number;
    peRatio: number | null;
    pbRatio: number | null;
    psRatio: number | null;
    dividendYield: number | null;
    marketCap: number | null;
    enterpriseValue: number | null;
    sharesOutstanding: number | null;
    roe: number | null;
    roa: number | null;
    roic: number | null;
    currentRatio: number | null;
    debtToEquity: number | null;
    altmanZ: number | null;
    piotroskiScore: number | null;
    beta: number | null;
    forwardPE: number | null;
    targetMeanPrice: number | null;
    targetHighPrice: number | null;
    targetLowPrice: number | null;
    recommendationKey: string | null;
    recommendationMean: number | null;
    numberOfAnalystOpinions: number | null;
    payoutRatio: number | null;
    dividendRate: number | null;
    intrinsicValue: number | null;
    marginOfSafety: number | null;
  }>;
  balanceSheets: Array<{
    id: string;
    year: number;
    quarter: number | null;
    cashAndCashEquivalents: number | null;
    shortTermInvestments: number | null;
    accountsReceivable: number | null;
    inventory: number | null;
    totalCurrentAssets: number | null;
    propertyPlantEquipment: number | null;
    goodwill: number | null;
    intangibleAssets: number | null;
    totalNonCurrentAssets: number | null;
    totalAssets: number | null;
    accountsPayable: number | null;
    shortTermDebt: number | null;
    totalCurrentLiabilities: number | null;
    longTermDebt: number | null;
    totalNonCurrentLiabilities: number | null;
    totalLiabilities: number | null;
    totalStockholdersEquity: number | null;
    retainedEarnings: number | null;
    treasuryStock: number | null;
  }>;
  segments: Array<{
    id: string;
    year: number;
    quarter: number | null;
    segmentName: string;
    segmentType: string;
    revenue: number;
    percentage: number | null;
  }>;
  dataSync: {
    id: string;
    lastSyncAt: string;
    yearsFetched: number;
    secSync: boolean;
    finnhubSync: boolean;
    europeanSync: boolean;
    errorMessage: string | null;
    validationWarnings: string[];
    dataGaps: string[];
  } | null;
}

type Financial = CompanyProfile['financials'][0];
type BalanceSheet = CompanyProfile['balanceSheets'][0];
type TTMData = NonNullable<ReturnType<typeof trailing12Months>>;

function sortByPeriodDesc<T extends { year: number; quarter?: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.quarter ?? 0) - (a.quarter ?? 0);
  });
}

function latestBalanceSheet(balanceSheets: BalanceSheet[]): BalanceSheet | undefined {
  return sortByPeriodDesc(balanceSheets)[0];
}

function annualFinancialYears(financials: Financial[]): number[] {
  return [...new Set(financials.filter((f) => (f.quarter ?? 0) === 0).map((f) => f.year))].sort((a, b) => b - a);
}

// Best row for a fiscal year: the complete annual (quarter=0) row when it
// exists, otherwise the latest quarterly row of that year.
function financialForYear(financials: Financial[], year: number): Financial | undefined {
  const annual = financials.find((f) => f.year === year && (f.quarter ?? 0) === 0);
  if (annual) return annual;
  return sortByPeriodDesc(financials.filter((f) => f.year === year))[0];
}

function balanceForYear(balanceSheets: BalanceSheet[], year: number): BalanceSheet | undefined {
  const annual = balanceSheets.find((b) => b.year === year && (b.quarter ?? 0) === 0);
  if (annual) return annual;
  return sortByPeriodDesc(balanceSheets.filter((b) => b.year === year))[0];
}

// Synthesizes a "TTM" financial row from the last 4 consecutive quarters.
// Balance fields are point-in-time → taken from the latest balance sheet.
function buildTtmFinancial(ttm: TTMData, latestQuarter: Financial, balanceSheet: BalanceSheet | undefined): Financial {
  const bs = ttm.balanceSheet ?? balanceSheet;
  return {
    id: 'ttm',
    year: latestQuarter.year,
    quarter: latestQuarter.quarter,
    revenue: ttm.revenue,
    costOfRevenue: ttm.costOfRevenue,
    grossProfit: ttm.grossProfit,
    operatingExpenses: ttm.operatingExpenses,
    sgaExpense: ttm.sgaExpense,
    rdExpense: ttm.rdExpense,
    interestExpense: ttm.interestExpense,
    taxExpense: ttm.taxExpense,
    netIncome: ttm.netIncome,
    ebitda: ttm.ebitda,
    ebit: ttm.ebit,
    capex: ttm.capex,
    depreciation: ttm.depreciation,
    operatingCashFlow: ttm.operatingCashFlow,
    investingCashFlow: latestQuarter.investingCashFlow,
    financingCashFlow: latestQuarter.financingCashFlow,
    freeCashFlow: ttm.freeCashFlow,
    dividendsPaid: ttm.dividendsPaid,
    shareRepurchases: ttm.shareRepurchases,
    totalAssets: bs?.totalAssets ?? latestQuarter.totalAssets,
    totalLiabilities: bs?.totalLiabilities ?? latestQuarter.totalLiabilities,
    totalEquity: bs?.totalStockholdersEquity ?? latestQuarter.totalEquity,
    periodLabel: latestQuarter.quarter != null
      ? `TTM Q${latestQuarter.quarter} ${latestQuarter.year}`
      : `TTM ${latestQuarter.year}`,
  };
}

interface PeriodInfo {
  ttm: TTMData | null;
  latest: Financial | undefined;
  annualYears: number[];
  showTTM: boolean;
  pills: Array<'ttm' | number>;
  ttmLabel: string;
}

// Decides which periods the fiscal-year selector offers. A "TTM" pill is
// shown (and used by default) when the newest data is quarterly and there are
// ≥4 consecutive quarters newer than the last complete annual year. Partial
// years (e.g. 2026 with only Q1/Q2) are never offered as a full fiscal year.
function computePeriodInfo(financials: Financial[], balanceSheets: BalanceSheet[]): PeriodInfo {
  const ttm = trailing12Months(financials, balanceSheets);
  const annualYears = annualFinancialYears(financials);
  const allYears = [...new Set(financials.map((f) => f.year))].sort((a, b) => b - a);
  const latest = sortByPeriodDesc(financials)[0];
  const latestYearComplete = (() => {
    if (latest == null) return false;
    const quarters = new Set(financials.filter((f) => f.year === latest.year).map((f) => f.quarter));
    return quarters.has(1) && quarters.has(2) && quarters.has(3) && quarters.has(4);
  })();
  const showTTM = ttm != null
    && ttm.isTTM
    && latest != null
    && (latest.quarter ?? 0) > 0
    && (annualYears[0] == null || latest.year > annualYears[0] || !latestYearComplete);

  const pills: Array<'ttm' | number> = [];
  if (showTTM) pills.push('ttm');
  for (const y of annualYears) pills.push(y);
  if (pills.length === 0) pills.push(...allYears);

  const ttmLabel = latest != null
    ? (latest.quarter != null ? `TTM Q${latest.quarter} ${latest.year}` : `TTM ${latest.year}`)
    : 'TTM';

  return { ttm, latest, annualYears, showTTM, pills, ttmLabel };
}

export type TabId = 'financials' | 'sankey' | 'valuation' | 'fundamental' | 'raw';

const TABS: { id: TabId; label: string }[] = [
  { id: 'financials', label: 'Estados financieros' },
  { id: 'sankey', label: 'Flujo de caja' },
  { id: 'valuation', label: 'Valoración' },
  { id: 'fundamental', label: 'Análisis fundamental' },
];

function CompanySkeleton() {
  return (
    <div className="cp-page">
      <div className="cp-header">
        <Skeleton width="36px" height="36px" borderRadius="10px" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.25rem' }}>
            <Skeleton width="80px" height="2rem" />
            <Skeleton width="100px" height="1.25rem" />
          </div>
          <Skeleton width="200px" height="0.9rem" />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Skeleton width="80px" height="0.7rem" borderRadius="99px" />
            <Skeleton width="60px" height="0.7rem" borderRadius="99px" />
            <Skeleton width="70px" height="0.7rem" borderRadius="99px" />
          </div>
        </div>
      </div>
      <div className="cp-tabs">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? '90px' : '70px'} height="32px" borderRadius="8px" />
        ))}
      </div>
      <div className="cp-content">
        <SkeletonStats count={4} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function CompanyPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isFavorite, addFavorite, removeFavorite, recordCompanyView, usage, isCompanyVisited } = useAuth();
  const [data, setData] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestedTab = searchParams.get('tab') as TabId;
  const isAdmin = user?.role === 'admin';
  const tabs: { id: TabId; label: string }[] = isAdmin
    ? [...TABS, { id: 'raw', label: 'Raw' }]
    : TABS;
  const [activeTab, setActiveTab] = useState<TabId>(tabs.some((t) => t.id === requestedTab) ? requestedTab : 'financials');
  const [selectedPeriod, setSelectedPeriod] = useState<'ttm' | number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioCompany, setPortfolioCompany] = useState<{ id: string; ticker: string } | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [holdingQuantity, setHoldingQuantity] = useState('');
  const [holdingCost, setHoldingCost] = useState('');
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [savingHolding, setSavingHolding] = useState(false);
  const portfolioModalRef = useRef<HTMLDivElement>(null);

  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [alarmTarget, setAlarmTarget] = useState<'buy' | 'hold' | 'sell'>('buy');
  const [alarmLoading, setAlarmLoading] = useState(false);
  const [existingAlarm, setExistingAlarm] = useState<{ id: string; targetVerdict: string; triggered: boolean } | null>(null);
  const alarmModalRef = useRef<HTMLDivElement>(null);

  const [showPaywall, setShowPaywall] = useState(false);
  const [showHookModal, setShowHookModal] = useState(false);
  const lastTrackedTicker = useRef<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    if (user && user.role === 'admin') return;
    if (lastTrackedTicker.current === ticker) return;
    lastTrackedTicker.current = ticker;
    if (user) {
      if (isCompanyVisited(ticker)) return;
      recordCompanyView(ticker).then((info) => {
        if (info.canView === false) setShowPaywall(true);
      });
    } else {
      const trialUsed = localStorage.getItem('di-trial-used');
      if (trialUsed) {
        setShowHookModal(true);
      } else {
        localStorage.setItem('di-trial-used', '1');
      }
    }
  }, [ticker, user]);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    fetch(`/api/companies/${ticker}/profile`)
      .then((res) => {
        if (!res.ok) throw new Error('Empresa no encontrada');
        return res.json();
      })
      .then((d: CompanyProfile) => {
        setData(d);
        const info = computePeriodInfo(d.financials, d.balanceSheets);
        const defaultYear = info.pills.find((p) => p !== 'ttm') ?? null;
        setSelectedPeriod(info.showTTM ? 'ttm' : defaultYear);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [ticker]);

  useEffect(() => {
    if (!loading && data && headerRef.current) {
      headerRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [loading, data]);

  useEffect(() => {
    if (loading || !data || !tabsRef.current) return;
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const container = tabsRef.current;
    const activeEl = container.querySelector<HTMLButtonElement>('.cp-tab--active');
    if (!activeEl) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const targetLeft = container.scrollLeft + (activeRect.left - containerRect.left) - (containerRect.width / 2 - activeRect.width / 2);
    container.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }, [loading, data, activeTab]);

  useEffect(() => {
    if (user) {
      listPortfolios().then(setPortfolios).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!user || !data) return;
    fetch('/api/alarms')
      .then((r) => r.ok ? r.json() : [])
      .then((alarms: Array<{ id: string; companyId: string; targetVerdict: string; triggered: boolean }>) => {
        const found = alarms.find((a) => a.companyId === data.company.id);
        setExistingAlarm(found || null);
      })
      .catch(() => {});
  }, [user, data]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (portfolioModalRef.current && !portfolioModalRef.current.contains(e.target as Node)) {
        setShowPortfolioModal(false);
      }
      if (alarmModalRef.current && !alarmModalRef.current.contains(e.target as Node)) {
        setShowAlarmModal(false);
      }
    };
    if (showPortfolioModal || showAlarmModal) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPortfolioModal, showAlarmModal]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) { navigate('/login'); return; }
    if (!data) return;
    if (isFavorite(data.company.id)) {
      await removeFavorite(data.company.id);
    } else {
      await addFavorite(data.company.id);
    }
  }, [user, data, isFavorite, addFavorite, removeFavorite, navigate]);

  const handleOpenPortfolioModal = useCallback(() => {
    if (!user) { navigate('/login'); return; }
    if (!data) return;
    setPortfolioCompany({ id: data.company.id, ticker: data.company.ticker });
    setSelectedPortfolioId(null);
    setHoldingQuantity('');
    setHoldingCost(data.stockMetrics[0]?.currentPrice?.toString() || '');
    setShowNewPortfolio(false);
    setNewPortfolioName('');
    setShowPortfolioModal(true);
  }, [user, data, navigate]);

  const handleAddToPortfolio = useCallback(async () => {
    if (!portfolioCompany) return;
    setSavingHolding(true);
    try {
      let pid = selectedPortfolioId;
      if (showNewPortfolio && newPortfolioName.trim()) {
        const created = await createPortfolio({ name: newPortfolioName.trim() });
        pid = created.id;
        setPortfolios((prev) => [created, ...prev]);
      }
      if (!pid || !holdingQuantity || !holdingCost) return;
      await addHolding(pid, {
        companyId: portfolioCompany.id,
        quantity: parseFloat(holdingQuantity),
        averageCost: parseFloat(holdingCost),
      });
      setShowPortfolioModal(false);
    } catch {
    } finally {
      setSavingHolding(false);
    }
  }, [portfolioCompany, selectedPortfolioId, showNewPortfolio, newPortfolioName, holdingQuantity, holdingCost]);

  const handleOpenAlarmModal = useCallback(() => {
    if (!user) { navigate('/login'); return; }
    if (!data) return;
    setAlarmTarget((existingAlarm?.targetVerdict as 'buy' | 'hold' | 'sell') || 'buy');
    setShowAlarmModal(true);
  }, [user, data, navigate, existingAlarm]);

  const handleSaveAlarm = useCallback(async () => {
    if (!data) return;
    setAlarmLoading(true);
    try {
      const body = {
        companyId: data.company.id,
        targetVerdict: alarmTarget,
      };
      if (existingAlarm) {
        await fetch(`/api/alarms/${existingAlarm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        setExistingAlarm({ ...existingAlarm, targetVerdict: alarmTarget });
      } else {
        const res = await fetch('/api/alarms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const created = await res.json();
        setExistingAlarm({ id: created.id, targetVerdict: alarmTarget, triggered: false });
      }
      setShowAlarmModal(false);
    } catch {
    } finally {
      setAlarmLoading(false);
    }
  }, [data, alarmTarget, existingAlarm]);

  const handleDeleteAlarm = useCallback(async () => {
    if (!existingAlarm) return;
    try {
      await fetch(`/api/alarms/${existingAlarm.id}`, { method: 'DELETE' });
      setExistingAlarm(null);
      setShowAlarmModal(false);
    } catch {
    }
  }, [existingAlarm]);

  if (loading) return <CompanySkeleton />;

  if (error || !data) {
    return (
      <div className="cp-error">
        <p>{error || 'No se encontraron datos'}</p>
        <button onClick={() => navigate(-1)}>Volver al inicio</button>
      </div>
    );
  }

  const { company, financials, stockMetrics, balanceSheets, segments, dataSync } = data;
  const stock = stockMetrics[0] || null;
  const periodInfo = computePeriodInfo(financials, balanceSheets);

  let currentFinancial: Financial | undefined;
  if (selectedPeriod === 'ttm' && periodInfo.ttm && periodInfo.latest) {
    currentFinancial = buildTtmFinancial(periodInfo.ttm, periodInfo.latest, latestBalanceSheet(balanceSheets));
  } else if (selectedPeriod != null && selectedPeriod !== 'ttm') {
    currentFinancial = financialForYear(financials, selectedPeriod);
  }
  if (!currentFinancial) currentFinancial = periodInfo.latest ?? financials[0];

  const currentBalanceSheet = selectedPeriod === 'ttm'
    ? (periodInfo.ttm?.balanceSheet ?? latestBalanceSheet(balanceSheets) ?? null)
    : selectedPeriod != null
      ? (balanceForYear(balanceSheets, selectedPeriod) ?? null)
      : (latestBalanceSheet(balanceSheets) ?? null);

  const segmentYear = selectedPeriod === 'ttm' ? (periodInfo.annualYears[0] ?? null) : selectedPeriod;
  const selectedYear = selectedPeriod === 'ttm' ? null : selectedPeriod;

  const marketCap = stock?.marketCap;
  const ev = stock?.enterpriseValue;
  const grossMargin = currentFinancial ? safeDiv(currentFinancial.grossProfit ?? 0, currentFinancial.revenue) : null;
  const netMargin = currentFinancial ? safeDiv(currentFinancial.netIncome, currentFinancial.revenue) : null;
  const ebitdaMargin = currentFinancial ? safeDiv(currentFinancial.ebitda ?? 0, currentFinancial.revenue) : null;

  const valInput: ValuationInput = { financials, balanceSheets, stock: stock!, currency: company.currency || 'USD' };
  const valResults = stock ? computeAll(valInput, getSectorConfigs(company.sector, company.industry)) : [];
  const avgFair = weightedAverage(valResults);
  const { verdict, upside, label: verdictLabel } = getVerdict(avgFair, stock?.currentPrice ?? 0);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      prev.set('tab', tab);
      return prev;
    }, { replace: true });
  };

  if (showHookModal && ticker) {
    return <RegistrationHookModal ticker={ticker} />;
  }

  return (
    <div className="cp-page">
      {/* Header */}
      <div className="cp-header" ref={headerRef}>
        <button className="cp-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <div className="cp-header-info">
          <div className="cp-header-top">
            {(company.logoUrl || companyLogoUrl(company.website)) ? (
              <img
                src={company.logoUrl || companyLogoUrl(company.website)!}
                alt={company.ticker}
                className="cp-logo"
                loading="lazy" decoding="async"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('cp-logo-fallback--hidden'); }}
              />
            ) : null}
            <div className={`cp-logo-fallback ${(company.logoUrl || companyLogoUrl(company.website)) ? 'cp-logo-fallback--hidden' : ''}`}>
              {company.ticker.slice(0, 2)}
            </div>
            <h1 className="cp-ticker">{company.ticker}</h1>
            {isCompanyVisited(company.ticker) && (
              <span className="cp-visited-badge" title="Ya visitada - accesible sin consumir vistas">✓ Visitada</span>
            )}
            {stock && (
              <div className="cp-price">
                <span className="cp-price-value">
                  {company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}<AnimatedNumber value={stock.currentPrice} format={(n) => n.toFixed(2)} />
                </span>
              </div>
            )}
            <div className="cp-actions">
              <button
                className={`cp-action-btn ${user && isFavorite(company.id) ? 'cp-action-btn--active' : ''}`}
                onClick={handleToggleFavorite}
                title={user && isFavorite(company.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Heart size={16} fill={user && isFavorite(company.id) ? 'currentColor' : 'none'} />
              </button>
              <div className="cp-portfolio-wrapper" ref={portfolioModalRef}>
                <button
                  className="cp-action-btn"
                  onClick={handleOpenPortfolioModal}
                  title="Añadir a portfolio"
                >
                  <Briefcase size={16} />
                </button>
                {showPortfolioModal && (
                  <div className="cp-portfolio-modal">
                    <div className="cp-portfolio-modal-header">
                      <span>Añadir {portfolioCompany?.ticker} a portfolio</span>
                      <button className="cp-portfolio-modal-close" onClick={() => setShowPortfolioModal(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className="cp-portfolio-modal-body">
                      {!showNewPortfolio ? (
                        <>
                          {portfolios.length > 0 && (
                            <div className="cp-portfolio-list">
                              {portfolios.map((p) => (
                                <button
                                  key={p.id}
                                  className={`cp-portfolio-item ${selectedPortfolioId === p.id ? 'cp-portfolio-item--selected' : ''}`}
                                  onClick={() => setSelectedPortfolioId(p.id)}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            className="cp-portfolio-new-btn"
                            onClick={() => setShowNewPortfolio(true)}
                          >
                            <Plus size={14} />
                            Crear nuevo portfolio
                          </button>
                        </>
                      ) : (
                        <div className="cp-portfolio-create">
                          <input
                            type="text"
                            value={newPortfolioName}
                            onChange={(e) => setNewPortfolioName(e.target.value)}
                            placeholder="Nombre del portfolio"
                            className="cp-portfolio-input"
                            autoFocus
                          />
                          <button
                            className="cp-portfolio-back-btn"
                            onClick={() => { setShowNewPortfolio(false); setNewPortfolioName(''); }}
                          >
                            Volver
                          </button>
                        </div>
                      )}
                      {(selectedPortfolioId || showNewPortfolio) && (
                        <div className="cp-portfolio-form">
                          <div className="cp-portfolio-field">
                            <label>Cantidad</label>
                            <input
                              type="number"
                              value={holdingQuantity}
                              onChange={(e) => setHoldingQuantity(e.target.value)}
                              step="0.0001"
                              min="0"
                              placeholder="100"
                              className="cp-portfolio-input"
                            />
                          </div>
                          <div className="cp-portfolio-field">
                            <label>Precio medio</label>
                            <input
                              type="number"
                              value={holdingCost}
                              onChange={(e) => setHoldingCost(e.target.value)}
                              step="0.01"
                              min="0"
                              placeholder="150.00"
                              className="cp-portfolio-input"
                            />
                          </div>
                          <button
                            className="cp-portfolio-save-btn"
                            disabled={(!selectedPortfolioId && !showNewPortfolio) || !holdingQuantity || !holdingCost || savingHolding || (showNewPortfolio && !newPortfolioName.trim())}
                            onClick={handleAddToPortfolio}
                          >
                            {savingHolding ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="cp-alarm-wrapper" ref={alarmModalRef}>
                <button
                  className={`cp-action-btn ${existingAlarm ? 'cp-action-btn--alarm' : ''}`}
                  onClick={handleOpenAlarmModal}
                  title={existingAlarm ? 'Editar alarma' : 'Crear alarma'}
                >
                  <Bell size={16} fill={existingAlarm ? 'currentColor' : 'none'} />
                </button>
                {showAlarmModal && (
                  <div className="cp-alarm-modal">
                    <div className="cp-alarm-modal-header">
                      <span>{existingAlarm ? 'Editar alarma' : 'Crear alarma'}</span>
                      <button className="cp-alarm-modal-close" onClick={() => setShowAlarmModal(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className="cp-alarm-modal-body">
                      <p className="cp-alarm-modal-desc">Recibe una alerta cuando {company.ticker} entre en este estado:</p>
                      <div className="cp-alarm-options">
                        {([
                          { key: 'buy' as const, label: 'Infravalorada', desc: 'Por debajo de su valor justo', color: 'var(--blue-light)' },
                          { key: 'hold' as const, label: 'Justa', desc: 'Cerca del valor intrínseco', color: 'var(--amber)' },
                          { key: 'sell' as const, label: 'Sobrevalorada', desc: 'Por encima de su valor justo', color: 'var(--red)' },
                        ]).map((opt) => (
                          <button
                            key={opt.key}
                            className={`cp-alarm-option ${alarmTarget === opt.key ? 'cp-alarm-option--selected' : ''}`}
                            style={{ '--alarm-color': opt.color } as React.CSSProperties}
                            onClick={() => setAlarmTarget(opt.key)}
                          >
                            <div className="cp-alarm-option-dot" />
                            <div className="cp-alarm-option-text">
                              <span className="cp-alarm-option-label">{opt.label}</span>
                              <span className="cp-alarm-option-desc">{opt.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="cp-alarm-modal-actions">
                        <button
                          className="cp-alarm-save-btn"
                          disabled={alarmLoading}
                          onClick={handleSaveAlarm}
                        >
                          {alarmLoading ? 'Guardando...' : existingAlarm ? 'Actualizar' : 'Crear alarma'}
                        </button>
                        {existingAlarm && (
                          <button className="cp-alarm-delete-btn" onClick={handleDeleteAlarm}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <h2 className="cp-name">{company.name}</h2>
          <div className="cp-meta">
            {company.sector && (
              <span className="cp-meta-item">
                <Building2 size={14} />
                {company.sector}
              </span>
            )}
            {company.industry && (
              <span className="cp-meta-item">{company.industry}</span>
            )}
            {company.country && (
              <span className="cp-meta-item">
                <MapPin size={14} />
                {company.country}
              </span>
            )}
            {company.employees && (
              <span className="cp-meta-item">
                <Users size={14} />
                {company.employees.toLocaleString()} empleados
              </span>
            )}
            {company.exchange && (
              <span className="cp-meta-item">{company.exchange}</span>
            )}
            {company.website && (
              <span className="cp-meta-item">
                <Globe size={14} />
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="cp-meta-link">
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats — key metrics for evaluating the company */}
      <div className="cp-quick">
        {avgFair != null && stock && (
          <div className="cp-quick-item cp-quick-verdict">
            <span className="cp-quick-label"><span className="info-label-row">Valoración <InfoButton content={INFO['valuation.hero']} /></span></span>
            <span className="cp-quick-value">
              <span className="cp-quick-verdict-dot" style={{ background: VERDICT_COLORS[verdict] }} />
              <span className="cp-quick-verdict-label" style={{ color: VERDICT_COLORS[verdict] }}>{verdictLabel}</span>
              {upside != null && (
                <span className="cp-quick-verdict-pct" style={{ color: VERDICT_COLORS[verdict] }}>
                  {upside > 0 ? '+' : ''}{(upside * 100).toFixed(1)}%
                </span>
              )}
              <span className="cp-quick-verdict-fair">
                {company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}{avgFair.toFixed(2)}
              </span>
            </span>
          </div>
        )}
        {marketCap != null && (
          <div className="cp-quick-item">
            <span className="cp-quick-label"><span className="info-label-row">Market Cap <InfoButton content={INFO['company.marketCap']} /></span></span>
            <span className="cp-quick-value"><AnimatedNumber value={marketCap} /></span>
          </div>
        )}
        {ev != null && (
          <div className="cp-quick-item">
            <span className="cp-quick-label"><span className="info-label-row">EV <InfoButton content={INFO['company.ev']} /></span></span>
            <span className="cp-quick-value"><AnimatedNumber value={ev} /></span>
          </div>
        )}
        {currentFinancial && (
          <div className="cp-quick-item">
            <span className="cp-quick-label"><span className="info-label-row">Beneficio Neto <InfoButton content={INFO['company.netIncome']} /></span></span>
            <span className="cp-quick-value"><AnimatedNumber value={currentFinancial.netIncome} /></span>
          </div>
        )}
        {currentFinancial && (
          <div className="cp-quick-item">
            <span className="cp-quick-label"><span className="info-label-row">Free Cash Flow <InfoButton content={INFO['company.fcf']} /></span></span>
            <span className="cp-quick-value"><AnimatedNumber value={currentFinancial.freeCashFlow ?? 0} /></span>
          </div>
        )}
        {currentFinancial && (
          <div className="cp-quick-item cp-quick-item--margins">
            <span className="cp-quick-label"><span className="info-label-row">Márgenes <InfoButton content={INFO['company.margins']} /></span></span>
            <span className="cp-quick-value">
              {grossMargin != null && <>Bruto {formatPct(grossMargin)}</>}
              {netMargin != null && <> · Neto {formatPct(netMargin)}</>}
              {ebitdaMargin != null && <> · EBITDA {formatPct(ebitdaMargin)}</>}
            </span>
          </div>
        )}
        {stock?.peRatio != null && (
          <div className="cp-quick-item">
            <span className="cp-quick-label"><span className="info-label-row">P/E <InfoButton content={INFO['company.pe']} /></span></span>
            <span className="cp-quick-value">{stock.peRatio.toFixed(1)}</span>
          </div>
        )}
        {stock?.pbRatio != null && (
          <div className="cp-quick-item">
            <span className="cp-quick-label"><span className="info-label-row">P/B <InfoButton content={INFO['company.pb']} /></span></span>
            <span className="cp-quick-value">{stock.pbRatio.toFixed(1)}</span>
          </div>
        )}
        {stock?.roe != null && (
          <div className="cp-quick-item">
            <span className="cp-quick-label"><span className="info-label-row">ROE <InfoButton content={INFO['company.roe']} /></span></span>
            <span className="cp-quick-value">{formatPct(stock.roe)}</span>
          </div>
        )}
        {stock?.roa != null && (
          <div className="cp-quick-item">
            <span className="cp-quick-label"><span className="info-label-row">ROA <InfoButton content={INFO['company.roa']} /></span></span>
            <span className="cp-quick-value">{formatPct(stock.roa)}</span>
          </div>
        )}
      </div>

      {/* Period Selector — only in tabs where content depends on selected period */}
      {periodInfo.pills.length > 1 && ['financials', 'sankey'].includes(activeTab) && (
        <div className="cp-year-bar">
          <Calendar size={16} />
          <span className="cp-year-label">Año fiscal:</span>
          <div className="cp-year-pills">
            {periodInfo.pills.map((p) => (
              <button
                key={p === 'ttm' ? 'ttm' : p}
                className={`cp-year-pill ${selectedPeriod === p ? 'cp-year-pill--active' : ''}`}
                onClick={() => setSelectedPeriod(p)}
              >
                {p === 'ttm' ? periodInfo.ttmLabel : p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="cp-tabs" ref={tabsRef}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`cp-tab ${activeTab === tab.id ? 'cp-tab--active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="cp-content">
        {financials.length === 0 && stockMetrics.length === 0 && (
          <div className="cp-empty-banner">
            <AlertTriangle size={18} />
            <span>Sin datos financieros disponibles. Sincroniza esta empresa desde el panel de administración.</span>
          </div>
        )}
        {activeTab === 'financials' && (
          <FinancialStatementsTab
            financial={currentFinancial}
            balanceSheet={currentBalanceSheet}
            stock={stock}
            segments={segments.filter((s) => s.year === segmentYear)}
          />
        )}
        {activeTab === 'sankey' && (
          <CashFlowSankeyTab
            financial={currentFinancial}
            balanceSheet={currentBalanceSheet}
            stock={stock}
            selectedYear={selectedYear}
          />
        )}
        {activeTab === 'valuation' && (
          <ValuationTab
            company={company}
            financials={financials}
            balanceSheets={balanceSheets}
            stock={stock}
            selectedYear={selectedYear}
          />
        )}
        {activeTab === 'fundamental' && (
          <FundamentalTab
            company={company}
            financial={currentFinancial}
            financials={financials}
            balanceSheets={balanceSheets}
            stock={stock}
            dataSync={dataSync}
          />
        )}
        {activeTab === 'raw' && isAdmin && ticker && (
          <RawDataTab
            ticker={ticker}
            isAdmin={isAdmin}
            selectedPeriod={selectedPeriod}
            pills={periodInfo.pills}
            ttmLabel={periodInfo.ttmLabel}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="cp-footer">
        <span>DataInvestments</span>
        <span>Datos de SEC EDGAR / Yahoo Finance</span>
        <nav className="cp-footer-legal">
          <Link to="/legal/terminos" className="cp-footer-legal-link">Términos</Link>
          <Link to="/legal/privacidad" className="cp-footer-legal-link">Privacidad</Link>
          <Link to="/legal/aviso-legal" className="cp-footer-legal-link">Aviso Legal</Link>
          <Link to="/legal/riesgos" className="cp-footer-legal-link">Riesgos</Link>
          <Link to="/legal/cookies" className="cp-footer-legal-link">Cookies</Link>
        </nav>
      </footer>

      {showPaywall && usage && (
        <PaywallModal views={usage.views} limit={usage.limit} />
      )}
    </div>
  );
}
