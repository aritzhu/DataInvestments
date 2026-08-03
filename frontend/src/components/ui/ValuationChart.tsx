import type { ValuationResult } from '../../utils/valuation';
import { fmtCurrency } from '../../utils/format';

interface Props {
  results: ValuationResult[];
  currentPrice: number;
  activeId: string;
  onSelect: (id: string) => void;
  currency?: string;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--blue-light)',
  medium: 'var(--amber)',
  low: 'var(--red)',
  na: 'var(--text-tertiary)',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  na: 'N/D',
};

export function ValuationChart({ results, currentPrice, activeId, onSelect, currency = 'USD' }: Props) {
  const valid = results.filter(r => r.fairValue != null && r.fairValue > 0);
  const maxVal = Math.max(...valid.map(r => r.fairValue!), currentPrice);

  return (
    <div className="vc-chart">
      {results.map((r) => {
        if (r.fairValue == null || r.fairValue <= 0) {
          return (
            <button key={r.id} className={`vc-row vc-row--na ${activeId === r.id ? 'vc-row--active' : ''}`} onClick={() => onSelect(r.id)}>
              <span className="vc-label">{r.name}</span>
              <div className="vc-track">
                <div className="vc-fill vc-fill--na" />
              </div>
              <span className="vc-value vc-value--na">N/D</span>
              <span className="vc-badge" style={{ background: CONFIDENCE_COLORS.na }}>{CONFIDENCE_LABELS.na}</span>
            </button>
          );
        }

        const widthPct = maxVal > 0 ? (r.fairValue / maxVal) * 100 : 0;
        const isActive = activeId === r.id;
        const isAbove = r.fairValue > currentPrice;
        const barColor = isAbove ? 'var(--blue-light)' : 'var(--red)';

        return (
          <button key={r.id} className={`vc-row ${isActive ? 'vc-row--active' : ''}`} onClick={() => onSelect(r.id)}>
            <span className="vc-label">{r.name}</span>
            <div className="vc-track">
              <div
                className={`vc-fill ${isActive ? 'vc-fill--active' : ''}`}
                style={{ width: `${widthPct}%`, background: barColor, opacity: isActive ? 1 : 0.7 }}
              />
            </div>
            <span className="vc-value">{fmtCurrency(r.fairValue, currency)}</span>
            <span className="vc-badge" style={{ background: CONFIDENCE_COLORS[r.confidence] }}>
              {CONFIDENCE_LABELS[r.confidence]}
            </span>
          </button>
        );
      })}

      {/* Price line */}
      <div className="vc-price-line" style={{ marginLeft: `${Math.min((currentPrice / maxVal) * 100, 98)}%` }}>
        <div className="vc-price-marker" />
        <span className="vc-price-label">Precio: {fmtCurrency(currentPrice, currency)}</span>
      </div>
    </div>
  );
}
