import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../hooks/useAnalytics';
import { getSafeRedirect, withRedirect } from '../utils/redirect';
import '../styles/auth.css';

export function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('Debes aceptar los Términos y Condiciones y la Política de Privacidad.');
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register(email, name, password);
      trackEvent('register');
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setError('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      trackEvent('register', { method: 'google' });
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar con Google');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Crear cuenta</h1>
          <p className="auth-subtitle">Únete a DataInvestments</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label className="auth-label" htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirm">Confirmar contraseña</label>
            <input
              id="confirm"
              type="password"
              className="auth-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="auth-field auth-consent">
            <label className="auth-consent-label">
              <input
                type="checkbox"
                className="auth-consent-checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
              />
              <span>
                He leído y acepto los{' '}
                <Link to="/legal/terminos" className="auth-link">Términos y Condiciones</Link>, la{' '}
                <Link to="/legal/privacidad" className="auth-link">Política de Privacidad</Link> y la{' '}
                <Link to="/legal/cookies" className="auth-link">Política de Cookies</Link>.
              </span>
            </label>
          </div>

          <button type="submit" className="auth-submit" disabled={loading || !acceptedTerms}>
            {loading ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-divider">
          <span>o regístrate con</span>
        </div>

        <div className="auth-google">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Error al registrar con Google')}
            theme="outline"
            size="large"
            width="100%"
            text="signup_with"
            shape="rectangular"
          />
        </div>

        <div className="auth-footer">
          <p className="auth-footer-text">
            ¿Ya tienes cuenta?{' '}
            <Link to={withRedirect('/login', redirectTo)} className="auth-link">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
