import { useState, useEffect } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import * as portfolioService from '../services/portfolioService';
import type { Portfolio } from '../types/portfolio';
import { PortfolioCard } from '../components/portfolio/PortfolioCard';
import { PortfolioForm } from '../components/portfolio/PortfolioForm';
import { PortfolioEmptyState } from '../components/portfolio/PortfolioEmptyState';
import '../styles/portfolio.css';

export function PortfoliosPage() {
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

  return (
    <div className="pf-page">
      <div className="pf-header">
        <div className="pf-header-left">
          <div className="pf-header-icon">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="pf-title">Portfolios</h1>
            <p className="pf-subtitle">Gestiona tus carteras de inversión</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="pf-btn-primary">
          <Plus size={16} />
          Nuevo Portfolio
        </button>
      </div>

      {loading && <div className="pf-loading">Cargando...</div>}

      {!loading && portfolios.length === 0 && (
        <PortfolioEmptyState type="portfolio" onAction={() => setShowForm(true)} />
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
