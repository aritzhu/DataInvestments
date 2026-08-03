import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingDown, TrendingUp, PiggyBank, BarChart3, Shield } from 'lucide-react';
import '../styles/cashflow.css';

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

interface CashFlowData {
  company: { ticker: string; name: string };
  period: { year: number; quarter: number | null };
  nodes: SankeyNode[];
  links: SankeyLink[];
}

function formatValue(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

export function CashFlowView() {
  const { ticker } = useParams<{ ticker: string }>();
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/companies/${ticker}/sankey/cashflow`)
      .then((res) => {
        if (!res.ok) throw new Error('No data');
        return res.json();
      })
      .then((d) => setData(d.error ? null : d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <div className="cf-loading">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="cf-spinner" />
          <p style={{ color: '#64748b', fontWeight: 500 }}>Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="cf-empty">
        <div className="cf-empty-icon">
          <BarChart3 size={32} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Sin datos disponibles</h2>
          <p style={{ color: '#64748b' }}>No se encontraron datos financieros para {ticker}</p>
        </div>
        <Link to="/" className="cf-back-btn">
          <ArrowLeft size={18} />
          Volver al inicio
        </Link>
      </div>
    );
  }

  const revenue = data.nodes.find((n) => n.id === 'revenue')?.value || 0;
  const cogs = data.nodes.find((n) => n.id === 'cogs')?.value || 0;
  const rd = data.nodes.find((n) => n.id === 'rd')?.value || 0;
  const netIncome = data.nodes.find((n) => n.id === 'net_income')?.value || 0;
  const capex = data.nodes.find((n) => n.id === 'capex')?.value || 0;

  const grossMargin = ((revenue - cogs) / revenue * 100).toFixed(1);
  const netMargin = (netIncome / revenue * 100).toFixed(1);

  return (
    <div className="cf-content">
      {/* Header */}
      <div className="cf-header">
        <div className="cf-header-inner">
          <Link to="/" className="cf-back-link">
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
          <div className="cf-header-title-row">
            <div className="cf-header-avatar">
              {data.company.ticker.slice(0, 2)}
            </div>
            <div>
              <h1 className="cf-header-ticker">
                {data.company.ticker}
                <span className="cf-header-label">Flujo de Caja</span>
              </h1>
              <p className="cf-header-subtitle">
                {data.company.name} — FY {data.period.year}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="cf-tabs">
            <Link to={`/cashflow/${ticker}`} className="cf-tab cf-tab--active">
              <DollarSign size={16} />
              Flujo de Caja
            </Link>
            <Link to={`/valuation/${ticker}`} className="cf-tab cf-tab--inactive">
              <Shield size={16} />
              Valoración
            </Link>
          </div>
        </div>
      </div>

      <div className="cf-content-inner">
        {/* Metric cards */}
        <div className="cf-metrics-grid">
          <MetricCard icon={<DollarSign size={20} />} label="Ingresos" value={formatValue(revenue)} color="blue" delay={0} />
          <MetricCard icon={<TrendingDown size={20} />} label="Coste Ventas" value={formatValue(cogs)} color="red" delay={1} />
          <MetricCard icon={<PiggyBank size={20} />} label="I+D" value={formatValue(rd)} color="purple" delay={2} />
          <MetricCard icon={<TrendingUp size={20} />} label="Beneficio Neto" value={formatValue(netIncome)} color="emerald" delay={3} />
          <MetricCard icon={<DollarSign size={20} />} label="CapEx" value={formatValue(capex)} color="amber" delay={4} />
        </div>

        {/* Margins */}
        <div className="cf-margins-grid">
          <div className="cf-margin-card" style={{ animationDelay: '0.3s' }}>
            <div className="cf-margin-header">
              <span className="cf-margin-label">Margen Bruto</span>
              <span className="cf-margin-value">{grossMargin}%</span>
            </div>
            <div className="cf-progress-track">
              <div
                className="cf-progress-fill cf-progress-fill--emerald"
                style={{ width: `${Math.min(parseFloat(grossMargin), 100)}%` }}
              />
            </div>
          </div>
          <div className="cf-margin-card" style={{ animationDelay: '0.4s' }}>
            <div className="cf-margin-header">
              <span className="cf-margin-label">Margen Neto</span>
              <span className="cf-margin-value">{netMargin}%</span>
            </div>
            <div className="cf-progress-track">
              <div
                className="cf-progress-fill cf-progress-fill--blue"
                style={{ width: `${Math.min(parseFloat(netMargin), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sankey */}
        <div className="cf-sankey-section">
          <h2 className="cf-sankey-title">Distribución del Flujo de Caja</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
            Visualización del flujo de ingresos hasta el beneficio neto
          </p>
          <div className="cf-sankey-container">
            <SankeyDiagram nodes={data.nodes} links={data.links} />
          </div>
        </div>

        {/* Detail Table */}
        <div className="cf-table-section">
          <div className="cf-table-header">
            <h2 className="cf-table-title">Desglose Detallado</h2>
          </div>
          <div>
            <table className="cf-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                  <th style={{ textAlign: 'right' }}>% Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {data.nodes.map((node) => (
                  <tr key={node.id}>
                    <td style={{ fontWeight: 500, color: '#334155' }}>{node.label}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatValue(node.value)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`cf-table-badge ${node.id === 'revenue' ? 'cf-table-badge--red' : 'cf-table-badge--slate'}`}>
                        {node.id === 'revenue' ? '100%' : `${(node.value / revenue * 100).toFixed(1)}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, delay }: { icon: React.ReactNode; label: string; value: string; color: string; delay: number }) {
  return (
    <div
      className="cf-metric-card"
      style={{ animationDelay: `${delay * 0.08}s` }}
    >
      <div className={`cf-metric-icon cf-metric-icon--${color}`}>
        {icon}
      </div>
      <p className="cf-metric-label">{label}</p>
      <p className="cf-metric-value">{value}</p>
    </div>
  );
}

function SankeyDiagram({ nodes, links }: { nodes: SankeyNode[]; links: SankeyLink[] }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const width = isMobile ? 450 : 950;
  const height = isMobile ? 500 : 450;
  const nodeWidth = isMobile ? 16 : 20;

  const revenue = nodes.find((n) => n.id === 'revenue')?.value || 1;

  const x0 = isMobile ? 5 : 200;
  const x2 = isMobile ? 210 : 400;
  const x3 = isMobile ? 310 : 560;
  const x4 = isMobile ? 400 : 720;

  const getNodeHeight = (value: number) => Math.max(isMobile ? 5 : 6, (Math.abs(value) / revenue) * (isMobile ? 340 : 280));

  const colors: Record<string, string> = {
    revenue: '#2563eb',
    cogs: '#ef4444',
    sga: '#f97316',
    rd: '#a855f7',
    other_opex: '#6b7280',
    interest: '#ec4899',
    tax: '#eab308',
    net_income: '#4f8fb5',
    capex: '#f59e0b',
    depreciation: '#64748b',
  };

  const expenseIds = ['cogs', 'sga', 'rd', 'other_opex', 'interest', 'tax'];
  const expenseNodes = expenseIds
    .map(id => nodes.find(n => n.id === id))
    .filter((n): n is SankeyNode => !!n && n.value > 0)
    .sort((a, b) => b.value - a.value);

  const revenueNode = nodes.find(n => n.id === 'revenue');
  const netIncomeNode = nodes.find(n => n.id === 'net_income');
  if (!revenueNode || !netIncomeNode) return null;
  const rightNodes = nodes
    .filter(n => ['capex', 'depreciation'].includes(n.id) && n.value > 0)
    .sort((a, b) => b.value - a.value);

  const positions = new Map<string, { x: number; y: number; h: number }>();

  const revenueH = getNodeHeight(revenueNode.value);
  positions.set('revenue', { x: x2, y: (height - revenueH) / 2, h: revenueH });

  const totalExpenseH = expenseNodes.reduce((sum, n) => sum + getNodeHeight(n.value), 0);
  const expenseGap = expenseNodes.length > 1
    ? Math.min(isMobile ? 10 : 14, (height - 40 - totalExpenseH) / (expenseNodes.length - 1))
    : 0;
  let expenseY = (height - totalExpenseH - expenseGap * Math.max(0, expenseNodes.length - 1)) / 2;
  for (const node of expenseNodes) {
    const h = getNodeHeight(node.value);
    positions.set(node.id, { x: x0, y: expenseY, h });
    expenseY += h + expenseGap;
  }

  const netIncomeH = getNodeHeight(netIncomeNode.value);
  positions.set('net_income', { x: x3, y: (height - netIncomeH) / 2, h: netIncomeH });

  const totalRightH = rightNodes.reduce((sum, n) => sum + getNodeHeight(n.value), 0);
  const rightGap = rightNodes.length > 1 ? (isMobile ? 10 : 14) : 0;
  let rightY = (height - totalRightH - rightGap * Math.max(0, rightNodes.length - 1)) / 2;
  for (const node of rightNodes) {
    const h = getNodeHeight(node.value);
    positions.set(node.id, { x: x4, y: rightY, h });
    rightY += h + rightGap;
  }

  const validLinks = links.filter(l =>
    l.value > 0 && positions.has(l.source) && positions.has(l.target)
  );

  const linksBySource = new Map<string, SankeyLink[]>();
  for (const link of validLinks) {
    const arr = linksBySource.get(link.source) || [];
    arr.push(link);
    linksBySource.set(link.source, arr);
  }

  for (const [, sourceLinks] of linksBySource) {
    sourceLinks.sort((a, b) => {
      const aIsLeft = positions.get(a.target)!.x < positions.get(a.source)!.x;
      const bIsLeft = positions.get(b.target)!.x < positions.get(b.source)!.x;
      if (aIsLeft && !bIsLeft) return -1;
      if (!aIsLeft && bIsLeft) return 1;
      return b.value - a.value;
    });
  }

  const renderedLinks: Array<{ key: string; d: string; color: string; strokeWidth: number }> = [];
  const sourceOffsets = new Map<string, number>();
  const targetOffsets = new Map<string, number>();

  for (const [, sourceLinks] of linksBySource) {
    for (const link of sourceLinks) {
      const sp = positions.get(link.source)!;
      const tp = positions.get(link.target)!;
      const isLeft = tp.x < sp.x;

      const sOffset = sourceOffsets.get(link.source) || 0;
      const sLinkH = getNodeHeight(link.value);
      const sy = sp.y + sOffset + sLinkH / 2;
      sourceOffsets.set(link.source, sOffset + sLinkH);

      const tOffset = targetOffsets.get(link.target) || 0;
      const tLinkH = getNodeHeight(link.value);
      const ty = tp.y + tOffset + tLinkH / 2;
      targetOffsets.set(link.target, tOffset + tLinkH);

      const sx = isLeft ? sp.x : sp.x + nodeWidth;
      const tx = isLeft ? tp.x + nodeWidth : tp.x;
      const dx = Math.abs(tx - sx) * 0.4;

      renderedLinks.push({
        key: `${link.source}-${link.target}`,
        d: `M ${sx} ${sy} C ${sx + (isLeft ? -dx : dx)} ${sy}, ${tx + (isLeft ? dx : -dx)} ${ty}, ${tx} ${ty}`,
        color: colors[link.source] || '#94a3b8',
        strokeWidth: Math.max(2, sLinkH),
      });
    }
  }

  const labelFontSize = isMobile ? 9 : 11;
  const valueFontSize = isMobile ? 8 : 10;
  const centerFontSize = isMobile ? 11 : 13;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="cf-sankey-svg">
      {renderedLinks.map(link => (
        <path
          key={link.key}
          d={link.d}
          fill="none"
          stroke={link.color}
          strokeWidth={link.strokeWidth}
          opacity={0.4}
          style={{ transition: 'opacity 0.3s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.4')}
        />
      ))}

      {Array.from(positions.entries()).map(([id, pos]) => {
        const node = nodes.find(n => n.id === id)!;
        const isCenter = Math.abs(pos.x - x2) < 10;
        const isLeft = pos.x < x2;

        const labelX = isCenter
          ? pos.x + nodeWidth / 2
          : (isLeft && isMobile)
            ? pos.x + nodeWidth + 6
            : isLeft
              ? pos.x - 8
              : pos.x + nodeWidth + 8;

        const labelAnchor = isCenter
          ? 'middle'
          : (isLeft && isMobile)
            ? 'start'
            : isLeft
              ? 'end'
              : 'start';

        return (
          <g key={id}>
            <rect
              x={pos.x}
              y={pos.y}
              width={nodeWidth}
              height={pos.h}
              fill={colors[id] || '#94a3b8'}
              rx={isMobile ? 3 : 4}
              style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            />
            <text
              x={labelX}
              y={pos.y + pos.h / 2}
              textAnchor={labelAnchor}
              dominantBaseline="middle"
              fill="#334155"
              fontSize={isCenter ? centerFontSize : labelFontSize}
              fontWeight={isCenter ? 700 : 500}
            >
              {node.label}
            </text>
            <text
              x={labelX}
              y={pos.y + pos.h / 2 + (isMobile ? 11 : 14)}
              textAnchor={labelAnchor}
              dominantBaseline="middle"
              fill="#64748b"
              fontSize={valueFontSize}
            >
              {formatValue(node.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
