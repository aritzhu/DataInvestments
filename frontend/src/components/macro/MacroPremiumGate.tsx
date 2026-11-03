import { ArrowRight, Globe, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  loggedIn: boolean;
}

const BENEFITS = [
  'Fluctuaciones de 17 índices de EE. UU., Europa, Asia y América.',
  'Selector de periodo: 1D, 1S, 1M, 3M, 6M, YTD, 1A y 5A.',
  'Minigráficas por índice y variación del periodo.',
  'Datos actualizados con caché para una carga rápida.',
];

export function MacroPremiumGate({ loggedIn }: Props) {
  const target = loggedIn ? '/plans' : '/login?redirect=%2Fmacro';
  const cta = loggedIn ? 'Hazte Premium' : 'Inicia sesión para continuar';

  return (
    <div className="macro-gate">
      <div className="macro-gate-icon-wrap">
        <Lock size={26} />
      </div>
      <span className="macro-gate-eyebrow">
        <Globe size={14} />
        Datos macro
      </span>
      <h1 className="macro-gate-title">Los mercados mundiales, en una sola vista</h1>
      <p className="macro-gate-subtitle">
        Esta sección está disponible exclusivamente para usuarios Premium. Sigue la evolución de los
        principales índices del mundo y compara su comportamiento en distintos periodos.
      </p>

      <ul className="macro-gate-benefits">
        {BENEFITS.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>

      <div className="macro-gate-preview" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div key={item} className="macro-gate-preview-card">
            <span className="macro-gate-preview-line macro-gate-preview-line--short" />
            <span className="macro-gate-preview-line macro-gate-preview-line--value" />
            <span className="macro-gate-preview-chart" />
            <span className="macro-gate-preview-line macro-gate-preview-line--foot" />
          </div>
        ))}
      </div>

      <Link to={target} className="macro-gate-cta">
        {cta}
        <ArrowRight size={16} />
      </Link>

      <p className="macro-gate-note">
        Si ya tienes Premium, vuelve a cargar la página o comprueba que tu sesión esté activa.
      </p>
    </div>
  );
}
