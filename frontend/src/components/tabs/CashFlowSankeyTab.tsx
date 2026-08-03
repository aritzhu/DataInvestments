import { useMemo, useState, useCallback } from 'react';
import type { CompanyProfile } from '../CompanyPage';
import { formatNum, formatPct } from '../../utils/format';
import '../../styles/cashflow.css';

interface Props {
  financial: CompanyProfile['financials'][0] | undefined;
  balanceSheet: CompanyProfile['balanceSheets'][0] | null;
  stock: CompanyProfile['stockMetrics'][0] | null;
  selectedYear: number | null;
}

interface SankeyNode {
  id: string;
  label: string;
  value: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

function formatVal(v: number): string {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

const NODE_COLORS: Record<string, string> = {
  operating_cf: 'var(--info)',
  capex: 'var(--red)',
  fcf: 'var(--blue-light)',
  dividends: 'var(--amber)',
  buybacks: 'var(--purple-light)',
  retained: 'var(--cyan-bright)',
};

function CashFlowSankeyDiagram({ nodes, links }: { nodes: SankeyNode[]; links: SankeyLink[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [isMobile] = useState(() => window.innerWidth < 640);

  const width = isMobile ? 460 : 900;
  const height = isMobile ? 340 : 380;
  const nodeWidth = isMobile ? 16 : 20;
  const padY = 30;

  const operatingNode = nodes.find(n => n.id === 'operating_cf');
  const total = operatingNode?.value || 1;

  const colX = { left: isMobile ? 10 : 160, mid: isMobile ? 200 : 420, right: isMobile ? 370 : 700 };

  const getNodeH = (v: number) => Math.max(isMobile ? 6 : 8, (Math.abs(v) / total) * (height - padY * 2));

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; h: number }>();

    if (operatingNode) {
      const h = getNodeH(operatingNode.value);
      map.set('operating_cf', { x: colX.left, y: (height - h) / 2, h });
    }

    const leftOut = links.filter(l => l.source === 'operating_cf');
    const totalLeftH = leftOut.reduce((s, l) => s + getNodeH(l.value), 0);
    const gap = leftOut.length > 1 ? Math.min(14, (height - padY * 2 - totalLeftH) / (leftOut.length - 1)) : 0;
    let ly = (height - totalLeftH - gap * Math.max(0, leftOut.length - 1)) / 2;
    for (const link of leftOut) {
      const node = nodes.find(n => n.id === link.target);
      if (!node || node.value <= 0) continue;
      const h = getNodeH(node.value);
      map.set(link.target, { x: colX.mid, y: ly, h });
      ly += h + gap;
    }

    const fcfNode = nodes.find(n => n.id === 'fcf');
    const rightOut = links.filter(l => l.source === 'fcf');
    if (fcfNode && fcfNode.value > 0) {
      const totalRightH = rightOut.reduce((s, l) => s + getNodeH(l.value), 0);
      const rGap = rightOut.length > 1 ? Math.min(12, (height - padY * 2 - totalRightH) / (rightOut.length - 1)) : 0;
      let ry = (height - totalRightH - rGap * Math.max(0, rightOut.length - 1)) / 2;
      for (const link of rightOut) {
        const node = nodes.find(n => n.id === link.target);
        if (!node || node.value <= 0) continue;
        const h = getNodeH(node.value);
        map.set(link.target, { x: colX.right, y: ry, h });
        ry += h + rGap;
      }
    }

    return map;
  }, [nodes, links, height, isMobile]);

  const validLinks = useMemo(() => {
    return links.filter(l => l.value > 0 && positions.has(l.source) && positions.has(l.target));
  }, [links, positions]);

  const { renderedLinks } = useMemo(() => {
    const rendered: Array<{ key: string; d: string; color: string; sw: number }> = [];
    const sOff = new Map<string, number>();
    const tOff = new Map<string, number>();

    for (const link of validLinks) {
      const sp = positions.get(link.source)!;
      const tp = positions.get(link.target)!;

      const so = sOff.get(link.source) || 0;
      const slh = getNodeH(link.value);
      const sy = sp.y + so + slh / 2;
      sOff.set(link.source, so + slh);

      const to = tOff.get(link.target) || 0;
      const tlh = getNodeH(link.value);
      const ty = tp.y + to + tlh / 2;
      tOff.set(link.target, to + tlh);

      const sx = sp.x + nodeWidth;
      const tx = tp.x;
      const dx = Math.abs(tx - sx) * 0.4;

      rendered.push({
        key: `${link.source}-${link.target}`,
        d: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`,
        color: NODE_COLORS[link.source] || 'var(--text-tertiary)',
        sw: Math.max(2, slh),
      });
    }
    return { renderedLinks: rendered, updatedOffsets: { s: sOff, t: tOff } };
  }, [validLinks, positions, nodeWidth, height]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, text: string) => {
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 10,
      text,
    });
  }, []);

  const lFontSize = isMobile ? 9 : 11;
  const vFontSize = isMobile ? 8 : 10;

  return (
    <div className="cs-sankey-container" style={{ position: 'relative' }}>
      {tooltip && (
        <div
          className="cs-sankey-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="cs-sankey-svg"
        onMouseLeave={() => setTooltip(null)}
      >
        {renderedLinks.map(link => (
          <path
            key={link.key}
            d={link.d}
            fill="none"
            stroke={link.color}
            strokeWidth={link.sw}
            opacity={0.35}
            style={{ transition: 'opacity 0.3s ease', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.65';
              const linkData = validLinks.find(l => `${l.source}-${l.target}` === link.key);
              if (linkData) {
                const sourceNode = nodes.find(n => n.id === linkData.source);
                const targetNode = nodes.find(n => n.id === linkData.target);
                handleMouseEnter(e, `${sourceNode?.label} → ${targetNode?.label}: ${formatVal(linkData.value)}`);
              }
            }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.35'; setTooltip(null); }}
          />
        ))}

        {Array.from(positions.entries()).map(([id, pos]) => {
          const node = nodes.find(n => n.id === id)!;
          const isLeft = pos.x < colX.mid - 10;
          const isRight = pos.x > colX.mid + 10;

          const labelX = isLeft
            ? pos.x - 8
            : isRight
              ? pos.x + nodeWidth + 8
              : pos.x + nodeWidth / 2;

          const labelAnchor = isLeft ? 'end' : isRight ? 'start' : 'middle';

          return (
            <g key={id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={nodeWidth}
                height={pos.h}
                fill={NODE_COLORS[id] || 'var(--text-tertiary)'}
                rx={isMobile ? 3 : 4}
                style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                  handleMouseEnter(e, `${node.label}: ${formatVal(node.value)}`);
                }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; setTooltip(null); }}
              />
              <text
                x={labelX}
                y={pos.y + pos.h / 2 - (isMobile ? 4 : 5)}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                fill="var(--text-secondary)"
                fontSize={isLeft || isRight ? lFontSize : isMobile ? 10 : 12}
                fontWeight={isLeft || isRight ? 500 : 700}
              >
                {node.label}
              </text>
              <text
                x={labelX}
                y={pos.y + pos.h / 2 + (isMobile ? 7 : 8)}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                fill="var(--text-tertiary)"
                fontSize={vFontSize}
              >
                {formatVal(node.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface BalanceBarProps {
  label: string;
  segments: Array<{ label: string; value: number; className: string }>;
  total: number;
}

function BalanceBar({ label, segments, total }: BalanceBarProps) {
  const validSegments = segments.filter(s => s.value > 0);
  return (
    <div className="cs-bar-row">
      <div className="cs-bar-label">{label}</div>
      <div className="cs-bar-track">
        {validSegments.map(s => (
          <div
            key={s.label}
            className={`cs-bar-segment ${s.className}`}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${formatVal(s.value)}`}
          >
            {s.value / total > 0.12 ? formatVal(s.value) : ''}
          </div>
        ))}
      </div>
      <div className="cs-bar-legend">
        {validSegments.map(s => (
          <div key={s.label} className="cs-legend-item">
            <span className={`cs-legend-dot ${s.className.replace('cs-bar-segment--', 'cs-legend-dot--')}`} />
            {s.label}: {formatVal(s.value)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashFlowSankeyTab({ financial, balanceSheet, stock, selectedYear }: Props) {
  const sankeyData = useMemo(() => {
    if (!financial) return null;

    const ocf = financial.operatingCashFlow ?? 0;
    const capex = Math.abs(financial.capex ?? 0);
    const fcf = financial.freeCashFlow ?? 0;
    const dividends = Math.abs(financial.dividendsPaid ?? 0);
    const buybacks = Math.abs(financial.shareRepurchases ?? 0);
    const retained = Math.max(0, fcf - dividends - buybacks);

    const nodes: SankeyNode[] = [
      { id: 'operating_cf', label: 'Flujo operativo', value: Math.abs(ocf) },
      { id: 'capex', label: 'CapEx', value: capex },
      { id: 'fcf', label: 'Free Cash Flow', value: Math.abs(fcf) },
      { id: 'dividends', label: 'Dividendos', value: dividends },
      { id: 'buybacks', label: 'Recompra', value: buybacks },
      { id: 'retained', label: 'Efectivo retenido', value: retained },
    ];

    const links: SankeyLink[] = [
      { source: 'operating_cf', target: 'capex', value: capex },
      { source: 'operating_cf', target: 'fcf', value: Math.abs(fcf) },
      { source: 'fcf', target: 'dividends', value: dividends },
      { source: 'fcf', target: 'buybacks', value: buybacks },
      { source: 'fcf', target: 'retained', value: retained },
    ];

    return { nodes, links };
  }, [financial]);

  const balanceData = useMemo(() => {
    if (!balanceSheet) return null;

    const ca = balanceSheet.totalCurrentAssets ?? 0;
    const nca = balanceSheet.totalNonCurrentAssets ?? 0;
    const ta = balanceSheet.totalAssets ?? ca + nca;

    const cl = balanceSheet.totalCurrentLiabilities ?? 0;
    const ltl = balanceSheet.totalNonCurrentLiabilities ?? 0;
    const tl = balanceSheet.totalLiabilities ?? cl + ltl;

    const eq = balanceSheet.totalStockholdersEquity ?? (ta - tl);

    const cash = balanceSheet.cashAndCashEquivalents ?? 0;
    const stDebt = balanceSheet.shortTermDebt ?? 0;
    const ltDebt = balanceSheet.longTermDebt ?? 0;
    const totalDebt = stDebt + ltDebt;
    const netDebt = totalDebt - cash;

    const currentRatio = cl > 0 ? ca / cl : null;
    const debtEquity = eq > 0 ? totalDebt / eq : null;
    const equityPct = ta > 0 ? eq / ta : null;

    return {
      assets: { total: ta, current: ca, nonCurrent: nca },
      financing: { total: Math.max(ta, tl + eq), liabilities: tl, currentLiabilities: cl, longTermLiabilities: ltl, equity: eq },
      metrics: {
        totalAssets: ta,
        totalLiabilities: tl,
        netDebt,
        totalDebt,
        currentRatio,
        debtEquity,
        equityPct,
      },
    };
  }, [balanceSheet]);

  if (!financial) {
    return (
      <div className="cs-tab">
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          Sin datos financieros disponibles para este año.
        </div>
      </div>
    );
  }

  return (
    <div className="cs-tab">
      {/* Sankey Card */}
      {sankeyData && (
        <div className="cs-sankey-card">
          <div className="cs-sankey-title">Flujos de caja</div>
          <div className="cs-sankey-subtitle">
            {selectedYear ? `Ejercicio ${selectedYear}` : 'Último ejercicio disponible'} — cómo se genera y distribuye el efectivo
          </div>
          <CashFlowSankeyDiagram nodes={sankeyData.nodes} links={sankeyData.links} />
        </div>
      )}

      {/* Cash Flow Verdict */}
      {financial && stock && (
        <div className="cs-sankey-card">
          <div className="cs-sankey-title">¿Estás pagando un precio justo por estos flujos de caja?</div>
          <div className="cs-sankey-subtitle">Múltiplos de flujo de caja para determinar si el precio es razonable</div>
          {(() => {
            const fcf = financial.freeCashFlow ?? 0;
            const shares = stock.sharesOutstanding ?? 0;
            const price = stock.currentPrice ?? 0;
            const ev = stock.enterpriseValue ?? 0;

            const fcfPerShare = shares > 0 ? fcf / shares : 0;
            const fcfYield = price > 0 ? (fcfPerShare / price) * 100 : 0;
            const evFcf = fcf > 0 ? ev / fcf : 0;
            const paybackYears = fcfPerShare > 0 ? price / fcfPerShare : 0;

            const fcfYieldSignal = fcfYield > 5 ? 'buy' : fcfYield > 3 ? 'hold' : 'sell';
            const evFcfSignal = evFcf < 15 ? 'buy' : evFcf < 25 ? 'hold' : 'sell';
            const paybackSignal = paybackYears < 15 ? 'buy' : paybackYears < 25 ? 'hold' : 'sell';

            return (
              <>
                <div className="cs-metrics-grid" style={{ marginTop: '1rem' }}>
                  <div className="cs-metric-card">
                    <span className="cs-metric-label">FCF Yield</span>
                    <span className="cs-metric-value">{fcfYield.toFixed(1)}%</span>
                    <span className="cs-metric-desc">{fcfYieldSignal === 'buy' ? 'Barato (>5%)' : fcfYieldSignal === 'hold' ? 'Justo (3-5%)' : 'Caro (<3%)'}</span>
                  </div>
                  <div className="cs-metric-card">
                    <span className="cs-metric-label">EV / FCF</span>
                    <span className="cs-metric-value">{evFcf > 0 ? `${evFcf.toFixed(1)}x` : '—'}</span>
                    <span className="cs-metric-desc">{evFcfSignal === 'buy' ? 'Barato (<15x)' : evFcfSignal === 'hold' ? 'Justo (15-25x)' : 'Caro (>25x)'}</span>
                  </div>
                  <div className="cs-metric-card">
                    <span className="cs-metric-label">Payback por FCF</span>
                    <span className="cs-metric-value">{paybackYears > 0 ? `${paybackYears.toFixed(1)} años` : '—'}</span>
                    <span className="cs-metric-desc">{paybackSignal === 'buy' ? 'Rápido (<15 años)' : paybackSignal === 'hold' ? 'Moderado (15-25)' : 'Lento (>25 años)'}</span>
                  </div>
                </div>
                <div className="cs-cashflow-verdict">
                  {fcfYieldSignal === 'buy' || evFcfSignal === 'buy' ? (
                    <>
                      <span className="edu-signal edu-signal--buy">SUBVALORADA por flujos de caja</span>
                      <span className="edu-signal-desc">Los flujos de caja generan un retorno atractivo respecto al precio</span>
                    </>
                  ) : fcfYieldSignal === 'sell' && evFcfSignal === 'sell' ? (
                    <>
                      <span className="edu-signal edu-signal--sell">SOBREVALORADA por flujos de caja</span>
                      <span className="edu-signal-desc">El precio es alto respecto a los flujos de caja que genera la empresa</span>
                    </>
                  ) : (
                    <>
                      <span className="edu-signal edu-signal--hold">JUSTA por flujos de caja</span>
                      <span className="edu-signal-desc">Los flujos de caja son razonables respecto al precio actual</span>
                    </>
                  )}
                </div>
              </>
            );
          })()}
            <p className="verdict-explanation">
              El <strong>FCF Yield</strong> mide cuánto retorno genera la empresa en flujos de caja libres respecto a su precio (como el yield de un bono). <strong>EV/FCF</strong> indica cuántos años de flujos de caja necesitarías para recuperar el valor de la empresa. El <strong>Payback</strong> te dice cuántos años tardarías en recuperar tu inversión solo con el flujo de caja libre. Un yield &gt; 5% generalmente indica infravaloración.
            </p>
        </div>
      )}

      {/* Balance Sheet Section */}
      {balanceData && (
        <div className="cs-balance-card">
          <div className="cs-balance-title">Activos y endeudamiento</div>
          <div className="cs-bar-group">
            <BalanceBar
              label="Activos totales"
              total={balanceData.assets.total}
              segments={[
                { label: 'Corrientes', value: balanceData.assets.current, className: 'cs-bar-segment--current' },
                { label: 'No corrientes', value: balanceData.assets.nonCurrent, className: 'cs-bar-segment--noncurrent' },
              ]}
            />
            <BalanceBar
              label="Financiación"
              total={balanceData.financing.total}
              segments={[
                { label: 'Pasivos corrientes', value: balanceData.financing.currentLiabilities, className: 'cs-bar-segment--cl' },
                { label: 'Pasivos no corrientes', value: balanceData.financing.longTermLiabilities, className: 'cs-bar-segment--ltl' },
                { label: 'Patrimonio neto', value: balanceData.financing.equity, className: 'cs-bar-segment--equity' },
              ]}
            />
          </div>

          {/* Key Metrics */}
          <div className="cs-metrics-grid">
            <div className="cs-metric-card">
              <span className="cs-metric-label">Activos totales</span>
              <span className="cs-metric-value">{formatNum(balanceData.metrics.totalAssets)}</span>
              <span className="cs-metric-desc">Total assets</span>
            </div>
            <div className="cs-metric-card">
              <span className="cs-metric-label">Pasivos totales</span>
              <span className="cs-metric-value">{formatNum(balanceData.metrics.totalLiabilities)}</span>
              <span className="cs-metric-desc">Total liabilities</span>
            </div>
            <div className="cs-metric-card">
              <span className="cs-metric-label">Deuda neta</span>
              <span className="cs-metric-value">{formatNum(balanceData.metrics.netDebt)}</span>
              <span className="cs-metric-desc">Deuda − efectivo</span>
            </div>
            <div className="cs-metric-card">
              <span className="cs-metric-label">Ratio corriente</span>
              <span className="cs-metric-value">{balanceData.metrics.currentRatio != null ? balanceData.metrics.currentRatio.toFixed(2) : '—'}</span>
              <span className="cs-metric-desc">Current assets / current liabilities</span>
            </div>
            <div className="cs-metric-card">
              <span className="cs-metric-label">Deuda / Equity</span>
              <span className="cs-metric-value">{balanceData.metrics.debtEquity != null ? balanceData.metrics.debtEquity.toFixed(2) : '—'}</span>
              <span className="cs-metric-desc">Leverage ratio</span>
            </div>
            <div className="cs-metric-card">
              <span className="cs-metric-label">Equity / Activos</span>
              <span className="cs-metric-value">{balanceData.metrics.equityPct != null ? formatPct(balanceData.metrics.equityPct) : '—'}</span>
              <span className="cs-metric-desc">Patrimonio neto</span>
            </div>
          </div>
        </div>
      )}

      {!balanceSheet && financial && (
        <div className="cs-balance-card">
          <div className="cs-balance-title">Activos y endeudamiento</div>
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            Sin datos de balance disponibles para este año.
          </div>
        </div>
      )}
    </div>
  );
}
