import { TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { MacroIndex, MacroPeriod, MacroPoint } from '../../services/macroService';

interface Props {
  index: MacroIndex;
  period: MacroPeriod;
}

function formatValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(t: number, period: MacroPeriod): string {
  const date = new Date(t);
  if (period === '1d' || period === '1w') {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (period === '5y') {
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  }
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function MacroTooltip({
  active,
  payload,
  period,
}: {
  active?: boolean;
  payload?: Array<{ payload?: MacroPoint }>;
  period: MacroPeriod;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="macro-tooltip">
      <span>{formatDate(point.t, period)}</span>
      <strong>{formatValue(point.c)}</strong>
    </div>
  );
}

export function MacroIndexCard({ index, period }: Props) {
  const changePercent = index.changePercent;
  const changeValue =
    changePercent != null && Number.isFinite(changePercent) ? changePercent : null;
  const up = changeValue != null && changeValue >= 0;
  const lineColor = changeValue == null ? 'var(--text-tertiary)' : up ? 'var(--blue-light)' : 'var(--red)';
  const gradientId = `macro-grad-${index.symbol.replace(/[^a-zA-Z0-9]/g, '')}`;
  const changeLabel = period === '1d' ? 'Var. diaria' : 'Var. periodo';

  return (
    <article className={`macro-card ${!index.available ? 'macro-card--unavailable' : ''}`}>
      <div className="macro-card-top">
        <div className="macro-card-heading">
          <h3 className="macro-card-name">{index.name}</h3>
          <span className="macro-card-symbol">
            {index.symbol} · {index.country}
          </span>
        </div>
        <div className="macro-card-change-wrap">
          <span className={`macro-card-change ${changeValue != null ? (up ? 'is-up' : 'is-down') : ''}`}>
            {changeValue != null ? (
              <>
                {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {up ? '+' : ''}
                {changeValue.toFixed(2)}%
              </>
            ) : (
              '—'
            )}
          </span>
          <span className="macro-card-change-label">{changeLabel}</span>
        </div>
      </div>

      <div className="macro-card-value num">
        {formatValue(index.price)}
        <span className="macro-card-unit">pts</span>
      </div>

      <div className="macro-card-chart">
        {index.available && index.points.length > 1 ? (
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={index.points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<MacroTooltip period={period} />} />
              <Area
                type="monotone"
                dataKey="c"
                stroke={lineColor}
                strokeWidth={1.8}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <span className="macro-card-empty">Sin datos disponibles</span>
        )}
      </div>

      <div className="macro-card-foot">
        <span>Máx. {formatValue(index.high)}</span>
        <span>Mín. {formatValue(index.low)}</span>
      </div>
    </article>
  );
}
