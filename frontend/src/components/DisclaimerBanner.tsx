import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/disclaimer.css';

interface Props {
  className?: string;
}

export function DisclaimerBanner({ className }: Props) {
  return (
    <div className={`disclaimer-banner ${className || ''}`}>
      <Info size={16} className="disclaimer-banner-icon" />
      <p className="disclaimer-banner-text">
        La información de este sitio es <strong>informativa y educativa</strong>. No constituye asesoramiento
        financiero ni recomendación de compra o venta de valores. Las valoraciones mostradas son{' '}
        <strong>estimaciones automáticas de modelos</strong> con hipótesis subjetivas y pueden contener errores
        o datos desactualizados. Invertir conlleva riesgo. Consulta nuestra{' '}
        <Link to="/legal/riesgos" className="disclaimer-banner-link">advertencia sobre riesgos</Link> y{' '}
        <Link to="/legal/terminos" className="disclaimer-banner-link">términos y condiciones</Link>.
      </p>
    </div>
  );
}
