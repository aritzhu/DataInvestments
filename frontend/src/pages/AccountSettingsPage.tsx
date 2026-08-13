import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Sun, Moon, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTheme } from '../utils/theme';
import '../styles/settings.css';

export function AccountSettingsPage() {
  const { user, updateProfile, changePassword, updateTheme, deleteAccount } = useAuth();
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

  const theme = getTheme();

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
            <h2 className="set-card-title">Perfil</h2>
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
            <h2 className="set-card-title">Seguridad</h2>
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
            <h2 className="set-card-title">Preferencias</h2>
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

        <section className="set-card set-card--danger">
          <div className="set-card-header">
            <Trash2 size={18} className="set-card-icon set-card-icon--danger" />
            <h2 className="set-card-title">Zona de peligro</h2>
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
