import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Menu, X, Home, BarChart3, LogOut, Heart, Clock, Briefcase, User, Sun, Moon, Search, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTheme, toggleTheme } from '../utils/theme';
import { UsageIndicator } from './ui/UsageIndicator';
import '../styles/navbar.css';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getTheme());
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);
  const [siteFaviconUrl, setSiteFaviconUrl] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateTheme } = useAuth();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; ticker: string; name: string }[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const suggestionsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.site_logo_url) setSiteLogoUrl(data.site_logo_url);
        if (data.site_favicon_url) setSiteFaviconUrl(data.site_favicon_url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (siteFaviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteFaviconUrl;
    }
  }, [siteFaviconUrl]);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
  };

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setTheme(next);
    if (user) updateTheme(next);
  };

  // Suggestions debounce
  useEffect(() => {
    if (suggestionsTimeout.current) clearTimeout(suggestionsTimeout.current);
    if (search.length < 2) { setSuggestions([]); return; }
    suggestionsTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies?q=${encodeURIComponent(search)}&pageSize=6`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data.data) ? data.data.slice(0, 6) : []);
        }
      } catch { setSuggestions([]); }
    }, 250);
    return () => { if (suggestionsTimeout.current) clearTimeout(suggestionsTimeout.current); };
  }, [search]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = search.trim();
    navigate(term ? `/?search=${encodeURIComponent(term)}#companies` : '/#companies');
    setSearch('');
    setSuggestions([]);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            {siteLogoUrl ? (
              <img src={siteLogoUrl} alt="DataInvestments" className="navbar-logo-img" />
            ) : (
              <span className="navbar-logo-text">DataInvestments</span>
            )}
          </Link>

          {/* Desktop search */}
          <div className="navbar-search-wrapper" ref={searchRef} style={{ position: 'relative', flex: '0 1 20rem', maxWidth: '24rem' }}>
            <form className="navbar-search" onSubmit={handleSearch} role="search">
              <Search size={15} className="navbar-search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empresa..."
                aria-label="Buscar empresa"
              />
              <button type="submit" aria-label="Buscar">
                <Search size={15} />
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="navbar-search-suggestions">
                {suggestions.map((c) => (
                  <div
                    key={c.id}
                    className="navbar-search-suggestion"
                    onMouseDown={() => { setSearch(`${c.ticker} — ${c.name}`); setSuggestions([]); }}
                  >
                    <span className="navbar-search-suggestion-ticker">{c.ticker}</span>
                    <span className="navbar-search-suggestion-name">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop links */}
          <div className="navbar-links">
            <Link to="/" className="navbar-link">Inicio</Link>
            <Link to="/formacion" className="navbar-link">
              <GraduationCap size={14} />
              Formación
            </Link>
            <Link to="/empresa/AAPL" className="navbar-cta">
              Analizar
            </Link>
            <button
              onClick={handleToggleTheme}
              className="navbar-icon-btn navbar-theme-btn"
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <Link to="/favorites" className="navbar-icon-btn navbar-favorites-btn" title="Favoritos y Alarmas">
                <Heart size={18} />
                <Clock size={12} className="navbar-favorites-clock" />
              </Link>
            )}
            {user && (
              <Link to="/portfolios" className="navbar-icon-btn" title="Portfolios">
                <Briefcase size={18} />
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="navbar-icon-btn" title="Panel de Admin">
                <Settings size={20} />
              </Link>
            )}
            {user && <UsageIndicator />}
            {user ? (
              <div className="navbar-user">
                <Link to="/settings" className="navbar-user-name" title="Configuración">
                  <User size={14} />
                  {user.name}
                </Link>
                <button onClick={handleLogout} className="navbar-logout-btn" title="Cerrar sesión">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="navbar-icon-btn" title="Iniciar sesión">
                <User size={20} />
              </Link>
            )}
          </div>

          {/* Hamburger — mobile */}
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`navbar-mobile-menu ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
      >
        <div
          className="navbar-mobile-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="navbar-mobile-close">
            <button onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
              <X size={24} />
            </button>
          </div>

          <div className="navbar-mobile-search-wrapper" style={{ position: 'relative' }}>
            <form className="navbar-mobile-search" onSubmit={handleSearch} role="search">
              <Search size={15} className="navbar-mobile-search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empresa..."
                aria-label="Buscar empresa"
              />
              <button type="submit" aria-label="Buscar">
                <Search size={15} />
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="navbar-mobile-search-suggestions">
                {suggestions.map((c) => (
                  <div
                    key={c.id}
                    className="navbar-mobile-search-suggestion"
                    onMouseDown={() => { setSearch(`${c.ticker} — ${c.name}`); setSuggestions([]); }}
                  >
                    <span className="navbar-search-suggestion-ticker">{c.ticker}</span>
                    <span className="navbar-search-suggestion-name">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {user && (
            <div className="navbar-mobile-user">
              <User size={18} />
              <div>
                <div className="navbar-mobile-user-name">{user.name}</div>
                <div className="navbar-mobile-user-email">{user.email}</div>
              </div>
            </div>
          )}

          <nav className="navbar-mobile-nav">
            <Link to="/" className="navbar-mobile-link">
              <Home size={20} />
              Inicio
            </Link>
            <Link to="/formacion" className="navbar-mobile-link">
              <GraduationCap size={20} />
              Formación
            </Link>
            <Link to="/empresa/AAPL" className="navbar-mobile-link navbar-mobile-link--cta">
              <BarChart3 size={20} />
              Analizar
            </Link>
            {user && (
              <Link to="/favorites" className="navbar-mobile-link">
                <Heart size={20} />
                Favoritos y Alarmas
              </Link>
            )}
            {user && (
              <Link to="/portfolios" className="navbar-mobile-link">
                <Briefcase size={20} />
                Portfolios
              </Link>
            )}
            {user && (
              <Link to="/settings" className="navbar-mobile-link">
                <Settings size={20} />
                Configuración
              </Link>
            )}
            {user && (
              <UsageIndicator />
            )}
            {user && (
              <Link to="/plans" className="navbar-mobile-link">
                <BarChart3 size={20} />
                Mis planes
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="navbar-mobile-link">
                <Settings size={20} />
                Panel de Admin
              </Link>
            )}
            {user ? (
              <button onClick={handleLogout} className="navbar-mobile-link navbar-mobile-link--logout">
                <LogOut size={20} />
                Cerrar sesión
              </button>
            ) : (
              <Link to="/login" className="navbar-mobile-link">
                <User size={20} />
                Iniciar sesión
              </Link>
            )}
            <button onClick={handleToggleTheme} className="navbar-mobile-link">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
