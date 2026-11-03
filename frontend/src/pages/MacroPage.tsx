import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { MacroIndexCard } from '../components/macro/MacroIndexCard';
import { MacroPeriodSelector } from '../components/macro/MacroPeriodSelector';
import { MacroPremiumGate } from '../components/macro/MacroPremiumGate';
import {
  fetchMacroIndices,
  PremiumRequiredError,
  type MacroPeriod,
  type MacroRegion,
  type MacroResponse,
} from '../services/macroService';
import '../styles/macro.css';

const REGIONS: Array<{ id: MacroRegion; label: string }> = [
  { id: 'us', label: 'Estados Unidos' },
  { id: 'europe', label: 'Europa' },
  { id: 'asia', label: 'Asia-Pacífico' },
  { id: 'americas', label: 'América' },
];

function MacroSkeleton() {
  return (
    <div className="macro-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="macro-card macro-card--skeleton">
          <span className="macro-skeleton-line macro-skeleton-line--short" />
          <span className="macro-skeleton-line macro-skeleton-line--value" />
          <span className="macro-skeleton-chart" />
          <span className="macro-skeleton-line macro-skeleton-line--foot" />
        </div>
      ))}
    </div>
  );
}

export function MacroPage() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<MacroPeriod>('1m');
  const [data, setData] = useState<MacroResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setData(null);
      setError(null);
      setPremiumRequired(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMacroIndices(period)
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setPremiumRequired(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof PremiumRequiredError) {
          setPremiumRequired(true);
          setData(null);
          return;
        }
        setError(err instanceof Error ? err.message : 'Error de conexión');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, user?.subscriptionTier, user?.role, period, reloadNonce]);

  if (authLoading) {
    return (
      <div className="macro-page">
        <div className="macro-inner">
          <MacroSkeleton />
        </div>
      </div>
    );
  }

  if (!user || premiumRequired) {
    return (
      <div className="macro-page">
        <div className="macro-inner">
          <MacroPremiumGate loggedIn={!!user} />
        </div>
      </div>
    );
  }

  return (
    <div className="macro-page">
      <div className="macro-inner">
        <header className="macro-header">
          <div className="macro-header-copy">
            <span className="macro-eyebrow">Datos macro</span>
            <h1 className="macro-title">Principales índices del mundo</h1>
            <p className="macro-subtitle">
              Sigue la evolución de las principales bolsas del mundo y compara su comportamiento en
              distintos periodos. Cada tarjeta muestra el valor actual, la variación del periodo y una
              minigráfica de su evolución.
            </p>
          </div>

          <div className="macro-header-actions">
            <MacroPeriodSelector value={period} onChange={setPeriod} disabled={loading} />
            <button
              type="button"
              className="macro-refresh"
              onClick={() => setReloadNonce((n) => n + 1)}
              disabled={loading}
              title="Actualizar datos"
              aria-label="Actualizar datos macro"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {data?.stale && (
          <div className="macro-notice">
            No se han podido actualizar los datos. Se muestra la última caché disponible.
          </div>
        )}

        {error && !data && (
          <div className="macro-error">
            <AlertCircle size={18} />
            <div>
              <strong>No se pudieron cargar los datos macro</strong>
              <p>{error}</p>
            </div>
            <button type="button" className="macro-error-retry" onClick={() => setReloadNonce((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {!data && loading && <MacroSkeleton />}

        {data && (
          <>
            {REGIONS.map((region) => {
              const indices = data.indices.filter((index) => index.region === region.id);
              if (indices.length === 0) return null;

              return (
                <section key={region.id} className="macro-region">
                  <h2 className="macro-region-title">{region.label}</h2>
                  <div className="macro-grid">
                    {indices.map((index) => (
                      <MacroIndexCard key={index.symbol} index={index} period={period} />
                    ))}
                  </div>
                </section>
              );
            })}

            <div className="macro-meta">
              Fuente: {data.source} · Actualizado:{' '}
              {new Date(data.updatedAt).toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}{' '}
              · Los datos pueden tener retraso.
            </div>
          </>
        )}

        <DisclaimerBanner className="macro-disclaimer" />
      </div>
    </div>
  );
}
