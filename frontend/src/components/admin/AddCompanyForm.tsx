import { useState } from 'react';
import { Search, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface Props {
  onCompanyAdded: () => void;
}

export function AddCompanyForm({ onCompanyAdded }: Props) {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ticker.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al añadir empresa');
        return;
      }

      const syncInfo = data.sync
        ? ` (${data.sync.financialRecords || 0} registros financieros)`
        : '';
      setSuccess(`${data.name || trimmed} añadida correctamente${syncInfo}`);
      setTicker('');
      onCompanyAdded();
      setTimeout(() => setSuccess(''), 5000);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form-row">
      <div className="admin-form-input-group">
        <Search size={18} className="admin-form-input-icon" />
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker de la empresa (ej: AAPL, MSFT, GOOGL)"
          className="admin-form-input"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        disabled={loading || !ticker.trim()}
        className="admin-form-btn"
      >
        {loading ? <Loader2 size={18} className="admin-spinner" /> : <Plus size={18} />}
        {loading ? 'Buscando...' : 'Añadir'}
      </button>

      {error && <span className="admin-form-message admin-form-message--error">{error}</span>}
      {success && (
        <span className="admin-form-message admin-form-message--success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <CheckCircle2 size={16} />
          {success}
        </span>
      )}
    </form>
  );
}
