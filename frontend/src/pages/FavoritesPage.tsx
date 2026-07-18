import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, Bell, Trash2, CheckCircle, Circle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getVerdict, VERDICT_COLORS, VERDICT_BG, VERDICT_BORDER } from '../utils/valuation';
import '../styles/favorites.css';

interface Alarm {
  id: string;
  companyId: string;
  targetVerdict: string;
  lastVerdict: string | null;
  lastPrice: number | null;
  lastCheckedAt: string | null;
  triggered: boolean;
  company: {
    id: string;
    ticker: string;
    name: string;
    sector: string | null;
    industry: string | null;
  };
}

type TabId = 'favorites' | 'alarms';

const VERDICT_LABELS: Record<string, string> = {
  buy: 'Subvalorada',
  hold: 'Justa',
  sell: 'Sobrevalorada',
  na: 'Sin datos',
};

export function FavoritesPage() {
  const { favorites, removeFavorite } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('favorites');
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [alarmsLoading, setAlarmsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/alarms', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setAlarms(data))
      .catch(() => {})
      .finally(() => setAlarmsLoading(false));
  }, []);

  const handleDeleteAlarm = async (alarmId: string) => {
    if (!confirm('¿Eliminar esta alarma?')) return;
    const res = await fetch(`/api/alarms/${alarmId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setAlarms((prev) => prev.filter((a) => a.id !== alarmId));
    }
  };

  const favoriteCompanies = useMemo(() => {
    return favorites.map((f) => {
      const stock = f.company.stockMetrics?.[0];
      return { ...f, stock };
    });
  }, [favorites]);

  const formatNumber = (n: number | null | undefined): string => {
    if (n == null) return 'N/D';
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const formatPercent = (n: number | null | undefined): string => {
    if (n == null) return 'N/D';
    return `${(n * 100).toFixed(1)}%`;
  };

  return (
    <div className="fav-page">
      <div className="fav-header">
        <div className="fav-header-icon">
          <Heart size={24} />
          <Clock size={16} className="fav-header-clock" />
        </div>
        <div>
          <h1 className="fav-title">Favoritos y Alarmas</h1>
          <p className="fav-subtitle">Gestiona tus empresas favoritas y sus alarmas de valoración</p>
        </div>
      </div>

      <div className="fav-tabs">
        <button
          className={`fav-tab ${activeTab === 'favorites' ? 'fav-tab--active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <Heart size={16} />
          Favoritos
          <span className="fav-tab-count">{favorites.length}</span>
        </button>
        <button
          className={`fav-tab ${activeTab === 'alarms' ? 'fav-tab--active' : ''}`}
          onClick={() => setActiveTab('alarms')}
        >
          <Bell size={16} />
          Alarmas
          <span className="fav-tab-count">{alarms.length}</span>
        </button>
      </div>

      {activeTab === 'favorites' && (
        <div className="fav-content">
          {favoriteCompanies.length === 0 ? (
            <div className="fav-empty">
              <Heart size={48} className="fav-empty-icon" />
              <h3>No tienes favoritos aún</h3>
              <p>Busca empresas en la página principal y haz clic en el corazón para añadirlas a tus favoritos.</p>
              <Link to="/" className="fav-empty-link">Explorar empresas</Link>
            </div>
          ) : (
            <div className="fav-grid">
              {favoriteCompanies.map((fav) => {
                const stock = fav.stock;
                const currentPrice = stock?.currentPrice ?? 0;
                const intrinsicValue = stock?.intrinsicValue ?? null;
                const marginOfSafety = stock?.marginOfSafety ?? null;
                const { verdict, upside, label } = getVerdict(intrinsicValue, currentPrice);
                const alarm = alarms.find((a) => a.companyId === fav.companyId);

                return (
                  <div
                    key={fav.id}
                    className={`fav-card ${alarm ? (alarm.triggered ? 'fav-card--triggered' : 'fav-card--pending') : ''}`}
                  >
                    <div className="fav-card-top">
                      <Link to={`/empresa/${fav.company.ticker}`} className="fav-card-avatar">
                        {fav.company.ticker.slice(0, 2)}
                      </Link>
                      <div className="fav-card-info">
                        <Link to={`/empresa/${fav.company.ticker}`} className="fav-card-ticker">
                          {fav.company.ticker}
                        </Link>
                        <div className="fav-card-name">{fav.company.name}</div>
                        <div className="fav-card-sector">{fav.company.sector || fav.company.industry || ''}</div>
                      </div>
                      <button
                        className="fav-card-heart"
                        onClick={() => removeFavorite(fav.companyId)}
                        title="Quitar de favoritos"
                      >
                        <Heart size={16} fill="currentColor" />
                      </button>
                    </div>

                    <div className="fav-card-divider" />

                    <div className="fav-card-metrics">
                      <div className="fav-metric">
                        <span className="fav-metric-label">Precio actual</span>
                        <span className="fav-metric-value">{formatNumber(currentPrice)}</span>
                      </div>
                      <div className="fav-metric">
                        <span className="fav-metric-label">Valor intrínseco</span>
                        <span className="fav-metric-value">{intrinsicValue != null ? formatNumber(intrinsicValue) : 'N/D'}</span>
                      </div>
                      <div className="fav-metric">
                        <span className="fav-metric-label">Margen seguridad</span>
                        <span className="fav-metric-value">{marginOfSafety != null ? formatPercent(marginOfSafety) : 'N/D'}</span>
                      </div>
                    </div>

                    <div className="fav-card-verdict" style={{ background: VERDICT_BG[verdict], borderColor: VERDICT_BORDER[verdict] }}>
                      <span className="fav-verdict-badge" style={{ color: VERDICT_COLORS[verdict] }}>
                        {verdict === 'buy' && '▲'}
                        {verdict === 'hold' && '●'}
                        {verdict === 'sell' && '▼'}
                        {' '}{label}
                      </span>
                      {upside != null && (
                        <span className="fav-verdict-upside" style={{ color: VERDICT_COLORS[verdict] }}>
                          {upside > 0 ? '+' : ''}{(upside * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {alarm && (
                      <div className={`fav-alarm-status ${alarm.triggered ? 'fav-alarm-status--triggered' : ''}`}>
                        {alarm.triggered ? <CheckCircle size={14} /> : <Circle size={14} />}
                        <span>
                          Alarma: {VERDICT_LABELS[alarm.targetVerdict] || alarm.targetVerdict}
                          {' — '}
                          {alarm.triggered ? 'Alcanzado' : 'Pendiente'}
                        </span>
                      </div>
                    )}

                    <div className="fav-card-extra">
                      {stock?.peRatio != null && (
                        <span className="fav-extra-pill">PE {stock.peRatio.toFixed(1)}</span>
                      )}
                      {stock?.pbRatio != null && (
                        <span className="fav-extra-pill">PB {stock.pbRatio.toFixed(1)}</span>
                      )}
                      {stock?.marketCap != null && (
                        <span className="fav-extra-pill">{formatNumber(stock.marketCap)}</span>
                      )}
                    </div>

                    <div className="fav-card-actions">
                      <Link to={`/empresa/${fav.company.ticker}#valoracion`} className="fav-action-btn">
                        Ver valoración
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'alarms' && (
        <div className="fav-content">
          {alarmsLoading ? (
            <div className="fav-loading">Cargando alarmas...</div>
          ) : alarms.length === 0 ? (
            <div className="fav-empty">
              <Bell size={48} className="fav-empty-icon" />
              <h3>No tienes alarmas configuradas</h3>
              <p>Crea una alarma desde la pestaña de valoración de cualquier empresa.</p>
            </div>
          ) : (
            <div className="alarm-list">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`alarm-card ${alarm.triggered ? 'alarm-card--triggered' : 'alarm-card--pending'}`}
                >
                  <div className="alarm-card-header">
                    <Link to={`/empresa/${alarm.company.ticker}`} className="alarm-card-ticker">
                      {alarm.company.ticker}
                    </Link>
                    <span className="alarm-card-name">{alarm.company.name}</span>
                    <div className="alarm-card-actions">
                      <button className="alarm-delete-btn" onClick={() => handleDeleteAlarm(alarm.id)} title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="alarm-card-body">
                    <div className="alarm-field">
                      <span className="alarm-field-label">Objetivo</span>
                      <span className="alarm-field-value">
                        {VERDICT_LABELS[alarm.targetVerdict] || alarm.targetVerdict}
                      </span>
                    </div>
                    <div className="alarm-field">
                      <span className="alarm-field-label">Estado</span>
                      <span className={`alarm-field-value ${alarm.triggered ? 'alarm-field-value--triggered' : ''}`}>
                        {alarm.triggered ? '✓ Alcanzado' : '○ Pendiente'}
                      </span>
                    </div>
                    {alarm.lastVerdict && (
                      <div className="alarm-field">
                        <span className="alarm-field-label">Último veredicto</span>
                        <span className="alarm-field-value">
                          {VERDICT_LABELS[alarm.lastVerdict] || alarm.lastVerdict}
                        </span>
                      </div>
                    )}
                    {alarm.lastPrice && (
                      <div className="alarm-field">
                        <span className="alarm-field-label">Precio checkeado</span>
                        <span className="alarm-field-value">${alarm.lastPrice.toFixed(2)}</span>
                      </div>
                    )}
                    {alarm.lastCheckedAt && (
                      <div className="alarm-field">
                        <span className="alarm-field-label">Última verificación</span>
                        <span className="alarm-field-value">
                          {new Date(alarm.lastCheckedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
