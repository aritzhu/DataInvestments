import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ProgressUpdate {
  current: number;
  total: number;
  ticker: string;
  status: 'adding' | 'syncing' | 'done' | 'skipped' | 'error';
  message?: string;
}

interface ImportComplete {
  success: string[];
  skipped: string[];
  failed: Array<{ ticker: string; error: string }>;
}

interface Props {
  progress: ProgressUpdate | null;
  complete: ImportComplete | null;
  isImporting: boolean;
}

export function BulkImportProgress({ progress, complete, isImporting }: Props) {
  if (!isImporting && !complete) return null;

  const percent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="bulk-progress">
      {isImporting && progress && (
        <>
          <div className="bulk-progress-header">
            <Loader2 size={16} className="admin-spinner" />
            <span>
              {progress.status === 'syncing' ? 'Sincronizando' : 'Importando'} <strong>{progress.ticker}</strong> ({progress.current}/{progress.total})
              {progress.message && progress.status !== 'syncing' && <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.375rem' }}>- {progress.message}</span>}
            </span>
          </div>
          <div className="bulk-progress-bar-track">
            <div className="bulk-progress-bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="bulk-progress-bar-label">{percent}%</div>
        </>
      )}

      {complete && (
        <div className="bulk-results">
          <div className="bulk-results-summary">
            {complete.success.length > 0 && (
              <span className="bulk-badge bulk-badge--success">
                <CheckCircle2 size={14} />
                {complete.success.length} importadas
              </span>
            )}
            {complete.skipped.length > 0 && (
              <span className="bulk-badge bulk-badge--skipped">
                <AlertCircle size={14} />
                {complete.skipped.length} omitidas
              </span>
            )}
            {complete.failed.length > 0 && (
              <span className="bulk-badge bulk-badge--error">
                <XCircle size={14} />
                {complete.failed.length} fallidas
              </span>
            )}
          </div>

          {complete.failed.length > 0 && (
            <div className="bulk-errors">
              <p className="bulk-errors-title">Errores:</p>
              <div className="bulk-errors-list">
                {complete.failed.map((f) => (
                  <span key={f.ticker} className="bulk-error-item">
                    <strong>{f.ticker}</strong>: {f.error}
                  </span>
                ))}
              </div>
            </div>
          )}

          {complete.success.length > 0 && (
            <p className="bulk-success-tickers">
              {complete.success.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
