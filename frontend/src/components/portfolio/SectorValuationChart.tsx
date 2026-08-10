import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PortfolioHistory, PortfolioValuationHolding } from '../../types/portfolio';
import { ChartRangeChips, ChartTooltip, fmtDate, fmtMoney } from './chartShared';

interface Props {
  history: PortfolioHistory;
  holdings: PortfolioValuationHolding[];
  excluded: ReadonlySet<string>;
  months: number;
  onRangeChange: (months: number) => void;
}

export function SectorValuationChart({ history, holdings, excluded, months, onRangeChange }: Props) {
  const { sectorOf, sectors } = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of holdings) {
      if (excluded.has(h.ticker)) continue;
      map.set(h.ticker, h.sector ?? 'Sin sector');
    }
    return { sectorOf: map, sectors: [...new Set(map.values())].sort() };
  }, [holdings, excluded]);

  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected((prev) => (prev && sectors.includes(prev) ? prev : sectors[0] ?? null));
  }, [sectors]);

  const data = useMemo(
    () =>
      history.points.map((p) => {
        const row: Record<string, any> = { label: fmtDate(p.date) };
        const acc = new Map<string, { mkt: number; tgt: number }>();
        for (const h of p.holdings ?? []) {
          const s = sectorOf.get(h.ticker);
          if (!s) continue;
          const cur = acc.get(s) ?? { mkt: 0, tgt: 0 };
          cur.mkt += h.marketValue;
          cur.tgt += h.targetValue;
          acc.set(s, cur);
        }
        for (const s of sectors) {
          const v = acc.get(s);
          row[`${s}__mkt`] = v ? v.mkt : 0;
          row[`${s}__tgt`] = v ? v.tgt : 0;
        }
        return row;
      }),
    [history, sectorOf, sectors],
  );

  const selectedMkt = selected ? `${selected}__mkt` : '';
  const selectedTgt = selected ? `${selected}__tgt` : '';
  const hasData = selected != null && data.some((r) => (r[selectedMkt] ?? 0) > 0);

  return (
    <div className="pf-chart-card">
      <div className="pf-chart-header">
        <h3 className="pf-chart-title">Valoración por sector</h3>
        <ChartRangeChips months={months} onRangeChange={onRangeChange} />
      </div>
      {sectors.length > 0 && (
        <div className="pf-chart-chips">
          {sectors.map((s) => (
            <button
              key={s}
              className={`pf-chart-chip ${selected === s ? 'pf-chart-chip--active' : ''}`}
              onClick={() => setSelected(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {!hasData || selected == null ? (
        <p className="pf-bd-empty">Sin posiciones visibles en este sector o sin historial.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} minTickGap={48} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: number) => fmtMoney(v)} width={70} />
            <Tooltip content={<ChartTooltip marketKey={selectedMkt} targetKey={selectedTgt} />} />
            <Line type="monotone" dataKey={selectedTgt} name="Valor objetivo" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={selectedMkt} name="Valor de mercado" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
