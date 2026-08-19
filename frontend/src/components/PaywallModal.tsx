import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import '../styles/paywall.css';

interface Props {
  views: number;
  limit: number;
}

export function PaywallModal({ views, limit }: Props) {
  const navigate = useNavigate();

  return (
    <div className="pw-overlay">
      <div className="pw-modal">
        <div className="pw-icon-wrap">
          <Lock size={28} />
        </div>

        <h2 className="pw-title">Límite mensual alcanzado</h2>
        <p className="pw-subtitle">
          Has utilizado tus <strong>{limit}</strong> análisis de este mes ({views}/{limit}).
        </p>
        <p className="pw-hint">
          Actualiza tu plan para seguir analizando empresas con datos reales.
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
