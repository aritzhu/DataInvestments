import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Sun, Moon, Trash2, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTheme } from '../utils/theme';
import { InfoButton } from '../components/ui/InfoButton';
import { INFO } from '../utils/infoContent';
import '../styles/settings.css';

const PLAN_NAMES: Record<string, string> = {
  free: 'Gratuito',
  pro: 'Pro',
  premium: 'Premium',
};

function subscriptionStatusInfo(status?: string | null): { label: string; className: string } | null {
  if (!status) return null;
  if (status === 'active' || status === 'trialing') return { label: 'Activa', className: 'set-sub-badge--active' };
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return { label: 'Pago pendiente', className: 'set-sub-badge--warning' };
  if (status === 'canceled' || status === 'incomplete_expired') return { label: 'Cancelada', className: 'set-sub-badge--canceled' };
  return null;
}

export function AccountSettingsPage() {
  const { user, planInfo, loadUsage, updateProfile, changePassword, updateTheme, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const theme = getTheme();

  const tier = planInfo?.tier || user?.subscriptionTier || 'free';
  const isPaidTier = tier === 'pro' || tier === 'premium';
  const statusBadge = isPaidTier ? subscriptionStatusInfo(planInfo?.subscriptionStatus) : null;
  const renewalDate = planInfo?.currentPeriodEnd
    ? new Date(planInfo.currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const pendingCancellation = !!planInfo?.cancelAtPeriodEnd;

  const refreshPlanInfo = () => {
    void loadUsage();
    setTimeout(() => void loadUsage(), 2500);
  };

  const handleManageSubscription = async () => {
    setSubError('');
    setSubLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscription/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setSubError(data.error || 'Error al abrir el portal de suscripción');
    } catch {
      setSubError('Error de conexión');
    }
    setSubLoading(false);
  };

  const handleCancelSubscription = async () => {
    setSubError('');
    setSubLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmCancel(false);
        refreshPlanInfo();
      } else {
        const data = await res.json();
        setSubError(data.error || 'Error al anular la suscripción');
      }
    } catch {
      setSubError('Error de conexión');
    }
    setSubLoading(false);
  };

  const handleResumeSubscription = async () => {
    setSubError('');
    setSubLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscription/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        refreshPlanInfo();
      } else {
        const data = await res.json();
        setSubError(data.error || 'Error al reactivar la suscripción');
      }
    } catch {
      setSubError('Error de conexión');
    }
    setSubLoading(false);
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileMsg('');
    setProfileSaving(true);
    try {
      await updateProfile(name.trim(), email.trim());
      setProfileMsg('Perfil actualizado correctamente.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Error al actualizar el perfil');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwMsg('');
    if (newPassword.length < 6) {
      setPwError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden.');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwMsg('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    if (confirmEmail.trim().toLowerCase() !== (user?.email || '').toLowerCase()) {
      setDeleteError('El email no coincide. No se ha eliminado la cuenta.');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar la cuenta');
      setDeleting(false);
    }
  };

  return (
    <div className="set-page">
      <div className="set-header">
        <h1 className="set-title">Configuración</h1>
        <p className="set-subtitle">Gestiona tu perfil, seguridad y preferencias</p>
      </div>

      <div className="set-cards">
        <section className="set-card">
          <div className="set-card-header">
            <User size={18} className="set-card-icon" />
            <h2 className="set-card-title"><span className="info-label-row">Perfil <InfoButton content={INFO['settings.profile']} /></span></h2>
          </div>
          <form className="set-form" onSubmit={handleProfile}>
            {profileError && <div className="auth-error">{profileError}</div>}
            {profileMsg && <div className="set-success">{profileMsg}</div>}

            <div className="auth-field">
              <label className="auth-label" htmlFor="set-name">Nombre</label>
              <input
                id="set-name"
                type="text"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="set-email">Email</label>
              <input
                id="set-email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit set-submit" disabled={profileSaving}>
              {profileSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </section>

        <section className="set-card">
          <div className="set-card-header">
            <Shield size={18} className="set-card-icon" />
            <h2 className="set-card-title"><span className="info-label-row">Seguridad <InfoButton content={INFO['settings.security']} /></span></h2>
          </div>
          <form className="set-form" onSubmit={handlePassword}>
            {pwError && <div className="auth-error">{pwError}</div>}
            {pwMsg && <div className="set-success">{pwMsg}</div>}

            <div className="auth-field">
              <label className="auth-label" htmlFor="set-current-pw">Contraseña actual</label>
              <input
                id="set-current-pw"
                type="password"
                className="auth-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="set-new-pw">Nueva contraseña</label>
              <input
                id="set-new-pw"
                type="password"
                className="auth-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="set-confirm-pw">Confirmar nueva contraseña</label>
              <input
                id="set-confirm-pw"
                type="password"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="auth-submit set-submit" disabled={pwSaving}>
              {pwSaving ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>

        <section className="set-card">
          <div className="set-card-header">
            <Sun size={18} className="set-card-icon" />
            <h2 className="set-card-title"><span className="info-label-row">Preferencias <InfoButton content={INFO['settings.preferences']} /></span></h2>
          </div>
          <div className="set-form">
            <p className="set-note">Elige el tema de la aplicación. Se guarda en tu cuenta.</p>
            <div className="set-theme-seg" role="radiogroup" aria-label="Tema de la aplicación">
              <button
                className={`set-theme-btn ${theme === 'dark' ? 'set-theme-btn--active' : ''}`}
                onClick={() => updateTheme('dark')}
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
              >
                <Moon size={16} />
                Oscuro
              </button>
              <button
                className={`set-theme-btn ${theme === 'light' ? 'set-theme-btn--active' : ''}`}
                onClick={() => updateTheme('light')}
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
              >
                <Sun size={16} />
                Claro
              </button>
            </div>
          </div>
        </section>

        <section className="set-card">
          <div className="set-card-header">
            <CreditCard size={18} className="set-card-icon" />
            <h2 className="set-card-title"><span className="info-label-row">Suscripción <InfoButton content={INFO['settings.subscription']} /></span></h2>
          </div>
          <div className="set-form">
            <div className="set-sub-row">
              <span className="set-sub-plan">{PLAN_NAMES[tier] ?? tier}</span>
              {statusBadge && (
                <span className={`set-sub-badge ${statusBadge.className}`}>{statusBadge.label}</span>
              )}
            </div>
            {isPaidTier && renewalDate && planInfo?.subscriptionStatus !== 'canceled' && (
              pendingCancellation ? (
                <p className="set-note set-sub-cancel-note">
                  Tu suscripción se cancelará el <strong>{renewalDate}</strong>. Mantendrás todas las ventajas del plan hasta esa fecha.
                </p>
              ) : (
                <p className="set-note">Próxima renovación: <strong>{renewalDate}</strong></p>
              )
            )}
            {subError && <div className="auth-error">{subError}</div>}
            <div className="set-danger-actions">
              <button
                className="set-cancel-btn"
                onClick={() => navigate('/plans')}
                type="button"
              >
                {isPaidTier ? 'Cambiar plan' : 'Mejorar plan'}
              </button>
              {isPaidTier && !pendingCancellation && !confirmCancel && (
                <button
                  className="set-sub-cancel-btn"
                  onClick={() => setConfirmCancel(true)}
                  disabled={subLoading}
                  type="button"
                >
                  Anular suscripción
                </button>
              )}
              {isPaidTier && pendingCancellation && (
                <button
                  className="auth-submit set-submit"
                  onClick={handleResumeSubscription}
                  disabled={subLoading}
                  type="button"
                >
                  {subLoading ? 'Reactivando...' : 'Reactivar suscripción'}
                </button>
              )}
              {isPaidTier && (
                <button
                  className="auth-submit set-submit"
                  onClick={handleManageSubscription}
                  disabled={subLoading}
                  type="button"
                >
                  {subLoading ? 'Abriendo portal...' : 'Gestionar en Stripe'}
                </button>
              )}
            </div>
            {confirmCancel && (
              <div className="set-form" style={{ marginTop: '0.75rem' }}>
                <p className="set-note">
                  ¿Seguro que quieres anular tu suscripción? Mantendrás el acceso hasta el{' '}
                  <strong>{renewalDate}</strong> y no se te cobrará más.
                </p>
                <div className="set-danger-actions">
                  <button
                    className="set-sub-cancel-btn"
                    onClick={handleCancelSubscription}
                    disabled={subLoading}
                    type="button"
                  >
                    {subLoading ? 'Anulando...' : 'Sí, anular suscripción'}
                  </button>
                  <button
                    className="set-cancel-btn"
                    onClick={() => setConfirmCancel(false)}
                    type="button"
                  >
                    No, mantenerla
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="set-card set-card--danger">
          <div className="set-card-header">
            <Trash2 size={18} className="set-card-icon set-card-icon--danger" />
            <h2 className="set-card-title"><span className="info-label-row">Zona de peligro <InfoButton content={INFO['settings.dangerZone']} variant="danger" /></span></h2>
          </div>
          {!confirmDelete ? (
            <button
              className="set-delete-btn"
              onClick={() => setConfirmDelete(true)}
              type="button"
            >
              Eliminar mi cuenta
            </button>
          ) : (
            <div className="set-form">
              <p className="set-note">
                Esta acción eliminará tu cuenta y todos tus datos (favoritos, alarmas y portfolios).
                Escribe tu email <strong>{user?.email}</strong> para confirmar.
              </p>
              {deleteError && <div className="auth-error">{deleteError}</div>}
              <div className="auth-field">
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Tu email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="set-danger-actions">
                <button className="set-delete-btn" onClick={handleDelete} disabled={deleting} type="button">
                  {deleting ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
                <button
                  className="set-cancel-btn"
                  onClick={() => { setConfirmDelete(false); setConfirmEmail(''); setDeleteError(''); }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
