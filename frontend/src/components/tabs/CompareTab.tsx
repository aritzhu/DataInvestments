import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { SectionReveal } from '../ui/SectionReveal';
import { SkeletonTable } from '../ui/Skeleton';
import { MarketComparisonChart, type MarketData } from '../ui/MarketComparisonChart';
import type { CompanyProfile } from '../CompanyPage';
import '../../styles/compare.css';

interface MetricDetail {
  key: string;
  label: string;
  companyVal: number | null;
  sectorVal: number;
  marketVal: number;
  higherIsBetter: boolean;
  format: (v: number) => string;
  explanation: string;
}

interface Props {
  company: CompanyProfile['company'];
  financial: CompanyProfile['financials'][0] | undefined;
  stock: CompanyProfile['stockMetrics'][0] | null;
}

export function CompareTab({ company, financial, stock }: Props) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sector = company.sector || 'Technology';
    fetch(`/api/market/sector-averages?sector=${encodeURIComponent(sector)}`)
      .then((r) => r.json())
      .then((data) => { setMarketData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [company.sector]);

  const evEbitda = stock?.enterpriseValue && financial?.ebitda
    ? stock.enterpriseValue / financial.ebitda
    : null;

  const fcfYield = stock?.marketCap && financial?.freeCashFlow
    ? (financial.freeCashFlow / stock.marketCap) * 100
    : null;

  const fmt2 = (v: number) => v.toFixed(1) + 'x';
  const fmtPct = (v: number) => v.toFixed(1) + '%';

  const metrics: MetricDetail[] = marketData ? [
    { key: 'pe', label: 'P/E Ratio', companyVal: stock?.peRatio ?? null, sectorVal: marketData.pe, marketVal: marketData.pe, higherIsBetter: false, format: fmt2, explanation: 'Cuanto paga el mercado por $1 de beneficio. Alto = expectativas altas de crecimiento.' },
    { key: 'pb', label: 'P/B Ratio', companyVal: stock?.pbRatio ?? null, sectorVal: marketData.pb, marketVal: marketData.pb, higherIsBetter: false, format: fmt2, explanation: 'Precio vs valor en libros. Alto = el mercado valora activos intangibles o expectativas.' },
    { key: 'ps', label: 'P/S Ratio', companyVal: stock?.psRatio ?? null, sectorVal: marketData.ps, marketVal: marketData.ps, higherIsBetter: false, format: fmt2, explanation: 'Precio por cada $1 de ventas. Utiliza para empresas con beneficios negativos.' },
    { key: 'evEbitda', label: 'EV/EBITDA', companyVal: evEbitda, sectorVal: marketData.evEbitda, marketVal: marketData.evEbitda, higherIsBetter: false, format: fmt2, explanation: 'Valor de empresa vs beneficios operativos. Menor = potencialmente mas barato.' },
    { key: 'fcfYield', label: 'FCF Yield', companyVal: fcfYield, sectorVal: marketData.fcfYield, marketVal: marketData.fcfYield, higherIsBetter: true, format: fmtPct, explanation: 'Free Cash Flow como % del market cap. Mayor = genera mas efectivo relativo a su precio.' },
  ] : [];

  const validMetrics = metrics.filter(m => m.companyVal != null && m.companyVal > 0);

  // Compute overall verdict
  let overvaluedCount = 0;
  let undervaluedCount = 0;
  for (const m of validMetrics) {
    if (m.higherIsBetter) {
      if (m.companyVal! > m.marketVal) undervaluedCount++;
      else if (m.companyVal! < m.marketVal) overvaluedCount++;
    } else {
      if (m.companyVal! < m.marketVal) undervaluedCount++;
      else if (m.companyVal! > m.marketVal) overvaluedCount++;
    }
  }

  const overallVerdict = overvaluedCount > undervaluedCount ? 'overvalued'
    : undervaluedCount > overvaluedCount ? 'undervalued'
    : 'fair';

  const verdictConfig = {
    overvalued: { label: 'Sobrevalorada vs Mercado', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: TrendingUp },
    undervalued: { label: 'Subvalorada vs Mercado', color: '#4f8fb5', bg: 'rgba(79, 143, 181, 0.14)', border: 'rgba(79, 143, 181, 0.35)', icon: TrendingDown },
    fair: { label: 'Alineada con el Mercado', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Minus },
  };
  const vConfig = verdictConfig[overallVerdict];
  const VerdictIcon = vConfig.icon;

  if (loading) {
    return (
      <div className="cmp-tab">
        <div className="cmp-header">
          <h3 className="cmp-title">Comparacion con el Mercado</h3>
          <p className="cmp-subtitle">Cargando datos del mercado...</p>
        </div>
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  if (!marketData || validMetrics.length === 0) {
    return (
      <div className="cmp-tab">
        <div className="cmp-header">
          <h3 className="cmp-title">Comparacion con el Mercado</h3>
          <p className="cmp-subtitle">No hay suficientes datos para comparar</p>
        </div>
        <div className="cmp-empty">
          <Info size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <p>Necesitas datos de stock (P/E, P/B, etc.) y del sector para esta comparacion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cmp-tab">
      {/* Header */}
      <SectionReveal delay={0}>
        <div className="cmp-header">
          <h3 className="cmp-title">Comparacion con el Mercado</h3>
          <p className="cmp-subtitle">
            Como se compara <strong>{company.ticker}</strong> con su sector ({company.sector || 'N/A'}) y el S&P 500
          </p>
        </div>
      </SectionReveal>

      {/* Overall Verdict */}
      <SectionReveal delay={40}>
        <div className="cmp-verdict-hero" style={{ background: vConfig.bg, borderColor: vConfig.border }}>
          <div className="cmp-verdict-hero-icon" style={{ background: vConfig.color }}>
            <VerdictIcon size={20} color="white" />
          </div>
          <div className="cmp-verdict-hero-body">
            <span className="cmp-verdict-hero-label" style={{ color: vConfig.color }}>{vConfig.label}</span>
            <span className="cmp-verdict-hero-detail">
              {overvaluedCount} de {validMetrics.length} ratios indican sobrevaloracion &middot; {undervaluedCount} indican subvaloracion
            </span>
          </div>
        </div>
        <p className="verdict-explanation">
          Esta comparacion muestra los ratios clave de <strong>{company.ticker}</strong> frente a los promedios del <strong>sector {company.sector || 'N/A'}</strong> y del <strong>S&P 500</strong>. Si la empresa tiene ratios <strong>más altos</strong> que el mercado (P/E, P/B, P/S, EV/EBITDA), el mercado espera mas crecimiento o puede estar sobrevalorada. Si tiene ratios <strong>más bajos</strong>, puede ser una oportunidad de compra. FCF Yield es al reves: mas alto es mejor.
        </p>
      </SectionReveal>

      {/* Chart */}
      {stock && (
        <SectionReveal delay={80}>
          <div className="cmp-chart-card">
            <div className="cmp-chart-card-header">
              <BarChart3 size={18} style={{ color: '#6366f1' }} />
              <span>Grafico Comparativo</span>
            </div>
            <MarketComparisonChart
              company={{
                pe: stock.peRatio,
                pb: stock.pbRatio,
                ps: stock.psRatio,
                evEbitda,
                fcfYield,
              }}
              market={marketData}
              ticker={company.ticker}
            />
            <span className="mkt-source">Fuente: {marketData.source}</span>
          </div>
        </SectionReveal>
      )}

      {/* Detailed Metrics Table */}
      <SectionReveal delay={120}>
        <div className="cmp-metrics-card">
          <div className="cmp-metrics-card-header">
            <span className="cmp-metrics-card-title">Detalle por Metrica</span>
          </div>
          <div className="cmp-metrics-table-wrapper">
            <table className="cmp-metrics-table">
              <thead>
                <tr>
                  <th>Metrica</th>
                  <th className="cmp-metrics-num">{company.ticker}</th>
                  <th className="cmp-metrics-num">Sector</th>
                  <th className="cmp-metrics-num">Mercado</th>
                  <th className="cmp-metrics-num">Diferencia</th>
                  <th className="cmp-metrics-center">Veredicto</th>
                </tr>
              </thead>
              <tbody>
                {validMetrics.map((m) => {
                  const diff = m.companyVal! - m.marketVal;
                  const diffPct = m.marketVal > 0 ? (diff / m.marketVal) * 100 : 0;
                  let isOver: boolean | null = null;
                  if (m.higherIsBetter) {
                    isOver = m.companyVal! < m.marketVal;
                  } else {
                    isOver = m.companyVal! > m.marketVal;
                  }
                  const diffColor = isOver === true ? '#dc2626' : isOver === false ? '#4f8fb5' : '#d97706';
                  const verdictLabel = isOver === true ? 'Sobrevalorada' : isOver === false ? 'Subvalorada' : 'Justa';

                  return (
                    <tr key={m.key}>
                      <td className="cmp-metrics-label">
                        <div className="cmp-metrics-label-main">{m.label}</div>
                        <div className="cmp-metrics-label-sub">{m.explanation}</div>
                      </td>
                      <td className="cmp-metrics-num cmp-metrics-company">{m.format(m.companyVal!)}</td>
                      <td className="cmp-metrics-num">{m.format(m.sectorVal)}</td>
                      <td className="cmp-metrics-num">{m.format(m.marketVal)}</td>
                      <td className="cmp-metrics-num" style={{ color: diffColor, fontWeight: 600 }}>
                        {diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
                      </td>
                      <td className="cmp-metrics-center">
                        <span className="cmp-metrics-verdict" style={{ color: diffColor, background: isOver ? '#fef2f2' : isOver === false ? 'rgba(79, 143, 181, 0.14)' : '#fffbeb' }}>
                          {verdictLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </SectionReveal>

      {/* Key Insights */}
      <SectionReveal delay={160}>
        <div className="cmp-insights-card">
          <div className="cmp-insights-header">
            <Info size={16} style={{ color: '#6366f1' }} />
            <span>Que significan estos datos?</span>
          </div>
          <div className="cmp-insights-grid">
            <div className="cmp-insight-item">
              <strong>P/E y P/B mas altos</strong>
              <p>El mercado espera alto crecimiento futuro. Si el crecimiento real no llega, la accion puede caer.</p>
            </div>
            <div className="cmp-insight-item">
              <strong>P/E y P/B mas bajos</strong>
              <p>Puede ser una oportunidad (barato) o senal de problemas (sector en declive, riesgos).</p>
            </div>
            <div className="cmp-insight-item">
              <strong>FCF Yield mas alto</strong>
              <p>La empresa genera mucho efectivo relativo a su precio. Senal positiva de calidad.</p>
            </div>
            <div className="cmp-insight-item">
              <strong>EV/EBITDA mas bajo</strong>
              <p>La empresa es mas barata en terminos de beneficios operativos vs sus competidores.</p>
            </div>
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
