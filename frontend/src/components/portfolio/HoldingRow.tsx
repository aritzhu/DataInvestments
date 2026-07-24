import { Pencil, Trash2 } from 'lucide-react';
import type { PortfolioValuationHolding } from '../../types/portfolio';
import { getVerdict, VERDICT_COLORS, VERDICT_BG, VERDICT_BORDER } from '../../utils/valuation';

interface Props {
  holding: PortfolioValuationHolding;
  onEdit: () => void;
  onRemove: () => void;
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

export function HoldingRow({ holding, onEdit, onRemove }: Props) {
  const verdictInfo = getVerdict(holding.fairValue, holding.currentPrice ?? 0);

  return (
    <div className="pf-holding">
      <div className="pf-holding-body">
        <div className="pf-holding-header">
          <span className="pf-holding-ticker">{holding.ticker}</span>
          <span className="pf-holding-name">{holding.companyName}</span>
          <span
            className="pf-holding-verdict"
            style={{
              color: VERDICT_COLORS[verdictInfo.verdict],
              backgroundColor: VERDICT_BG[verdictInfo.verdict],
              borderColor: VERDICT_BORDER[verdictInfo.verdict],
            }}
          >
            {verdictInfo.label}
          </span>
        </div>

        <div className="pf-holding-metrics">
          <div className="pf-holding-metric">
            <span className="pf-holding-metric-label">Qty: </span>
            {holding.quantity}
          </div>
          <div className="pf-holding-metric">
            <span className="pf-holding-metric-label">Avg: </span>
            {fmt(holding.averageCost)}
          </div>
          <div className="pf-holding-metric">
            <span className="pf-holding-metric-label">Price: </span>
            {fmt(holding.currentPrice)}
          </div>
          <div className="pf-holding-metric">
            <span className="pf-holding-metric-label">P&L: </span>
            <span className={holding.pl != null && holding.pl >= 0 ? 'pf-holding-metric-positive' : 'pf-holding-metric-negative'}>
              {fmt(holding.pl)} ({fmtPct(holding.plPercent)})
            </span>
          </div>
          <div className="pf-holding-metric">
            <span className="pf-holding-metric-label">Fair Value: </span>
            {fmt(holding.fairValue)}
          </div>
          <div className="pf-holding-metric">
            <span className="pf-holding-metric-label">MOS: </span>
            <span className={holding.marginOfSafety != null && holding.marginOfSafety >= 0 ? 'pf-holding-metric-positive' : 'pf-holding-metric-negative'}>
              {fmtPct(holding.marginOfSafety)}
            </span>
          </div>
        </div>
      </div>

      <div className="pf-holding-actions">
        <button onClick={onEdit} className="pf-btn-icon pf-btn-icon--edit" title="Editar">
          <Pencil size={15} />
        </button>
        <button onClick={onRemove} className="pf-btn-icon pf-btn-icon--danger" title="Eliminar">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
