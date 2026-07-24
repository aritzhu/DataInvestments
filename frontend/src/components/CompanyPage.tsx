import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import '../styles/company.css';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { Skeleton, SkeletonCard, SkeletonStats } from './ui/Skeleton';
import { DashboardTab } from './tabs/DashboardTab';
import { FinancialStatementsTab } from './tabs/FinancialStatementsTab';
import { CashFlowSankeyTab } from './tabs/CashFlowSankeyTab';
import { ValuationTab } from './tabs/ValuationTab';
import { EducationTab } from './tabs/EducationTab';

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
    website: string | null;
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
}

export type TabId = 'dashboard' | 'financials' | 'sankey' | 'valuation' | 'education';

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'financials', label: 'Estados financieros' },
  { id: 'sankey', label: 'Flujo de caja' },
  { id: 'valuation', label: 'Valoración' },
  { id: 'education', label: 'Educativo' },
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
        {Array.from({ length: 5 }).map((_, i) => (
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
  const [data, setData] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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
        const years = [...new Set(d.financials.map((f) => f.year))].sort((a, b) => b - a);
        setSelectedYear(years[0] || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [ticker]);

  useEffect(() => {
    if (!loading && data && headerRef.current) {
      headerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, data]);

  if (loading) return <CompanySkeleton />;

  if (error || !data) {
    return (
      <div className="cp-error">
        <p>{error || 'No se encontraron datos'}</p>
        <button onClick={() => navigate('/')}>Volver al inicio</button>
      </div>
    );
  }

  const { company, financials, stockMetrics, balanceSheets, segments } = data;
  const stock = stockMetrics[0] || null;
  const availableYears = [...new Set(financials.map((f) => f.year))].sort((a, b) => b - a);
  const currentFinancial = financials.find((f) => f.year === selectedYear) || financials[0];

  return (
    <div className="cp-page">
      {/* Header */}
      <div className="cp-header" ref={headerRef}>
        <button className="cp-back" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </button>
        <div className="cp-header-info">
          <div className="cp-header-top">
            <h1 className="cp-ticker">{company.ticker}</h1>
            {stock && (
              <div className="cp-price">
                <span className="cp-price-value">
                  $<AnimatedNumber value={stock.currentPrice} format={(n) => n.toFixed(2)} />
                </span>
              </div>
            )}
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
          </div>
        </div>
      </div>

      {/* Year Selector — only in tabs where content depends on selected year */}
      {availableYears.length > 1 && ['financials', 'sankey', 'dashboard'].includes(activeTab) && (
        <div className="cp-year-bar">
          <Calendar size={16} />
          <span className="cp-year-label">Año fiscal:</span>
          <div className="cp-year-pills">
            {availableYears.map((y) => (
              <button
                key={y}
                className={`cp-year-pill ${selectedYear === y ? 'cp-year-pill--active' : ''}`}
                onClick={() => setSelectedYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="cp-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`cp-tab ${activeTab === tab.id ? 'cp-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
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
        {activeTab === 'dashboard' && (
          <DashboardTab
            company={company}
            financial={currentFinancial}
            financials={financials}
            balanceSheets={balanceSheets}
            stock={stock}
          />
        )}
        {activeTab === 'financials' && (
          <FinancialStatementsTab
            financial={currentFinancial}
            balanceSheet={balanceSheets.find((b) => b.year === selectedYear) || null}
            stock={stock}
            segments={segments.filter((s) => s.year === selectedYear)}
          />
        )}
        {activeTab === 'sankey' && (
          <CashFlowSankeyTab
            financial={currentFinancial}
            balanceSheet={balanceSheets.find((b) => b.year === selectedYear) || null}
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
        {activeTab === 'education' && (
          <EducationTab
            financial={currentFinancial}
            balanceSheet={balanceSheets.find((b) => b.year === selectedYear) || null}
            stock={stock}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="cp-footer">
        <span>DataInvestments</span>
        <span>Datos de FMP / SEC EDGAR</span>
      </footer>
    </div>
  );
}
