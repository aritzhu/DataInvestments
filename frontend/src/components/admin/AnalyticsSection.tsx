import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { analyticsAPI } from '../../api/analytics';

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Visitas de página',
  company_view: 'Vistas de empresa',
  register: 'Registros',
  formacion_view: 'Visitas formación',
  course_view: 'Visitas curso',
  legal_view: 'Visitas legal',
};

export function AnalyticsSection() {
  const [overview, setOverview] = useState<any>(null);
  const [topEvents, setTopEvents] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getOverview(),
      analyticsAPI.getTopEvents(),
      analyticsAPI.getDaily(),
    ])
      .then(([ov, ev, dailyData]) => {
        setOverview(ov);
        setTopEvents(ev);
        setDaily(dailyData);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Cargando analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <p>Error al cargar analytics</p>
      </div>
    );
  }

  const maxCount = topEvents.length > 0 ? Math.max(...topEvents.map((e: any) => e.count)) : 1;
  const dailyMax = daily.length > 0 ? Math.max(...daily.map((d: any) => d.count)) : 1;

  return (
    <div>
      <a
        href="https://analytics.google.com/analytics/web/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.5rem 1rem',
          background: 'var(--primary)',
          color: 'white',
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.8rem',
          textDecoration: 'none',
          marginBottom: 20,
        }}
      >
        <ExternalLink size={16} /> Ver en Google Analytics
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Eventos — Hoy', value: overview?.today?.events ?? 0 },
          { label: 'Eventos — Semana', value: overview?.week?.events ?? 0 },
          { label: 'Eventos — Mes', value: overview?.month?.events ?? 0 },
          { label: 'Vistas empresa — Hoy', value: overview?.today?.companyViews ?? 0 },
          { label: 'Vistas empresa — Semana', value: overview?.week?.companyViews ?? 0 },
          { label: 'Vistas empresa — Mes', value: overview?.month?.companyViews ?? 0 },
        ].map((card, i) => (
          <div key={i} style={{ background: 'var(--bg-card, var(--surface-2))', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-tertiary)' }}>{card.label}</h4>
            <p style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {topEvents.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 600 }}>Top Eventos</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Evento</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '2px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Conteo</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid var(--border)', width: '40%' }}></th>
              </tr>
            </thead>
            <tbody>
              {topEvents.map((e: any) => (
                <tr key={e.event}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{EVENT_LABELS[e.event] || e.event}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 600 }}>{e.count}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(e.count / maxCount) * 100}%`, background: 'var(--primary, #2563eb)', borderRadius: 4 }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {daily.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 600 }}>Tendencia diaria</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80, marginBottom: 24 }}>
            {daily.map((d: any) => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    height: `${(d.count / dailyMax) * 100}%`,
                    minHeight: d.count > 0 ? 4 : 0,
                    background: 'var(--primary, #2563eb)',
                    borderRadius: '2px 2px 0 0',
                    opacity: 0.7,
                  }}
                  title={`${d.date}: ${d.count}`}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {overview?.today?.events === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Sin datos aún. Los eventos empezarán a registrarse cuando los usuarios naveguen por la web.</p>
      )}
    </div>
  );
}
