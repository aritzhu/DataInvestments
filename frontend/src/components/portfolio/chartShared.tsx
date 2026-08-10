export const RANGES = [6, 12, 24];

export const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#84cc16', '#f43f5e'];

export const fmtMoney = (n: number | null) => {
  if (n == null) return 'N/D';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

export const fmtDate = (iso: string) => {
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00Z'));
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  marketKey?: string;
  targetKey?: string;
}

export function ChartTooltip({ active, payload, label, marketKey = 'marketValue', targetKey = 'targetValue' }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const tv = payload.find((p: any) => p.dataKey === targetKey)?.value as number | undefined;
  const mv = payload.find((p: any) => p.dataKey === marketKey)?.value as number | undefined;
  const gap = tv != null && mv != null && mv > 0 ? (tv - mv) / mv : null;
  const reached = gap != null && Math.abs(gap) <= 0.03;
  return (
    <div className="pf-chart-tooltip">
      <p className="pf-chart-tooltip-date">{label}</p>
      <p className="pf-chart-tooltip-row"><span className="pf-chart-tooltip-dot pf-chart-tooltip-dot--target" />Objetivo: <b>{fmtMoney(tv ?? null)}</b></p>
      <p className="pf-chart-tooltip-row"><span className="pf-chart-tooltip-dot pf-chart-tooltip-dot--market" />Mercado: <b>{fmtMoney(mv ?? null)}</b></p>
      <p className="pf-chart-tooltip-row">Gap: <b className={gap != null && gap >= 0 ? 'pf-chart-tooltip-positive' : 'pf-chart-tooltip-negative'}>
        {gap != null ? `${(gap * 100).toFixed(1)}%` : 'N/D'}
      </b></p>
      {reached && <p className="pf-chart-tooltip-note">La cartera ha alcanzado su valor objetivo.</p>}
    </div>
  );
}

interface RangeChipsProps {
  months: number;
  onRangeChange: (months: number) => void;
}

export function ChartRangeChips({ months, onRangeChange }: RangeChipsProps) {
  return (
    <div className="pf-chart-ranges">
      {RANGES.map((r) => (
        <button
          key={r}
          className={`pf-chart-range ${r === months ? 'pf-chart-range--active' : ''}`}
          onClick={() => onRangeChange(r)}
        >
          {r}m
        </button>
      ))}
    </div>
  );
}
