import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, ArrowRight, Shield, PieChart, Database, Heart, ArrowUpDown, Globe, LayoutGrid, List } from 'lucide-react';
import { SectionReveal } from './ui/SectionReveal';
import { MarketTicker } from './hero/MarketTicker';
import { MarketClocks } from './hero/MarketClocks';
import { ScrollIndicator } from './hero/ScrollIndicator';
import { useAuth } from '../contexts/AuthContext';
import { companyLogoUrl } from '../utils/companyLogoUrl';
import '../styles/landing.css';

interface CompanyFromAPI {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  logoUrl: string | null;
}

const COUNTRY_NAMES: Record<string, string> = {
  ES: 'España',
  US: 'Estados Unidos',
  DE: 'Alemania',
  FR: 'Francia',
  GB: 'Reino Unido',
  IT: 'Italia',
  NL: 'Países Bajos',
  BE: 'Bélgica',
  FI: 'Finlandia',
  SE: 'Suecia',
  DK: 'Dinamarca',
  PT: 'Portugal',
  AT: 'Austria',
  CH: 'Suiza',
  NO: 'Noruega',
  IE: 'Irlanda',
  LU: 'Luxemburgo',
};

const colorNames = ['blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'blue'] as const;

const METHOD_NAMES: Record<string, string> = {
  dcf: 'DCF',
  per: 'P/E',
  pb: 'P/B',
  ps: 'P/S',
  ev_ebitda: 'EV/EBITDA',
  ev_ebit: 'EV/EBIT',
  ddm: 'DDM',
  graham: 'Nº de Graham',
  fcf_yield: 'FCF Yield',
  net_net: 'Net-Net',
};

const PAGE_SIZE = 24;

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

export function Landing() {
  const { user, favorites, isFavorite, addFavorite, removeFavorite } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const companiesSectionRef = useRef<HTMLDivElement>(null);
  const [companies, setCompanies] = useState<CompanyFromAPI[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedSector, setSelectedSector] = useState<string | null>(searchParams.get('sector') || null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sort') as 'asc' | 'desc') || 'asc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(searchParams.get('fav') === '1');
  const [selectedCountry, setSelectedCountry] = useState<string>(searchParams.get('country') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState<number>(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [heroSettings, setHeroSettings] = useState<Record<string, string | null>>({});
  const [undervalued, setUndervalued] = useState<any[]>([]);
  const [overvalued, setOvervalued] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/companies')
      .then((res) => res.json())
      .then((data) => setCompanies(data))
      .catch(() => {});
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setHeroSettings(data);
        const uLimit = data.undervalued_limit || '5';
        const oLimit = data.overvalued_limit || '5';
        fetch(`/api/companies/undervalued?limit=${uLimit}`)
          .then((res) => res.json())
          .then((d) => setUndervalued(d))
          .catch(() => {});
        fetch(`/api/companies/overvalued?limit=${oLimit}`)
          .then((res) => res.json())
          .then((d) => setOvervalued(d))
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedCountry) params.country = selectedCountry;
    if (selectedSector) params.sector = selectedSector;
    if (sortOrder !== 'asc') params.sort = sortOrder;
    if (showFavoritesOnly) params.fav = '1';
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [searchTerm, selectedCountry, selectedSector, sortOrder, showFavoritesOnly, page]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
  }, [searchTerm, selectedCountry, selectedSector, sortOrder, showFavoritesOnly]);

  useEffect(() => {
    if (companies.length > 0 && searchParams.toString()) {
      setTimeout(() => {
        companiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [companies.length]);

  // Sync URL → state so searches from the navbar apply while already on this page
  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  // Scroll to companies section when arriving via navbar search (#companies)
  useEffect(() => {
    if (location.hash !== '#companies' || companies.length === 0) return;
    const timer = setTimeout(() => {
      companiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [location.hash, companies.length]);

  const favoriteCompanies = useMemo(() => {
    if (!favorites.length) return [];
    const favIds = new Set(favorites.map((f) => f.companyId));
    return companies.filter((c) => favIds.has(c.id));
  }, [favorites, companies]);

  const availableSectors = useMemo(() => {
    const sectorSet = new Set(companies.map((c) => c.sector).filter(Boolean));
    return Array.from(sectorSet).sort() as string[];
  }, [companies]);

  const availableCountries = useMemo(() => {
    const countrySet = new Set(companies.map((c) => c.country).filter(Boolean));
    return Array.from(countrySet).sort() as string[];
  }, [companies]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.companyId)), [favorites]);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter((c) => {
        if (showFavoritesOnly && !favoriteIds.has(c.id)) return false;

        if (selectedCountry && c.country !== selectedCountry) return false;

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
  }, [companies, searchTerm, selectedSector, sortOrder, showFavoritesOnly, favoriteIds, selectedCountry]);

  const paginatedCompanies = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCompanies.slice(start, start + PAGE_SIZE);
  }, [filteredCompanies, page]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, filteredCompanies.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
      <section className={`hero${heroSettings.hero_bg_url ? ' hero--has-bg' : ''}`} style={heroSettings.hero_bg_url ? { backgroundImage: `url(${heroSettings.hero_bg_url})` } : undefined}>
        <MarketTicker />
        <div className="hero-pattern" />
        <div className="hero-content">
          <div className="hero-main">
            <div className="hero-badge">
              <BarChart3 size={16} />
              {heroSettings.hero_badge || 'Análisis de Valor Intrínseco'}
            </div>
            <h1 className="hero-title">
              {(heroSettings.hero_title || 'Entiende el valor real de las empresas')
                .split(/( valor real)/i)
                .map((part, i) =>
                  part.toLowerCase() === ' valor real'
                    ? <span key={i} className="hero-title-gradient">{part}</span>
                    : <span key={i}>{i > 0 ? ' ' : ''}{part.trim()}</span>
                )}
            </h1>
            <p className="hero-subtitle">
              {heroSettings.hero_subtitle || 'Visualiza flujos de caja, gastos, reinversión y valoración con gráficos interactivos que hacen simple lo complejo.'}
            </p>
            <div className="hero-actions">
              <a href={heroSettings.hero_cta_primary_link || '#companies'} className="hero-btn-primary">
                {heroSettings.hero_cta_primary || 'Explorar Empresas'}
                <ArrowRight size={20} />
              </a>
              <a href={heroSettings.hero_cta_secondary_link || '#features'} className="hero-btn-secondary">
                {heroSettings.hero_cta_secondary || 'Saber más'}
              </a>
            </div>
          </div>
          <MarketClocks />
        </div>
        <ScrollIndicator />
        <div className="hero-glow" />
      </section>

      {/* Valuation Sections — Undervalued & Overvalued */}
      {(undervalued.length > 0 || overvalued.length > 0) && (
        <section className="valuation-section">
          <div className="valuation-inner">
            <div className="valuation-grid">
              {/* Undervalued */}
              {undervalued.length > 0 && (
                <div className="valuation-column">
                  <SectionReveal delay={0}>
                    <div className="valuation-header valuation-header--green">
                      <TrendingUp size={22} className="valuation-icon valuation-icon--green" />
                      <h2 className="valuation-title">{heroSettings.undervalued_title || 'Oportunidades de Inversión'}</h2>
                      <p className="valuation-subtitle">{heroSettings.undervalued_subtitle || 'Empresas con margen de seguridad positivo según nuestro análisis'}</p>
                    </div>
                  </SectionReveal>
                  <div className="valuation-list">
                    {undervalued.map((c: any, i: number) => (
                      <SectionReveal key={c.ticker} delay={40 + i * 60}>
                        <Link to={`/empresa/${c.ticker}?tab=valuation`} className="valuation-card valuation-card--green">
                          <div className="valuation-card-left">
                            {(c.logoUrl || companyLogoUrl(c.website)) ? (
                              <img src={c.logoUrl || companyLogoUrl(c.website) || ''} alt={c.ticker} className="valuation-avatar valuation-avatar--img" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('valuation-avatar--hidden'); }} />
                            ) : null}
                            <div className={`valuation-avatar valuation-avatar--green ${(c.logoUrl || companyLogoUrl(c.website)) ? 'valuation-avatar--hidden' : ''}`}>
                              {c.ticker.slice(0, 2)}
                            </div>
                            <div>
                              <div className="valuation-ticker">{c.ticker}</div>
                              <div className="valuation-name">{c.name}</div>
                            </div>
                          </div>
                          <div className="valuation-metrics">
                            <div className="valuation-metric">
                              <span className="valuation-metric-label">Precio</span>
                              <span className="valuation-metric-value">${c.currentPrice?.toFixed(2)}</span>
                            </div>
                            <div className="valuation-metric">
                              <span className="valuation-metric-label">Valor intrínseco</span>
                              <span className="valuation-metric-value">${c.intrinsicValue?.toFixed(2)}</span>
                              <span className="valuation-method-badge">{METHOD_NAMES[c.recommendedModel] || c.recommendedModel}</span>
                            </div>
                            <div className="valuation-metric valuation-metric--green">
                              <span className="valuation-metric-label">Margen de seguridad</span>
                              <span className="valuation-metric-value">+{(c.marginOfSafety * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </Link>
                      </SectionReveal>
                    ))}
                  </div>
                </div>
              )}

              {/* Overvalued */}
              {overvalued.length > 0 && (
                <div className="valuation-column">
                  <SectionReveal delay={100}>
                    <div className="valuation-header valuation-header--red">
                      <TrendingDown size={22} className="valuation-icon valuation-icon--red" />
                      <h2 className="valuation-title">{heroSettings.overvalued_title || 'Empresas Sobrevaloradas'}</h2>
                      <p className="valuation-subtitle">{heroSettings.overvalued_subtitle || 'Empresas que el mercado sobreestima según nuestro análisis'}</p>
                    </div>
                  </SectionReveal>
                  <div className="valuation-list">
                    {overvalued.map((c: any, i: number) => (
                      <SectionReveal key={c.ticker} delay={140 + i * 60}>
                        <Link to={`/empresa/${c.ticker}?tab=valuation`} className="valuation-card valuation-card--red">
                          <div className="valuation-card-left">
                            {(c.logoUrl || companyLogoUrl(c.website)) ? (
                              <img src={c.logoUrl || companyLogoUrl(c.website) || ''} alt={c.ticker} className="valuation-avatar valuation-avatar--img" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('valuation-avatar--hidden'); }} />
                            ) : null}
                            <div className={`valuation-avatar valuation-avatar--red ${(c.logoUrl || companyLogoUrl(c.website)) ? 'valuation-avatar--hidden' : ''}`}>
                              {c.ticker.slice(0, 2)}
                            </div>
                            <div>
                              <div className="valuation-ticker">{c.ticker}</div>
                              <div className="valuation-name">{c.name}</div>
                            </div>
                          </div>
                          <div className="valuation-metrics">
                            <div className="valuation-metric">
                              <span className="valuation-metric-label">Precio</span>
                              <span className="valuation-metric-value">${c.currentPrice?.toFixed(2)}</span>
                            </div>
                            <div className="valuation-metric">
                              <span className="valuation-metric-label">Valor intrínseco</span>
                              <span className="valuation-metric-value">${c.intrinsicValue?.toFixed(2)}</span>
                              <span className="valuation-method-badge">{METHOD_NAMES[c.recommendedModel] || c.recommendedModel}</span>
                            </div>
                            <div className="valuation-metric valuation-metric--red">
                              <span className="valuation-metric-label">Sobrevaloración</span>
                              <span className="valuation-metric-value">{(c.marginOfSafety * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </Link>
                      </SectionReveal>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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
      <section id="companies" className="companies-section" ref={companiesSectionRef}>
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
                      {(company.logoUrl || companyLogoUrl(company.website)) ? (
                        <img
                          src={company.logoUrl || companyLogoUrl(company.website)!}
                          alt={company.ticker}
                          className="favorites-card-avatar favorites-card-avatar--img"
                          loading="lazy" decoding="async"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('favorites-card-avatar--hidden'); }}
                        />
                      ) : null}
                      <div className={`favorites-card-avatar ${(company.logoUrl || companyLogoUrl(company.website)) ? 'favorites-card-avatar--hidden' : ''}`}>
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
                {availableCountries.length > 0 && (
                  <div className="country-filter-wrapper">
                    <Globe size={14} className="country-filter-icon" />
                    <select
                      className="country-filter"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                      <option value="">Todos los países</option>
                      {availableCountries.map((code) => (
                        <option key={code} value={code}>
                          {COUNTRY_NAMES[code] || code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                <div className="view-toggle">
                  <button className={`view-toggle-btn ${viewMode === 'grid' ? 'view-toggle-btn--active' : ''}`} onClick={() => setViewMode('grid')} title="Vista cuadrícula">
                    <LayoutGrid size={15} />
                  </button>
                  <button className={`view-toggle-btn ${viewMode === 'list' ? 'view-toggle-btn--active' : ''}`} onClick={() => setViewMode('list')} title="Vista lista">
                    <List size={15} />
                  </button>
                </div>
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

          <div className={viewMode === 'grid' ? 'companies-grid' : 'companies-list'}>
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
              <div className="companies-empty" style={viewMode === 'grid' ? { gridColumn: '1 / -1' } : undefined}>
                <Database size={48} className="companies-empty-icon" />
                <h3 className="companies-empty-title">Sin resultados</h3>
                <p className="companies-empty-desc">No se encontraron empresas para "{searchTerm}"</p>
              </div>
            ) : viewMode === 'grid' ? (
              paginatedCompanies.map((company, i) => {
                const color = colorNames[i % colorNames.length];
                return (
                  <SectionReveal key={company.ticker} delay={60 + i * 80}>
                    <div className="company-card">
                      <div className={`company-card-strip company-card-strip--${color}`} />
                      <div className="company-card-header">
                        {(company.logoUrl || companyLogoUrl(company.website)) ? (
                          <img
                            src={company.logoUrl || companyLogoUrl(company.website)!}
                            alt={company.ticker}
                            className={`company-card-avatar company-card-avatar--img`}
                            loading="lazy" decoding="async"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('company-card-avatar--hidden'); }}
                          />
                        ) : null}
                        <div className={`company-card-avatar company-card-avatar--${color} ${(company.logoUrl || companyLogoUrl(company.website)) ? 'company-card-avatar--hidden' : ''}`}>
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
                          Dashboard
                        </Link>
                        <Link to={`/empresa/${company.ticker}?tab=valuation`} className="company-card-btn company-card-btn--primary">
                          <TrendingUp size={14} />
                          Ver valoración
                        </Link>
                      </div>
                    </div>
                  </SectionReveal>
                );
              })
            ) : (
              paginatedCompanies.map((company, i) => (
                <SectionReveal key={company.ticker} delay={40 + i * 40}>
                  <div className="company-list-item">
                    {(company.logoUrl || companyLogoUrl(company.website)) ? (
                      <img
                        src={company.logoUrl || companyLogoUrl(company.website)!}
                        alt={company.ticker}
                        className="company-list-avatar company-list-avatar--img"
                        loading="lazy" decoding="async"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('company-list-avatar--hidden'); }}
                      />
                    ) : null}
                    <div className={`company-list-avatar ${(company.logoUrl || companyLogoUrl(company.website)) ? 'company-list-avatar--hidden' : ''}`}>
                      {company.ticker.slice(0, 2)}
                    </div>
                    <Link to={`/empresa/${company.ticker}`} className="company-list-info">
                      <div className="company-list-ticker">{company.ticker}</div>
                      <div className="company-list-name">{company.name}</div>
                    </Link>
                    <div className="company-list-meta">
                      <span className="company-list-sector">{company.sector || company.industry || 'N/A'}</span>
                      <span className="company-list-country">{COUNTRY_NAMES[company.country || ''] || company.country || ''}</span>
                    </div>
                    <div className="company-list-actions">
                      <button
                        className={`company-card-heart ${user && isFavorite(company.id) ? 'company-card-heart--active' : ''}`}
                        onClick={(e) => handleToggleFavorite(e, company.id)}
                        title={user && isFavorite(company.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                      >
                        <Heart size={16} fill={user && isFavorite(company.id) ? 'currentColor' : 'none'} />
                      </button>
                      <Link to={`/empresa/${company.ticker}`} className="company-list-link">Dashboard</Link>
                      <Link to={`/empresa/${company.ticker}?tab=valuation`} className="company-list-link company-list-link--accent">Valoración</Link>
                    </div>
                  </div>
                </SectionReveal>
              ))
            )}
          </div>

          {filteredCompanies.length > PAGE_SIZE && (
            <div className="pagination-wrap">
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => {
                    setPage(page - 1);
                    companiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  disabled={page <= 1}
                >
                  Anterior
                </button>
                <div className="pagination-pages">
                  {getPageNumbers(page, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`e${i}`} className="pagination-ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        className={`pagination-btn pagination-btn--num ${p === page ? 'pagination-btn--active' : ''}`}
                        onClick={() => {
                          setPage(p);
                          companiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>
                <button
                  className="pagination-btn"
                  onClick={() => {
                    setPage(page + 1);
                    companiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </button>
              </div>
              <p className="pagination-info">
                Mostrando {pageStart}–{pageEnd} de {filteredCompanies.length} empresas
              </p>
            </div>
          )}
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
