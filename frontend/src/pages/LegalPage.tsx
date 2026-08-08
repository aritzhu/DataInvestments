import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { LEGAL_DOCUMENTS, getLegalDocument, DEFAULT_UPDATED_AT } from '../legal/content';
import '../styles/legal.css';

const FALLBACK = '[Pendiente — configurar en el panel de administración]';
const FALLBACK_REGISTRAL = 'No indicado';

export function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: Record<string, string>) => setSettings(data))
      .catch(() => {});
  }, []);

  const replaceTokens = (text: string): string => {
    const tokens: Record<string, string> = {
      '{TITULAR}': settings.legal_titular || FALLBACK,
      '{NIF}': settings.legal_nif || FALLBACK,
      '{DOMICILIO}': settings.legal_domicilio || FALLBACK,
      '{EMAIL}': settings.legal_email || FALLBACK,
      '{REGISTRAL}': settings.legal_registral || FALLBACK_REGISTRAL,
    };
    let out = text;
    for (const [token, value] of Object.entries(tokens)) {
      out = out.split(token).join(value);
    }
    return out;
  };

  const doc = getLegalDocument(slug || '');
  if (!doc) {
    return <Navigate to="/legal/terminos" replace />;
  }

  const updatedAt = settings.legal_updated_at || DEFAULT_UPDATED_AT;

  return (
    <div className="legal-page">
      <div className="legal-inner">
        <aside className="legal-sidebar">
          <h3 className="legal-sidebar-title">Información legal</h3>
          <nav className="legal-nav">
            {LEGAL_DOCUMENTS.map((item) => (
              <Link
                key={item.slug}
                to={`/legal/${item.slug}`}
                className={`legal-nav-link ${item.slug === doc.slug ? 'legal-nav-link--active' : ''}`}
              >
                {item.shortTitle}
              </Link>
            ))}
          </nav>
          <Link to="/" className="legal-back">← Volver al inicio</Link>
        </aside>

        <article className="legal-content">
          <header className="legal-header">
            <h1 className="legal-title">{doc.title}</h1>
            <p className="legal-updated">Última actualización: {updatedAt}</p>
          </header>
          {doc.sections.map((section, i) => (
            <section key={i} className="legal-section">
              <h2 className="legal-section-title">{section.heading}</h2>
              {section.paragraphs.map((paragraph, j) => (
                <p key={j} className="legal-paragraph">{replaceTokens(paragraph)}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
