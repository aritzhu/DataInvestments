import type { PortfolioValuation } from '../../types/portfolio';

interface Props {
  valuation: PortfolioValuation;
}

const fmt = (n: number | null) => {
  if (n == null) return 'N/D';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const fmtPct = (n: number | null) => {
  if (n == null) return 'N/D';
  const v = (n * 100).toFixed(1);
  return `${n >= 0 ? '+' : ''}${v}%`;
};

export function PortfolioSummary({ valuation }: Props) {
  const { summary } = valuation;
  const isPositive = summary.totalPL >= 0;

  return (
    <div className="pf-summary-grid">
      <div className="pf-summary-card">
        <p className="pf-summary-label">Invertido</p>
        <p className="pf-summary-value">{fmt(summary.totalInvested)}</p>
      </div>
      <div className="pf-summary-card">
        <p className="pf-summary-label">Valor Actual</p>
        <p className="pf-summary-value">{fmt(summary.totalValue)}</p>
      </div>
      <div className="pf-summary-card">
        <p className="pf-summary-label">P&L Total</p>
        <p className={`pf-summary-value ${isPositive ? 'pf-summary-value--positive' : 'pf-summary-value--negative'}`}>
          {fmt(summary.totalPL)}
        </p>
      </div>
      <div className="pf-summary-card">
        <p className="pf-summary-label">Rentabilidad</p>
        <p className={`pf-summary-value ${isPositive ? 'pf-summary-value--positive' : 'pf-summary-value--negative'}`}>
          {fmtPct(summary.totalPLPercent)}
        </p>
      </div>
    </div>
  );
}
