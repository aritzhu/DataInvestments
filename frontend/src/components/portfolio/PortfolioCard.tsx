import { Link } from 'react-router-dom';
import { Briefcase, ChevronRight } from 'lucide-react';
import type { Portfolio } from '../../types/portfolio';

interface Props {
  portfolio: Portfolio;
}

export function PortfolioCard({ portfolio }: Props) {
  const hasInvested = (portfolio.totalInvested ?? 0) > 0;

  return (
    <Link to={`/portfolios/${portfolio.id}`} className="pf-card">
      <div className="pf-card-top">
        <div className="pf-card-left">
          <div className="pf-card-icon">
            <Briefcase size={18} />
          </div>
          <div>
            <h3 className="pf-card-name">{portfolio.name}</h3>
            {portfolio.description && (
              <p className="pf-card-desc">{portfolio.description}</p>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="pf-card-arrow" />
      </div>

      <div className="pf-card-meta">
        <div>
          <span className="pf-card-meta-label">Posiciones: </span>
          <span className="pf-card-meta-value">{portfolio._count?.holdings ?? 0}</span>
        </div>
        {hasInvested && (
          <div>
            <span className="pf-card-meta-label">Invertido: </span>
            <span className="pf-card-meta-value">
              ${(portfolio.totalInvested ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
