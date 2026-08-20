import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, BarChart3, Heart, Briefcase, Download, GitCompare, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/plans.css';

interface PlanFeature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  premium: string | boolean;
}

interface PlanData {
  slug: string;
  name: string;
  priceMonthly: number;
  companyViews: number;
  favorites: number;
  portfolios: number;
  screening: boolean;
  compare: boolean;
  exportData: boolean;
}

function formatLimit(val: number): string {
  return val === -1 ? 'Ilimitados' : String(val);
}

function buildFeatures(plans: PlanData[]): PlanFeature[] {
  const bySlug = Object.fromEntries(plans.map((p) => [p.slug, p]));
  const f = (s: string) => bySlug[s];
  return [
    { label: 'Análisis de empresas / mes', free: formatLimit(f('free')?.companyViews ?? 3), pro: formatLimit(f('pro')?.companyViews ?? 20), premium: formatLimit(f('premium')?.companyViews ?? -1) },
    { label: 'Cursos de inversión', free: true, pro: true, premium: true },
    { label: 'Favoritos y alarmas', free: formatLimit(f('free')?.favorites ?? 3), pro: formatLimit(f('pro')?.favorites ?? 10), premium: formatLimit(f('premium')?.favorites ?? -1) },
    { label: 'Portfolios', free: formatLimit(f('free')?.portfolios ?? 1), pro: formatLimit(f('pro')?.portfolios ?? 5), premium: formatLimit(f('premium')?.portfolios ?? -1) },
    { label: 'Screening avanzado', free: f('free')?.screening ?? false, pro: f('pro')?.screening ?? true, premium: f('premium')?.screening ?? true },
    { label: 'Comparar empresas', free: f('free')?.compare ?? false, pro: f('pro')?.compare ?? true, premium: f('premium')?.compare ?? true },
    { label: 'Exportar datos', free: f('free')?.exportData ?? false, pro: f('pro')?.exportData ?? false, premium: f('premium')?.exportData ?? true },
  ];
}

function FeatureCheck({ value }: { value: string | boolean }) {
  if (value === true) return <span className="plan-feature-check-wrap"><Check size={16} className="plan-feature-check plan-feature-check--yes" /></span>;
  if (value === false) return <span className="plan-feature-check-wrap"><X size={16} className="plan-feature-check plan-feature-check--no" /></span>;
  return <span className="plan-feature-text">{value}</span>;
}

export function PlanSelectionPage() {
  const { user, loadUsage, updateUserTier } = useAuth();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [msg, setMsg] = useState('');
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [features, setFeatures] = useState<PlanFeature[]>([]);

  const currentTier = user?.subscriptionTier || 'free';

  useEffect(() => {
    fetch('/api/subscription/plans')
      .then((res) => res.ok ? res.json() : [])
      .then((data: PlanData[]) => {
        setPlans(data);
        setFeatures(buildFeatures(data));
      })
      .catch(() => {
        setFeatures([
          { label: 'Análisis de empresas / mes', free: '3', pro: '20', premium: 'Ilimitados' },
          { label: 'Cursos de inversión', free: true, pro: true, premium: true },
          { label: 'Favoritos y alarmas', free: '3', pro: '10', premium: 'Ilimitadas' },
          { label: 'Portfolios', free: '1', pro: '5', premium: 'Ilimitados' },
          { label: 'Screening avanzado', free: false, pro: true, premium: true },
          { label: 'Comparar empresas', free: false, pro: true, premium: true },
          { label: 'Exportar datos', free: false, pro: false, premium: true },
        ]);
      });
  }, []);

  const price = (slug: string) => plans.find((p) => p.slug === slug)?.priceMonthly ?? 0;
  const planName = (slug: string) => plans.find((p) => p.slug === slug)?.name ?? slug;

  const handleSelectPlan = async (plan: string) => {
    if (plan === 'premium') {
      setShowPremiumModal(true);
      return;
    }
    if (plan === currentTier) return;

    setSelecting(plan);
    setMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscription/select-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
    if (res.ok) {
      await loadUsage();
      updateUserTier(plan);
      setMsg(`Plan cambiado a ${planName(plan)} correctamente`);
      } else {
        const err = await res.json();
        setMsg(err.error || 'Error al cambiar plan');
      }
    } catch {
      setMsg('Error de conexión');
    }
    setSelecting(null);
  };

  const displayFeatures = features.length > 0 ? features : [
    { label: 'Análisis de empresas / mes', free: '3', pro: '20', premium: 'Ilimitados' },
    { label: 'Cursos de inversión', free: true, pro: true, premium: true },
    { label: 'Favoritos y alarmas', free: '3', pro: '10', premium: 'Ilimitadas' },
    { label: 'Portfolios', free: '1', pro: '5', premium: 'Ilimitados' },
    { label: 'Screening avanzado', free: false, pro: true, premium: true },
    { label: 'Comparar empresas', free: false, pro: true, premium: true },
    { label: 'Exportar datos', free: false, pro: false, premium: true },
  ];

  return (
    <div className="plans-page">
      <div className="plans-inner">
        <div className="plans-header">
          <h1 className="plans-title">Elige tu plan</h1>
          <p className="plans-subtitle">
            Selecciona el plan que mejor se adapte a tu estilo de inversión
          </p>
        </div>

        {msg && <div className="plans-msg">{msg}</div>}

        <div className="plans-grid">
          {/* Free */}
          <div className={`plan-card ${currentTier === 'free' ? 'plan-card--current' : ''}`}>
            {currentTier === 'free' && <div className="plan-badge">Plan actual</div>}
            <div className="plan-card-header">
              <h3 className="plan-name">{planName('free')}</h3>
              <div className="plan-price">
                <span className="plan-price-amount">{price('free')}€</span>
                <span className="plan-price-period">/mes</span>
              </div>
              <p className="plan-desc">Para empezar a explorar el mundo de la inversión</p>
            </div>
            <ul className="plan-features">
              <li><BarChart3 size={16} /> {formatLimit(plans.find((p) => p.slug === 'free')?.companyViews ?? 3)} análisis de empresas / mes</li>
              <li><Check size={16} /> Cursos de inversión</li>
              <li><Heart size={16} /> {formatLimit(plans.find((p) => p.slug === 'free')?.favorites ?? 3)} favoritos y alarmas</li>
              <li><Briefcase size={16} /> {formatLimit(plans.find((p) => p.slug === 'free')?.portfolios ?? 1)} portfolio</li>
            </ul>
            <button
              className={`plan-btn ${currentTier === 'free' ? 'plan-btn--current' : 'plan-btn--outline'}`}
              disabled={currentTier === 'free' || selecting === 'free'}
              onClick={() => handleSelectPlan('free')}
            >
              {currentTier === 'free' ? 'Tu plan actual' : selecting === 'free' ? 'Cambiando...' : 'Seleccionar'}
            </button>
          </div>

          {/* Pro */}
          <div className={`plan-card plan-card--featured ${currentTier === 'pro' ? 'plan-card--current' : ''}`}>
            {currentTier === 'pro' && <div className="plan-badge">Plan actual</div>}
            {currentTier !== 'pro' && <div className="plan-badge plan-badge--popular">Popular</div>}
            <div className="plan-card-header">
              <h3 className="plan-name">{planName('pro')}</h3>
              <div className="plan-price">
                <span className="plan-price-amount">{price('pro')}€</span>
                <span className="plan-price-period">/mes</span>
              </div>
              <p className="plan-desc">Para inversores que quieren ir más allá</p>
            </div>
            <ul className="plan-features">
              <li><BarChart3 size={16} /> {formatLimit(plans.find((p) => p.slug === 'pro')?.companyViews ?? 20)} análisis de empresas / mes</li>
              <li><Check size={16} /> Cursos de inversión</li>
              <li><Heart size={16} /> {formatLimit(plans.find((p) => p.slug === 'pro')?.favorites ?? 10)} favoritos y alarmas</li>
              <li><Briefcase size={16} /> {formatLimit(plans.find((p) => p.slug === 'pro')?.portfolios ?? 5)} portfolios</li>
              <li><GitCompare size={16} /> Screening avanzado</li>
              <li><GitCompare size={16} /> Comparar empresas</li>
            </ul>
            <button
              className={`plan-btn ${currentTier === 'pro' ? 'plan-btn--current' : 'plan-btn--primary'}`}
              disabled={currentTier === 'pro' || selecting === 'pro'}
              onClick={() => handleSelectPlan('pro')}
            >
              {currentTier === 'pro' ? 'Tu plan actual' : selecting === 'pro' ? 'Cambiando...' : 'Seleccionar Pro'}
            </button>
          </div>

          {/* Premium */}
          <div className={`plan-card ${currentTier === 'premium' ? 'plan-card--current' : ''}`}>
            {currentTier === 'premium' && <div className="plan-badge">Plan actual</div>}
            <div className="plan-card-header">
              <h3 className="plan-name">{planName('premium')}</h3>
              <div className="plan-price">
                <span className="plan-price-amount">{price('premium')}€</span>
                <span className="plan-price-period">/mes</span>
              </div>
              <p className="plan-desc">Sin límites para profesionales</p>
            </div>
            <ul className="plan-features">
              <li><BarChart3 size={16} /> Análisis ilimitados</li>
              <li><Check size={16} /> Cursos de inversión</li>
              <li><Heart size={16} /> Favoritos y alarmas ilimitados</li>
              <li><Briefcase size={16} /> Portfolios ilimitados</li>
              <li><GitCompare size={16} /> Screening avanzado</li>
              <li><GitCompare size={16} /> Comparar empresas</li>
              <li><Download size={16} /> Exportar datos</li>
            </ul>
            <button
              className={`plan-btn ${currentTier === 'premium' ? 'plan-btn--current' : 'plan-btn--outline'}`}
              disabled={currentTier === 'premium' || selecting === 'premium'}
              onClick={() => handleSelectPlan('premium')}
            >
              {currentTier === 'premium' ? 'Tu plan actual' : selecting === 'premium' ? 'Cambiando...' : 'Próximamente'}
            </button>
          </div>
        </div>

        <div className="plans-table-wrapper">
          <h2 className="plans-compare-title">Comparar planes</h2>
          <table className="plans-table">
            <thead>
              <tr>
                <th>Característica</th>
                <th>Gratis</th>
                <th className="plans-table-featured">Pro</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              {displayFeatures.map((f) => (
                <tr key={f.label}>
                  <td>{f.label}</td>
                  <td><FeatureCheck value={f.free} /></td>
                  <td className="plans-table-featured"><FeatureCheck value={f.pro} /></td>
                  <td><FeatureCheck value={f.premium} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="plans-back" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>

      {showPremiumModal && (
        <div className="plans-premium-overlay" onClick={() => setShowPremiumModal(false)}>
          <div className="plans-premium-modal" onClick={(e) => e.stopPropagation()}>
            <Lock size={32} className="plans-premium-icon" />
            <h3>Próximamente disponible</h3>
            <p>El plan Premium estará disponible muy pronto. Estamos preparando la pasarela de pagos para ofrecerte la mejor experiencia.</p>
            <button className="plan-btn plan-btn--primary" onClick={() => setShowPremiumModal(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
