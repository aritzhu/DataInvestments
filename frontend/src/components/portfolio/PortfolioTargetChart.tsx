import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PortfolioHistory } from '../../types/portfolio';
import { ChartTooltip, ChartRangeChips, PALETTE, fmtDate, fmtMoney } from './chartShared';
import { InfoButton } from '../ui/InfoButton';
import { INFO } from '../../utils/infoContent';

interface Props {
  history: PortfolioHistory;
  months: number;
  onRangeChange: (months: number) => void;
  allocation: Array<{ ticker: string; value: number }>;
  excluded: ReadonlySet<string>;
}

export function PortfolioTargetChart({ history, months, onRangeChange, allocation, excluded }: Props) {
  const data = history.points.map((p) => {
    const h = p.holdings ?? null;
    if (h && h.length > 0) {
      const visible = h.filter((x) => !excluded.has(x.ticker));
      return {
        label: fmtDate(p.date),
        marketValue: visible.reduce((s, x) => s + x.marketValue, 0),
        targetValue: visible.reduce((s, x) => s + x.targetValue, 0),
      };
    }
    return { label: fmtDate(p.date), marketValue: p.marketValue, targetValue: p.targetValue };
  });
  const hasData = data.some((d) => d.marketValue > 0);
  const totalAlloc = allocation.reduce((s, a) => s + a.value, 0);

  return (
    <div className="pf-chart-card">
      <div className="pf-chart-header">
        <h3 className="pf-chart-title"><span className="info-label-row">Convergencia hacia el valor objetivo <InfoButton content={INFO['portfolio.convergence']} /></span></h3>
        <ChartRangeChips months={months} onRangeChange={onRangeChange} />
      </div>
      <div className="pf-chart-body">
        <div className="pf-chart-line">
          {!hasData ? (
            <p className="pf-bd-empty">Todas las posiciones están ocultas o aún no hay historial.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} minTickGap={48} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(v: number) => fmtMoney(v)}
                  width={70}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="targetValue" name="Valor objetivo" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="marketValue" name="Valor de mercado" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="pf-chart-donut">
          <h4 className="pf-chart-donut-title">Asignación actual</h4>
          {allocation.length === 0 ? (
            <p className="pf-bd-empty">Sin posiciones visibles.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="ticker" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none">
                    {allocation.map((entry, i) => (
                      <Cell key={entry.ticker} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [fmtMoney(Number(value)), name]} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="pf-chart-donut-legend">
                {allocation.map((a, i) => (
                  <li key={a.ticker}>
                    <span className="pf-chart-donut-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="pf-chart-donut-name">{a.ticker}</span>
                    <span className="pf-chart-donut-value">{fmtMoney(a.value)}</span>
                    <span className="pf-chart-donut-pct">{totalAlloc > 0 ? `${((a.value / totalAlloc) * 100).toFixed(0)}%` : ''}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
