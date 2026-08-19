import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/usage-indicator.css';

export function UsageIndicator() {
  const { user, usage } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role === 'admin' || user.subscriptionTier === 'premium' || !usage) return null;

  const views = usage.views;
  const limit = usage.limit;
  const remaining = usage.remaining;

  const isWarning = remaining === 1;
  const isExhausted = remaining === 0;

  const label = remaining === -1
    ? `${views}/∞`
    : `${views}/${limit}`;

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const infoText = remaining === 0
    ? `renueva en ${daysUntilReset} días`
    : null;

  return (
    <div className="usage-indicator-wrap">
      <button
        className={`usage-indicator ${isWarning ? 'usage-indicator--warning' : ''} ${isExhausted ? 'usage-indicator--exhausted' : ''}`}
        onClick={() => navigate('/plans')}
        title={`${remaining === -1 ? 'Ilimitado' : `${remaining} análisis restantes este mes`}`}
      >
        <BarChart3 size={14} />
        <span>{label}</span>
      </button>
      {infoText && <span className="usage-indicator-info">{infoText}</span>}
    </div>
  );
}
