import CookieConsent from 'react-cookie-consent';
import { Link } from 'react-router-dom';
import '../styles/cookies.css';

export function CookieConsentBanner() {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Aceptar"
      declineButtonText="Rechazar"
      enableDeclineButton
      flipButtons
      cookieName="di-cookie-consent"
      expires={365}
      containerClasses="cookie-consent-container"
      buttonClasses="cookie-btn cookie-btn-accept"
      declineButtonClasses="cookie-btn cookie-btn-decline"
      onAccept={() => {
        localStorage.setItem('di-analytics-consent', 'granted');
        window.location.reload();
      }}
      onDecline={() => {
        localStorage.setItem('di-analytics-consent', 'denied');
      }}
    >
      Utilizamos almacenamiento local para guardar tu sesión y preferencias.
      Consulta nuestra{' '}
      <Link to="/legal/cookies" className="cookie-link">
        Política de Cookies
      </Link>
      .
    </CookieConsent>
  );
}
