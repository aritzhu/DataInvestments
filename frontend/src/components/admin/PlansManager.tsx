import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface Plan {
  id: string;
  slug: string;
  name: string;
  priceMonthly: number;
  companyViews: number;
  favorites: number;
  portfolios: number;
  screening: boolean;
  compare: boolean;
  exportData: boolean;
  active: boolean;
}

export function PlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    apiFetch('/api/admin/plans')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setPlans(data))
      .catch(() => setMsg({ type: 'err', text: 'Error al cargar planes del servidor' }))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (slug: string, field: keyof Plan, value: any) => {
    setPlans((prev) => prev.map((p) => p.slug === slug ? { ...p, [field]: value } : p));
  };

  const handleSave = async (plan: Plan) => {
    setSaving(plan.slug);
    setMsg(null);
    try {
      const res = await apiFetch(`/api/admin/plans/${plan.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: plan.name,
          priceMonthly: plan.priceMonthly,
          companyViews: plan.companyViews,
          favorites: plan.favorites,
          portfolios: plan.portfolios,
          screening: plan.screening,
          compare: plan.compare,
          exportData: plan.exportData,
          active: plan.active,
        }),
      });
      if (res.ok) {
        setMsg({ type: 'ok', text: `Plan "${plan.name}" guardado correctamente` });
      } else {
        const err = await res.json();
        setMsg({ type: 'err', text: err.error || 'Error al guardar' });
      }
    } catch {
      setMsg({ type: 'err', text: 'Error de conexión' });
    }
    setSaving(null);
  };

  if (loading) {
    return <div className="admin-loading">Cargando planes...</div>;
  }

  return (
    <div className="admin-section">
      <div className="admin-form-section">
        <h3 className="admin-form-title">Gestión de Planes</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Los cambios se aplican inmediatamente a todos los usuarios con ese plan.
        </p>
      </div>

      {msg && (
        <div className={`admin-form-message ${msg.type === 'ok' ? 'admin-form-message--success' : 'admin-form-message--error'}`} style={{ marginBottom: '1rem' }}>
          {msg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {plans.map((plan) => (
          <div
            key={plan.slug}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
              opacity: plan.active ? 1 : 0.6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{plan.name}</h4>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: plan.active ? 'var(--green-bg, rgba(34,197,94,0.15))' : 'var(--surface-2)',
                  color: plan.active ? 'var(--green, #22c55e)' : 'var(--text-tertiary)',
                  fontWeight: 600,
                }}>
                  {plan.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <button
                className="admin-form-btn"
                onClick={() => handleSave(plan)}
                disabled={saving === plan.slug}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {saving === plan.slug ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="admin-form-input-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem', display: 'block' }}>Nombre</label>
                <input
                  className="admin-form-input"
                  value={plan.name}
                  onChange={(e) => updateField(plan.slug, 'name', e.target.value)}
                />
              </div>

              <div className="admin-form-input-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem', display: 'block' }}>Precio mensual (€)</label>
                <input
                  className="admin-form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={plan.priceMonthly}
                  onChange={(e) => updateField(plan.slug, 'priceMonthly', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="admin-form-input-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem', display: 'block' }}>Análisis empresas/mes (-1 = ilimitado)</label>
                <input
                  className="admin-form-input"
                  type="number"
                  min="-1"
                  value={plan.companyViews}
                  onChange={(e) => updateField(plan.slug, 'companyViews', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="admin-form-input-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem', display: 'block' }}>Favoritos (-1 = ilimitado)</label>
                <input
                  className="admin-form-input"
                  type="number"
                  min="-1"
                  value={plan.favorites}
                  onChange={(e) => updateField(plan.slug, 'favorites', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="admin-form-input-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem', display: 'block' }}>Portfolios (-1 = ilimitado)</label>
                <input
                  className="admin-form-input"
                  type="number"
                  min="-1"
                  value={plan.portfolios}
                  onChange={(e) => updateField(plan.slug, 'portfolios', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {[
                { key: 'screening' as const, label: 'Screening avanzado' },
                { key: 'compare' as const, label: 'Comparar empresas' },
                { key: 'exportData' as const, label: 'Exportar datos' },
                { key: 'active' as const, label: 'Activo' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={plan[key]}
                    onChange={(e) => updateField(plan.slug, key, e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--blue)' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
