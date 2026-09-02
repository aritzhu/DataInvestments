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
}

interface Props {
  ticker: string;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function fmtX(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}x`;
}

function TrendTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as VariationPoint | undefined;
  if (!row) return null;
  return (
    <div className="fund-variations-tooltip">
      <p className="fund-variations-tooltip-label">{row.periodLabel}</p>
      <p className="fund-variations-tooltip-row">
        <span className="fund-variations-tooltip-dot fund-variations-tooltip-dot--roe" />
        ROE: <b>{fmtPct(row.roe)}</b>
      </p>
      <p className="fund-variations-tooltip-row">
        <span className="fund-variations-tooltip-dot fund-variations-tooltip-dot--pb" />
        P/B: <b>{fmtX(row.pbRatio)}</b>
      </p>
    </div>
  );
}

export function MetricVariationsCard({ ticker }: Props) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const rows = data ?? [];
  const chartData = rows.map((p) => ({
    ...p,
    roePct: p.roe != null ? p.roe * 100 : null,
  }));

  return (
    <div className="fund-variations">
      {loading && (
        <div className="fund-variations-state">
          <Loader2 size={16} className="fund-variations-spin" /> Cargando evolución histórica...
        </div>
      )}

      {!loading && error && (
        <div className="fund-variations-state fund-variations-state--error">
          <AlertTriangle size={15} /> No se pudo cargar la evolución histórica. <button type="button" className="fund-variations-retry" onClick={load}><RefreshCw size={13} /> Reintentar</button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="fund-variations-state">
          No hay suficientes datos históricos para mostrar la evolución de ROE y P/B.
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="fund-variations-chart">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} interval="preserveStartEnd" />
                <YAxis yAxisId="roe" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <YAxis yAxisId="pb" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: number) => `${v.toFixed(1)}x`} />
                <Tooltip content={<TrendTooltip />} />
                <Line yAxisId="roe" type="monotone" dataKey="roePct" name="ROE" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="pb" type="monotone" dataKey="pbRatio" name="P/B" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="fund-variations-legend">
            <span className="fund-variations-legend-item"><span className="fund-variations-legend-dot fund-variations-legend-dot--roe" /> ROE (%)</span>
            <span className="fund-variations-legend-item"><span className="fund-variations-legend-dot fund-variations-legend-dot--pb" /> P/B (x)</span>
          </div>

          <div className="fund-variations-table-wrap">
            <table className="fund-variations-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>ROE</th>
                  <th>P/B</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={`${p.year}-${p.quarter}`}>
                    <td>{p.periodLabel}</td>
                    <td className="fund-variations-roe">{fmtPct(p.roe)}</td>
                    <td>{fmtX(p.pbRatio)}</td>
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
