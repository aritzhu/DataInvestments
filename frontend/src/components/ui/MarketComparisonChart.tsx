import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface MarketData {
  pe: number;
  pb: number;
  ps: number;
  evEbitda: number;
  fcfYield: number;
  sector: string;
  source: string;
  market?: {
    pe: number;
    pb: number;
    ps: number;
    evEbitda: number;
    fcfYield: number;
  };
}

interface Props {
  company: {
    pe: number | null;
    pb: number | null;
    ps: number | null;
    evEbitda: number | null;
    fcfYield: number | null;
  };
  market: MarketData;
  ticker: string;
}

interface MetricRow {
  key: string;
  label: string;
  unit: string;
  companyVal: number | null;
  sectorVal: number;
  marketVal: number;
  higherIsBetter: boolean;
  format: (v: number) => string;
}

function isOvervalued(companyVal: number, benchmark: number, higherIsBetter: boolean): boolean {
  if (higherIsBetter) return companyVal < benchmark;
  return companyVal > benchmark;
}

const SERIES = [
  { key: 'Sector', fill: 'var(--indigo)' },
  { key: 'Mercado', fill: 'var(--text-tertiary)' },
];

function MetricTooltip({ active, payload, format }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; dataKey?: string | number; fill?: string }>;
  format: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="mkt-tooltip">
      {payload.map((entry, i) => (
        <div key={i} className="mkt-tooltip-row">
          <span className="mkt-tooltip-dot" style={{ background: entry.fill }} />
          <span className="mkt-tooltip-name">{entry.name}</span>
          <span className="mkt-tooltip-value">{entry.value != null ? format(entry.value) : 'N/D'}</span>
        </div>
      ))}
    </div>
  );
}

export function MarketComparisonChart({ company, market, ticker }: Props) {
  const fmtX = (v: number) => `${v.toFixed(1)}x`;
  const fmtPct = (v: number) => `${v.toFixed(1)}%`;
  const mkt = market.market ?? market;

  const metrics: MetricRow[] = [
    { key: 'pe', label: 'P/E', unit: 'x', companyVal: company.pe, sectorVal: market.pe, marketVal: mkt.pe, higherIsBetter: false, format: fmtX },
    { key: 'pb', label: 'P/B', unit: 'x', companyVal: company.pb, sectorVal: market.pb, marketVal: mkt.pb, higherIsBetter: false, format: fmtX },
    { key: 'ps', label: 'P/S', unit: 'x', companyVal: company.ps, sectorVal: market.ps, marketVal: mkt.ps, higherIsBetter: false, format: fmtX },
    { key: 'evEbitda', label: 'EV/EBITDA', unit: 'x', companyVal: company.evEbitda, sectorVal: market.evEbitda, marketVal: mkt.evEbitda, higherIsBetter: false, format: fmtX },
    { key: 'fcfYield', label: 'FCF Yield', unit: '%', companyVal: company.fcfYield, sectorVal: market.fcfYield, marketVal: mkt.fcfYield, higherIsBetter: true, format: fmtPct },
  ];

  const validMetrics = metrics.filter(m => m.companyVal != null && m.companyVal > 0);
  if (validMetrics.length === 0) return null;

  return (
    <div className="mkt-wrap">
      <div className="mkt-legend">
        <span className="mkt-legend-item">
          <span className="mkt-legend-dot mkt-legend-dot--company-good" />
          {ticker} <em>(verde = infravalorada, rojo = sobrevalorada)</em>
        </span>
        {SERIES.map((s) => (
          <span key={s.key} className="mkt-legend-item">
            <span className="mkt-legend-dot" style={{ background: s.fill }} />
            {s.key}
          </span>
        ))}
      </div>

      <div className="mkt-grid">
        {validMetrics.map((m) => {
          const overValued = isOvervalued(m.companyVal!, m.marketVal, m.higherIsBetter);
          const companyFill = overValued ? 'var(--red)' : 'var(--teal)';
          const data = [{ name: m.label, Empresa: m.companyVal, Sector: m.sectorVal, Mercado: m.marketVal }];

          return (
            <div key={m.key} className="mkt-cell">
              <div className="mkt-cell-title">
                {m.label}
                <span className="mkt-cell-unit">{m.unit}</span>
              </div>
              <div className="mkt-cell-chart">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid vertical={false} stroke="var(--border-light)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide domain={[0, 'dataMax']} />
                    <Tooltip
                      cursor={{ fill: 'var(--surface-1)', opacity: 0.5 }}
                      content={<MetricTooltip format={m.format} />}
                    />
                    <Bar dataKey="Empresa" fill={companyFill} maxBarSize={34}>
                      <LabelList dataKey="Empresa" position="top" fill="var(--text-primary)" fontSize={11} fontWeight={700} formatter={(v: unknown) => (typeof v === 'number' ? m.format(v) : 'N/D')} />
                    </Bar>
                    <Bar dataKey="Sector" fill="var(--indigo)" maxBarSize={34} radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="Sector" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(v: unknown) => (typeof v === 'number' ? m.format(v) : 'N/D')} />
                    </Bar>
                    <Bar dataKey="Mercado" fill="var(--text-tertiary)" maxBarSize={34} radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="Mercado" position="top" fill="var(--text-secondary)" fontSize={11} formatter={(v: unknown) => (typeof v === 'number' ? m.format(v) : 'N/D')} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
