import { useState } from 'react';
import { TrendingUp, ShieldCheck, HandCoins, Gauge, Users, Target, BookOpen } from 'lucide-react';
import type { CompanyProfile } from '../CompanyPage';
import { AbbrTip } from '../ui/AbbrTip';
import { SectionReveal } from '../ui/SectionReveal';
import { CompareTab } from './CompareTab';
import { fmtCurrencyShort, formatPct } from '../../utils/format';
import { computeGrowth, computeSolvency, computeShareholderReturns, computeEfficiency } from '../../utils/fundamental';
import { getMetricConfidence, parseWarningFields, type MetricConfidence } from '../../utils/metricConfidence';
import { FUND_SECTION_INFO, type FundSectionInfo } from '../../utils/fundamentalEducation';
import '../../styles/fundamental.css';

interface Props {
  company: CompanyProfile['company'];
  financial: CompanyProfile['financials'][0] | undefined;
  financials: CompanyProfile['financials'];
  balanceSheets: CompanyProfile['balanceSheets'];
  stock: CompanyProfile['stockMetrics'][0] | null;
  dataSync?: CompanyProfile['dataSync'] | null;
}

const GUIDE_TOPICS = [
  { key: 'what', label: '¿Qué es?' },
  { key: 'sectors', label: '¿En qué sectores es más útil?' },
  { key: 'caveats', label: 'Qué tener en cuenta' },
  { key: 'country', label: '¿Importa el país?' },
] as const;

function FundGuide({ info }: { info: FundSectionInfo }) {
  const [topic, setTopic] = useState<(typeof GUIDE_TOPICS)[number]['key']>('what');
  return (
    <div className="fund-guide">
      <div className="fund-guide-bar">
        <span className="fund-guide-label">Guía</span>
        <div className="fund-guide-select-wrapper">
          <BookOpen size={14} className="fund-guide-select-icon" />
          <select
            className="fund-guide-select"
            aria-label="Guía de la sección"
            value={topic}
            onChange={(e) => setTopic(e.target.value as (typeof GUIDE_TOPICS)[number]['key'])}
          >
            {GUIDE_TOPICS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fund-guide-pills">
          {GUIDE_TOPICS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`fund-guide-pill${topic === t.key ? ' fund-guide-pill--active' : ''}`}
              onClick={() => setTopic(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <p className="fund-guide-body">{info[topic]}</p>
    </div>
  );
}

function Metric({ label, value, positive, negative, confidence }: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  confidence?: MetricConfidence;
}) {
  const tone = positive ? 'metric-val--pos' : negative ? 'metric-val--neg' : '';
  return (
    <div className="fund-metric">
      <span className="fund-metric-label"><AbbrTip abbr={label} /></span>
      <span className={`fund-metric-value ${tone}`}>
        {value}
        {confidence && confidence.level !== 'full' && (
          <span
            className={`fund-confidence fund-confidence--${confidence.level}`}
            data-tip={confidence.reason || undefined}
            tabIndex={0}
          >
            {confidence.level === 'low' ? '!' : '~'}
          </span>
        )}
      </span>
    </div>
  );
}

export function FundamentalTab({ company, financial, financials, balanceSheets, stock, dataSync }: Props) {
  const currency = company.currency || 'USD';
  const input = { financials, balanceSheets, stock, currency };

  const growth = computeGrowth(input);
  const solvency = computeSolvency(input);
  const shareholder = computeShareholderReturns(input);
  const efficiency = computeEfficiency(input);

  const hasData = financials.length > 0 || stock != null;
  if (!hasData) {
    return <div className="fund-empty">Sin datos financieros disponibles</div>;
  }

  const lastSync = dataSync?.lastSyncAt ? new Date(dataSync.lastSyncAt) : null;
  const syncDaysAgo = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / (24 * 60 * 60 * 1000)) : null;
  const syncLabel = lastSync
    ? lastSync.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;
  const isStale = syncDaysAgo != null && syncDaysAgo > 7;
  const hasSyncError = Boolean(dataSync?.errorMessage);
  const freshnessTone = hasSyncError ? 'err' : isStale ? 'warn' : 'ok';

  const gaps = dataSync?.dataGaps ?? [];
  const gapLabels: Record<string, string> = {
    shortTermDebt: 'deuda a corto plazo',
    longTermDebt: 'deuda a largo plazo',
    interestExpense: 'gasto de intereses',
    ebit: 'EBIT',
    ebitda: 'EBITDA',
    operatingCashFlow: 'flujo operativo',
    freeCashFlow: 'flujo de caja libre',
    dividendsPaid: 'dividendos pagados',
    shareRepurchases: 'recompras',
    totalCurrentAssets: 'activo corriente',
    totalCurrentLiabilities: 'pasivo corriente',
    inventory: 'inventario',
    accountsReceivable: 'cuentas a cobrar',
    accountsPayable: 'cuentas a pagar',
    totalAssets: 'activo total',
    totalStockholdersEquity: 'patrimonio neto',
  };
  const visibleGaps = gaps.slice(0, 3).map((g) => gapLabels[g] ?? g);
  const hiddenGaps = gaps.length - visibleGaps.length;

  const warningFields = parseWarningFields(dataSync?.validationWarnings ?? []);
  const qualityCtx = { gaps, warningFields };
  const conf = (key: string) => getMetricConfidence(key, qualityCtx);

  const cagr = (v: number | null) => (v != null ? `${(v * 100).toFixed(1)}%` : '—');

  const REC_LABELS: Record<string, string> = {
    strong_buy: 'Compra fuerte',
    buy: 'Comprar',
    hold: 'Mantener',
    sell: 'Vender',
    strong_sell: 'Venta fuerte',
  };
  const recKey = stock?.recommendationKey ?? null;
  const recLabel = recKey ? REC_LABELS[recKey] ?? recKey : stock?.recommendationMean != null ? `${stock.recommendationMean.toFixed(1)} / 5` : '—';
  const current = stock?.currentPrice ?? null;
  const target = stock?.targetMeanPrice ?? null;
  const targetUpside = target != null && current != null && current > 0 ? (target - current) / current : null;
  const hasForward = stock != null && (stock.beta != null || stock.forwardPE != null || target != null || recKey != null);

  return (
    <div className="fund-page">
      <p className="fund-intro">
        Análisis fundamental de <strong>{company.name}</strong> ({company.ticker}) basado en sus estados financieros ({growth.availableYears} ejercicios disponibles). Las métricas usan los últimos 12 meses salvo que se indique lo contrario.
      </p>

      <div className="fund-freshness-row">
        <span className={`fund-freshness-chip fund-freshness-chip--${freshnessTone}`}>
          {financial?.year != null ? `Datos ejercicio ${financial.year}` : 'Datos financieros'}
          {efficiency.periodLabel && efficiency.periodLabel !== '—' ? ` · ${efficiency.periodLabel}` : ''}
          {syncLabel ? ` · Actualizado ${syncLabel}` : ' · sin registro de sincronización'}
          {isStale && !hasSyncError ? ' · desactualizado' : ''}
        </span>
        {hasSyncError && <span className="fund-freshness-error">Última sincronización con errores: {dataSync?.errorMessage}</span>}
      </div>

      {gaps.length > 0 && (
        <div className="fund-gaps-banner">
          ⚠ Datos parciales: no hay información de {visibleGaps.join(', ')}
          {hiddenGaps > 0 ? ` y ${hiddenGaps} más` : ''}. Algunos ratios pueden estar incompletos.
        </div>
      )}

      {/* Pilar 1 — Crecimiento */}
      <SectionReveal delay={0}>
        <section className="fund-section">
          <header className="fund-section-header">
            <span className="fund-section-icon fund-section-icon--green"><TrendingUp size={18} /></span>
            <h3 className="fund-section-title">Crecimiento</h3>
          </header>
          <div className="fund-grid">
            <Metric label="Rev YoY" value={cagr(growth.revenueYoY)} positive={(growth.revenueYoY ?? 0) > 0} negative={(growth.revenueYoY ?? 0) < 0} />
            <Metric label="NI YoY" value={cagr(growth.netIncomeYoY)} positive={(growth.netIncomeYoY ?? 0) > 0} negative={(growth.netIncomeYoY ?? 0) < 0} />
            <Metric label="FCF YoY" value={cagr(growth.fcfYoY)} positive={(growth.fcfYoY ?? 0) > 0} negative={(growth.fcfYoY ?? 0) < 0} confidence={conf('fcfYoY')} />
            <Metric label="CAGR 3A" value={cagr(growth.revenueCagr3y)} />
            <Metric label="CAGR 5A" value={cagr(growth.revenueCagr5y)} />
            <Metric label="CAGR NI 5A" value={cagr(growth.netIncomeCagr5y)} />
            <Metric label="PEG" value={growth.peg != null ? growth.peg.toFixed(2) : '—'} positive={growth.peg != null && growth.peg < 1} negative={growth.peg != null && growth.peg > 2} />
            <Metric label="G. Sostenible" value={formatPct(growth.sustainableGrowth)} />
          </div>
          {growth.peg != null && (
            <p className="fund-note">
              PEG calculado con P/E {stock?.peRatio != null ? stock.peRatio.toFixed(1) : '—'} y {growth.growthUsedForPegLabel.toLowerCase()}. PEG &lt; 1 sugiere que el precio no refleja el crecimiento esperado.
            </p>
          )}
          <FundGuide info={FUND_SECTION_INFO.growth} />
        </section>
      </SectionReveal>

      {/* Pilar 2 — Solvencia */}
      <SectionReveal delay={40}>
        <section className="fund-section">
          <header className="fund-section-header">
            <span className="fund-section-icon fund-section-icon--blue"><ShieldCheck size={18} /></span>
            <h3 className="fund-section-title">Solvencia</h3>
          </header>
          <div className="fund-grid">
            <Metric label="Deuda neta" value={fmtCurrencyShort(solvency.netDebt, currency)} negative={(solvency.netDebt ?? 0) > 0} positive={(solvency.netDebt ?? 0) < 0} confidence={conf('netDebt')} />
            <Metric label="ND/EBITDA" value={solvency.netDebtEbitda != null ? `${solvency.netDebtEbitda.toFixed(2)}x` : '—'} negative={solvency.netDebtEbitda != null && solvency.netDebtEbitda > 3} positive={solvency.netDebtEbitda != null && solvency.netDebtEbitda <= 1} confidence={conf('netDebtEbitda')} />
            <Metric label="Cob. Interés" value={solvency.interestCoverage != null ? `${solvency.interestCoverage.toFixed(1)}x` : '—'} positive={(solvency.interestCoverage ?? 0) > 3} negative={(solvency.interestCoverage ?? 0) < 1} confidence={conf('interestCoverage')} />
            <Metric label="Current Ratio" value={solvency.currentRatio != null ? `${solvency.currentRatio.toFixed(2)}x` : '—'} positive={(solvency.currentRatio ?? 0) >= 1.5} negative={(solvency.currentRatio ?? 0) < 1} confidence={conf('currentRatio')} />
            <Metric label="Quick ratio" value={solvency.quickRatio != null ? `${solvency.quickRatio.toFixed(2)}x` : '—'} positive={(solvency.quickRatio ?? 0) >= 1} negative={(solvency.quickRatio ?? 0) < 0.5} confidence={conf('quickRatio')} />
            <Metric label="Capital circ." value={fmtCurrencyShort(solvency.workingCapital, currency)} positive={(solvency.workingCapital ?? 0) > 0} negative={(solvency.workingCapital ?? 0) < 0} confidence={conf('workingCapital')} />
            <Metric label="Debt/Equity" value={solvency.totalDebtEquity != null ? `${solvency.totalDebtEquity.toFixed(2)}x` : '—'} negative={solvency.totalDebtEquity != null && solvency.totalDebtEquity > 2} confidence={conf('totalDebtEquity')} />
          </div>
          <FundGuide info={FUND_SECTION_INFO.solvency} />
        </section>
      </SectionReveal>

      {/* Pilar 3 — Retorno al accionista */}
      <SectionReveal delay={80}>
        <section className="fund-section">
          <header className="fund-section-header">
            <span className="fund-section-icon fund-section-icon--amber"><HandCoins size={18} /></span>
            <h3 className="fund-section-title">Retorno al accionista</h3>
          </header>
          <div className="fund-grid">
            <Metric label="Payout" value={formatPct(shareholder.payoutRatio)} negative={shareholder.payoutRatio != null && shareholder.payoutRatio > 0.9} positive={shareholder.payoutRatio != null && shareholder.payoutRatio > 0 && shareholder.payoutRatio <= 0.6} confidence={conf('payoutRatio')} />
            <Metric label="Cob. Div." value={shareholder.dividendCoverage != null ? `${shareholder.dividendCoverage.toFixed(1)}x` : '—'} positive={(shareholder.dividendCoverage ?? 0) >= 1.5} negative={(shareholder.dividendCoverage ?? 0) < 1} confidence={conf('dividendCoverage')} />
            <Metric label="Buyback" value={formatPct(shareholder.buybackYield)} confidence={conf('buybackYield')} />
            <Metric label="Sh. Yield" value={formatPct(shareholder.shareholderYield)} confidence={conf('shareholderYield')} />
            <Metric label="Div/FCF" value={shareholder.fcfDividendCoverage != null ? `${shareholder.fcfDividendCoverage.toFixed(1)}x` : '—'} positive={(shareholder.fcfDividendCoverage ?? 0) >= 1} negative={(shareholder.fcfDividendCoverage ?? 0) < 0.7} confidence={conf('fcfDividendCoverage')} />
          </div>
          <FundGuide info={FUND_SECTION_INFO.shareholder} />
        </section>
      </SectionReveal>

      {/* Pilar 4 — Eficiencia y DuPont */}
      <SectionReveal delay={120}>
        <section className="fund-section">
          <header className="fund-section-header">
            <span className="fund-section-icon fund-section-icon--purple"><Gauge size={18} /></span>
            <h3 className="fund-section-title">Eficiencia y análisis DuPont</h3>
          </header>
          <div className="fund-dupont">
            <div className="fund-dupont-equation">
              <Metric label="ROE" value={formatPct(efficiency.dupont.roe)} confidence={conf('dupont_roe')} />
              <div className="fund-dupont-factors">
                <Metric label="Margen neto" value={formatPct(efficiency.dupont.netMargin)} confidence={conf('dupont_netMargin')} />
                <span className="fund-dupont-op">×</span>
                <Metric label="Rot. activos" value={efficiency.dupont.assetTurnover != null ? `${efficiency.dupont.assetTurnover.toFixed(2)}x` : '—'} confidence={conf('dupont_assetTurnover')} />
                <span className="fund-dupont-op">×</span>
                <Metric label="Apalanc." value={efficiency.dupont.equityMultiplier != null ? `${efficiency.dupont.equityMultiplier.toFixed(2)}x` : '—'} confidence={conf('dupont_equityMultiplier')} />
              </div>
            </div>
          </div>
          <div className="fund-grid">
            <Metric label="Margen bruto" value={formatPct(efficiency.grossMargin)} />
            <Metric label="Margen op." value={formatPct(efficiency.operatingMargin)} />
            <Metric label="Margen FCF" value={formatPct(efficiency.fcfMargin)} confidence={conf('fcfMargin')} />
            <Metric label="Conv. FCF" value={formatPct(efficiency.fcfConversion)} confidence={conf('fcfConversion')} />
            <Metric label="CapEx" value={formatPct(efficiency.capexIntensity)} confidence={conf('capexIntensity')} />
            <Metric label="Rot. inv." value={efficiency.inventoryTurnover != null ? `${efficiency.inventoryTurnover.toFixed(1)}x` : '—'} confidence={conf('inventoryTurnover')} />
            <Metric label="DSO" value={efficiency.daysSalesOutstanding != null ? `${efficiency.daysSalesOutstanding.toFixed(0)} días` : '—'} confidence={conf('daysSalesOutstanding')} />
            <Metric label="DPO" value={efficiency.daysPayableOutstanding != null ? `${efficiency.daysPayableOutstanding.toFixed(0)} días` : '—'} confidence={conf('daysPayableOutstanding')} />
            <Metric label="CCC" value={efficiency.cashConversionCycle != null ? `${efficiency.cashConversionCycle.toFixed(0)} días` : '—'} confidence={conf('cashConversionCycle')} />
          </div>
          <FundGuide info={FUND_SECTION_INFO.efficiency} />
        </section>
      </SectionReveal>

      {/* Pilar 5 — Comparación con pares */}
      <SectionReveal delay={160}>
        <section className="fund-section">
          <header className="fund-section-header">
            <span className="fund-section-icon fund-section-icon--indigo"><Users size={18} /></span>
            <h3 className="fund-section-title">Comparación con el sector</h3>
          </header>
          <CompareTab company={company} financial={financial} stock={stock} />
          <FundGuide info={FUND_SECTION_INFO.peers} />
        </section>
      </SectionReveal>

      {/* Pilar 6 — Prospectivo y riesgo */}
      <SectionReveal delay={200}>
        <section className="fund-section">
          <header className="fund-section-header">
            <span className="fund-section-icon fund-section-icon--slate"><Target size={18} /></span>
            <h3 className="fund-section-title">Perspectiva y riesgo</h3>
          </header>
          {hasForward ? (
            <>
              <div className="fund-grid">
                <Metric label="Beta" value={stock?.beta != null ? stock.beta.toFixed(2) : '—'} positive={stock?.beta != null && stock.beta < 1} negative={stock?.beta != null && stock.beta > 1.5} />
                <Metric label="P/E Fwd" value={stock?.forwardPE != null ? `${stock.forwardPE.toFixed(1)}x` : '—'} />
                <Metric label="P. Objetivo" value={target != null ? fmtCurrencyShort(target, currency) : '—'} />
                <Metric label="Rec. analistas" value={recLabel} />
                <Metric label="Payout (Yahoo)" value={formatPct(stock?.payoutRatio ?? null)} />
                <Metric label="Dividend Rate" value={stock?.dividendRate != null ? fmtCurrencyShort(stock.dividendRate, currency) : '—'} />
              </div>
              {targetUpside != null && (
                <p className="fund-note">
                  El consenso de {stock?.numberOfAnalystOpinions ?? 'varios'} analistas sitúa el precio objetivo en {fmtCurrencyShort(target, currency)}
                  {' '}(máx. {stock?.targetHighPrice != null ? fmtCurrencyShort(stock.targetHighPrice, currency) : '—'}, mín. {stock?.targetLowPrice != null ? fmtCurrencyShort(stock.targetLowPrice, currency) : '—'}),
                  un <strong style={{ color: targetUpside >= 0 ? '#16a34a' : '#dc2626' }}>{targetUpside >= 0 ? '+' : ''}{(targetUpside * 100).toFixed(1)}%</strong> sobre el precio actual.
                </p>
              )}
              {stock?.beta != null && (
                <p className="fund-note">
                  Una <AbbrTip abbr="Beta" /> inferior a 1 indica menor volatilidad que el mercado (defensiva); superior a 1 amplifica los movimientos del mercado (agresiva).
                </p>
              )}
            </>
          ) : (
            <p className="fund-note">Datos de analistas y riesgo aún no disponibles. Se rellenan en cada sincronización periódica de cotizaciones.</p>
          )}
          <FundGuide info={FUND_SECTION_INFO.forward} />
        </section>
      </SectionReveal>

      <p className="fund-disclaimer">
        Nota: en banca, seguros y REITs algunos ratios (rotación de activos, DuPont, D/E) se interpretan de forma distinta. Datos anuales de los estados financieros; las cifras negativas de beneficio invalidan ratios como PEG o cobertura.
      </p>
    </div>
  );
}
