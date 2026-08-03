import { useState } from 'react';
import type { CompanyProfile } from '../CompanyPage';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { AbbrTip } from '../ui/AbbrTip';
import { SectionReveal } from '../ui/SectionReveal';
import { SkeletonTable } from '../ui/Skeleton';
import { formatNum, pctOf, safeDiv } from '../../utils/format';
import '../../styles/statements.css';
import '../../styles/cashflow.css';
import '../../styles/revenue.css';

interface Props {
  financial: CompanyProfile['financials'][0] | undefined;
  balanceSheet: CompanyProfile['balanceSheets'][0] | null;
  stock: CompanyProfile['stockMetrics'][0] | null;
  segments: CompanyProfile['segments'];
}

const SEGMENT_COLORS = ['#193e57', '#4f8fb5', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#79b3d6', '#f97316', '#6366f1'];

export function FinancialStatementsTab({ financial, balanceSheet, stock, segments }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    income: true,
    balance: false,
    waterfall: false,
    distribution: false,
    cashflow: false,
    segments: false,
  });

  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  if (!financial) {
    return <div className="tab-empty">Sin datos financieros disponibles</div>;
  }

  const f = financial;
  const bs = balanceSheet;
  const grossProfit = f.grossProfit ?? (f.revenue - f.costOfRevenue);
  const operatingProfit = f.ebit ?? (grossProfit - f.operatingExpenses);
  const otherOpex = Math.max(0, f.operatingExpenses - f.sgaExpense - f.rdExpense);

  const incomeStatement = [
    { label: 'Ingresos', value: f.revenue, level: 0 },
    { label: 'Costo de ventas', value: f.costOfRevenue, level: 1 },
    { label: 'Beneficio bruto', value: grossProfit, level: 0, bold: true },
    { label: <AbbrTip abbr="SGA" />, value: f.sgaExpense, level: 1 },
    { label: <AbbrTip abbr="I+D" />, value: f.rdExpense, level: 1 },
    { label: 'Otros gastos operativos', value: otherOpex, level: 1 },
    { label: <AbbrTip abbr="EBIT" />, value: operatingProfit, level: 0, bold: true },
    { label: 'Intereses', value: f.interestExpense, level: 1 },
    { label: 'Impuestos', value: f.taxExpense, level: 1 },
    { label: 'Beneficio neto', value: f.netIncome, level: 0, bold: true },
  ];

  const waterfall = [
    { label: 'Ingresos', value: f.revenue, color: '#2563eb', type: 'total' as const },
    { label: 'Costo de ventas', value: -f.costOfRevenue, color: '#ef4444', type: 'expense' as const },
    { label: 'Beneficio bruto', value: grossProfit, color: '#4f8fb5', type: 'subtotal' as const },
    { label: 'SGA', value: -f.sgaExpense, color: '#f97316', type: 'expense' as const },
    { label: 'I+D', value: -f.rdExpense, color: '#f59e0b', type: 'expense' as const },
    { label: 'Otros gastos op.', value: -otherOpex, color: '#fb923c', type: 'expense' as const },
    { label: 'EBIT', value: operatingProfit, color: '#8b5cf6', type: 'subtotal' as const },
    { label: 'Intereses', value: -f.interestExpense, color: '#ef4444', type: 'expense' as const },
    { label: 'Impuestos', value: -f.taxExpense, color: '#ef4444', type: 'expense' as const },
    { label: 'Beneficio neto', value: f.netIncome, color: '#4f8fb5', type: 'total' as const },
  ];

  const distribution = [
    { label: 'Dividendos', value: f.dividendsPaid || 0, color: '#2563eb' },
    { label: 'Recompra acciones', value: f.shareRepurchases || 0, color: '#8b5cf6' },
    { label: <>Inversión (<AbbrTip abbr="CapEx" />)</>, value: f.capex, color: '#f59e0b' },
    { label: 'Free Cash Flow', value: f.freeCashFlow ?? (f.operatingCashFlow != null ? f.operatingCashFlow - f.capex : 0), color: '#4f8fb5' },
  ];
  const totalDist = distribution.reduce((s, d) => s + d.value, 0);

  const productSegments = segments.filter(s => s.segmentType === 'product').sort((a, b) => b.revenue - a.revenue);
  const geoSegments = segments.filter(s => s.segmentType === 'geography').sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="fs-tab">
      {/* Earnings Verdict */}
      {stock && (
        <SectionReveal delay={0}>
          <div className="fs-verdict-card">
            <div className="fs-verdict-title">¿Estás pagando un precio justo por estos beneficios?</div>
            <div className="fs-verdict-grid">
              {(() => {
                const eps = stock.sharesOutstanding ? f.netIncome / stock.sharesOutstanding : null;
                const currentPE = stock.peRatio;
                const currentPS = stock.psRatio;
                const ev = stock.enterpriseValue;
                const evEbitda = f.ebitda && f.ebitda > 0 && ev ? ev / f.ebitda : null;

                const peSignal = currentPE != null && currentPE > 0 ? (currentPE < 20 ? 'buy' : currentPE < 30 ? 'hold' : 'sell') : null;
                const psSignal = currentPS != null && currentPS > 0 ? (currentPS < 3 ? 'buy' : currentPS < 8 ? 'hold' : 'sell') : null;
                const evEbitdaSignal = evEbitda != null ? (evEbitda < 15 ? 'buy' : evEbitda < 25 ? 'hold' : 'sell') : null;

                const signalText: Record<string, string> = { buy: 'Barato', hold: 'Justo', sell: 'Caro' };
                const signalRange: Record<string, string> = { buy: '< 20x', hold: '20-30x', sell: '> 30x' };
                const psRange: Record<string, string> = { buy: '< 3x', hold: '3-8x', sell: '> 8x' };
                const evRange: Record<string, string> = { buy: '< 15x', hold: '15-25x', sell: '> 25x' };

                return (
                  <>
                    {currentPE != null && currentPE > 0 && (
                      <div className="fs-verdict-metric">
                        <span className="fs-verdict-metric-label"><AbbrTip abbr="P/E" /> ratio</span>
                        <span className="fs-verdict-metric-value">{currentPE.toFixed(1)}x</span>
                        <span className={`fs-verdict-signal fs-verdict-signal--${peSignal}`}>{signalText[peSignal!]} ({signalRange[peSignal!]})</span>
                      </div>
                    )}
                    {currentPS != null && currentPS > 0 && (
                      <div className="fs-verdict-metric">
                        <span className="fs-verdict-metric-label"><AbbrTip abbr="P/S" /> ratio</span>
                        <span className="fs-verdict-metric-value">{currentPS.toFixed(1)}x</span>
                        <span className={`fs-verdict-signal fs-verdict-signal--${psSignal}`}>{signalText[psSignal!]} ({psRange[psSignal!]})</span>
                      </div>
                    )}
                    {evEbitda != null && (
                      <div className="fs-verdict-metric">
                        <span className="fs-verdict-metric-label"><AbbrTip abbr="EV/EBITDA" /></span>
                        <span className="fs-verdict-metric-value">{evEbitda.toFixed(1)}x</span>
                        <span className={`fs-verdict-signal fs-verdict-signal--${evEbitdaSignal}`}>{signalText[evEbitdaSignal!]} ({evRange[evEbitdaSignal!]})</span>
                      </div>
                    )}
                    {eps != null && (
                      <div className="fs-verdict-metric">
                        <span className="fs-verdict-metric-label"><AbbrTip abbr="EPS" /></span>
                        <span className="fs-verdict-metric-value">${eps.toFixed(2)}</span>
                        <span className="fs-verdict-signal fs-verdict-signal--info">Beneficio por acción</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="verdict-explanation">
              Estos ratios miden <strong>cuánto pagas por cada unidad de beneficio, ventas y beneficio operativo</strong>. Un P/E bajo (&lt; 20x) sugiere que la empresa es barata respecto a sus ganancias; uno alto (&gt; 30x) indica que el mercado espera un fuerte crecimiento o que está sobrevalorada. El EV/EBITDA incluye la deuda y es el múltiplo preferido en fusiones y adquisiciones.
            </p>
          </div>
        </SectionReveal>
      )}

      {/* Income Statement */}
      <SectionReveal delay={0}>
        <button className="fs-section-toggle" onClick={() => toggle('income')}>
          <span className="fs-section-title">Cuenta de resultados — {f.year}</span>
          <span className={`fs-section-arrow ${openSections.income ? 'fs-section-arrow--open' : ''}`}>▾</span>
        </button>
        {openSections.income && (
          <div className="fs-section-body">
            <div className="stmt-table">
              <div className="stmt-header-row">
                <span>Concepto</span>
                <span>Valor</span>
                <span>% Ingresos</span>
              </div>
              {incomeStatement.map((row, i) => (
                <div key={i} className={`stmt-row ${row.bold ? 'stmt-row--bold' : ''} stmt-row--level-${row.level}`}>
                  <span className="stmt-label">{row.label}</span>
                  <span className="stmt-value">{formatNum(row.value)}</span>
                  <span className="stmt-pct">{pctOf(row.value, f.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionReveal>

      {/* Balance Sheet */}
      <SectionReveal delay={60}>
        <button className="fs-section-toggle" onClick={() => toggle('balance')}>
          <span className="fs-section-title">Balance — {f.year}</span>
          <span className={`fs-section-arrow ${openSections.balance ? 'fs-section-arrow--open' : ''}`}>▾</span>
        </button>
        {openSections.balance && (
          <div className="fs-section-body">
            {bs ? (
              <div className="stmt-bs-grid">
                <div className="stmt-bs-col">
                  <h4 className="stmt-bs-subtitle">Activos</h4>
                  <div className="stmt-bs-block">
                    <div className="stmt-bs-row"><span>Efectivo y equivalentes</span><span>{formatNum(bs.cashAndCashEquivalents)}</span></div>
                    <div className="stmt-bs-row"><span>Cuentas por cobrar</span><span>{formatNum(bs.accountsReceivable)}</span></div>
                    <div className="stmt-bs-row"><span>Inventario</span><span>{formatNum(bs.inventory)}</span></div>
                    <div className="stmt-bs-row stmt-bs-row--sub"><span>Activos corrientes</span><span>{formatNum(bs.totalCurrentAssets)}</span></div>
                    <div className="stmt-bs-row"><span>Propiedad planta y equipo</span><span>{formatNum(bs.propertyPlantEquipment)}</span></div>
                    <div className="stmt-bs-row"><span>Goodwill</span><span>{formatNum(bs.goodwill)}</span></div>
                    <div className="stmt-bs-row"><span>Activos intangibles</span><span>{formatNum(bs.intangibleAssets)}</span></div>
                    <div className="stmt-bs-row stmt-bs-row--sub"><span>Activos no corrientes</span><span>{formatNum(bs.totalNonCurrentAssets)}</span></div>
                    <div className="stmt-bs-row stmt-bs-row--total"><span>Total activos</span><span>{formatNum(bs.totalAssets)}</span></div>
                  </div>
                </div>
                <div className="stmt-bs-col">
                  <h4 className="stmt-bs-subtitle">Pasivos y patrimonio</h4>
                  <div className="stmt-bs-block">
                    <div className="stmt-bs-row"><span>Cuentas por pagar</span><span>{formatNum(bs.accountsPayable)}</span></div>
                    <div className="stmt-bs-row"><span>Deuda a corto plazo</span><span>{formatNum(bs.shortTermDebt)}</span></div>
                    <div className="stmt-bs-row stmt-bs-row--sub"><span>Pasivos corrientes</span><span>{formatNum(bs.totalCurrentLiabilities)}</span></div>
                    <div className="stmt-bs-row"><span>Deuda a largo plazo</span><span>{formatNum(bs.longTermDebt)}</span></div>
                    <div className="stmt-bs-row stmt-bs-row--sub"><span>Pasivos no corrientes</span><span>{formatNum(bs.totalNonCurrentLiabilities)}</span></div>
                    <div className="stmt-bs-row stmt-bs-row--total"><span>Total pasivos</span><span>{formatNum(bs.totalLiabilities)}</span></div>
                    <div className="stmt-bs-row"><span>Patrimonio neto</span><span>{formatNum(bs.totalStockholdersEquity)}</span></div>
                    <div className="stmt-bs-row"><span>Resultados retenidos</span><span>{formatNum(bs.retainedEarnings)}</span></div>
                    <div className="stmt-bs-row"><span>Treasury stock</span><span>{formatNum(bs.treasuryStock)}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <SkeletonTable rows={10} cols={2} />
            )}
          </div>
        )}
      </SectionReveal>

      {/* Waterfall */}
      <SectionReveal delay={120}>
        <button className="fs-section-toggle" onClick={() => toggle('waterfall')}>
          <span className="fs-section-title">Waterfall: Ingresos → Beneficio neto</span>
          <span className={`fs-section-arrow ${openSections.waterfall ? 'fs-section-arrow--open' : ''}`}>▾</span>
        </button>
        {openSections.waterfall && (
          <div className="fs-section-body">
            <div className="cf-waterfall">
              {waterfall.map((row, i) => {
                const absVal = Math.abs(row.value);
                const widthPct = f.revenue > 0 ? (absVal / f.revenue) * 100 : 0;
                return (
                  <div key={i} className={`cf-wf-row cf-wf-row--${row.type}`}>
                    <span className="cf-wf-label">{row.label}</span>
                    <div className="cf-wf-bar-area">
                      <div className={`cf-wf-bar cf-wf-bar--${row.type}`} style={{ width: `${widthPct}%`, background: row.color }} />
                    </div>
                    <span className={`cf-wf-value cf-wf-value--${row.type}`}>
                      {row.value < 0 ? '−' : ''}$<AnimatedNumber value={Math.abs(row.value)} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionReveal>

      {/* Distribution */}
      <SectionReveal delay={180}>
        <button className="fs-section-toggle" onClick={() => toggle('distribution')}>
          <span className="fs-section-title">Distribución del beneficio</span>
          <span className={`fs-section-arrow ${openSections.distribution ? 'fs-section-arrow--open' : ''}`}>▾</span>
        </button>
        {openSections.distribution && (
          <div className="fs-section-body">
            <div className="cf-dist">
              {distribution.filter(d => d.value > 0).map((row, i) => (
                <div key={i} className="cf-dist-item">
                  <div className="cf-dist-bar-bg">
                    <div className="cf-dist-bar" style={{ width: `${totalDist > 0 ? (row.value / totalDist) * 100 : 0}%`, background: row.color }} />
                  </div>
                  <div className="cf-dist-info">
                    <span className="cf-dist-label">{row.label}</span>
                    <span className="cf-dist-value">{formatNum(row.value)} ({pctOf(row.value, totalDist)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionReveal>

      {/* Cash Flow Summary */}
      <SectionReveal delay={240}>
        <button className="fs-section-toggle" onClick={() => toggle('cashflow')}>
          <span className="fs-section-title">Flujos de efectivo</span>
          <span className={`fs-section-arrow ${openSections.cashflow ? 'fs-section-arrow--open' : ''}`}>▾</span>
        </button>
        {openSections.cashflow && (
          <div className="fs-section-body">
            <div className="cf-cashflow-grid">
              <div className="cf-cf-card">
                <span className="cf-cf-label">Operativo</span>
                <span className="cf-cf-value cf-cf-value--positive">
                  $<AnimatedNumber value={f.operatingCashFlow ?? 0} />
                </span>
              </div>
              <div className="cf-cf-card">
                <span className="cf-cf-label">Inversión</span>
                <span className="cf-cf-value cf-cf-value--negative">
                  $<AnimatedNumber value={f.investingCashFlow ?? 0} />
                </span>
              </div>
              <div className="cf-cf-card">
                <span className="cf-cf-label">Financiación</span>
                <span className="cf-cf-value cf-cf-value--negative">
                  $<AnimatedNumber value={f.financingCashFlow ?? 0} />
                </span>
              </div>
              <div className="cf-cf-card cf-cf-card--highlight">
                <span className="cf-cf-label">Free Cash Flow</span>
                <span className="cf-cf-value cf-cf-value--positive">
                  $<AnimatedNumber value={f.freeCashFlow ?? 0} />
                </span>
              </div>
            </div>
          </div>
        )}
      </SectionReveal>

      {/* Segments */}
      <SectionReveal delay={300}>
        <button className="fs-section-toggle" onClick={() => toggle('segments')}>
          <span className="fs-section-title">Segmentos de ingresos</span>
          <span className={`fs-section-arrow ${openSections.segments ? 'fs-section-arrow--open' : ''}`}>▾</span>
        </button>
        {openSections.segments && (
          <div className="fs-section-body">
            {productSegments.length > 0 && (
              <div className="rev-section">
                <h4 className="rev-section-title">Por producto / servicio</h4>
                <div className="rev-bars">
                  {productSegments.map((seg, i) => {
                    const pct = seg.percentage ?? safeDiv(seg.revenue, f.revenue);
                    const widthPct = pct != null ? pct * 100 : 0;
                    return (
                      <div key={seg.segmentName} className="rev-bar-row">
                        <span className="rev-bar-label">{seg.segmentName}</span>
                        <div className="rev-bar-track">
                          <div className="rev-bar-fill" style={{ width: `${widthPct}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                        </div>
                        <span className="rev-bar-value">{formatNum(seg.revenue)}</span>
                        <span className="rev-bar-pct">{pct != null ? `${(pct * 100).toFixed(1)}%` : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {geoSegments.length > 0 && (
              <div className="rev-section">
                <h4 className="rev-section-title">Por geografía</h4>
                <div className="rev-bars">
                  {geoSegments.map((seg, i) => {
                    const pct = seg.percentage ?? safeDiv(seg.revenue, f.revenue);
                    const widthPct = pct != null ? pct * 100 : 0;
                    return (
                      <div key={seg.segmentName} className="rev-bar-row">
                        <span className="rev-bar-label">{seg.segmentName}</span>
                        <div className="rev-bar-track">
                          <div className="rev-bar-fill" style={{ width: `${widthPct}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                        </div>
                        <span className="rev-bar-value">{formatNum(seg.revenue)}</span>
                        <span className="rev-bar-pct">{pct != null ? `${(pct * 100).toFixed(1)}%` : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {productSegments.length === 0 && geoSegments.length === 0 && (
              <div className="rev-no-data">
                <p>Sin datos de segmentos disponibles para {f.year}.</p>
                <p className="rev-hint">Los datos de segmentos se importan automáticamente desde SEC EDGAR.</p>
              </div>
            )}
          </div>
        )}
      </SectionReveal>
    </div>
  );
}
