import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PortfolioHistory, PortfolioValuationHolding } from '../../types/portfolio';
import { ChartRangeChips, PALETTE, fmtDate, fmtMoney } from './chartShared';
import { InfoButton } from '../ui/InfoButton';
import { INFO } from '../../utils/infoContent';

interface Props {
  history: PortfolioHistory;
  holdings: PortfolioValuationHolding[];
  excluded: ReadonlySet<string>;
  months: number;
  onRangeChange: (months: number) => void;
}

const pctFmt = (v: number | null) => {
  if (v == null) return 'N/D';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
};

export function PortfolioPriceChart({ history, holdings, excluded, months, onRangeChange }: Props) {
  const [relative, setRelative] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const qtyMap = useMemo(() => new Map(holdings.map((h) => [h.ticker, h.quantity])), [holdings]);
  const tickers = useMemo(
    () => holdings.filter((h) => !excluded.has(h.ticker)).map((h) => h.ticker),
    [holdings, excluded],
  );
  const colorOf = (ticker: string) => PALETTE[(tickers.indexOf(ticker) + 1) % PALETTE.length];

  const data = useMemo(() => {
    const rows = history.points.map((p) => {
      const row: Record<string, any> = { label: fmtDate(p.date) };
      for (const t of tickers) {
        const h = (p.holdings ?? []).find((x) => x.ticker === t);
        const qty = qtyMap.get(t);
        row[t] = h ? (h.price ?? (qty ? h.marketValue / qty : null)) : null;
      }
      return row;
    });
    if (relative) {
      const base = new Map<string, number>();
      for (const t of tickers) {
        for (const r of rows) {
          if (r[t] != null && r[t] > 0) {
            base.set(t, r[t]);
            break;
          }
        }
      }
      for (const r of rows) {
        for (const t of tickers) {
          const b = base.get(t);
          r[t] = b ? ((r[t] / b - 1) * 100) : null;
        }
      }
    }
    return rows;
  }, [history, tickers, relative, qtyMap]);

  const visibleTickers = tickers.filter((t) => !hidden.has(t));
  const hasData = data.some((r) => visibleTickers.some((t) => r[t] != null));

  const toggleTicker = (t: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  function PriceTooltip({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="pf-chart-tooltip">
        <p className="pf-chart-tooltip-date">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="pf-chart-tooltip-row">
            <span className="pf-chart-tooltip-dot" style={{ background: colorOf(p.dataKey) }} />
            {p.dataKey}: <b>{relative ? pctFmt(p.value) : fmtMoney(p.value)}</b>
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="pf-chart-card">
      <div className="pf-chart-header">
        <h3 className="pf-chart-title"><span className="info-label-row">Evolución de precios <InfoButton content={INFO['portfolio.priceChart']} /></span></h3>
        <div className="pf-chart-actions">
          <button className={`pf-chart-range ${relative ? 'pf-chart-range--active' : ''}`} onClick={() => setRelative((v) => !v)}>
            {relative ? 'Relativo %' : 'Precio real'}
          </button>
          <ChartRangeChips months={months} onRangeChange={onRangeChange} />
        </div>
      </div>
      {tickers.length > 0 && (
        <div className="pf-chart-chips">
          {tickers.map((t) => (
            <button
              key={t}
              className={`pf-chart-chip ${hidden.has(t) ? 'pf-chart-chip--hidden' : ''}`}
              onClick={() => toggleTicker(t)}
            >
              <span className="pf-chart-chip-dot" style={{ background: colorOf(t) }} />
              {t}
            </button>
          ))}
        </div>
      )}
      {!hasData ? (
        <p className="pf-bd-empty">Sin posiciones visibles o sin historial de precios.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} minTickGap={48} />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              tickFormatter={(v: number) => (relative ? pctFmt(v) : fmtMoney(v))}
              width={70}
            />
            <Tooltip content={<PriceTooltip />} />
            {visibleTickers.map((t) => (
              <Line key={t} type="monotone" dataKey={t} name={t} stroke={colorOf(t)} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
