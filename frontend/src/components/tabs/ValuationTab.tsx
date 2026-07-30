import { useState, useMemo, useEffect } from 'react';
import type { CompanyProfile } from '../CompanyPage';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { SectionReveal } from '../ui/SectionReveal';
import { ValuationChart } from '../ui/ValuationChart';
import { formatPct } from '../../utils/format';
import { computeAll, weightedAverage, getVerdict, VERDICT_COLORS, VERDICT_BG, VERDICT_BORDER, getSectorConfigs, getRecommendedModel, latestFinancialPeriod, type ValuationInput } from '../../utils/valuation';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, X } from 'lucide-react';
import '../../styles/stockvalue.css';

const getAuth = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

interface AlarmData {
  id: string;
  companyId: string;
  targetVerdict: string;
  lastVerdict: string | null;
  lastPrice: number | null;
  lastCheckedAt: string | null;
  triggered: boolean;
}

interface Props {
  company: CompanyProfile['company'];
  financials: CompanyProfile['financials'];
  balanceSheets: CompanyProfile['balanceSheets'];
  stock: CompanyProfile['stockMetrics'][0] | null;
  selectedYear: number | null;
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'var(--color-success)',
  medium: 'var(--color-warning)',
  low: 'var(--color-danger)',
  na: 'var(--text-tertiary)',
};

const METHOD_NAMES: Record<string, string> = {
  dcf: 'DCF',
  per: 'P/E',
  pb: 'P/B',
  ps: 'P/S',
  ev_ebitda: 'EV/EBITDA',
  ev_ebit: 'EV/EBIT',
  ddm: 'DDM',
  graham: 'Nº de Graham',
  fcf_yield: 'FCF Yield',
  net_net: 'Net-Net',
};

export function ValuationTab({ company, financials, balanceSheets, stock }: Props) {
  const { user } = useAuth();
  const [activeMethod, setActiveMethod] = useState('dcf');
  const [configs, setConfigs] = useState(() => getSectorConfigs(company.sector, company.industry));
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [existingAlarm, setExistingAlarm] = useState<AlarmData | null>(null);
  const [alarmTarget, setAlarmTarget] = useState<'buy' | 'hold' | 'sell'>('buy');
  const [alarmLoading, setAlarmLoading] = useState(false);

  const input: ValuationInput = useMemo(() => ({
    financials,
    balanceSheets,
    stock: stock!,
    currency: company.currency || 'USD',
  }), [financials, balanceSheets, stock, company.currency]);

  const results = useMemo(() => {
    if (!stock) return [];
    return computeAll(input, configs);
  }, [input, configs]);

  // Fetch existing alarm for this company
  useEffect(() => {
    if (!user || !company.id) return;
    fetch('/api/alarms', { headers: getAuth() })
      .then((res) => res.json())
      .then((alarms: AlarmData[]) => {
        const found = alarms.find((a) => a.companyId === company.id);
        if (found) setExistingAlarm(found);
      })
      .catch(() => {});
  }, [user, company.id]);

  const handleOpenAlarm = () => {
    if (existingAlarm) {
      setAlarmTarget(existingAlarm.targetVerdict as 'buy' | 'hold' | 'sell');
    } else {
      setAlarmTarget('buy');
    }
    setShowAlarmModal(true);
  };

  const handleSubmitAlarm = async () => {
    setAlarmLoading(true);
    try {
      if (existingAlarm) {
        const res = await fetch(`/api/alarms/${existingAlarm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuth() },
          body: JSON.stringify({ targetVerdict: alarmTarget }),
        });
        if (res.ok) {
          const updated = await res.json();
          setExistingAlarm(updated);
          setShowAlarmModal(false);
        }
      } else {
        const res = await fetch('/api/alarms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuth() },
          body: JSON.stringify({ companyId: company.id, targetVerdict: alarmTarget }),
        });
        if (res.ok) {
          const created = await res.json();
          setExistingAlarm(created);
          setShowAlarmModal(false);
        }
      }
    } catch {
      // ignore
    }
    setAlarmLoading(false);
  };

  const handleDeleteAlarm = async () => {
    if (!existingAlarm) return;
    if (!confirm('¿Eliminar esta alarma?')) return;
    const res = await fetch(`/api/alarms/${existingAlarm.id}`, {
      method: 'DELETE',
      headers: getAuth(),
    });
    if (res.ok) {
      setExistingAlarm(null);
      setShowAlarmModal(false);
    }
  };

  const active = results.find(r => r.id === activeMethod);
  const recommendedModel = getRecommendedModel(company.sector, company.industry);

  if (!stock) {
    return <div className="tab-empty">Sin datos suficientes para valoración</div>;
  }

  const validValues = results.filter(r => r.fairValue != null && r.fairValue > 0).map(r => r.fairValue!);
  const recommendedResult = results.find(r => r.id === recommendedModel);
  const recommendedFair = recommendedResult?.fairValue ?? null;
  const avgFair = weightedAverage(results);
  const avgUpside = recommendedFair && stock.currentPrice > 0 ? (recommendedFair - stock.currentPrice) / stock.currentPrice : null;
  const { verdict, label: verdictLabel } = getVerdict(recommendedFair, stock.currentPrice);
  const periodInfo = latestFinancialPeriod(financials);
  const periodLabel = periodInfo.isTTM
    ? `TTM — ${periodInfo.quarter != null ? `Q${periodInfo.quarter} ` : ''}${periodInfo.year ?? '—'}`
    : `Ejercicio ${periodInfo.year ?? '—'}`;

  const barPct = (() => {
    if (!recommendedFair || !stock.currentPrice || stock.currentPrice <= 0) return 50;
    const max = Math.max(recommendedFair, stock.currentPrice);
    if (max <= 0) return 50;
    return Math.min(100, Math.max(0, (stock.currentPrice / max) * 100));
  })();

  const updateConfig = <K extends keyof typeof configs>(section: K, key: keyof typeof configs[K], value: number) => {
    setConfigs(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  return (
    <div className="val-tab">
      {/* Hero Summary */}
      <SectionReveal delay={0}>
        <div className="val-hero-summary">
          <div className="val-hero-fair">
            <span className="val-hero-amount">
              {recommendedFair ? `${company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}${recommendedFair.toFixed(2)}` : '—'}
            </span>
            <span className="val-hero-label">Valor justo</span>
            <span className="val-hero-method">{METHOD_NAMES[recommendedModel] || recommendedModel}</span>
          </div>

          <div className="val-hero-center">
            <div className="val-verdict" style={{ background: VERDICT_BG[verdict], borderColor: VERDICT_BORDER[verdict] }}>
              <span className="val-verdict-dot" style={{ background: VERDICT_COLORS[verdict] }} />
              <span className="val-verdict-label" style={{ color: VERDICT_COLORS[verdict] }}>{verdictLabel}</span>
              {avgUpside != null && (
                <span className="val-verdict-pct" style={{ color: VERDICT_COLORS[verdict] }}>
                  {avgUpside > 0 ? '+' : ''}{(avgUpside * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="val-hero-bar">
              <div className="val-hero-bar-track">
                <div
                  className="val-hero-bar-fill"
                  style={{
                    width: `${barPct}%`,
                    background: verdict === 'buy' ? '#059669' : verdict === 'sell' ? '#dc2626' : '#d97706',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="val-hero-price">
            <span className="val-hero-amount">{company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}{stock.currentPrice.toFixed(2)}</span>
            <span className="val-hero-label">Precio actual</span>
          </div>
        </div>

        <div className="val-summary-secondary">
          <span className="val-summary-secondary-text">
            Promedio ponderado {validValues.length} métodos: {avgFair ? `${company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}${avgFair.toFixed(2)}` : '—'}
          </span>
          <span className="val-summary-secondary-sep">·</span>
          <span className="val-summary-secondary-text">
            {periodLabel}
          </span>
        </div>
        {periodInfo.isTTM && (
          <p className="val-ttm-legend">
            TTM = <strong>Trailing Twelve Months</strong> — últimos 12 meses acumulados. Último trimestre disponible: <strong>Q{periodInfo.quarter} {periodInfo.year}</strong>. Los ingresos/beneficio se suman de los 4 trimestres más recientes; el balance corresponde al último trimestre.
          </p>
        )}
        <p className="verdict-explanation">
          La valoración se basa en el <strong>método recomendado para el sector</strong> (<strong>{METHOD_NAMES[recommendedModel] || recommendedModel}</strong>), que es el modelo estadísticamente más adecuado para este tipo de empresa. Los datos utilizados corresponden al <strong>{periodLabel.toLowerCase()}</strong>. Un upside &gt; 15% sugiere <strong>infravaloración</strong>; menor a -15% <strong>sobrevaloración</strong>.
        </p>
      </SectionReveal>

      {/* Method Grid */}
      <SectionReveal delay={80}>
        <div className="val-method-grid">
          {results.map((r) => {
            const isActive = activeMethod === r.id;
            const isNA = r.fairValue == null || r.fairValue === 0;
            const isNegative = r.fairValue != null && r.fairValue < 0;
            const isRecommended = r.id === recommendedModel;
            return (
              <button
                key={r.id}
                className={`val-method-card ${isActive ? 'val-method-card--active' : ''} ${isNA ? 'val-method-card--na' : ''} ${isRecommended ? 'val-method-card--recommended' : ''}`}
                onClick={() => setActiveMethod(r.id)}
              >
                <div className="val-method-card-header">
                  <span className="val-method-card-name">{r.name}</span>
                  {isRecommended && <span className="val-recommended-badge">Recomendado</span>}
                  <span className="val-confidence-dot" style={{ background: CONFIDENCE_DOT[r.confidence] }} />
                </div>
                <span className={`val-method-card-value ${isNegative ? 'val-method-card-value--negative' : ''}`}>
                  {isNA ? 'N/D' : `${isNegative ? '-' : ''}${company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}${(isNegative ? -r.fairValue! : r.fairValue!).toFixed(2)}`}
                </span>
              </button>
            );
          })}
        </div>
      </SectionReveal>

      {/* Detail Panel */}
      {active && (
        <SectionReveal delay={160}>
          <div className="val-detail">
            <div className="val-hero">
              <div className="val-hero-left">
                <h3 className="val-hero-title">{active.name}</h3>
                <p className="val-hero-desc">{active.description}</p>
                <span className="val-formula">{active.formula}</span>
                {active.inputs.length > 0 && (
                  <div className="val-inputs">
                    <h4 className="val-inputs-title">Datos utilizados</h4>
                    <div className="val-inputs-grid">
                      {active.inputs.map((inp, i) => (
                        <div key={i} className="val-inputs-item">
                          <span className="val-inputs-label">{inp.label}</span>
                          <span className="val-inputs-value">{inp.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="val-explanation">{active.explanation}</p>
              </div>
              <div className="val-hero-right">
                <div className="val-price-compare">
                  <div className="val-price-block">
                    <span className="val-price-label">Precio actual</span>
                    <span className="val-price-value">
                      {company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}<AnimatedNumber value={stock.currentPrice} format={(n) => n.toFixed(2)} />
                    </span>
                  </div>
<div className="val-price-block val-price-block--intrinsic">
                     <span className="val-price-label">Valor intrínseco</span>
                    <span className={`val-price-value ${active.fairValue != null && active.fairValue < 0 ? 'val-price-value--negative' : 'val-price-value--green'}`}>
                      {active.fairValue != null && active.fairValue !== 0 ? (
                        <>{company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}<AnimatedNumber value={active.fairValue} format={(n) => n.toFixed(2)} /></>
                      ) : '—'}
                     </span>
                   </div>
                </div>
                {active.fairValue && stock.currentPrice > 0 && (
                  <div className="val-margin">
                    <span className="val-margin-label">Margen de seguridad</span>
                    <span className={`val-margin-value ${(active.fairValue - stock.currentPrice) / stock.currentPrice > 0 ? 'positive' : 'negative'}`}>
                      {formatPct((active.fairValue - stock.currentPrice) / stock.currentPrice)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Alarm bar */}
            {user && (
              <div className="val-alarm-bar">
                <button className="val-alarm-btn" onClick={handleOpenAlarm}>
                  <Bell size={16} />
                  {existingAlarm ? 'Editar alarma' : 'Crear alarma'}
                </button>
                {existingAlarm && (
                  <div className="val-alarm-summary">
                    <span className="val-alarm-target">
                      Objetivo: {existingAlarm.targetVerdict === 'buy' ? 'Subvalorada' : existingAlarm.targetVerdict === 'hold' ? 'Justa' : 'Sobrevalorada'}
                    </span>
                    <span className={`val-alarm-status ${existingAlarm.triggered ? 'val-alarm-status--triggered' : ''}`}>
                      {existingAlarm.triggered ? '✓ Alcanzado' : '○ Pendiente'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Configurator */}
            {active.configurable && active.id === 'dcf' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar DCF</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label">Crecimiento anual</label>
                    <input type="range" min={0} max={15} step={0.5} value={configs.dcf.growthRate}
                      onChange={(e) => updateConfig('dcf', 'growthRate', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.dcf.growthRate}%</span>
                  </div>
                  <div className="val-config-item">
                    <label className="val-config-label">Tasa de descuento</label>
                    <input type="range" min={5} max={20} step={0.5} value={configs.dcf.discountRate}
                      onChange={(e) => updateConfig('dcf', 'discountRate', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.dcf.discountRate}%</span>
                  </div>
                  <div className="val-config-item">
                    <label className="val-config-label">Horizonte (años)</label>
                    <input type="range" min={3} max={20} step={1} value={configs.dcf.horizonYears}
                      onChange={(e) => updateConfig('dcf', 'horizonYears', parseInt(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.dcf.horizonYears}</span>
                  </div>
                </div>
              </div>
            )}
            {active.configurable && active.id === 'per' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar PER</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label">Target P/E</label>
                    <input type="range" min={5} max={50} step={1} value={configs.per.targetPE}
                      onChange={(e) => updateConfig('per', 'targetPE', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.per.targetPE}x</span>
                  </div>
                </div>
              </div>
            )}
            {active.configurable && active.id === 'pb' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar P/B</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label">Target P/B</label>
                    <input type="range" min={0.5} max={10} step={0.5} value={configs.pb.targetPB}
                      onChange={(e) => updateConfig('pb', 'targetPB', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.pb.targetPB}x</span>
                  </div>
                </div>
              </div>
            )}
            {active.configurable && active.id === 'ps' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar P/S</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label">Target P/S</label>
                    <input type="range" min={0.5} max={20} step={0.5} value={configs.ps.targetPS}
                      onChange={(e) => updateConfig('ps', 'targetPS', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.ps.targetPS}x</span>
                  </div>
                </div>
              </div>
            )}
            {active.configurable && active.id === 'ev_ebitda' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar EV/EBITDA</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label">Múltiplo objetivo</label>
                    <input type="range" min={5} max={30} step={0.5} value={configs.evEbitda.targetMultiple}
                      onChange={(e) => updateConfig('evEbitda', 'targetMultiple', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.evEbitda.targetMultiple}x</span>
                  </div>
                </div>
              </div>
            )}
            {active.configurable && active.id === 'ev_ebit' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar EV/EBIT</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label">Múltiplo objetivo</label>
                    <input type="range" min={5} max={40} step={0.5} value={configs.evEbit.targetMultiple}
                      onChange={(e) => updateConfig('evEbit', 'targetMultiple', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.evEbit.targetMultiple}x</span>
                  </div>
                </div>
              </div>
            )}
            {active.configurable && active.id === 'ddm' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar DDM</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label">Crecimiento de dividendos</label>
                    <input type="range" min={0} max={10} step={0.5} value={configs.ddm.growthRate}
                      onChange={(e) => updateConfig('ddm', 'growthRate', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.ddm.growthRate}%</span>
                  </div>
                  <div className="val-config-item">
                    <label className="val-config-label">Retorno requerido</label>
                    <input type="range" min={5} max={20} step={0.5} value={configs.ddm.requiredReturn}
                      onChange={(e) => updateConfig('ddm', 'requiredReturn', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.ddm.requiredReturn}%</span>
                  </div>
                </div>
              </div>
            )}
            {active.configurable && active.id === 'fcf_yield' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar FCF Yield</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label">FCF Yield objetivo</label>
                    <input type="range" min={2} max={15} step={0.5} value={configs.fcfYield.targetYield}
                      onChange={(e) => updateConfig('fcfYield', 'targetYield', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.fcfYield.targetYield}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning for negative input */}
            {active.negativeInputWarning && (
              <div className="val-negative-warning">
                <span className="val-negative-warning-icon">⚠️</span>
                <span>{active.negativeInputWarning}</span>
              </div>
            )}
            {/* Confidence */}
            <div className="val-confidence-row">
              <span className="val-confidence-label">Confianza:</span>
              <span className="val-confidence-badge" style={{ background: CONFIDENCE_DOT[active.confidence] }}>
                {active.confidence === 'high' ? 'Alta' : active.confidence === 'medium' ? 'Media' : active.confidence === 'low' ? 'Baja' : 'N/D'}
              </span>
              <span className="val-confidence-reason">{active.confidenceReason}</span>
            </div>
          </div>
        </SectionReveal>
      )}

      {/* Comparison Chart */}
      <SectionReveal delay={240}>
        <div className="val-chart-section">
          <h4 className="val-chart-title">Comparación de métodos</h4>
          <ValuationChart results={results} currentPrice={stock.currentPrice} activeId={activeMethod} onSelect={setActiveMethod} currency={company.currency || 'USD'} />
        </div>
      </SectionReveal>

      {/* Quality & Strength */}
      <SectionReveal delay={320}>
        <div className="val-quality">
          <h4 className="val-quality-title">Calidad y solidez financiera</h4>
          <div className="val-quality-grid">
            <div className="val-q-card">
              <span className="val-q-label">ROE</span>
              <span className="val-q-value">{stock.roe != null ? formatPct(stock.roe) : '—'}</span>
              <span className="val-q-desc">Rentabilidad sobre patrimonio</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label">ROA</span>
              <span className="val-q-value">{stock.roa != null ? formatPct(stock.roa) : '—'}</span>
              <span className="val-q-desc">Rentabilidad sobre activos</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label">ROIC</span>
              <span className="val-q-value">{stock.roic != null ? formatPct(stock.roic) : '—'}</span>
              <span className="val-q-desc">Rentabilidad sobre capital invertido</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label">Current Ratio</span>
              <span className="val-q-value">{stock.currentRatio?.toFixed(2) || '—'}</span>
              <span className="val-q-desc">Liquidez a corto plazo</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label">Debt/Equity</span>
              <span className="val-q-value">{stock.debtToEquity?.toFixed(2) || '—'}</span>
              <span className="val-q-desc">Apalancamiento</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label">Altman Z-Score</span>
              <span className="val-q-value">{stock.altmanZ?.toFixed(2) || '—'}</span>
              <span className="val-q-desc">Riesgo de quiebra</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label">Piotroski</span>
              <span className="val-q-value">{stock.piotroskiScore != null ? `${stock.piotroskiScore}/9` : '—'}</span>
              <span className="val-q-desc">Fortaleza financiera</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label">Dividend Yield</span>
              <span className="val-q-value">{stock.dividendYield != null ? formatPct(stock.dividendYield) : '—'}</span>
              <span className="val-q-desc">Rendimiento por dividendo</span>
            </div>
          </div>
        </div>
      </SectionReveal>

      {/* Alarm Modal */}
      {showAlarmModal && (
        <div className="val-alarm-modal-overlay" onClick={() => setShowAlarmModal(false)}>
          <div className="val-alarm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="val-alarm-modal-header">
              <h3>{existingAlarm ? 'Editar' : 'Crear'} alarma — {company.ticker}</h3>
              <button className="val-alarm-modal-close" onClick={() => setShowAlarmModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="val-alarm-modal-body">
              <p className="val-alarm-modal-desc">¿Cuándo quieres que te avise?</p>
              <div className="val-alarm-options">
                {([
                  { value: 'buy' as const, label: 'Subvalorada', desc: 'Cuando el sistema detecte que está por debajo de su valor justo', color: '#059669' },
                  { value: 'hold' as const, label: 'Justa', desc: 'Cuando el precio esté cerca del valor intrínseco', color: '#d97706' },
                  { value: 'sell' as const, label: 'Sobrevalorada', desc: 'Cuando el sistema detecte que está por encima de su valor justo', color: '#dc2626' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    className={`val-alarm-option ${alarmTarget === opt.value ? 'val-alarm-option--active' : ''}`}
                    style={{ borderColor: alarmTarget === opt.value ? opt.color : undefined }}
                    onClick={() => setAlarmTarget(opt.value)}
                  >
                    <span className="val-alarm-option-radio" style={{ background: alarmTarget === opt.value ? opt.color : undefined }} />
                    <div>
                      <span className="val-alarm-option-label" style={{ color: alarmTarget === opt.value ? opt.color : undefined }}>{opt.label}</span>
                      <span className="val-alarm-option-desc">{opt.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="val-alarm-modal-footer">
              {existingAlarm && (
                <button className="val-alarm-delete-btn" onClick={handleDeleteAlarm}>Eliminar alarma</button>
              )}
              <div className="val-alarm-modal-footer-right">
                <button className="val-alarm-cancel-btn" onClick={() => setShowAlarmModal(false)}>Cancelar</button>
                <button className="val-alarm-save-btn" onClick={handleSubmitAlarm} disabled={alarmLoading}>
                  {alarmLoading ? 'Guardando...' : existingAlarm ? 'Guardar cambios' : 'Crear alarma'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
