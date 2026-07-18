import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Settings, Menu, X, Home, BarChart3, LogIn, LogOut, Heart, Clock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/navbar.css';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

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

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon">
              <TrendingUp size={22} />
            </div>
            <span className="navbar-logo-text">DataInvestments</span>
          </Link>

          {/* Desktop links */}
          <div className="navbar-links">
            <Link to="/" className="navbar-link">Inicio</Link>
            <Link to="/empresa/AAPL" className="navbar-cta">
              Analizar
            </Link>
            {user && (
              <Link to="/favorites" className="navbar-icon-btn navbar-favorites-btn" title="Favoritos y Alarmas">
                <Heart size={18} />
                <Clock size={12} className="navbar-favorites-clock" />
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="navbar-icon-btn" title="Panel de Admin">
                <Settings size={20} />
              </Link>
            )}
            {user ? (
              <div className="navbar-user">
                <span className="navbar-user-name">
                  <User size={14} />
                  {user.name}
                </span>
                <button onClick={handleLogout} className="navbar-logout-btn" title="Cerrar sesión">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="navbar-icon-btn" title="Iniciar sesión">
                <LogIn size={20} />
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
                <LogIn size={20} />
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
