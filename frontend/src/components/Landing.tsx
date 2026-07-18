import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart3, DollarSign, ArrowRight, Shield, PieChart, Database, Heart, ArrowUpDown } from 'lucide-react';
import { SectionReveal } from './ui/SectionReveal';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';

interface CompanyFromAPI {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
}

const colorNames = ['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'blue'] as const;

export function Landing() {
  const { user, favorites, isFavorite, addFavorite, removeFavorite } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyFromAPI[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    fetch('/api/companies')
      .then((res) => res.json())
      .then((data) => setCompanies(data))
      .catch(() => {});
  }, []);

  const favoriteCompanies = useMemo(() => {
    if (!favorites.length) return [];
    const favIds = new Set(favorites.map((f) => f.companyId));
    return companies.filter((c) => favIds.has(c.id));
  }, [favorites, companies]);

  const availableSectors = useMemo(() => {
    const sectorSet = new Set(companies.map((c) => c.sector).filter(Boolean));
    return Array.from(sectorSet).sort() as string[];
  }, [companies]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.companyId)), [favorites]);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter((c) => {
        if (showFavoritesOnly && !favoriteIds.has(c.id)) return false;

        const matchesSearch =
          c.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.sector?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.industry?.toLowerCase().includes(searchTerm.toLowerCase());

        if (selectedSector) {
          return matchesSearch && c.sector === selectedSector;
        }
        return matchesSearch;
      })
      .sort((a, b) => {
        const cmp = a.ticker.localeCompare(b.ticker);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [companies, searchTerm, selectedSector, sortOrder, showFavoritesOnly, favoriteIds]);

  const handleToggleFavorite = async (e: React.MouseEvent, companyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (isFavorite(companyId)) {
      await removeFavorite(companyId);
    } else {
      await addFavorite(companyId);
    }
  };

  return (
    <div className="landing-root">
      {/* Hero */}
      <section className="hero">
        <div className="hero-pattern" />
        <div className="hero-content">
          <div className="hero-badge">
            <BarChart3 size={16} />
            Análisis de Valor Intrínseco
          </div>
          <h1 className="hero-title">
            Entiende el{' '}
            <span className="hero-title-gradient">valor real</span>{' '}
            de las empresas
          </h1>
          <p className="hero-subtitle">
            Visualiza flujos de caja, gastos, reinversión y valoración con gráficos interactivos que hacen simple lo complejo.
          </p>
          <div className="hero-actions">
            <a href="#companies" className="hero-btn-primary">
              Explorar Empresas
              <ArrowRight size={20} />
            </a>
            <a href="#features" className="hero-btn-secondary">
              Saber más
            </a>
          </div>
        </div>
        <div className="hero-glow" />
      </section>

      {/* Features */}
      <section id="features" className="features-section">
        <div className="features-grid">
          <SectionReveal delay={0}>
            <div className="features-header">
              <h2 className="features-title">¿Qué puedes analizar?</h2>
              <p className="features-subtitle">Herramientas diseñadas para inversores que buscan entender los números</p>
            </div>
          </SectionReveal>

          <SectionReveal delay={80}>
            <div className="feature-card">
              <div className="feature-icon feature-icon--blue">
                <DollarSign size={28} />
              </div>
              <h3 className="feature-title">Flujo de Caja</h3>
              <p className="feature-desc">
                Visualiza cómo fluyen los ingresos a través de costos, gastos operativos e inversión hasta el beneficio neto.
              </p>
              <div className="feature-tags">
                {['Ingresos', 'Costes', 'Gastos', 'I+D', 'CapEx'].map((tag) => (
                  <span key={tag} className="feature-tag feature-tag--blue">{tag}</span>
                ))}
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={160}>
            <div className="feature-card">
              <div className="feature-icon feature-icon--emerald">
                <TrendingUp size={28} />
              </div>
              <h3 className="feature-title">Valoración</h3>
              <p className="feature-desc">
                Compara el precio actual con el valor intrínseco estimado y calcula el margen de seguridad.
              </p>
              <div className="feature-tags">
                {['P/E', 'P/B', 'P/S', 'Dividend', 'Margen'].map((tag) => (
                  <span key={tag} className="feature-tag feature-tag--emerald">{tag}</span>
                ))}
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={240}>
            <div className="feature-card">
              <div className="feature-icon feature-icon--purple">
                <Shield size={28} />
              </div>
              <h3 className="feature-title">Seguridad</h3>
              <p className="feature-desc">
                Identifica oportunidades de inversión con márgenes de seguridad y análisis fundamental sólido.
              </p>
              <div className="feature-tags">
                {['Fundamental', 'Riesgo', 'Valor', 'Crecimiento'].map((tag) => (
                  <span key={tag} className="feature-tag feature-tag--purple">{tag}</span>
                ))}
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Companies */}
      <section id="companies" className="companies-section">
        <div className="companies-inner">
          <SectionReveal delay={0}>
            <div className="companies-header">
              <h2 className="companies-title">Empresas Disponibles</h2>
              <p className="companies-subtitle">Selecciona una empresa para comenzar el análisis</p>
            </div>
          </SectionReveal>

          {/* Favorites section */}
          {user && favoriteCompanies.length > 0 && (
            <div className="favorites-section">
              <div className="favorites-header">
                <Heart size={20} className="favorites-icon" />
                <h3 className="favorites-title">Mis Favoritos</h3>
                <span className="favorites-badge">{favoriteCompanies.length}</span>
              </div>
              <div className="favorites-grid">
                {favoriteCompanies.map((company) => (
                  <Link
                    key={company.ticker}
                    to={`/empresa/${company.ticker}`}
                    className="favorites-card"
                  >
                    <div className="favorites-card-left">
                      <div className="favorites-card-avatar">
                        {company.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <div className="favorites-card-ticker">{company.ticker}</div>
                        <div className="favorites-card-name">{company.name}</div>
                        <div className="favorites-card-sector">{company.sector || company.industry || 'N/A'}</div>
                      </div>
                    </div>
                    <button
                      className="favorites-card-heart"
                      onClick={(e) => handleToggleFavorite(e, company.id)}
                      title="Quitar de favoritos"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {companies.length > 0 && (
            <div className="sector-filters-wrapper">
              <div className="search-row">
                <div className="companies-search-wrapper">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por ticker, nombre o sector..."
                    className="companies-search-input"
                  />
                </div>
                <button
                  className="sort-btn"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown size={15} />
                  {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
                </button>
                {user && favoriteCompanies.length > 0 && (
                  <button
                    className={`fav-filter-btn ${showFavoritesOnly ? 'fav-filter-btn--active' : ''}`}
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  >
                    <Heart size={15} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                    Favoritas
                    <span className="fav-filter-count">{favoriteCompanies.length}</span>
                  </button>
                )}
              </div>
              {availableSectors.length > 0 && (
                <div className="sector-pills">
                  <button
                    className={`sector-pill ${selectedSector === null ? 'sector-pill--active' : ''}`}
                    onClick={() => setSelectedSector(null)}
                  >
                    Todos
                  </button>
                  {availableSectors.map((sector) => (
                    <button
                      key={sector}
                      className={`sector-pill ${selectedSector === sector ? 'sector-pill--active' : ''}`}
                      onClick={() => setSelectedSector(selectedSector === sector ? null : sector)}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="companies-grid">
            {companies.length === 0 ? (
              <SectionReveal delay={80}>
                <div className="companies-empty">
                  <Database size={48} className="companies-empty-icon" />
                  <h3 className="companies-empty-title">Sin empresas aún</h3>
                  <p className="companies-empty-desc">Añade empresas desde el panel de administración para empezar</p>
                  <Link to="/admin" className="hero-btn-primary companies-empty-btn">
                    Ir al Admin
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </SectionReveal>
            ) : filteredCompanies.length === 0 ? (
              <div className="companies-empty" style={{ gridColumn: '1 / -1' }}>
                <Database size={48} className="companies-empty-icon" />
                <h3 className="companies-empty-title">Sin resultados</h3>
                <p className="companies-empty-desc">No se encontraron empresas para "{searchTerm}"</p>
              </div>
            ) : (
              filteredCompanies.map((company, i) => {
                const color = colorNames[i % colorNames.length];
                return (
                  <SectionReveal key={company.ticker} delay={60 + i * 80}>
                    <div className="company-card">
                      <div className={`company-card-strip company-card-strip--${color}`} />
                      <div className="company-card-header">
                        <div className={`company-card-avatar company-card-avatar--${color}`}>
                          {company.ticker.slice(0, 2)}
                        </div>
                        <div>
                          <div className="company-card-ticker">{company.ticker}</div>
                          <div className="company-card-name">{company.sector || company.industry || 'N/A'}</div>
                        </div>
                        <button
                          className={`company-card-heart ${user && isFavorite(company.id) ? 'company-card-heart--active' : ''}`}
                          onClick={(e) => handleToggleFavorite(e, company.id)}
                          title={user && isFavorite(company.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        >
                          <Heart size={18} fill={user && isFavorite(company.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <p className="company-card-desc">{company.name}</p>
                      <div className="company-card-actions">
                        <Link to={`/empresa/${company.ticker}`} className="company-card-btn company-card-btn--secondary">
                          <DollarSign size={14} />
                          Analizar
                        </Link>
                        <Link to={`/empresa/${company.ticker}`} className="company-card-btn company-card-btn--primary">
                          <TrendingUp size={14} />
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  </SectionReveal>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <SectionReveal delay={0}>
        <section className="cta-section">
          <div className="cta-inner">
            <PieChart size={48} className="cta-icon" />
            <h2 className="cta-title">Toma mejores decisiones de inversión</h2>
            <p className="cta-desc">
              Analiza empresas de forma visual e intuitiva con datos financieros reales
            </p>
            <a href="#companies" className="cta-btn">
              Comenzar ahora
              <ArrowRight size={20} />
            </a>
          </div>
        </section>
      </SectionReveal>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-brand-text">DataInvestments</span>
          </div>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} DataInvestments — Análisis de inversión con datos reales
          </p>
        </div>
      </footer>
    </div>
  );
}
