import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, BarChart3, Sparkles, X } from 'lucide-react';
import '../styles/welcome-modal.css';

const WELCOME_SEEN_KEY = 'di-welcome-seen';

export function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
    setVisible(false);
  };

  const handleExplore = () => {
    dismiss();
    document.getElementById('companies')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRegister = () => {
    dismiss();
    navigate('/register');
  };

  if (!visible) return null;

  return (
    <div className="wm-overlay" onClick={dismiss}>
      <div className="wm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="wm-close" onClick={dismiss} aria-label="Cerrar">
          <X size={20} />
        </button>

        <div className="wm-sparkle">
          <Sparkles size={32} />
        </div>

        <h2 className="wm-title">Bienvenido a DataInvestments</h2>
        <p className="wm-subtitle">
          Analiza empresas reales con datos financieros verificados y toma mejores decisiones de inversión.
        </p>

        <div className="wm-features">
          <div className="wm-feature">
            <div className="wm-feature-icon wm-feature-icon--blue">
              <BookOpen size={22} />
            </div>
            <div>
              <h4 className="wm-feature-title">Cursos gratuitos</h4>
              <p className="wm-feature-desc">Aprende value investing desde cero</p>
            </div>
          </div>
          <div className="wm-feature">
            <div className="wm-feature-icon wm-feature-icon--emerald">
              <BarChart3 size={22} />
            </div>
            <div>
              <h4 className="wm-feature-title">1 empresa gratis</h4>
              <p className="wm-feature-desc">Explora el análisis completo sin registrarte</p>
            </div>
          </div>
        </div>

        <div className="wm-actions">
          <button className="wm-btn wm-btn--primary" onClick={handleExplore}>
            Comenzar a explorar
          </button>
          <button className="wm-btn wm-btn--secondary" onClick={handleRegister}>
            Registrarme ahora
          </button>
        </div>
      </div>
    </div>
  );
}
