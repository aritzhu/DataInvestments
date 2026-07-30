import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Trash2, Loader2, ExternalLink, Clock, X, BarChart3 } from 'lucide-react';
import type { CompanyData } from './AdminPanel';
import { FullCoverageReport } from './FullCoverageReport';
import { apiFetch } from '../../utils/api';

interface Props {
  company: CompanyData;
  onDeleted: () => void;
  onSyncComplete: () => void;
}

export function CompanyRow({ company, onDeleted, onSyncComplete }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [years, setYears] = useState(company.sync?.yearsFetched || 5);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showCoverage, setShowCoverage] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await apiFetch(`/api/admin/sync/${company.ticker}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ years }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSyncResult(`Error: ${data.error}`);
        return;
      }

      const sources = [
        data.secSync && 'SEC',
        data.finnhubSync && 'Finnhub',
      ].filter(Boolean);

      setSyncResult(
        `Sincronizado: ${data.financialRecords} registros, ${years} años. Fuentes: ${sources.join(', ') || 'ninguna'}`
      );
      onSyncComplete();
      setTimeout(() => setSyncResult(null), 5000);
    } catch {
      setSyncResult('Error de conexión');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar ${company.ticker} y todos sus datos?`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/companies/${company.id}`, { method: 'DELETE' });
      onDeleted();
    } catch {
      console.error('Error deleting');
    } finally {
      setDeleting(false);
    }
  };

  const lastSync = company.sync?.lastSyncAt
    ? new Date(company.sync.lastSyncAt).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <>
    <tr>
      {/* Company Info */}
      <td>
        <div className="admin-row-info">
          <div className="admin-row-avatar">
            {company.ticker.slice(0, 2)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to={`/cashflow/${company.ticker}`} className="admin-row-ticker">
                {company.ticker}
              </Link>
              <Link to={`/cashflow/${company.ticker}`} style={{ color: '#94a3b8', transition: 'color 0.2s' }} title="Ver datos">
                <ExternalLink size={12} />
              </Link>
            </div>
            <p className="admin-row-name">{company.name}</p>
          </div>
        </div>
      </td>

      {/* Sector */}
      <td>
        <span style={{ fontSize: '0.875rem', color: '#475569' }}>{company.sector || '—'}</span>
      </td>

      {/* Records */}
      <td style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{company.financialRecords}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>financials</span>
        </div>
      </td>

      {/* Sync Status */}
      <td style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          {company.sync ? (
            <>
              <div className="admin-sync-dots">
                {company.sync.secSync && <div className="admin-sync-dot admin-sync-dot--filled" title="SEC" />}
                {company.sync.finnhubSync && <div className="admin-sync-dot admin-sync-dot--filled" title="Finnhub" style={{ background: '#7c3aed' }} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                <Clock size={10} />
                {lastSync}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{company.sync.yearsFetched} años</span>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <X size={10} />
              No sincronizado
            </span>
          )}
</div>
      </td>

      {/* Actions */}
      <td style={{ textAlign: 'center' }}>
        <div className="admin-actions" style={{ justifyContent: 'center' }}>
          <select
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="admin-year-select"
            disabled={syncing}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'año' : 'años'}</option>
            ))}
          </select>

          <button onClick={handleSync} disabled={syncing} className="admin-btn-sync">
            {syncing ? <Loader2 size={14} className="admin-spinner" /> : <RefreshCw size={14} />}
            {syncing ? 'Sync...' : 'Sync'}
          </button>

          <button onClick={() => setShowCoverage(true)} disabled={company.financialRecords === 0} className="admin-btn-sync" title="Ver cobertura detallada" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <BarChart3 size={14} />
          </button>

          <button onClick={handleDelete} disabled={deleting || syncing} className="admin-btn-delete" title="Eliminar">
            {deleting ? <Loader2 size={14} className="admin-spinner" /> : <Trash2 size={14} />}
          </button>
        </div>

        {syncResult && (
          <div className={`admin-sync-result ${syncResult.startsWith('Error') ? 'admin-sync-result--error' : 'admin-sync-result--success'}`}>
            {syncResult}
          </div>
        )}
      </td>

      {/* Close the tr and render modal separately */}
    </tr>
    
    {/* Render modal as sibling, not as child of tr */}
    {showCoverage && <FullCoverageReport ticker={company.ticker} onClose={() => setShowCoverage(false)} />}
  </>
  );
}
