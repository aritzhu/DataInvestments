import { useState, useMemo, useEffect } from 'react';
import type { CompanyProfile } from '../CompanyPage';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { AbbrTip } from '../ui/AbbrTip';
import { SectionReveal } from '../ui/SectionReveal';
import { ValuationChart } from '../ui/ValuationChart';
import { CommoditySensitivityChart } from '../ui/CommoditySensitivityChart';
import { formatPct } from '../../utils/format';
import { VERDICT_COLORS, VERDICT_BG, VERDICT_BORDER, latestFinancialPeriod, type CommodityMapping } from '../../utils/valuation';
import { fetchValuation, fetchCommodityMapping, type ValuationApiResponse, type ValuationConfigs } from '../../utils/valuationApi';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, X, ChevronDown } from 'lucide-react';
import { DisclaimerBanner } from '../DisclaimerBanner';
import { InfoButton } from '../ui/InfoButton';
import { INFO } from '../../utils/infoContent';
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
  per_norm: 'P/E Normalizado',
};

// Fallback slider values while the first API response (with the effective
// sector configs) is loading. Mirrors the backend defaults.
const DEFAULT_SLIDERS: ValuationConfigs = {
  dcf: { growthRate: 5, discountRate: 10, horizonYears: 10 },
  per: { targetPE: 20 },
  pb: { targetPB: 3 },
  ps: { targetPS: 5 },
  evEbitda: { targetMultiple: 15 },
  evEbit: { targetMultiple: 15 },
  ddm: { growthRate: 3, requiredReturn: 8 },
  fcfYield: { targetYield: 8 },
};

export function ValuationTab({ company, financials, stock }: Props) {
  const { user } = useAuth();
  const [activeMethod, setActiveMethod] = useState('dcf');
  const [expandedGrowth, setExpandedGrowth] = useState(false);
  const [expandedWacc, setExpandedWacc] = useState(false);
  const [expandedPERBreakdown, setExpandedPERBreakdown] = useState(false);
  const [ccOverride, setCcOverride] = useState(() => ({ growth: false, discount: false }));
  const [configs, setConfigs] = useState<ValuationConfigs>(DEFAULT_SLIDERS);
  const [data, setData] = useState<ValuationApiResponse | null>(null);
  const [queryVersion, setQueryVersion] = useState(0);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [existingAlarm, setExistingAlarm] = useState<AlarmData | null>(null);
  const [alarmTarget, setAlarmTarget] = useState<'buy' | 'hold' | 'sell'>('buy');
  const [alarmLoading, setAlarmLoading] = useState(false);

  // Load the server-computed valuation (effective sector configs + results).
  useEffect(() => {
    setData(null);
    setConfigs(DEFAULT_SLIDERS);
    setQueryVersion(0);
    let cancelled = false;
    fetchValuation(company.ticker)
      .then((d) => { if (!cancelled) { setData(d); setConfigs(d.configs); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [company.ticker]);

  // Debounced refetch whenever the user moves a slider. The current slider
  // values are sent as backend params, so the server stays the source of truth.
  const configsKey = JSON.stringify(configs);
  const ccKey = `${ccOverride.growth ? 1 : 0}${ccOverride.discount ? 1 : 0}`;
  useEffect(() => {
    if (queryVersion === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchValuation(company.ticker, {
        growth: configs.dcf.growthRate,
        discount: configs.dcf.discountRate,
        horizon: configs.dcf.horizonYears,
        per: configs.per.targetPE,
        pb: configs.pb.targetPB,
        ps: configs.ps.targetPS,
        evEbitda: configs.evEbitda.targetMultiple,
        evEbit: configs.evEbit.targetMultiple,
        ddmGrowth: configs.ddm.growthRate,
        ddmReturn: configs.ddm.requiredReturn,
        fcfYield: configs.fcfYield.targetYield,
        ccGrowth: ccOverride.growth,
        ccDiscount: ccOverride.discount,
      }, { signal: controller.signal })
        .then((d) => { if (!controller.signal.aborted) setData(d); })
        .catch(() => {});
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryVersion, configsKey, ccKey, company.ticker]);

  const [commodityMapping, setCommodityMapping] = useState<CommodityMapping | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchCommodityMapping(company.ticker, company.industry, company.sector)
      .then((m) => { if (!cancelled) setCommodityMapping(m); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [company.ticker, company.industry, company.sector]);
  const isBasicMaterials = !!commodityMapping;
  const isBasicMaterialsSector = company.sector?.toLowerCase() === 'basic materials';
  const [commodityData, setCommodityData] = useState<{ price: number; name: string; currency: string } | null>(null);
  const [optimisticPct, setOptimisticPct] = useState(commodityMapping?.defaultOptimisticPct ?? 20);
  const [pessimisticPct, setPessimisticPct] = useState(commodityMapping?.defaultPessimisticPct ?? 20);
  const [manualPctMP, setManualPctMP] = useState(0.5);

  // Fetch current commodity price for Basic Materials companies
  useEffect(() => {
    if (!isBasicMaterials || !commodityMapping) return;
    let cancelled = false;
    fetch(`/api/commodities/prices?symbols=${encodeURIComponent(commodityMapping.commoditySymbol)}`)
      .then((res) => res.json())
      .then((data: { prices?: Record<string, { price: number; name: string; currency: string }> }) => {
        if (cancelled) return;
        const entry = data?.prices?.[commodityMapping.commoditySymbol];
        if (entry) setCommodityData({ price: entry.price, name: entry.name, currency: entry.currency });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isBasicMaterials, commodityMapping]);

  const results = data?.results ?? [];

  const cogs = useMemo(() => {
    const annual = [...financials]
      .filter((x) => (x.quarter == null || x.quarter === 0) && x.costOfRevenue != null && x.costOfRevenue > 0)
      .sort((a, b) => b.year - a.year)[0];
    if (annual) return annual.costOfRevenue;
    const anyRow = [...financials]
      .filter((x) => x.costOfRevenue != null && x.costOfRevenue > 0)
      .sort((a, b) => (b.year - a.year) || (b.quarter ?? 0) - (a.quarter ?? 0))[0];
    return anyRow?.costOfRevenue ?? 0;
  }, [financials]);

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

  const recommendedModel = data?.recommended.model ?? 'dcf';
  const recommendedBm = data?.recommended.businessModel ?? data?.businessModel ?? null;
  const applicable = results.filter(r => r.fairValue != null && r.fairValue > 0);
  const activeId = applicable.some(r => r.id === activeMethod)
    ? activeMethod
    : (applicable.find(r => r.id === recommendedModel)?.id ?? applicable[0]?.id ?? 'dcf');
  const active = results.find(r => r.id === activeId);

  if (!stock) {
    return <div className="tab-empty">Sin datos suficientes para valoración</div>;
  }

  const resolved = data?.recommended ?? { model: 'dcf', fairValue: null };
  const heroModel = resolved.model;
  const heroResult = results.find(r => r.id === heroModel) ?? applicable[0] ?? null;
  const heroRecommended = heroResult?.id === recommendedModel;
  const recommendedFair = heroResult?.fairValue ?? null;
  const avgUpside = recommendedFair && stock.currentPrice > 0 ? (recommendedFair - stock.currentPrice) / stock.currentPrice : null;
  const { verdict, label: verdictLabel } = data?.verdict ?? { verdict: 'na', label: 'Sin datos' };
  const periodInfo = latestFinancialPeriod(financials);
  const periodLabel = periodInfo.isTTM
    ? `TTM — ${periodInfo.quarter != null ? `Q${periodInfo.quarter} ` : ''}${periodInfo.year ?? '—'}`
    : `Ejercicio ${periodInfo.year ?? '—'}`;

  const dcfGrowthLabels = ['CAGR ingresos', 'Crecimiento reciente', 'Peso ponderado'];
  const dcfWaccLabels = ['Ke (CAPM', 'Kd (interés', 'Impuesto efectivo', 'Peso Equity', 'WACC = Ke×E'];
  // Para 'Equity' y 'Deuda' solo clasificamos como WACC si el método es DCF y hay inputs de WACC presentes.
  const dcfInputs = active?.id === 'dcf' ? (active.inputs ?? []) : [];
  const hasWacc = dcfInputs.some((i) => i.label.startsWith('Ke (CAPM'));
  const isWaccInput = (label: string) =>
    dcfWaccLabels.some((p) => label.startsWith(p)) ||
    (hasWacc && (label === 'Equity' || label === 'Deuda'));
  const dcfGrowthItems = dcfInputs.filter((i) => dcfGrowthLabels.some((p) => i.label.startsWith(p)));
  const dcfWaccItems = dcfInputs.filter((i) => isWaccInput(i.label));
  const dcfOtherItems = dcfInputs.filter((i) => !dcfGrowthLabels.some((p) => i.label.startsWith(p)) && !isWaccInput(i.label));

  const barPct = (() => {
    if (!recommendedFair || !stock.currentPrice || stock.currentPrice <= 0) return 50;
    const max = Math.max(recommendedFair, stock.currentPrice);
    if (max <= 0) return 50;
    return Math.min(100, Math.max(0, (stock.currentPrice / max) * 100));
  })();

  const updateConfig = <K extends keyof ValuationConfigs>(section: K, key: keyof ValuationConfigs[K], value: number) => {
    setConfigs(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setQueryVersion(v => v + 1);
  };

  return (
    <div className="val-tab">
      {/* Investment disclaimer */}
      <SectionReveal delay={0}>
        <DisclaimerBanner className="val-disclaimer" />
      </SectionReveal>

      {/* Hero Summary */}
      <SectionReveal delay={0}>
        <div className="val-hero-summary">
          <div className="val-hero-fair">
            <span className="val-hero-amount">
              {recommendedFair ? `${company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}${recommendedFair.toFixed(2)}` : '—'}
            </span>
            <span className="val-hero-label"><span className="info-label-row">Valor justo <InfoButton content={INFO['valuation.hero']} /></span></span>
            <span className="val-hero-method"><AbbrTip abbr={METHOD_NAMES[heroModel] || heroModel} /></span>
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
                    background: verdict === 'buy' ? 'var(--blue-light)' : verdict === 'sell' ? 'var(--red)' : 'var(--amber)',
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
            {periodLabel}
          </span>
        </div>
        {periodInfo.isTTM && (
          <p className="val-ttm-legend">
            <AbbrTip abbr="TTM" /> = <strong>Trailing Twelve Months</strong> — últimos 12 meses acumulados. Último trimestre disponible: <strong>Q{periodInfo.quarter} {periodInfo.year}</strong>. Los ingresos/beneficio se suman de los 4 trimestres más recientes; el balance corresponde al último trimestre.
          </p>
        )}
        <p className="verdict-explanation">
          {heroRecommended ? (
            recommendedBm?.model != null ? (
              <>La valoración se basa en el <strong>{recommendedBm.label.toLowerCase()}</strong> (modelo inferido de sus métricas), que se valora con el método <strong>{METHOD_NAMES[heroModel] || heroModel}</strong>. {recommendedBm.reason} Los datos utilizados corresponden al <strong>{periodLabel.toLowerCase()}</strong>.</>
            ) : (
              <>La valoración se basa en el <strong>método recomendado para el sector</strong> (<strong>{METHOD_NAMES[heroModel] || heroModel}</strong>), que es el modelo estadísticamente más adecuado para este tipo de empresa. Los datos utilizados corresponden al <strong>{periodLabel.toLowerCase()}</strong>.</>
            )
          ) : (
            <>La valoración se basa en el <strong>método con datos disponibles</strong> (<strong>{METHOD_NAMES[heroModel] || heroModel}</strong>), el mejor ajuste para esta empresa. Los datos utilizados corresponden al <strong>{periodLabel.toLowerCase()}</strong>.</>
          )}{' '}
          Un upside &gt; 15% sugiere <strong>infravaloración</strong>; menor a -15% <strong>sobrevaloración</strong>.
        </p>
        {periodInfo.year && periodInfo.year < new Date().getFullYear() - 2 && (
          <p className="val-stale-warning">
            ⚠ Esta valoración se basa en datos financieros del ejercicio <strong>{periodInfo.year}</strong>. Los datos pueden estar desactualizados y las estimaciones podrían no reflejar la situación actual de la empresa.
          </p>
        )}
      </SectionReveal>

      {/* Method Grid */}
      <SectionReveal delay={80}>
        {applicable.length === 0 ? (
          <div className="tab-empty">Sin datos suficientes para valoración</div>
        ) : (
          <>
            <div className="val-method-grid">
              {applicable.map((r) => {
                const isActive = activeId === r.id;
                const isRecommended = heroRecommended && r.id === recommendedModel;
                return (
                  <button
                    key={r.id}
                    className={`val-method-card ${isActive ? 'val-method-card--active' : ''} ${isRecommended ? 'val-method-card--recommended' : ''}`}
                    onClick={() => setActiveMethod(r.id)}
                  >
                    <div className="val-method-card-header">
                      <span className="val-method-card-name">{r.name}</span>
                      {isRecommended && <span className="val-recommended-badge">{recommendedBm?.model != null ? 'Método por modelo de negocio' : 'Método sugerido por sector'}</span>}
                      <span className="val-confidence-dot" style={{ background: CONFIDENCE_DOT[r.confidence] }} />
                    </div>
                    <span className="val-method-card-value">
                      {company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}{r.fairValue!.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
            {applicable.length < results.length && (
              <p className="verdict-explanation">
                <strong>No aplican a esta empresa por su modelo de negocio:</strong>{' '}
                {results.filter(r => !applicable.includes(r)).map(r => `${r.name} (${r.confidenceReason || 'sin datos'})`).join('; ')}.
              </p>
            )}
          </>
        )}
      </SectionReveal>

      {/* Detail Panel */}
      {applicable.length > 0 && active && (
        <SectionReveal delay={160}>
          <div className="val-detail">
            <div className="val-hero">
              <div className="val-hero-left">
                <h3 className="val-hero-title">{active.name}</h3>
                <p className="val-hero-desc">{active.description}</p>
                <span className="val-formula">{active.formula}</span>
                {active.id !== 'dcf' && active.inputs.length > 0 && (
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
                    <span className="val-margin-label"><span className="info-label-row">Margen de seguridad <InfoButton content={INFO['valuation.marginOfSafety']} /></span></span>
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
                      Objetivo: {existingAlarm.targetVerdict === 'buy' ? 'Infravalorada' : existingAlarm.targetVerdict === 'hold' ? 'Justa' : 'Sobrevalorada'}
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
                    <label className="val-config-label"><span className="info-label-row">Crecimiento anual <InfoButton content={INFO['valuation.dcfGrowth']} /></span></label>
                    <input type="range" min={0} max={15} step={0.5} value={configs.dcf.growthRate}
                      onChange={(e) => { updateConfig('dcf', 'growthRate', parseFloat(e.target.value)); setCcOverride((prev) => ({ ...prev, growth: true })); }} className="val-config-slider" />
                    <span className="val-config-value">{configs.dcf.growthRate}%</span>
                    {dcfGrowthItems.length > 0 && (
                      <>
                        <button type="button" className="val-config-toggle" onClick={() => setExpandedGrowth(!expandedGrowth)} aria-expanded={expandedGrowth}>
                          <ChevronDown size={14} className={`val-config-toggle-icon ${expandedGrowth ? 'val-config-toggle-icon--open' : ''}`} />
                          <span>Valores utilizados</span>
                        </button>
                        {expandedGrowth && (
                          <div className="val-config-detail">
                            {dcfGrowthItems.map((inp, i) => (
                              <div key={i} className="val-config-detail-row">
                                <span className="val-config-detail-label">{inp.label}</span>
                                <span className="val-config-detail-value">{inp.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="val-config-item">
                    <label className="val-config-label"><span className="info-label-row">Tasa de descuento <InfoButton content={INFO['valuation.discountRate']} /></span></label>
                    <input type="range" min={5} max={20} step={0.5} value={configs.dcf.discountRate}
                      onChange={(e) => { updateConfig('dcf', 'discountRate', parseFloat(e.target.value)); setCcOverride((prev) => ({ ...prev, discount: true })); }} className="val-config-slider" />
                    <span className="val-config-value">{configs.dcf.discountRate}%</span>
                    {dcfWaccItems.length > 0 && (
                      <>
                        <button type="button" className="val-config-toggle" onClick={() => setExpandedWacc(!expandedWacc)} aria-expanded={expandedWacc}>
                          <ChevronDown size={14} className={`val-config-toggle-icon ${expandedWacc ? 'val-config-toggle-icon--open' : ''}`} />
                          <span>Valores utilizados</span>
                        </button>
                        {expandedWacc && (
                          <div className="val-config-detail">
                            {dcfWaccItems.map((inp, i) => (
                              <div key={i} className="val-config-detail-row">
                                <span className="val-config-detail-label">{inp.label}</span>
                                <span className="val-config-detail-value">{inp.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="val-config-item">
                    <label className="val-config-label"><span className="info-label-row">Horizonte (años) <InfoButton content={INFO['valuation.horizon']} /></span></label>
                    <input type="range" min={3} max={20} step={1} value={configs.dcf.horizonYears}
                      onChange={(e) => updateConfig('dcf', 'horizonYears', parseInt(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.dcf.horizonYears}</span>
                  </div>
                </div>
                {dcfOtherItems.length > 0 && (
                  <div className="val-inputs">
                    <h4 className="val-inputs-title">Datos utilizados</h4>
                    <div className="val-inputs-grid">
                      {dcfOtherItems.map((inp, i) => (
                        <div key={i} className="val-inputs-item">
                          <span className="val-inputs-label">{inp.label}</span>
                          <span className="val-inputs-value">{inp.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Commodity sensitivity for Basic Materials */}
            {active.id === 'dcf' && cogs > 0 && isBasicMaterials && commodityMapping && commodityData && (
              <div className="val-commodity-section">
                <h4 className="val-commodity-title">
                  Sensibilidad al precio de {commodityMapping.commodityName}
                </h4>
                <p className="val-commodity-desc">
                  El precio de {commodityMapping.commodityName} afecta directamente al coste de ventas (COGS). Ajustando su variación, el FCF cambia solo por esa partida.
                </p>
                <div className="val-commodity-meta">
                  <span className="val-commodity-meta-item">
                    <span className="val-commodity-meta-label">Precio actual</span>
                    <span className="val-commodity-meta-value">
                      {commodityData.currency === 'USD' ? '$' : commodityData.currency === 'EUR' ? '€' : commodityData.currency === 'GBP' ? '£' : ''}
                      {commodityData.price.toLocaleString('es-ES', { maximumFractionDigits: 3 })}
                    </span>
                  </span>
                  <span className="val-commodity-meta-item">
                    <span className="val-commodity-meta-label">% COGS = materia prima</span>
                    <span className="val-commodity-meta-value">{(commodityMapping.pctMP ?? 0.5) * 100}%</span>
                  </span>
                </div>
                <div className="val-commodity-controls">
                  <div className="val-commodity-item">
                    <label className="val-commodity-label">Optimista (+%)</label>
                    <input type="range" min={5} max={60} step={5} value={optimisticPct}
                      onChange={(e) => setOptimisticPct(parseInt(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">+{optimisticPct}%</span>
                  </div>
                  <div className="val-commodity-item">
                    <label className="val-commodity-label">Pesimista (−%)</label>
                    <input type="range" min={5} max={60} step={5} value={pessimisticPct}
                      onChange={(e) => setPessimisticPct(parseInt(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">−{pessimisticPct}%</span>
                  </div>
                </div>
                <CommoditySensitivityChart
                  baseFCF={active.inputs.find((i) => i.label.startsWith('FCF'))?.rawValue ?? 0}
                  shares={active.inputs.find((i) => i.label === 'Acciones')?.rawValue ?? 0}
                  growthRate={configs.dcf.growthRate}
                  discountRate={configs.dcf.discountRate}
                  horizonYears={configs.dcf.horizonYears}
                  commodityPrice={commodityData.price}
                  commodityName={commodityMapping.commodityName}
                  commodityCurrency={commodityData.currency}
                  currency={company.currency || 'USD'}
                  optimisticPct={optimisticPct}
                  pessimisticPct={pessimisticPct}
                  cogs={cogs}
                  pctMP={commodityMapping.pctMP ?? 0.5}
                  taxRate={commodityMapping.taxRate ?? 0.25}
                />
              </div>
            )}
            {/* Manual raw-material sensitivity for Basic Materials without a real commodity quote */}
            {active.id === 'dcf' && cogs > 0 && isBasicMaterialsSector && !(commodityMapping && commodityData) && (
              <div className="val-commodity-section">
                <h4 className="val-commodity-title">
                  Sensibilidad a materias primas
                </h4>
                <p className="val-commodity-desc">
                  Esta empresa no tiene una cotización directa de su materia prima. Ajusta manualmente el % del coste de ventas (COGS) que es materia prima y cómo varía su precio; el impacto se limita a esa partida.
                </p>
                <div className="val-commodity-controls">
                  <div className="val-commodity-item">
                    <label className="val-commodity-label">Variación optimista (+%)</label>
                    <input type="range" min={5} max={60} step={5} value={optimisticPct}
                      onChange={(e) => setOptimisticPct(parseInt(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">+{optimisticPct}%</span>
                  </div>
                  <div className="val-commodity-item">
                    <label className="val-commodity-label">Variación pesimista (−%)</label>
                    <input type="range" min={5} max={60} step={5} value={pessimisticPct}
                      onChange={(e) => setPessimisticPct(parseInt(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">−{pessimisticPct}%</span>
                  </div>
                  <div className="val-commodity-item">
                    <label className="val-commodity-label">% COGS = materia prima</label>
                    <input type="range" min={10} max={90} step={5} value={Math.round(manualPctMP * 100)}
                      onChange={(e) => setManualPctMP(parseInt(e.target.value) / 100)} className="val-config-slider" />
                    <span className="val-config-value">{Math.round(manualPctMP * 100)}%</span>
                  </div>
                </div>
                <CommoditySensitivityChart
                  baseFCF={active.inputs.find((i) => i.label.startsWith('FCF'))?.rawValue ?? 0}
                  shares={active.inputs.find((i) => i.label === 'Acciones')?.rawValue ?? 0}
                  growthRate={configs.dcf.growthRate}
                  discountRate={configs.dcf.discountRate}
                  horizonYears={configs.dcf.horizonYears}
                  commodityPrice={0}
                  commodityName="materia prima"
                  commodityCurrency={company.currency || 'USD'}
                  currency={company.currency || 'USD'}
                  optimisticPct={optimisticPct}
                  pessimisticPct={pessimisticPct}
                  cogs={cogs}
                  pctMP={manualPctMP}
                  taxRate={0.25}
                />
              </div>
            )}
            {active.configurable && active.id === 'per' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar PER</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label"><span className="info-label-row">Target P/E <InfoButton content={INFO['valuation.targetPE']} /></span></label>
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
                    <label className="val-config-label"><span className="info-label-row">Target P/B <InfoButton content={INFO['valuation.targetPB']} /></span></label>
                    <input type="range" min={0.1} max={10} step={0.1} value={configs.pb.targetPB}
                      onChange={(e) => updateConfig('pb', 'targetPB', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.pb.targetPB.toFixed(1)}x</span>
                  </div>
                </div>
              </div>
            )}
            {active.configurable && active.id === 'ps' && (
              <div className="val-config">
                <h4 className="val-config-title">Configurar P/S</h4>
                <div className="val-config-grid">
                  <div className="val-config-item">
                    <label className="val-config-label"><span className="info-label-row">Target P/S <InfoButton content={INFO['valuation.targetPS']} /></span></label>
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
                    <label className="val-config-label"><span className="info-label-row">Múltiplo objetivo <InfoButton content={INFO['valuation.targetMultiple']} /></span></label>
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
                    <label className="val-config-label"><span className="info-label-row">Múltiplo objetivo <InfoButton content={INFO['valuation.targetMultiple']} /></span></label>
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
                    <label className="val-config-label"><span className="info-label-row">Crecimiento de dividendos <InfoButton content={INFO['valuation.ddmGrowth']} /></span></label>
                    <input type="range" min={0} max={10} step={0.5} value={configs.ddm.growthRate}
                      onChange={(e) => updateConfig('ddm', 'growthRate', parseFloat(e.target.value))} className="val-config-slider" />
                    <span className="val-config-value">{configs.ddm.growthRate}%</span>
                  </div>
                  <div className="val-config-item">
                    <label className="val-config-label"><span className="info-label-row">Retorno requerido <InfoButton content={INFO['valuation.ddmReturn']} /></span></label>
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
                    <label className="val-config-label"><span className="info-label-row">FCF Yield objetivo <InfoButton content={INFO['valuation.fcfYieldTarget']} /></span></label>
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
                <InfoButton content={INFO['valuation.uncertainty']} />
              </div>
            )}
            {/* Warning for partial quarterly data */}
            {active.dataWarning && (
              <div className="val-negative-warning">
                <span className="val-negative-warning-icon">⚠️</span>
                <span>{active.dataWarning}</span>
                <InfoButton content={INFO['valuation.uncertainty']} />
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
            {active.id === 'per_norm' && (
              <div className="val-pernorm">
                <h4 className="val-pernorm-title">Escenarios y sensibilidad</h4>
                {active.scenarios && (
                  <div className="val-pernorm-scenarios">
                    {([
                      { key: 'bear' as const, label: 'Bear', price: active.scenarios.bear, tone: 'warn' },
                      { key: 'base' as const, label: 'Base', price: active.scenarios.base, tone: 'base' },
                      { key: 'bull' as const, label: 'Bull', price: active.scenarios.bull, tone: 'pos' },
                    ]).map((s) => (
                      <div key={s.key} className={`val-pernorm-scenario val-pernorm-scenario--${s.tone}`}>
                        <span className="val-pernorm-scenario-label">{s.label}</span>
                        <span className="val-pernorm-scenario-value">
                          {company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}
                          {s.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {active.sensitivityTable && active.sensitivityTable.length > 0 && (
                  <div className="val-pernorm-sensitivity">
                    <span className="val-pernorm-subtitle">Precio objetivo según el múltiplo utilizado</span>
                    <table className="val-pernorm-table">
                      <thead>
                        <tr>
                          <th>P/E</th>
                          <th>Precio objetivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.sensitivityTable.map((row) => (
                          <tr key={row.pe} className={row.isTarget ? 'is-target' : undefined}>
                            <td>{row.pe}x{row.isTarget ? ' ← usado' : ''}</td>
                            <td>
                              {company.currency === 'EUR' ? '€' : company.currency === 'GBP' ? '£' : '$'}
                              {row.price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {active.perPEBreakdown && (
                  <div className="val-config">
                    <button
                      className="val-config-toggle"
                      onClick={() => setExpandedPERBreakdown((v) => !v)}
                      aria-expanded={expandedPERBreakdown}
                    >
                      Cómo se eligió el P/E objetivo
                      <ChevronDown className={expandedPERBreakdown ? 'val-config-chevron open' : 'val-config-chevron'} />
                    </button>
                    {expandedPERBreakdown && (
                      <div className="val-config-detail">
                        {(() => {
                          const b = active.perPEBreakdown!;
                          const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;
                          return (
                            <div className="val-pernorm-breakdown">
                              <div className="val-pernorm-break-row">
                                <span className="val-pernorm-break-label">Peso P/E fundamental</span>
                                <span className="val-pernorm-break-value">
                                  {b.weights.fundamental > 0 ? fmtPct(b.weights.fundamental) : '—'}
                                  {b.weights.fundamental > 0 && b.fundamental && (
                                    <span className="val-pernorm-break-detail"> = payout/(Ke−g): {b.fundamental.payout.toFixed(2)} / ({b.fundamental.ke.toFixed(2)} − {b.fundamental.g.toFixed(3)})</span>
                                  )}
                                </span>
                              </div>
                              <div className="val-pernorm-break-row">
                                <span className="val-pernorm-break-label">Peso P/E forward</span>
                                <span className="val-pernorm-break-value">
                                  {b.weights.forward > 0 ? fmtPct(b.weights.forward) : '—'}
                                  {b.weights.forward > 0 && b.forward != null && <span className="val-pernorm-break-detail"> = {b.forward.toFixed(1)}x</span>}
                                </span>
                              </div>
                              <div className="val-pernorm-break-row">
                                <span className="val-pernorm-break-label">Peso P/E actual</span>
                                <span className="val-pernorm-break-value">
                                  {b.weights.current > 0 ? fmtPct(b.weights.current) : '—'}
                                  {b.weights.current > 0 && b.current != null && <span className="val-pernorm-break-detail"> = {b.current.toFixed(1)}x</span>}
                                </span>
                              </div>
                              {b.usedFallback && (
                                <div className="val-pernorm-break-row val-pernorm-break-row--warn">
                                  <span className="val-pernorm-break-label">Ajuste (fallback)</span>
                                  <span className="val-pernorm-break-value">{b.fallbackReason ?? 'Sin referencias de mercado'}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
                <p className="val-pernorm-note">
                  P/E histórico y P/E de comparables no están disponibles en este modelo de datos.
                  El objetivo combina P/E fundamental (coste de equity, payout y crecimiento) con el
                  P/E forward y el P/E actual como referencias de mercado.
                </p>
              </div>
            )}
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
          <h4 className="val-quality-title"><span className="info-label-row">Calidad y solidez financiera <InfoButton content={INFO['valuation.quality']} /></span></h4>
          <div className="val-quality-grid">
            <div className="val-q-card">
              <span className="val-q-label"><AbbrTip abbr="ROE" /></span>
              <span className="val-q-value">{stock.roe != null ? formatPct(stock.roe) : '—'}</span>
              <span className="val-q-desc">Rentabilidad sobre patrimonio</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label"><AbbrTip abbr="ROA" /></span>
              <span className="val-q-value">{stock.roa != null ? formatPct(stock.roa) : '—'}</span>
              <span className="val-q-desc">Rentabilidad sobre activos</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label"><AbbrTip abbr="ROIC" /></span>
              <span className="val-q-value">{stock.roic != null ? formatPct(stock.roic) : '—'}</span>
              <span className="val-q-desc">Rentabilidad sobre capital invertido</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label"><AbbrTip abbr="Current Ratio" /></span>
              <span className="val-q-value">{stock.currentRatio?.toFixed(2) || '—'}</span>
              <span className="val-q-desc">Liquidez a corto plazo</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label"><AbbrTip abbr="Debt/Equity" /></span>
              <span className="val-q-value">{stock.debtToEquity?.toFixed(2) || '—'}</span>
              <span className="val-q-desc">Apalancamiento</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label"><AbbrTip abbr="Altman Z-Score" /></span>
              <span className="val-q-value">{stock.altmanZ?.toFixed(2) || '—'}</span>
              <span className="val-q-desc">Riesgo de quiebra</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label"><AbbrTip abbr="Piotroski" /></span>
              <span className="val-q-value">{stock.piotroskiScore != null ? `${stock.piotroskiScore}/9` : '—'}</span>
              <span className="val-q-desc">Fortaleza financiera</span>
            </div>
            <div className="val-q-card">
              <span className="val-q-label"><AbbrTip abbr="Dividend Yield" /></span>
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
              <button className="val-alarm-modal-close" onClick={() => setShowAlarmModal(false)} aria-label="Cerrar modal de alarma">
                <X size={20} />
              </button>
            </div>
            <div className="val-alarm-modal-body">
              <p className="val-alarm-modal-desc">¿Cuándo quieres que te avise?</p>
              <p className="val-alarm-note">Los estados ("Infravalorada", "Justa", "Sobrevalorada") son estimaciones automáticas del modelo de valoración, no recomendaciones de compra o venta.</p>
              <div className="val-alarm-options">
                {([
                  { value: 'buy' as const, label: 'Infravalorada', desc: 'Cuando el sistema detecte que está por debajo de su valor justo', color: 'var(--blue-light)' },
                  { value: 'hold' as const, label: 'Justa', desc: 'Cuando el precio esté cerca del valor intrínseco', color: 'var(--amber)' },
                  { value: 'sell' as const, label: 'Sobrevalorada', desc: 'Cuando el sistema detecte que está por encima de su valor justo', color: 'var(--red)' },
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
