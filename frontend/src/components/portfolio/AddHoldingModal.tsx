import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';

const getAuth = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

interface CompanyOption {
  id: string;
  ticker: string;
  name: string;
}

interface Props {
  onSave: (data: { companyId: string; quantity: number; averageCost: number }) => void;
  onClose: () => void;
  initial?: { holdingId?: string; ticker?: string; quantity?: number; averageCost?: number };
}

export function AddHoldingModal({ onSave, onClose, initial }: Props) {
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selected, setSelected] = useState<CompanyOption | null>(null);
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '');
  const [averageCost, setAverageCost] = useState(initial?.averageCost?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (search.length < 1) {
      setCompanies([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies?q=${encodeURIComponent(search)}`, { headers: getAuth() });
        if (res.ok) {
          const all: CompanyOption[] = await res.json();
          setCompanies(all.filter((c) =>
            c.ticker.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase())
          ).slice(0, 10));
        }
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected && !initial) return;
    if (!quantity || !averageCost) return;
    setSaving(true);
    try {
      if (selected) {
        await onSave({ companyId: selected.id, quantity: parseFloat(quantity), averageCost: parseFloat(averageCost) });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-modal-overlay" onClick={onClose}>
      <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pf-modal-header">
          <h2>{initial ? 'Editar Posición' : 'Añadir Posición'}</h2>
          <button onClick={onClose} className="pf-modal-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pf-modal-body">
            {!initial && (
              <div className="pf-form-group">
                <label>Empresa</label>
                <div className="pf-search-wrapper">
                  <Search size={16} className="pf-search-icon" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
                    className="pf-input pf-search-input"
                    placeholder="Buscar por ticker o nombre..."
                  />
                </div>
                {companies.length > 0 && !selected && (
                  <div className="pf-search-results">
                    {companies.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => { setSelected(c); setSearch(`${c.ticker} — ${c.name}`); setCompanies([]); }}
                        className="pf-search-result"
                      >
                        <span className="pf-search-result-ticker">{c.ticker}</span>
                        <span className="pf-search-result-name">{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selected && (
                  <div className="pf-search-selected">
                    {selected.ticker} — {selected.name}
                  </div>
                )}
              </div>
            )}

            <div className="pf-input-row">
              <div className="pf-form-group">
                <label>Cantidad</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  step="0.0001"
                  min="0"
                  className="pf-input"
                  placeholder="100"
                  required
                />
              </div>
              <div className="pf-form-group">
                <label>Precio medio de compra</label>
                <input
                  type="number"
                  value={averageCost}
                  onChange={(e) => setAverageCost(e.target.value)}
                  step="0.01"
                  min="0"
                  className="pf-input"
                  placeholder="150.00"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pf-modal-footer">
            <button type="button" onClick={onClose} className="pf-cancel-btn">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={(!selected && !initial) || !quantity || !averageCost || saving}
              className="pf-save-btn"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
