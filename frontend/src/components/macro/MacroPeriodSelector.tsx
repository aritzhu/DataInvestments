import type { MacroPeriod } from '../../services/macroService';

const PERIODS: Array<{ value: MacroPeriod; label: string }> = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1S' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1A' },
  { value: '5y', label: '5A' },
];

interface Props {
  value: MacroPeriod;
  onChange: (period: MacroPeriod) => void;
  disabled?: boolean;
}

export function MacroPeriodSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="macro-periods" role="group" aria-label="Periodo de los índices">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          className={`macro-period ${value === period.value ? 'macro-period--active' : ''}`}
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
          disabled={disabled}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
