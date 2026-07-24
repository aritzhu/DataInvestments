import { Briefcase, Plus } from 'lucide-react';

interface Props {
  type: 'portfolio' | 'holding';
  onAction?: () => void;
}

export function PortfolioEmptyState({ type, onAction }: Props) {
  if (type === 'portfolio') {
    return (
      <div className="pf-empty">
        <div className="pf-empty-icon">
          <Briefcase size={28} />
        </div>
        <h3 className="pf-empty-title">No tienes portfolios</h3>
        <p className="pf-empty-text">Crea tu primer portfolio para empezar a gestionar tus inversiones.</p>
        {onAction && (
          <button onClick={onAction} className="pf-empty-action">
            <Plus size={16} />
            Crear Portfolio
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pf-empty">
      <div className="pf-empty-icon">
        <Briefcase size={24} />
      </div>
      <h3 className="pf-empty-title">Este portfolio está vacío</h3>
      <p className="pf-empty-text">Añade tu primera posición para empezar a ver la valoración.</p>
      {onAction && (
        <button onClick={onAction} className="pf-empty-action">
          <Plus size={16} />
          Añadir Posición
        </button>
      )}
    </div>
  );
}
