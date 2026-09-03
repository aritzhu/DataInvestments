import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtCurrency } from '../../utils/format';

interface Props {
  baseFCF: number;
  shares: number;
  growthRate: number;
  discountRate: number;
  horizonYears: number;
  commodityPrice: number;
  commodityName: string;
  commodityCurrency: string;
  currency: string;
  optimisticPct: number;
  pessimisticPct: number;
  cogs: number;
  pctMP: number;
  taxRate: number;
}

interface ScenarioData {
  base: number;
  optimistic: number;
  pessimistic: number;
}

function computeScenarioFairValue(
  baseFCF: number,
  shares: number,
  g: number,
  r: number,
  horizon: number,
  cogs: number,
  pctMP: number,
  taxRate: number,
  delta: number,
): number {
  const deltaCOGS = cogs * pctMP * delta;
  const deltaFCF = -deltaCOGS * (1 - taxRate);
  const fcfScenario = baseFCF + deltaFCF;
  const tg = 0.03;
  let totalPV = 0;
  for (let i = 1; i <= horizon; i++) {
    totalPV += (fcfScenario * Math.pow(1 + g, i)) / Math.pow(1 + r, i);
  }
  const terminalValue = (fcfScenario * Math.pow(1 + g, horizon) * (1 + tg)) / (r - tg);
  const terminalPV = terminalValue / Math.pow(1 + r, horizon);
  return (totalPV + terminalPV) / shares;
}

function ScenarioTooltip({ active, payload, label, fmt }: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string; name?: string }>;
  label?: string;
  fmt: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="vodc-tooltip">
      <p className="vodc-tooltip-label">Año {label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="vodc-tooltip-row">
          <span className="vodc-tooltip-dot" style={{ background: entry.color }} />
          {entry.name}: <b>{entry.value != null ? fmt(entry.value) : 'N/D'}</b>
        </p>
      ))}
    </div>
  );
}

export function CommoditySensitivityChart({
  baseFCF,
  shares,
  growthRate,
  discountRate,
  horizonYears,
  commodityPrice,
  commodityName,
  commodityCurrency,
  currency,
  optimisticPct,
  pessimisticPct,
  cogs,
  pctMP,
  taxRate,
}: Props) {
  const g = growthRate / 100;
  const r = discountRate / 100;

  const optimisticPrice = commodityPrice * (1 + optimisticPct / 100);
  const pessimisticPrice = commodityPrice * (1 - pessimisticPct / 100);
  const deltaOptimistic = commodityPrice > 0 ? (optimisticPrice - commodityPrice) / commodityPrice : optimisticPct / 100;
  const deltaPessimistic = commodityPrice > 0 ? (pessimisticPrice - commodityPrice) / commodityPrice : -pessimisticPct / 100;

  const data = useMemo<ScenarioData[]>(() => {
    if (!baseFCF || shares <= 0 || cogs <= 0) return [];
    const rows: ScenarioData[] = [];
    for (let year = 0; year <= horizonYears; year++) {
      rows.push({
        base: computeScenarioFairValue(baseFCF, shares, g, r, year, cogs, pctMP, taxRate, 0),
        optimistic: computeScenarioFairValue(baseFCF, shares, g, r, year, cogs, pctMP, taxRate, deltaOptimistic),
        pessimistic: computeScenarioFairValue(baseFCF, shares, g, r, year, cogs, pctMP, taxRate, deltaPessimistic),
      });
    }
    return rows;
  }, [baseFCF, shares, g, r, horizonYears, cogs, pctMP, taxRate, deltaOptimistic, deltaPessimistic]);

  if (!baseFCF || shares <= 0 || cogs <= 0 || data.length === 0) {
    return null;
  }

  const chartData = data.map((row, idx) => ({
    label: idx,
    base: Math.round(row.base * 100) / 100,
    optimistic: Math.round(row.optimistic * 100) / 100,
    pessimistic: Math.round(row.pessimistic * 100) / 100,
  }));

  const fmt = (v: number) => fmtCurrency(v, currency);

  return (
    <div className="vodc-wrap">
      <div className="vodc-header">
        <span className="vodc-title">
          Sensibilidad al precio de {commodityName}
        </span>
        {commodityPrice > 0 && (
          <span className="vodc-current">
            Precio actual: {fmtCurrency(commodityPrice, commodityCurrency || currency)}
          </span>
        )}
      </div>
      <div className="vodc-legend">
        <span className="vodc-legend-item"><span className="vodc-legend-dot" style={{ background: '#059669' }} />Optimista (+{optimisticPct}%)</span>
        <span className="vodc-legend-item"><span className="vodc-legend-dot" style={{ background: '#6366f1' }} />Base</span>
        <span className="vodc-legend-item"><span className="vodc-legend-dot" style={{ background: '#dc2626' }} />Pesimista (−{pessimisticPct}%)</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            tickFormatter={(v: number) => `Año ${v}`}
            minTickGap={40}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            tickFormatter={(v: number) => fmtCurrency(v, currency)}
            width={78}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ScenarioTooltip fmt={fmt} />} />
          <Line type="monotone" dataKey="optimistic" name="Optimista" stroke="#059669" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="base" name="Base" stroke="#6366f1" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pessimistic" name="Pesimista" stroke="#dc2626" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
