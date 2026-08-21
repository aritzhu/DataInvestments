import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/plans.css';

const PLAN_LABELS: Record<string, string> = {
  pro: 'Plan Pro',
  premium: 'Plan Premium',
};

export function CheckoutResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUserTier } = useAuth();
  const status = searchParams.get('status');
  const [syncing, setSyncing] = useState(status === 'success');
  const [finalTier, setFinalTier] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'success') return;

    let cancelled = false;
    const token = localStorage.getItem('token');

    const poll = async (attempt: number): Promise<void> => {
      try {
        const res = await fetch('/api/subscription/plan-info', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tier && data.tier !== 'free') {
            if (!cancelled) {
              updateUserTier(data.tier);
              setFinalTier(data.tier);
              setSyncing(false);
            }
            return;
          }
        }
      } catch {
        // retry
      }
      if (attempt < 6 && !cancelled) {
        setTimeout(() => void poll(attempt + 1), 1500);
      } else if (!cancelled) {
        setSyncing(false);
      }
    };

    void poll(0);
    return () => { cancelled = true; };
  }, [status, updateUserTier]);

  if (status === 'cancel') {
    return (
      <div className="checkout-result-page">
        <div className="checkout-result-card">
          <div className="checkout-result-icon-wrap checkout-result-icon-wrap--error">
            <XCircle size={40} />
          </div>
          <h1 className="checkout-result-title">Pago cancelado</h1>
          <p className="checkout-result-text">
            No se ha realizado ningún cargo. Cuando quieras puedes volver a intentarlo.
          </p>
          <div className="checkout-result-actions">
            <button className="plan-btn plan-btn--primary" onClick={() => navigate('/plans')}>
              Ver los planes
            </button>
            <button className="plan-btn plan-btn--outline" onClick={() => navigate('/')}>
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="checkout-result-page">
        <div className="checkout-result-card">
          <div className="checkout-result-icon-wrap checkout-result-icon-wrap--pending">
            <Loader2 size={40} className="animate-spin" />
          </div>
          <h1 className="checkout-result-title">Confirmando tu pago...</h1>
          <p className="checkout-result-text">
            Estamos activando tu suscripción. Esto solo tarda unos segundos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-result-page">
      <div className="checkout-result-card">
        <div className="checkout-result-icon-wrap checkout-result-icon-wrap--success">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="checkout-result-title">
          {finalTier ? '¡Suscripción activada!' : 'Pago recibido'}
        </h1>
        {finalTier && (
          <div style={{ marginBottom: '0.75rem' }}>
            <span className="checkout-result-plan-pill">
              <Sparkles size={14} />
              {PLAN_LABELS[finalTier] ?? finalTier}
            </span>
          </div>
        )}
        <p className="checkout-result-text">
          {finalTier
            ? 'Ya tienes acceso a todas las ventajas de tu nuevo plan.'
            : 'Hemos recibido tu pago. La activación puede tardar unos instantes; si tu plan no aparece aún, recarga la página.'}
        </p>
        <p className="checkout-result-renewal">Renovación mensual automática · cancela cuando quieras</p>
        <div className="checkout-result-actions">
          <button className="plan-btn plan-btn--primary" onClick={() => navigate('/')}>
            Ir al inicio
          </button>
          <button className="plan-btn plan-btn--outline" onClick={() => navigate('/plans')}>
            Gestionar suscripción
          </button>
        </div>
      </div>
    </div>
  );
}
