import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Star, BarChart3, Heart, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/registration-hook.css';

const TRIAL_USED_KEY = 'di-trial-used';

interface Props {
  ticker: string;
}

export function RegistrationHookModal({ ticker }: Props) {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const trialUsed = localStorage.getItem(TRIAL_USED_KEY);
    if (trialUsed) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [ticker]);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setError('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      localStorage.removeItem(TRIAL_USED_KEY);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar con Google');
    }
  };

  if (!visible) return null;

  return (
    <div className="rh-overlay">
      <div className="rh-modal">
        <div className="rh-icon-wrap">
          <Star size={28} className="rh-icon" />
        </div>

        <h2 className="rh-title">Te está gustando, ¿verdad?</h2>
        <p className="rh-subtitle">
          Regístrate gratis para seguir analizando empresas y sacar el máximo partido a DataInvestments.
        </p>

        <div className="rh-benefits">
          <div className="rh-benefit">
            <BarChart3 size={16} />
            <span>3 análisis mensuales</span>
          </div>
          <div className="rh-benefit">
            <Heart size={16} />
            <span>Guarda tus favoritas</span>
          </div>
          <div className="rh-benefit">
            <Briefcase size={16} />
            <span>Crea portfolios</span>
          </div>
        </div>

        {error && <div className="rh-error">{error}</div>}

        <div className="rh-google">
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

        <div className="rh-divider"><span>o</span></div>

        <div className="rh-actions">
          <button className="rh-btn rh-btn--primary" onClick={() => navigate('/register')}>
            Registrarme con email
          </button>
          <button className="rh-btn rh-btn--secondary" onClick={() => navigate('/login')}>
            Ya tengo cuenta, iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
