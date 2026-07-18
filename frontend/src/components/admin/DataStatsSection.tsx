import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Building2, Wrench, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface FieldCoverage {
  populated: number;
  total: number;
  pct: number;
}

interface ToolAvailability {
  available: number;
  total: number;
  pct: number;
}

interface CompanySync {
  fmpSync: boolean;
  secSync: boolean;
  finnhubSync: boolean;
}

interface CompanyStats {
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  sync: CompanySync | null;
  segments: number;
  missingFinancialData: string[];
  missingStockMetrics: string[];
  missingBalanceSheet: string[];
}

interface DataStats {
  summary: {
    totalCompanies: number;
    totalFinancialRecords: number;
    totalBalanceSheets: number;
    totalStockMetrics: number;
    totalSegments: number;
    totalProductSegments: number;
    totalGeoSegments: number;
    syncOrigin: {
      fmpSynced: number;
      secSynced: number;
      finnhubSynced: number;
      withSync: number;
      withoutSync: number;
    };
  };
  fieldCoverage: {
    financialData: Record<string, FieldCoverage>;
    balanceSheet: Record<string, FieldCoverage>;
    stockMetric: Record<string, FieldCoverage>;
    company: Record<string, FieldCoverage>;
  };
  toolAvailability: Record<string, ToolAvailability>;
  companies: CompanyStats[];
}

const TOOL_LABELS: Record<string, string> = {
  dcf: 'DCF',
  per: 'P/E Ratio',
  pb: 'P/B Ratio',
  ps: 'P/S Ratio',
  evEbitda: 'EV/EBITDA',
  evEbit: 'EV/EBIT',
  ddm: 'DDM',
  graham: 'Graham',
  fcfYield: 'FCF Yield',
  netnet: 'Net-Net',
  sankeyCashflow: 'Sankey CashFlow',
  compareTab: 'Compare Tab',
};

const FIELD_LABELS: Record<string, string> = {
  grossProfit: 'Gross Profit',
  ebitda: 'EBITDA',
  ebit: 'EBIT',
  operatingCashFlow: 'Operating CF',
  investingCashFlow: 'Investing CF',
  financingCashFlow: 'Financing CF',
  freeCashFlow: 'Free Cash Flow',
  dividendsPaid: 'Dividends',
  shareRepurchases: 'Buybacks',
  totalAssets: 'Total Assets',
  totalLiabilities: 'Total Liabilities',
  totalEquity: 'Total Equity',
  cashAndCashEquivalents: 'Cash',
  shortTermInvestments: 'ST Investments',
  accountsReceivable: 'Receivables',
  inventory: 'Inventory',
  totalCurrentAssets: 'Current Assets',
  propertyPlantEquipment: 'PPE',
  goodwill: 'Goodwill',
  intangibleAssets: 'Intangibles',
  totalNonCurrentAssets: 'Non-Current Assets',
  accountsPayable: 'Payables',
  shortTermDebt: 'ST Debt',
  totalCurrentLiabilities: 'Current Liabilities',
  longTermDebt: 'LT Debt',
  totalNonCurrentLiabilities: 'Non-Current Liab.',
  totalStockholdersEquity: 'Equity',
  retainedEarnings: 'Ret. Earnings',
  treasuryStock: 'Treasury Stock',
  peRatio: 'P/E',
  pbRatio: 'P/B',
  psRatio: 'P/S',
  dividendYield: 'Div Yield',
  marketCap: 'Market Cap',
  enterpriseValue: 'EV',
  sharesOutstanding: 'Shares Out.',
  roe: 'ROE',
  roa: 'ROA',
  roic: 'ROIC',
  currentRatio: 'Current Ratio',
  debtToEquity: 'D/E',
  altmanZ: 'Altman Z',
  piotroskiScore: 'Piotroski',
  intrinsicValue: 'Intrinsic Value',
  marginOfSafety: 'Margin Safety',
  sector: 'Sector',
  industry: 'Industry',
  description: 'Description',
  cik: 'CIK',
  ceo: 'CEO',
  employees: 'Employees',
  country: 'Country',
  exchange: 'Exchange',
  website: 'Website',
};

type Tab = 'overview' | 'companies' | 'tools';

function CoverageBar({ fieldName, field }: { fieldName: string; field: FieldCoverage }) {
  const level = field.pct >= 70 ? 'high' : field.pct >= 40 ? 'medium' : 'low';
  return (
    <div className="stats-field-row">
      <span className="stats-field-name">{FIELD_LABELS[fieldName] || fieldName}</span>
      <div className="stats-field-bar">
        <div className={`stats-field-bar-fill stats-field-bar-fill--${level}`} style={{ width: `${field.pct}%` }} />
      </div>
      <span className={`stats-field-pct stats-field-pct--${level}`}>{field.pct}%</span>
    </div>
  );
}

function ToolCard({ name, data }: { name: string; data: ToolAvailability }) {
  const level = data.pct >= 70 ? 'high' : data.pct >= 40 ? 'medium' : 'low';
  return (
    <div className="stats-tool-card">
      <div className="stats-tool-name">{TOOL_LABELS[name] || name}</div>
      <div className={`stats-tool-count stats-tool-count--${level}`}>{data.pct}%</div>
      <div className="stats-tool-label">{data.available} de {data.total} empresas</div>
    </div>
  );
}

function CompanyRow({ company }: { company: CompanyStats }) {
  const [expanded, setExpanded] = useState(false);
  const totalMissing = company.missingFinancialData.length + company.missingStockMetrics.length + company.missingBalanceSheet.length;
  const hasData = company.missingFinancialData.length < 4 && company.missingStockMetrics.length < 4 && company.missingBalanceSheet.length < 2;

  return (
    <div>
      <div
        className={`stats-company-row ${expanded ? 'stats-company-row--expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="stats-company-ticker">{company.ticker}</span>
        <span className="stats-company-name">{company.name}</span>
        <div className="stats-company-badges">
          {company.sync?.fmpSync && <span className="stats-badge stats-badge--info">FMP</span>}
          {company.sync?.secSync && <span className="stats-badge stats-badge--ok">SEC</span>}
          {company.segments > 0 && <span className="stats-badge stats-badge--info">{company.segments} seg</span>}
          {hasData ? (
            <span className="stats-badge stats-badge--ok"><CheckCircle2 size={10} /> OK</span>
          ) : totalMissing > 5 ? (
            <span className="stats-badge stats-badge--error"><XCircle size={10} /> {totalMissing} faltan</span>
          ) : (
            <span className="stats-badge stats-badge--warn"><AlertTriangle size={10} /> {totalMissing} faltan</span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className="stats-company-detail">
          <div className="stats-detail-section">
            <div className="stats-detail-title">Financial Data — {8 - company.missingFinancialData.length}/8</div>
            <div className="stats-detail-fields">
              {company.missingFinancialData.length === 0 ? (
                <span className="stats-badge stats-badge--ok"><CheckCircle2 size={10} /> Todos los campos OK</span>
              ) : (
                company.missingFinancialData.map((f) => (
                  <span key={f} className="stats-badge stats-badge--error">{FIELD_LABELS[f] || f}</span>
                ))
              )}
            </div>
          </div>
          <div className="stats-detail-section">
            <div className="stats-detail-title">Stock Metrics — {9 - company.missingStockMetrics.length}/9</div>
            <div className="stats-detail-fields">
              {company.missingStockMetrics.length === 0 ? (
                <span className="stats-badge stats-badge--ok"><CheckCircle2 size={10} /> Todos los campos OK</span>
              ) : (
                company.missingStockMetrics.map((f) => (
                  <span key={f} className="stats-badge stats-badge--error">{FIELD_LABELS[f] || f}</span>
                ))
              )}
            </div>
          </div>
          <div className="stats-detail-section">
            <div className="stats-detail-title">Balance Sheet — {5 - company.missingBalanceSheet.length}/5</div>
            <div className="stats-detail-fields">
              {company.missingBalanceSheet.length === 0 ? (
                <span className="stats-badge stats-badge--ok"><CheckCircle2 size={10} /> Todos los campos OK</span>
              ) : (
                company.missingBalanceSheet.map((f) => (
                  <span key={f} className="stats-badge stats-badge--error">{FIELD_LABELS[f] || f}</span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataStatsSection() {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/data-stats');
      if (!res.ok) throw new Error('Error fetching stats');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="admin-form-section">
        <div className="stats-loading">
          <div className="stats-loading-spinner" />
          <span style={{ fontSize: '0.875rem' }}>Analizando datos importados...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-form-section">
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <p style={{ fontWeight: 600 }}>Error cargando estadísticas</p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>{error}</p>
          <button onClick={fetchStats} className="admin-form-btn" style={{ marginTop: '1rem' }}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const filteredCompanies = stats.companies.filter(
    (c) =>
      c.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-form-section" style={{ border: '2px solid #dbeafe', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f1ff 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Estadísticas de Importación</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Cobertura de campos, origen de datos y disponibilidad de herramientas</p>
          </div>
        </div>
        <button onClick={fetchStats} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }} title="Actualizar">
          <BarChart3 size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="stats-tabs">
        <button className={`stats-tab ${activeTab === 'overview' ? 'stats-tab--active' : ''}`} onClick={() => setActiveTab('overview')}>
          <BarChart3 size={14} /> Overview
        </button>
        <button className={`stats-tab ${activeTab === 'companies' ? 'stats-tab--active' : ''}`} onClick={() => setActiveTab('companies')}>
          <Building2 size={14} /> Por Empresa
        </button>
        <button className={`stats-tab ${activeTab === 'tools' ? 'stats-tab--active' : ''}`} onClick={() => setActiveTab('tools')}>
          <Wrench size={14} /> Herramientas
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="stats-summary-grid">
            <div className="stats-summary-card">
              <div className="stats-summary-value">{stats.summary.totalCompanies}</div>
              <div className="stats-summary-label">Empresas</div>
            </div>
            <div className="stats-summary-card">
              <div className="stats-summary-value">{stats.summary.totalFinancialRecords}</div>
              <div className="stats-summary-label">Registros Financ.</div>
            </div>
            <div className="stats-summary-card">
              <div className="stats-summary-value">{stats.summary.totalBalanceSheets}</div>
              <div className="stats-summary-label">Balance Sheets</div>
            </div>
            <div className="stats-summary-card">
              <div className="stats-summary-value">{stats.summary.totalStockMetrics}</div>
              <div className="stats-summary-label">Stock Metrics</div>
            </div>
            <div className="stats-summary-card">
              <div className="stats-summary-value">{stats.summary.totalSegments}</div>
              <div className="stats-summary-label">Segmentos</div>
            </div>
            <div className="stats-summary-card">
              <div className="stats-summary-value">{stats.summary.totalProductSegments}</div>
              <div className="stats-summary-label">x Producto</div>
            </div>
            <div className="stats-summary-card">
              <div className="stats-summary-value">{stats.summary.totalGeoSegments}</div>
              <div className="stats-summary-label">x Geografía</div>
            </div>
            <div className="stats-summary-card">
              <div className="stats-summary-value">
                {stats.summary.totalCompanies > 0
                  ? Math.round(
                      (Object.values(stats.fieldCoverage.financialData).reduce((s, f) => s + f.pct, 0) /
                        Object.keys(stats.fieldCoverage.financialData).length)
                    )
                  : 0}%
              </div>
              <div className="stats-summary-label">Promedio Cobertura</div>
            </div>
          </div>

          {/* Sync Origin */}
          <div className="stats-coverage-section">
            <div className="stats-coverage-title">Origen de Datos</div>
            <div className="stats-origin-grid">
              <div className="stats-origin-card">
                <div className="stats-origin-icon stats-origin-icon--fmp">FMP</div>
                <div className="stats-origin-count">{stats.summary.syncOrigin.fmpSynced}</div>
                <div className="stats-origin-label">Financial Modeling Prep</div>
              </div>
              <div className="stats-origin-card">
                <div className="stats-origin-icon stats-origin-icon--sec">SEC</div>
                <div className="stats-origin-count">{stats.summary.syncOrigin.secSynced}</div>
                <div className="stats-origin-label">SEC EDGAR</div>
              </div>
              <div className="stats-origin-card">
                <div className="stats-origin-icon stats-origin-icon--finnhub">FIN</div>
                <div className="stats-origin-count">{stats.summary.syncOrigin.finnhubSynced}</div>
                <div className="stats-origin-label">Finnhub</div>
              </div>
              <div className="stats-origin-card">
                <div className="stats-origin-icon stats-origin-icon--none">—</div>
                <div className="stats-origin-count">{stats.summary.syncOrigin.withoutSync}</div>
                <div className="stats-origin-label">Sin Sync</div>
              </div>
            </div>
          </div>

          {/* Field Coverage */}
          <div className="stats-coverage-section">
            <div className="stats-coverage-title">Cobertura de Campos</div>

            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb', marginBottom: '0.5rem' }}>Financial Data</h3>
            <div className="stats-coverage-grid" style={{ marginBottom: '1rem' }}>
              {Object.entries(stats.fieldCoverage.financialData).map(([key, val]) => (
                <CoverageBar key={key} fieldName={key} field={val} />
              ))}
            </div>

            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669', marginBottom: '0.5rem' }}>Balance Sheet</h3>
            <div className="stats-coverage-grid" style={{ marginBottom: '1rem' }}>
              {Object.entries(stats.fieldCoverage.balanceSheet).map(([key, val]) => (
                <CoverageBar key={key} fieldName={key} field={val} />
              ))}
            </div>

            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed', marginBottom: '0.5rem' }}>Stock Metrics</h3>
            <div className="stats-coverage-grid" style={{ marginBottom: '1rem' }}>
              {Object.entries(stats.fieldCoverage.stockMetric).map(([key, val]) => (
                <CoverageBar key={key} fieldName={key} field={val} />
              ))}
            </div>

            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706', marginBottom: '0.5rem' }}>Company Profile</h3>
            <div className="stats-coverage-grid">
              {Object.entries(stats.fieldCoverage.company).map(([key, val]) => (
                <CoverageBar key={key} fieldName={key} field={val} />
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'companies' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ticker o nombre..."
              className="admin-form-input"
              style={{ paddingLeft: '1rem' }}
            />
          </div>
          <div className="stats-company-list">
            {filteredCompanies.map((c) => (
              <CompanyRow key={c.ticker} company={c} />
            ))}
            {filteredCompanies.length === 0 && (
              <div className="admin-empty">
                <p>No se encontraron empresas</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'tools' && (
        <>
          <div className="stats-tools-grid">
            {Object.entries(stats.toolAvailability)
              .sort((a, b) => b[1].pct - a[1].pct)
              .map(([name, data]) => (
                <ToolCard key={name} name={name} data={data} />
              ))}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Recomendaciones</h3>
            <ul style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.8, listStyle: 'disc', paddingLeft: '1.5rem' }}>
              {Object.entries(stats.toolAvailability)
                .filter(([, d]) => d.pct < 50 && d.available > 0)
                .map(([name]) => (
                  <li key={name}>
                    <strong>{TOOL_LABELS[name] || name}</strong>: solo disponible en {stats.toolAvailability[name].pct}% de empresas.
                    {stats.toolAvailability[name].available < stats.summary.totalCompanies &&
                      ` Faltan campos en ${stats.summary.totalCompanies - stats.toolAvailability[name].available} empresas.`}
                  </li>
                ))}
              {Object.entries(stats.toolAvailability).filter(([, d]) => d.pct === 0).length > 0 && (
                <li style={{ color: '#dc2626' }}>
                  <strong>Sin datos para:</strong>{' '}
                  {Object.entries(stats.toolAvailability)
                    .filter(([, d]) => d.pct === 0)
                    .map(([name]) => TOOL_LABELS[name] || name)
                    .join(', ')}
                  . Necesitan APIs adicionales o campos específicos no disponibles en las fuentes actuales.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
