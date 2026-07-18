import { SectionReveal } from './SectionReveal';

export interface MarketData {
  pe: number;
  pb: number;
  ps: number;
  evEbitda: number;
  fcfYield: number;
  sector: string;
  source: string;
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
  companyVal: number | null;
  sectorVal: number;
  marketVal: number;
  higherIsBetter: boolean;
  format: (v: number) => string;
}

function isOvervalued(companyVal: number, benchmark: number, higherIsBetter: boolean): boolean {
  if (higherIsBetter) return companyVal > benchmark;
  return companyVal < benchmark;
}

export function MarketComparisonChart({ company, market, ticker }: Props) {
  const fmt2 = (v: number) => v.toFixed(1) + 'x';
  const fmtPct = (v: number) => v.toFixed(1) + '%';

  const metrics: MetricRow[] = [
    { key: 'pe', label: 'P/E', companyVal: company.pe, sectorVal: market.pe, marketVal: market.pe, higherIsBetter: false, format: fmt2 },
    { key: 'pb', label: 'P/B', companyVal: company.pb, sectorVal: market.pb, marketVal: market.pb, higherIsBetter: false, format: fmt2 },
    { key: 'ps', label: 'P/S', companyVal: company.ps, sectorVal: market.ps, marketVal: market.ps, higherIsBetter: false, format: fmt2 },
    { key: 'evEbitda', label: 'EV/EBITDA', companyVal: company.evEbitda, sectorVal: market.evEbitda, marketVal: market.evEbitda, higherIsBetter: false, format: fmt2 },
    { key: 'fcfYield', label: 'FCF Yield', companyVal: company.fcfYield, sectorVal: market.fcfYield, marketVal: market.fcfYield, higherIsBetter: true, format: fmtPct },
  ];

  const validMetrics = metrics.filter(m => m.companyVal != null && m.companyVal > 0);
  if (validMetrics.length === 0) return null;

  // Find max value for scaling (exclude FCF Yield which is %)
  const barMetrics = validMetrics.filter(m => m.key !== 'fcfYield');
  const maxVal = Math.max(
    ...barMetrics.map(m => Math.max(m.companyVal!, m.sectorVal, m.marketVal)),
    1
  );

  return (
    <SectionReveal delay={0}>
      <div className="mkt-chart">
        {validMetrics.map((m) => {
          const isNA = m.companyVal == null || m.companyVal <= 0;
          const scale = m.key === 'fcfYield' ? 100 / Math.max(m.sectorVal, m.marketVal, m.companyVal || 0, 1) : 100 / maxVal;
          const companyW = isNA ? 0 : m.companyVal! * scale;
          const sectorW = m.sectorVal * scale;
          const marketW = m.marketVal * scale;
          const overValued = !isNA && isOvervalued(m.companyVal!, m.marketVal, m.higherIsBetter);

          return (
            <div key={m.key} className="mkt-row">
              <div className="mkt-row-label">{m.label}</div>
              <div className="mkt-bars">
                {/* Company bar */}
                <div className="mkt-bar-group">
                  <span className="mkt-bar-label">{ticker}</span>
                  <div className="mkt-bar-track">
                    <div
                      className={`mkt-bar mkt-bar--company ${!isNA ? (overValued ? 'mkt-bar--red' : 'mkt-bar--green') : ''}`}
                      style={{ width: `${Math.min(companyW, 100)}%` }}
                    />
                  </div>
                  <span className="mkt-bar-value">{isNA ? 'N/D' : m.format(m.companyVal!)}</span>
                </div>
                {/* Sector bar */}
                <div className="mkt-bar-group">
                  <span className="mkt-bar-label">Sector</span>
                  <div className="mkt-bar-track">
                    <div
                      className="mkt-bar mkt-bar--sector"
                      style={{ width: `${Math.min(sectorW, 100)}%` }}
                    />
                  </div>
                  <span className="mkt-bar-value">{m.format(m.sectorVal)}</span>
                </div>
                {/* Market bar */}
                <div className="mkt-bar-group">
                  <span className="mkt-bar-label">Mercado</span>
                  <div className="mkt-bar-track">
                    <div
                      className="mkt-bar mkt-bar--market"
                      style={{ width: `${Math.min(marketW, 100)}%` }}
                    />
                  </div>
                  <span className="mkt-bar-value">{m.format(m.marketVal)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionReveal>
  );
}
