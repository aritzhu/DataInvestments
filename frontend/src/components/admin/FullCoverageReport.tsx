import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { guessField, FIELD_LABELS } from '../../utils/tagDiscovery';

interface DetailedFieldEntry {
  fieldName: string;
  label: string;
  category: 'financial' | 'balanceSheet' | 'stockMetric' | 'company';
  source: string;
  value: number | null;
  populated: boolean;
  ytdChange?: number;
}

interface YearData {
  year: number;
  source: string;
  financialData: DetailedFieldEntry[];
  balanceSheet: DetailedFieldEntry[];
  stockMetrics: DetailedFieldEntry[];
  companyProfile: DetailedFieldEntry[];
  totalConceptsExtracted: number;
  mappedConcepts: number;
}

interface ImportEvent {
  timestamp: string;
  ticker: string;
  event: 'start' | 'progress' | 'success' | 'error' | 'skipped';
  message?: string;
  recordsProcessed?: number;
  fieldsPopulated?: number;
  sourceBreakdown?: {
    sec: number;
    finnhub: number;
    european: number;
  };
}

interface FullCoverageReportProps {
  ticker: string;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  financial: 'Estado de Resultados',
  balanceSheet: 'Balance General',
  stockMetric: 'Métricas de Mercado',
  company: 'Perfil de Empresa',
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  financial: { bg: 'var(--red-pale)', border: 'var(--red-line)', text: 'var(--red-deep)' },
  balanceSheet: { bg: 'var(--blue-pale)', border: 'var(--blue-line)', text: 'var(--info-dark)' },
  stockMetric: { bg: 'var(--blue-pale)', border: 'var(--blue-line)', text: 'var(--blue-light)' },
  company: { bg: 'var(--amber-pale)', border: 'var(--amber-line)', text: 'var(--amber)' },
};

export function FullCoverageReport({ ticker, onClose }: FullCoverageReportProps) {
  const [yearsData, setYearsData] = useState<YearData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'details'>('overview');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addedMappings, setAddedMappings] = useState<Set<string>>(new Set());

  const fetchComprehensiveReport = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch data for all years, not just the latest
      const res = await apiFetch(`/api/admin/companies/${ticker}/year-data`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error fetching comprehensive report');
      }
      const data = await res.json();
      setYearsData(data);

      // Fetch import timeline
      const timelineRes = await apiFetch(`/api/admin/companies/${ticker}/import-timeline`);
      if (timelineRes.ok) {
        const timelineData = await timelineRes.json();
        setImportHistory(timelineData);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  const handleAddFieldMapping = async (concept: string, fieldName: string) => {
    const colonIdx = concept.indexOf(':');
    const conceptName = colonIdx >= 0 ? concept.substring(colonIdx + 1) : concept;

    try {
      const res = await apiFetch('/api/admin/field-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, source: 'european', customTags: [concept] }),
      });
      if (!res.ok) throw new Error('Error adding field mapping');

      await apiFetch('/api/admin/concept-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptName, fieldName, source: 'european', confirmedBy: 'admin' }),
      });

      setAddedMappings(prev => new Set(prev).add(concept));
    } catch (err) {
      console.error('Error adding tag mapping:', err);
    }
  };

  useEffect(() => {
    fetchComprehensiveReport();
  }, [fetchComprehensiveReport]);

  const getCurrentYearData = (): YearData | null => {
    if (selectedYear === 0) {
      return yearsData[yearsData.length - 1] || null;
    }
    return yearsData.find(y => y.year === selectedYear) || null;
  };

  const getAllMissingConcepts = (): Array<{ concept: string; fieldName: string; count: number }> => {
    const missingMap = new Map<string, { fieldName: string; count: number }>();
    yearsData.forEach(year => {
      year.stockMetrics
        .filter(f => !f.populated)
        .forEach(field => {
          if (!missingMap.has(field.fieldName)) {
            missingMap.set(field.fieldName, { fieldName: field.fieldName, count: 0 });
          }
          missingMap.get(field.fieldName)!.count++;
        });
    });
    return Array.from(missingMap.entries()).map(([concept, data]) => ({ concept, ...data }));
  };

  const getToolAvailabilityForYear = (yearData: YearData | null) => {
    if (!yearData) return {};
    const tools = {
      dcf: false,
      per: false,
      pb: false,
      ps: false,
      evEbitda: false,
      evEbit: false,
      ddm: false,
      graham: false,
      fcfYield: false,
      netnet: false,
      sankeyCashflow: false,
      compareTab: false,
    };

    if (yearData) {
      const financialFields = yearData.financialData;
      const balanceSheetFields = yearData.balanceSheet;
      const stockMetrics = yearData.stockMetrics;

      tools.dcf = !!(financialFields.find(f => f.fieldName === 'freeCashFlow' && f.populated) ||
        (financialFields.find(f => f.fieldName === 'operatingCashFlow' && f.populated) &&
          financialFields.find(f => f.fieldName === 'capex' && f.populated && f.value && f.value > 0)));
      tools.dcf = tools.dcf && !!(stockMetrics.find(f => f.fieldName === 'sharesOutstanding' && f.populated));
      tools.dcf = tools.dcf && !!(stockMetrics.find(f => f.fieldName === 'currentPrice' && f.populated && f.value && f.value > 0));

      tools.per = !!(financialFields.find(f => f.fieldName === 'netIncome' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'sharesOutstanding' && f.populated));

      tools.pb = !!(balanceSheetFields.find(f => f.fieldName === 'totalStockholdersEquity' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'sharesOutstanding' && f.populated));

      tools.ps = !!(financialFields.find(f => f.fieldName === 'revenue' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'sharesOutstanding' && f.populated));

      tools.evEbitda = !!(financialFields.find(f => f.fieldName === 'ebitda' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'enterpriseValue' && f.value && f.value > 0));

      tools.evEbit = !!(financialFields.find(f => f.fieldName === 'ebit' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'enterpriseValue' && f.value && f.value > 0));

      tools.ddm = !!(financialFields.find(f => f.fieldName === 'dividendsPaid' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'sharesOutstanding' && f.populated));

      tools.graham = !!(financialFields.find(f => f.fieldName === 'netIncome' && f.value && f.value > 0)) &&
        !!(balanceSheetFields.find(f => f.fieldName === 'totalStockholdersEquity' && f.value && f.value > 0 || f.fieldName === 'totalEquity' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'sharesOutstanding' && f.populated));

      tools.fcfYield = !!(financialFields.find(f => f.fieldName === 'freeCashFlow' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'sharesOutstanding' && f.populated)) &&
        !!(stockMetrics.find(f => f.fieldName === 'currentPrice' && f.value && f.value > 0));

      tools.netnet = !!(balanceSheetFields.find(f => f.fieldName === 'cashAndCashEquivalents' && f.value && f.value > 0)) &&
        !!(balanceSheetFields.find(f => f.fieldName === 'totalLiabilities' && f.value && f.value > 0)) &&
        !!(stockMetrics.find(f => f.fieldName === 'sharesOutstanding' && f.populated));

      tools.sankeyCashflow = !!(financialFields.find(f => f.fieldName === 'operatingCashFlow' && f.populated)) &&
        !!(financialFields.find(f => f.fieldName === 'investingCashFlow' && f.populated)) &&
        !!(financialFields.find(f => f.fieldName === 'financingCashFlow' && f.populated));

      tools.compareTab = !!(stockMetrics.find(f => f.fieldName === 'peRatio' && f.populated)) &&
        !!(stockMetrics.find(f => f.fieldName === 'pbRatio' && f.populated)) &&
        !!(stockMetrics.find(f => f.fieldName === 'psRatio' && f.populated));
    }

    return tools;
  };

  const renderOverview = () => {
    const currentYear = getCurrentYearData();
    const toolAvailability = getToolAvailabilityForYear(currentYear);

    const allMissingConcepts = getAllMissingConcepts();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header with ticker and year selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Cobertura de Datos — {ticker}
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              Datos detallados de todos los años disponibles · Tick {selectedYear === 0 ? 'último' : ` ${selectedYear}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Año:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--border-default)', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option value={0}>Útimo año</option>
              {yearsData.map(y => (
                <option key={y.year} value={y.year}>Año {y.year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{yearsData.reduce((sum, y) => sum + y.financialData.length, 0)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Campos Financ.</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{yearsData.reduce((sum, y) => sum + y.balanceSheet.length, 0)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Balance Sheet</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{yearsData.reduce((sum, y) => sum + y.stockMetrics.length, 0)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Stock Metrics</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{importHistory.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Eventos de Import</div>
          </div>
        </div>

        {/* Tool Availability for Selected Year */}
        {currentYear && (
          <div style={{ background: 'var(--surface-2)', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid var(--border-default)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={14} /> Disponibilidad de Herramientas de Valoración ({selectedYear})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(toolAvailability).map(([tool, available]) => {
                const color = available
                  ? tool === 'dcf' ? 'var(--blue-light)'
                  : tool === 'per' ? 'var(--info)'
                  : tool === 'pb' ? 'var(--purple)'
                  : tool === 'ps' ? 'var(--amber)'
                  : tool === 'evEbitda' ? 'var(--red)'
                  : tool === 'evEbit' ? 'var(--orange-deep)'
                  : tool === 'ddm' ? 'var(--cyan-deep)'
                  : tool === 'graham' ? 'var(--blue-light)'
                  : tool === 'fcfYield' ? 'var(--teal)'
                  : tool === 'netnet' ? 'var(--pink)'
                  : tool === 'sankeyCashflow' ? 'var(--purple)'
                  : 'var(--text-tertiary)'
                  : 'var(--text-tertiary)';
                const labels: Record<string, string> = {
                  dcf: 'DCF', per: 'P/E', pb: 'P/B', ps: 'P/S',
                  evEbitda: 'EV/EBITDA', evEbit: 'EV/EBIT', ddm: 'DDM',
                  graham: 'Graham', fcfYield: 'FCF Yield', netnet: 'Net-Net',
                  sankeyCashflow: 'Sankey', compareTab: 'Comparable'
                };
                return (
                  <div key={tool} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: available ? `${color}15` : 'var(--surface-2)', borderRadius: '0.5rem', border: `1px solid ${color}30` }}>
                    <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{labels[tool] || tool}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{available ? '✓' : '✗'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Missing Fields Summary */}
        {allMissingConcepts.length > 0 && (
          <div style={{ background: 'var(--amber-pale)', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid var(--amber-line)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--amber)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={14} /> Campos con Cobertura Baja ({allMissingConcepts.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allMissingConcepts.map(item => {
                const fieldName = item.fieldName;
                const guessed = guessField(fieldName);
                return (
                  <div key={fieldName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--amber-pale)', borderRadius: '0.375rem', border: '1px solid var(--amber-line)' }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{fieldName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {guessed && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--amber)', fontStyle: 'italic' }}>{FIELD_LABELS[guessed] || guessed}</span>
                      )}
                      {guessed && (
                        <button
                          onClick={() => handleAddFieldMapping(fieldName, guessed)}
                          disabled={addedMappings.has(fieldName)}
                          style={{ background: addedMappings.has(fieldName) ? 'var(--blue-light)' : 'var(--amber)', color: 'white', border: 'none', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', cursor: addedMappings.has(fieldName) ? 'default' : 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          {addedMappings.has(fieldName) ? '✓' : '+'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTimeline = () => (
    <div style={{ background: 'var(--surface-2)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-default)' }}>
      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <TrendingUp size={14} /> Cronología de Importaciones
      </h4>
      <div style={{ maxHeight: '20rem', overflow: 'auto' }}>
        {importHistory.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>No hay historial de importaciones disponible</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {importHistory.map((event, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface-1)', borderRadius: '0.5rem', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: '2rem' }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: event.event === 'success' ? 'var(--blue-light)' : event.event === 'error' ? 'var(--red)' : event.event === 'skipped' ? 'var(--amber)' : 'var(--info-light)' }} />
                  {index > 0 && <div style={{ width: '1px', height: '1rem', background: 'var(--border-default)' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{event.event === 'success' ? 'Completado' : event.event === 'error' ? 'Error' : event.event === 'skipped' ? 'Omitido' : event.event === 'progress' ? 'En progreso' : 'Inicio'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{new Date(event.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>{event.message || event.ticker}</p>
                  {event.fieldsPopulated && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>Campos poblados: {event.fieldsPopulated}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDetails = () => {
    const currentYear = getCurrentYearData();
    if (!currentYear) return null;

    const fieldsByCategory = {
      financial: currentYear.financialData,
      balanceSheet: currentYear.balanceSheet,
      stockMetric: currentYear.stockMetrics,
      company: currentYear.companyProfile,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Object.entries(fieldsByCategory).map(([category, fields]) => {
          const isExpanded = expandedCategories.has(category);
          const colors = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];

          return (
            <div key={category} style={{ background: 'var(--surface-1)', borderRadius: '0.75rem', border: `2px solid ${colors.border}`, overflow: 'hidden' }}>
              <div
                onClick={() => setExpandedCategories(prev => {
                  const next = new Set(prev);
                  if (next.has(category)) next.delete(category); else next.add(category);
                  return next;
                })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', background: colors.bg,
                  borderBottom: isExpanded ? `2px solid ${colors.border}` : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: colors.text }} />
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: colors.text }}>{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}</h4>
                  <span style={{ fontSize: '0.7rem', color: colors.text, opacity: 0.7 }}>{fields.length} campos</span>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {isExpanded && (
                <div style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.5rem' }}>
                    {fields.map(field => (
                      <div key={field.fieldName} style={{ padding: '0.75rem', background: field.populated ? colors.bg : 'var(--surface-2)', borderRadius: '0.5rem', border: `1px solid ${field.populated ? colors.border : 'var(--border-default)'}`, transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: field.populated ? colors.text : 'var(--text-tertiary)' }}>{field.label}</span>
                          {field.populated && <CheckCircle2 size={14} style={{ color: colors.text }} />}
                          {!field.populated && <XCircle size={14} style={{ color: 'var(--text-tertiary)' }} />}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>{field.fieldName}</div>
                        {field.source && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Fuente:</span>
                            <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: colors.text }}>{field.source}</span>
                          </div>
                        )}
                        {field.value !== null && field.value !== undefined && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.25rem' }}>
                            {field.value > 1000000 || field.value < -1000000
                              ? `${(field.value / 1000000).toFixed(1)}M`
                              : field.value > 1000 || field.value < -1000
                                ? `${(field.value / 1000).toFixed(1)}k`
                                : field.value}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)', borderRadius: '1rem', width: '100%', maxWidth: '90vw', height: '90vh',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-default)',
          background: 'linear-gradient(135deg, var(--blue-pale) 0%, var(--blue-pale) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--info)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Cobertura de Datos Detallada — {ticker}
              </h3>
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                {yearsData.length} años de datos • {selectedYear === 0 ? 'Último año' : `Año ${selectedYear}`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--border-default)', borderRadius: '0.5rem', padding: '0.25rem' }}>
              {(['overview', 'timeline', 'details'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.375rem',
                    background: activeTab === tab ? 'var(--info)' : 'transparent',
                    color: activeTab === tab ? 'white' : 'var(--text-tertiary)',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab === 'overview' && 'Resumen'}
                  {tab === 'timeline' && 'Historial'}
                  {tab === 'details' && 'Detalles'}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '0.25rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ overflow: 'auto', flex: 1, padding: '1.5rem' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '3rem', color: 'var(--text-tertiary)' }}>
              <Loader2 size={24} className="admin-spinner" />
              <span>Cargando datos detallados...</span>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--red)' }}>
              <XCircle size={32} style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Error</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{error}</p>
              <button onClick={fetchComprehensiveReport} className="admin-form-btn" style={{ marginTop: '1rem' }}>Reintentar</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'timeline' && renderTimeline()}
              {activeTab === 'details' && renderDetails()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}