import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus } from 'lucide-react';
import * as portfolioService from '../services/portfolioService';
import type { Portfolio } from '../types/portfolio';
import { PortfolioCard } from '../components/portfolio/PortfolioCard';
import { PortfolioForm } from '../components/portfolio/PortfolioForm';
import { PortfolioEmptyState } from '../components/portfolio/PortfolioEmptyState';
import { InfoButton } from '../components/ui/InfoButton';
import { INFO } from '../utils/infoContent';
import { useAuth } from '../contexts/AuthContext';
import '../styles/portfolio.css';

export function PortfoliosPage() {
  const { planLimits, usage, canCreatePortfolio } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchPortfolios = async () => {
    try {
      const data = await portfolioService.listPortfolios();
      setPortfolios(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchPortfolios(); }, []);

  const handleCreate = async (data: { name: string; description?: string }) => {
    await portfolioService.createPortfolio(data);
    setShowForm(false);
    fetchPortfolios();
  };

  const handleNewClick = () => {
    if (!canCreatePortfolio) return;
    setShowForm(true);
  };

  return (
    <div className="pf-page">
      <div className="pf-header">
        <div className="pf-header-left">
          <div className="pf-header-icon">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="pf-title"><span className="info-label-row">Portfolios <InfoButton content={INFO['portfolio.intro']} /></span></h1>
            <p className="pf-subtitle">
              Gestiona tus carteras de inversión
              {planLimits && planLimits.portfolios !== -1 && (
                <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                  ({portfolios.length}/{planLimits.portfolios})
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={handleNewClick}
          className="pf-btn-primary"
          disabled={!canCreatePortfolio}
          title={!canCreatePortfolio ? 'Límite de portfolios alcanzado' : 'Nuevo Portfolio'}
        >
          <Plus size={16} />
          Nuevo Portfolio
        </button>
      </div>

      {planLimits && planLimits.portfolios !== -1 && usage && usage.portfolios >= planLimits.portfolios && (
        <div className="fav-limit-banner">
          Límite de portfolios alcanzado ({usage.portfolios}/{planLimits.portfolios}).{' '}
          <Link to="/plans" className="fav-limit-link">Mejora tu plan</Link>
        </div>
      )}

      {loading && <div className="pf-loading">Cargando...</div>}

      {!loading && portfolios.length === 0 && (
        <PortfolioEmptyState type="portfolio" onAction={handleNewClick} />
      )}

      {!loading && portfolios.length > 0 && (
        <div className="pf-grid">
          {portfolios.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      )}

      {showForm && (
        <PortfolioForm
          title="Nuevo Portfolio"
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
