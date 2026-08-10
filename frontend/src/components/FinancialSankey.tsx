import { useMemo, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import type { CompanyProfile } from './CompanyPage';
import '../styles/cashflow.css';

interface Props {
  financial: CompanyProfile['financials'][0] | undefined;
  balanceSheet: CompanyProfile['balanceSheets'][0] | null;
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
  px?: number;
}

interface Stack {
  x: number;
  scale: number;
  nodes: string[];
  heights?: number[];
  topOffset?: number;
}

const W = 1000;
const H = 460;
const PAD_Y = 30;
const S = H - PAD_Y * 2;
const COL_TOP = PAD_Y;
const NODE_W = 20;
const MIN_PX = 10;
const LABEL_MIN_H = 20;

function floorColumn(heights: number[], total: number): number[] {
  if (heights.length === 0) return [];
  const floor = MIN_PX;
  const floored = heights.map(h => Math.max(floor, h));
  const sum = floored.reduce((a, b) => a + b, 0);
  if (sum <= total) return floored;
  const excess = sum - total;
  const above = heights.map(h => Math.max(0, h - floor));
  const aboveSum = above.reduce((a, b) => a + b, 0);
  if (aboveSum > excess) {
    return floored.map((v, i) => Math.max(0, v - excess * (above[i] / aboveSum)));
  }
  const k = total / sum;
  return floored.map(v => Math.max(0, v * k));
}

const X = { fin: 180, pool: 310, assets: 410, rev: 640, costs: 740 };

const STAGES = [
  { label: '1 · Financiación', mid: 180 },
  { label: '2 · Activos', mid: 410 },
  { label: '3 · Generación', mid: 690 },
];

const LABELS: Record<string, string> = {
  debt_st: 'Deuda a corto plazo',
  debt_lt: 'Deuda a largo plazo',
  payables: 'Cuentas por pagar',
  other_liab: 'Otros pasivos',
  equity: 'Patrimonio neto',
  pool: 'Fondo de capital',
  cash: 'Efectivo',
  receivables: 'Cuentas por cobrar',
  inventory: 'Inventario',
  ppe: 'Planta y equipo',
  intangibles: 'Intangibles',
  other_assets: 'Otros activos',
  revenue: 'Ingresos',
  cogs: 'Costo de ventas',
  sga: 'Gastos SGA',
  rd: 'I+D',
  other_opex: 'Otros gastos',
  interest: 'Intereses',
  taxes: 'Impuestos',
  net_income: 'Beneficio neto',
};

const NODE_COLORS: Record<string, string> = {
  debt_st: 'var(--red)',
  debt_lt: 'var(--red)',
  payables: 'var(--orange)',
  other_liab: 'var(--amber)',
  equity: 'var(--blue)',
  pool: 'var(--gold)',
  cash: 'var(--cyan-bright)',
  receivables: 'var(--sky)',
  inventory: 'var(--gold)',
  ppe: 'var(--amber)',
  intangibles: 'var(--purple)',
  other_assets: 'var(--text-tertiary)',
  revenue: 'var(--info)',
  cogs: 'var(--red)',
  sga: 'var(--orange)',
  rd: 'var(--amber)',
  other_opex: 'var(--orange-light)',
  interest: 'var(--pink)',
  taxes: 'var(--red)',
  net_income: 'var(--teal)',
};

function formatVal(v: number): string {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

function buildSankey(
  f: CompanyProfile['financials'][0] | undefined,
  bs: CompanyProfile['balanceSheets'][0] | null,
): { nodes: SankeyNode[]; links: SankeyLink[]; stacks: Stack[] } | null {
  if (!f || f.revenue <= 0) return null;

  const st = Math.max(0, bs?.shortTermDebt ?? 0);
  const lt = Math.max(0, bs?.longTermDebt ?? 0);
  const payables = Math.max(0, bs?.accountsPayable ?? 0);
  const tl = bs?.totalLiabilities ?? (bs?.totalCurrentLiabilities ?? 0) + (bs?.totalNonCurrentLiabilities ?? 0);
  const ta = bs?.totalAssets ?? (bs?.totalCurrentAssets ?? 0) + (bs?.totalNonCurrentAssets ?? 0);
  const otherLiab = Math.max(0, tl - st - lt - payables);
  const equity = Math.max(0, bs?.totalStockholdersEquity ?? (ta - tl));

  const cash = Math.max(0, (bs?.cashAndCashEquivalents ?? 0) + (bs?.shortTermInvestments ?? 0));
  const receivables = Math.max(0, bs?.accountsReceivable ?? 0);
  const inventory = Math.max(0, bs?.inventory ?? 0);
  const ppe = Math.max(0, bs?.propertyPlantEquipment ?? 0);
  const intangibles = Math.max(0, (bs?.goodwill ?? 0) + (bs?.intangibleAssets ?? 0));
  const known = cash + receivables + inventory + ppe + intangibles;
  const otherAssets = Math.max(0, ta - known);

  const finTotal = st + lt + payables + otherLiab + equity;
  const taTotal = known + otherAssets;
  if (finTotal <= 0 || taTotal <= 0) return null;

  const finValues: Array<[string, number]> = [
    ['debt_st', st],
    ['debt_lt', lt],
    ['payables', payables],
    ['other_liab', otherLiab],
    ['equity', equity],
  ];
  const assetValues: Array<[string, number]> = [
    ['cash', cash],
    ['receivables', receivables],
    ['inventory', inventory],
    ['ppe', ppe],
    ['intangibles', intangibles],
    ['other_assets', otherAssets],
  ];

  const sga = Math.max(0, f.sgaExpense);
  const rd = Math.max(0, f.rdExpense);
  const costs: Record<string, number> = {
    cogs: Math.max(0, f.costOfRevenue),
    sga,
    rd,
    other_opex: Math.max(0, f.operatingExpenses - sga - rd),
    interest: Math.max(0, f.interestExpense),
    taxes: Math.max(0, f.taxExpense),
  };
  let ni = Math.max(0, f.netIncome);
  let sumOut = Object.values(costs).reduce((a, b) => a + b, 0) + ni;
  if (sumOut > f.revenue) {
    const k = f.revenue / sumOut;
    for (const key of Object.keys(costs)) costs[key] *= k;
    ni *= k;
  }
  const revenue = f.revenue;

  const nodeValues: Record<string, number> = {
    debt_st: st,
    debt_lt: lt,
    payables,
    other_liab: otherLiab,
    equity,
    cash,
    receivables,
    inventory,
    ppe,
    intangibles,
    other_assets: otherAssets,
    revenue,
    ...costs,
    net_income: ni,
    pool: taTotal,
  };

  const nodes: SankeyNode[] = Object.entries(nodeValues)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, label: LABELS[id] ?? id, value: v }));

  const links: SankeyLink[] = [];
  const finNodes = finValues.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const assetNodes = assetValues.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  const genOuts: Array<[string, number]> = Object.entries(costs).filter(([, cv]) => cv > 0);
  if (ni > 0) genOuts.push(['net_income', ni]);
  genOuts.sort((a, b) => b[1] - a[1]);

  const GS = S / Math.max(taTotal, revenue);
  const poolFill = Math.min(1, taTotal / finTotal);
  const revFill = Math.min(1, revenue / taTotal);
  const heightOf: Record<string, number> = {};

  const costsTotal = Math.min(sumOut, revenue) * GS;

  const finHeights = floorColumn(finNodes.map(([, v]) => v * GS), Math.min(finTotal, taTotal) * GS);
  finNodes.forEach(([id], i) => { heightOf[id] = finHeights[i]; });

  const assetHeights = floorColumn(assetNodes.map(([, v]) => v * GS), taTotal * GS);
  assetNodes.forEach(([id], i) => { heightOf[id] = assetHeights[i]; });

  const assetFeed = floorColumn(assetNodes.map(([, v]) => v * GS), Math.min(revenue, taTotal) * GS);

  const genHeights = floorColumn(genOuts.map(([, v]) => v * GS), costsTotal);
  genOuts.forEach(([id], i) => { heightOf[id] = genHeights[i]; });

  heightOf.pool = taTotal * GS;
  heightOf.revenue = revenue * GS;

  for (let i = 0; i < finNodes.length; i++) {
    const [fid, fv] = finNodes[i];
    links.push({ source: fid, target: 'pool', value: fv * poolFill, px: finHeights[i] });
  }
  for (let i = 0; i < assetNodes.length; i++) {
    const [aid, av] = assetNodes[i];
    links.push({ source: 'pool', target: aid, value: av, px: assetHeights[i] });
    links.push({ source: aid, target: 'revenue', value: av * revFill, px: assetFeed[i] });
  }
  for (let i = 0; i < genOuts.length; i++) {
    const [cid, cv] = genOuts[i];
    links.push({ source: 'revenue', target: cid, value: cv, px: heightOf[cid] });
  }

  const stacks: Stack[] = [
    { x: X.fin, scale: GS, nodes: finNodes.map(([id]) => id), heights: finNodes.map(([id]) => heightOf[id]) },
    { x: X.pool, scale: GS, nodes: ['pool'], heights: [heightOf.pool] },
    { x: X.assets, scale: GS, nodes: assetNodes.map(([id]) => id), heights: assetNodes.map(([id]) => heightOf[id]) },
    { x: X.rev, scale: GS, nodes: ['revenue'], heights: [heightOf.revenue] },
    { x: X.costs, scale: GS, nodes: genOuts.map(([id]) => id), heights: genOuts.map(([id]) => heightOf[id]) },
  ];

  return { nodes, links, stacks };
}

export function FinancialSankey({ financial, balanceSheet }: Props) {
  const data = useMemo(() => buildSankey(financial, balanceSheet), [financial, balanceSheet]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [active, setActive] = useState<Set<string>>(new Set());

  const nodeMap = useMemo(() => new Map((data?.nodes ?? []).map(n => [n.id, n])), [data]);

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number; h: number }>();
    for (const st of data?.stacks ?? []) {
      let y = COL_TOP + (st.topOffset ?? 0);
      for (let i = 0; i < st.nodes.length; i++) {
        const id = st.nodes[i];
        const n = nodeMap.get(id);
        if (!n) continue;
        const h = st.heights?.[i] ?? Math.max(MIN_PX, n.value * st.scale);
        pos.set(id, { x: st.x, y, h });
        y += h;
      }
    }
    return pos;
  }, [data, nodeMap]);

  const validLinks = useMemo(
    () => (data?.links ?? []).filter(l => l.value > 0 && positions.has(l.source) && positions.has(l.target)),
    [data, positions],
  );

  const renderedLinks = useMemo(() => {
    const sOff = new Map<string, number>();
    const tOff = new Map<string, number>();
    return validLinks.map(l => {
      const sp = positions.get(l.source)!;
      const tp = positions.get(l.target)!;
      const px = l.px ?? 0;
      const sy = sp.y + (sOff.get(l.source) || 0) + px / 2;
      const ty = tp.y + (tOff.get(l.target) || 0) + px / 2;
      sOff.set(l.source, (sOff.get(l.source) || 0) + px);
      tOff.set(l.target, (tOff.get(l.target) || 0) + px);
      const sx = sp.x + NODE_W;
      const tx = tp.x;
      const dx = Math.min(60, Math.abs(tx - sx) * 0.35);
      return {
        key: `${l.source}-${l.target}`,
        d: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`,
        color: NODE_COLORS[l.target] || 'var(--text-tertiary)',
        sw: px,
        source: l.source,
        target: l.target,
        value: l.value,
      };
    });
  }, [validLinks, positions]);

  const highlightFrom = useCallback(
    (seeds: string[]) => {
      const set = new Set<string>(seeds);
      let changed = true;
      while (changed) {
        changed = false;
        for (const l of validLinks) {
          if (set.has(l.source) || set.has(l.target)) {
            if (!set.has(l.source)) {
              set.add(l.source);
              changed = true;
            }
            if (!set.has(l.target)) {
              set.add(l.target);
              changed = true;
            }
          }
        }
      }
      setActive(set);
    },
    [validLinks],
  );

  const handleMouseEnter = useCallback((e: ReactMouseEvent, text: string) => {
    const rect = e.currentTarget.closest('.cs-sankey-container')?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10, text });
  }, []);

  const labelSide: Record<string, 'left' | 'right'> = {
    debt_st: 'left', debt_lt: 'left', payables: 'left', other_liab: 'left', equity: 'left',
    cash: 'right', receivables: 'right', inventory: 'right', ppe: 'right', intangibles: 'right', other_assets: 'right',
    revenue: 'left', cogs: 'right', sga: 'right', rd: 'right', other_opex: 'right', interest: 'right', taxes: 'right', net_income: 'right',
  };

  if (!data) {
    return (
      <div className="cs-sankey-container">
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
          Sin datos suficientes (balance y cuenta de resultados) para dibujar el Sankey de este ejercicio.
        </div>
      </div>
    );
  }

  const hasActive = active.size > 0;
  const netNode = nodeMap.get('net_income');

  return (
    <div className="cs-sankey-container">
      {tooltip && (
        <div className="cs-sankey-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="cs-sankey-svg fs-sankey-min"
        onMouseLeave={() => {
          setTooltip(null);
          setActive(new Set());
        }}
      >
        {STAGES.map(stage => (
          <text
            key={stage.label}
            x={stage.mid}
            y={14}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="var(--text-secondary)"
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {stage.label}
          </text>
        ))}

        {renderedLinks.map(l => (
          <path
            key={l.key}
            d={l.d}
            fill="none"
            stroke={l.color}
            strokeWidth={l.sw}
            opacity={hasActive ? (active.has(l.source) && active.has(l.target) ? 0.55 : 0.07) : 0.3}
            style={{ transition: 'opacity 0.25s ease', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              highlightFrom([l.source, l.target]);
              const src = nodeMap.get(l.source);
              const tgt = nodeMap.get(l.target);
              handleMouseEnter(e, `${src?.label} → ${tgt?.label}: ${formatVal(l.value)}`);
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {Array.from(positions.entries()).map(([id, pos]) => {
          const n = nodeMap.get(id)!;
          const isLeft = labelSide[id] !== 'right';
          const labelX = isLeft ? pos.x - 8 : pos.x + NODE_W + 8;
          const anchor = isLeft ? 'end' : 'start';
          const isHub = id === 'revenue';
          const isPool = id === 'pool';
          const isNet = id === 'net_income';
          const labelOnly = pos.h < LABEL_MIN_H;
          const activeNode = !hasActive || active.has(id);
          return (
            <g key={id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={NODE_W}
                height={pos.h}
                rx={4}
                fill={NODE_COLORS[id] || 'var(--text-tertiary)'}
                opacity={activeNode ? 1 : 0.22}
                style={{ transition: 'opacity 0.25s ease', cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  highlightFrom([id]);
                  handleMouseEnter(e, `${n.label}: ${formatVal(n.value)}`);
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              {isPool ? (
                <>
                  <text
                    x={pos.x + NODE_W / 2}
                    y={pos.y + pos.h + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={activeNode ? 'var(--text-secondary)' : 'var(--text-tertiary)'}
                    fontSize={10}
                    fontWeight={500}
                    opacity={hasActive && !activeNode ? 0.35 : 1}
                    style={{ transition: 'opacity 0.25s ease' }}
                  >
                    {n.label}
                  </text>
                  <text
                    x={pos.x + NODE_W / 2}
                    y={pos.y + pos.h + 24}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--text-tertiary)"
                    fontSize={9}
                    opacity={hasActive && !activeNode ? 0.3 : 1}
                    style={{ transition: 'opacity 0.25s ease' }}
                  >
                    {formatVal(n.value)}
                  </text>
                </>
              ) : (
                <>
                  <text
                    x={labelX}
                    y={pos.y + pos.h / 2 + (labelOnly ? 0 : -4)}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    fill={activeNode ? (isNet ? 'var(--text-primary)' : 'var(--text-secondary)') : 'var(--text-tertiary)'}
                    fontSize={isHub ? 11.5 : 10}
                    fontWeight={isNet || isHub ? 700 : 500}
                    opacity={hasActive && !activeNode ? 0.35 : 1}
                    style={{ transition: 'opacity 0.25s ease' }}
                  >
                    {n.label}
                  </text>
                  {!labelOnly && (
                    <text
                      x={labelX}
                      y={pos.y + pos.h / 2 + 5}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fill={isNet ? 'var(--text-secondary)' : 'var(--text-tertiary)'}
                      fontSize={9}
                      opacity={hasActive && !activeNode ? 0.3 : 1}
                      style={{ transition: 'opacity 0.25s ease' }}
                    >
                      {formatVal(n.value)}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
      {netNode && (
        <div className="cs-sankey-note">
          Tras todos los gastos, quedan <b>{formatVal(netNode.value)}</b> de beneficio neto.
        </div>
      )}
    </div>
  );
}
