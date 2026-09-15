import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface VariationPoint {
  year: number;
  quarter: number;
  periodLabel: string;
  periodEnd: string;
  roe: number | null;
  pbRatio: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roa: number | null;
  roic: number | null;
  totalDebt: number | null;
  quickRatio: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
}

export interface MetricConfig {
  key: keyof Omit<VariationPoint, 'year' | 'quarter' | 'periodLabel' | 'periodEnd'>;
  label: string;
  color: string;
  format: 'pct' | 'x' | 'currency';
}

interface Props {
  ticker: string;
  title: string;
  metrics: MetricConfig[];
}

function fmtValue(v: number | null, format: 'pct' | 'x' | 'currency'): string {
  if (v == null) return '—';
  if (format === 'pct') return `${(v * 100).toFixed(1)}%`;
  if (format === 'x') return `${v.toFixed(2)}x`;
  if (format === 'currency') {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return v.toLocaleString();
  }
  return String(v);
}

function TrendTooltip({ active, payload, metrics }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as VariationPoint | undefined;
  if (!row) return null;
  return (
    <div className="fund-variations-tooltip">
      <p className="fund-variations-tooltip-label">{row.periodLabel}</p>
      {metrics.map((m: MetricConfig) => (
        <p key={m.key} className="fund-variations-tooltip-row">
          <span className="fund-variations-tooltip-dot" style={{ background: m.color }} />
          {m.label}: <b>{fmtValue(row[m.key] as number | null, m.format)}</b>
        </p>
      ))}
    </div>
  );
}

export function MetricHistoryCard({ ticker, title, metrics }: Props) {
  const [data, setData] = useState<VariationPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/companies/${encodeURIComponent(ticker)}/metric-variations`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d.variations ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error de red');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [ticker]);

  const allRows = data ?? [];
  const annualRows = allRows.filter((p) => p.quarter === 0);
  const chartData = annualRows.map((p) => ({ ...p }));

  // Collect unique years for table columns, sorted ascending
  const years = [...new Set(annualRows.map((p) => p.year))].sort((a, b) => a - b);

  const hasAnyData = annualRows.some((row) =>
    metrics.some((m) => row[m.key] != null),
  );

  return (
    <div className="fund-variations">
      {loading && (
        <div className="fund-variations-state">
          <Loader2 size={16} className="fund-variations-spin" /> Cargando datos históricos...
        </div>
      )}

      {!loading && error && (
        <div className="fund-variations-state fund-variations-state--error">
          <AlertTriangle size={15} /> No se pudo cargar la evolución histórica.{' '}
          <button type="button" className="fund-variations-retry" onClick={load}>
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      {!loading && !error && !hasAnyData && (
        <div className="fund-variations-state">
          No hay suficientes datos históricos para mostrar {title.toLowerCase()}.
        </div>
      )}

      {!loading && !error && hasAnyData && (
        <>
          <div className="fund-variations-chart">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis
                  dataKey="periodLabel"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(v: number) =>
                    metrics[0]?.format === 'x' ? `${v.toFixed(1)}x` : `${v.toFixed(0)}%`
                  }
                />
                <Tooltip content={<TrendTooltip metrics={metrics} />} />
                {metrics.map((m) => (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    name={m.label}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="fund-variations-legend">
            {metrics.map((m) => (
              <span key={m.key} className="fund-variations-legend-item">
                <span className="fund-variations-legend-dot" style={{ background: m.color }} />
                {m.label}
              </span>
            ))}
          </div>

          <div className="fund-variations-table-wrap">
            <table className="fund-history-table">
              <thead>
                <tr>
                  <th className="fund-history-metric-col">Métrica</th>
                  {years.map((y) => (
                    <th key={y}>{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.key}>
                    <td className="fund-history-metric-col">{m.label}</td>
                    {years.map((y) => {
                      const row = annualRows.find((r) => r.year === y);
                      const val = row ? (row[m.key] as number | null) : null;
                      return <td key={y}>{fmtValue(val, m.format)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
