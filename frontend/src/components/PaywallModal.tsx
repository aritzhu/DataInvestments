import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import '../styles/paywall.css';

type PaywallReason = 'views' | 'favorites' | 'portfolios';

interface Props {
  views: number;
  limit: number;
  reason?: PaywallReason;
  current?: number;
}

const REASON_CONFIG: Record<PaywallReason, { title: string; hint: string }> = {
  views: {
    title: 'Límite mensual de análisis alcanzado',
    hint: 'Actualiza tu plan para seguir analizando empresas con datos reales.',
  },
  favorites: {
    title: 'Límite de favoritos alcanzado',
    hint: 'Actualiza tu plan para añadir más empresas a tus favoritos.',
  },
  portfolios: {
    title: 'Límite de portfolios alcanzado',
    hint: 'Actualiza tu plan para crear más portfolios de inversión.',
  },
};

function reasonMessage(reason: PaywallReason, current: number, limit: number): string {
  const count = `${current}/${limit}`;
  switch (reason) {
    case 'views':
      return `Has utilizado tus ${limit} análisis de este mes (${count}).`;
    case 'favorites':
      return `Has alcanzado el límite de ${limit} favoritos (${count}).`;
    case 'portfolios':
      return `Has alcanzado el límite de ${limit} portfolios (${count}).`;
  }
}

export function PaywallModal({ views, limit, reason = 'views', current }: Props) {
  const navigate = useNavigate();
  const config = REASON_CONFIG[reason];
  const displayCurrent = current ?? views;

  return (
    <div className="pw-overlay">
      <div className="pw-modal">
        <div className="pw-icon-wrap">
          <Lock size={28} />
        </div>

        <h2 className="pw-title">{config.title}</h2>
        <p className="pw-subtitle">
          {reasonMessage(reason, displayCurrent, limit)}
        </p>
        <p className="pw-hint">
          {config.hint}
        </p>

        <div className="pw-actions">
          <button className="pw-btn pw-btn--primary" onClick={() => navigate('/plans')}>
            Ver planes
            <ArrowRight size={16} />
          </button>
          <p className="pw-reset-info">
            Tu límite se renueva el próximo mes.
          </p>
        </div>
      </div>
    </div>
  );
}
