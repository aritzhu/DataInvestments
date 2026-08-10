import type { PortfolioValuation } from '../../types/portfolio';

interface Props {
  valuation: PortfolioValuation;
}

interface BarDatum {
  name: string;
  value: number;
  count?: number;
}

const PALETTE = ['#10b981', '#6366f1', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#e11d48', '#64748b'];

const fmtMoney = (n: number) => {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

function BarList({ items, total, suffix }: { items: BarDatum[]; total: number; suffix?: (d: BarDatum) => string }) {
  if (items.length === 0) {
    return <p className="pf-bd-empty">Sin datos</p>;
  }
  return (
    <div className="pf-bd-bars">
      {items.map((d, i) => {
        const pct = total > 0 ? d.value / total : 0;
        return (
          <div key={d.name} className="pf-bd-row">
            <span className="pf-bd-label" title={d.name}>{d.name}</span>
            <div className="pf-bd-track">
              <div
                className="pf-bd-fill"
                style={{ width: `${Math.max(1, pct * 100)}%`, background: PALETTE[i % PALETTE.length] }}
              />
            </div>
            <span className="pf-bd-value">{fmtMoney(d.value)}</span>
            <span className="pf-bd-pct">
              {fmtPct(pct)}
              {suffix ? ` · ${suffix(d)}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PortfolioBreakdown({ valuation }: Props) {
  const { stats, summary } = valuation;
  return (
    <div className="pf-bd-grid">
      <section className="pf-bd-card">
        <h3 className="pf-bd-title">Sectores</h3>
        <BarList
          items={stats.bySector.map((s) => ({ name: s.name, value: s.value, count: s.count }))}
          total={summary.totalValue}
          suffix={(d) => `${d.count ?? 0} ${(d.count ?? 0) === 1 ? 'empresa' : 'empresas'}`}
        />
      </section>
      <section className="pf-bd-card">
        <h3 className="pf-bd-title">Países</h3>
        <BarList items={stats.byCountry} total={summary.totalValue} />
      </section>
      {stats.bySegment.length > 0 && (
        <section className="pf-bd-card">
          <h3 className="pf-bd-title">Segmentos de negocio</h3>
          <BarList items={stats.bySegment} total={summary.totalValue} />
        </section>
      )}
      {stats.byGeography.length > 0 && (
        <section className="pf-bd-card">
          <h3 className="pf-bd-title">Ingresos por país</h3>
          <BarList items={stats.byGeography} total={summary.totalValue} />
        </section>
      )}
    </div>
  );
}
