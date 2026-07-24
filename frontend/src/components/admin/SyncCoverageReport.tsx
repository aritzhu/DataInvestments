import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, BarChart3, X, Loader2, Plus, Check } from 'lucide-react';
import { FIELD_LABELS, guessField } from '../../utils/tagDiscovery';

interface FieldEntry {
  fieldName: string;
  label: string;
  category: string;
  populated: boolean;
  value: number | null;
}

interface UnusedConcept {
  concept: string;
  count: number;
}

interface CoverageReportData {
  ticker: string;
  companyName: string;
  year: number;
  source: string;
  populatedFields: FieldEntry[];
  missingFields: FieldEntry[];
  unusedConcepts: UnusedConcept[];
  totalConceptsExtracted: number;
  mappedConcepts: number;
}

interface SyncCoverageReportProps {
  ticker: string;
  onClose: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  sec: 'SEC EDGAR',
  european: 'ESEF/XBRL (European)',
  fmp: 'Financial Modeling Prep',
  unknown: 'Unknown',
};

export function SyncCoverageReport({ ticker, onClose }: SyncCoverageReportProps) {
  const [report, setReport] = useState<CoverageReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingTag, setAddingTag] = useState<string | null>(null);
  const [addedTags, setAddedTags] = useState<Set<string>>(new Set());

  const handleAddTag = async (tag: string, fieldName: string) => {
    setAddingTag(tag);
    try {
      const colonIdx = tag.indexOf(':');
      const conceptName = colonIdx >= 0 ? tag.substring(colonIdx + 1) : tag;

      const res = await fetch('/api/admin/field-config');
      const { catalog } = await res.json();
      const field = catalog?.find((f: { fieldName: string }) => f.fieldName === fieldName);
      const existingCustom = field?.sources?.european?.customTags || [];
      const merged = [...new Set([...existingCustom, tag])];

      await fetch('/api/admin/field-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, source: 'european', customTags: merged }),
      });

      await fetch('/api/admin/concept-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptName, fieldName, source: 'european', confirmedBy: 'admin' }),
      });

      setAddedTags(prev => new Set(prev).add(tag));
    } catch (err) {
      console.error('Error adding tag:', err);
    } finally {
      setAddingTag(null);
    }
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/sync/${ticker}/coverage`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error fetching coverage');
        }
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [ticker]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '1rem', width: '100%', maxWidth: '48rem',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f1ff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={20} style={{ color: '#2563eb' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Cobertura de Datos — {ticker}
              </h3>
              {report && (
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Año {report.year} · Fuente: {SOURCE_LABELS[report.source] || report.source}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: '1.5rem' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem', color: '#64748b' }}>
              <Loader2 size={16} className="admin-spinner" />
              <span>Cargando reporte...</span>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
              <XCircle size={24} style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Error</p>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{error}</p>
            </div>
          )}

          {report && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary bar */}
              <div style={{
                display: 'flex', gap: '1rem', padding: '1rem',
                background: '#f8fafc', borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>{report.populatedFields.length}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Campos rellenados</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>{report.missingFields.length}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Campos no rellenados</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{report.totalConceptsExtracted}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Conceptos XBRL extraídos</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{report.mappedConcepts}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Conceptos mapeados</div>
                </div>
              </div>

              {/* Populated fields */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <CheckCircle2 size={14} /> Campos rellenados ({report.populatedFields.length})
                </h4>
                {report.populatedFields.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {report.populatedFields.map((f) => (
                      <span key={f.fieldName} style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: '#f0fdf4', color: '#166534',
                        borderRadius: '0.25rem', border: '1px solid #bbf7d0',
                        fontFamily: 'monospace',
                      }}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Ningún campo rellenado</p>
                )}
              </div>

              {/* Missing fields */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <XCircle size={14} /> Campos no rellenados ({report.missingFields.length})
                </h4>
                {report.missingFields.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {report.missingFields.map((f) => (
                      <span key={f.fieldName} style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: '#fef2f2', color: '#991b1b',
                        borderRadius: '0.25rem', border: '1px solid #fecaca',
                        fontFamily: 'monospace',
                      }}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Todos los campos esperados están rellenados</p>
                )}
              </div>

              {/* Unused concepts */}
              {report.unusedConcepts.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <AlertTriangle size={14} /> Conceptos XBRL sin mapping ({report.unusedConcepts.length})
                  </h4>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.375rem' }}>
                    Estos conceptos se encontraron en los datos pero no están mapeados a ningún campo interno.
                    Haz clic en "Añadir" para crear un mapping que se aplicará en futuras sincronizaciones.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '12rem', overflowY: 'auto' }}>
                    {report.unusedConcepts.slice(0, 50).map((u) => {
                      const guessed = guessField(u.concept);
                      const alreadyAdded = addedTags.has(u.concept);
                      return (
                        <div key={u.concept} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                          background: guessed ? '#fffbeb' : '#f8fafc',
                          border: `1px solid ${guessed ? '#fde68a' : '#e2e8f0'}`,
                          fontSize: '0.7rem',
                        }}>
                          <code style={{ color: '#475569', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.concept}
                          </code>
                          {guessed && (
                            <span style={{
                              padding: '0.1rem 0.3rem', borderRadius: '0.2rem',
                              background: '#fef3c7', fontSize: '0.6rem', color: '#475569', whiteSpace: 'nowrap',
                            }}>
                              → {FIELD_LABELS[guessed] || guessed}
                            </span>
                          )}
                          {guessed && (
                            <button
                              onClick={() => handleAddTag(u.concept, guessed)}
                              disabled={addingTag === u.concept || alreadyAdded}
                              style={{
                                background: alreadyAdded ? '#dcfce7' : '#2563eb',
                                color: alreadyAdded ? '#166534' : '#fff',
                                border: 'none', borderRadius: '0.2rem', padding: '0.15rem 0.35rem',
                                cursor: alreadyAdded ? 'default' : 'pointer',
                                fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem',
                                opacity: alreadyAdded ? 0.7 : 1,
                              }}
                            >
                              {alreadyAdded ? <Check size={9} /> : <Plus size={9} />}
                              {alreadyAdded ? 'Añadido' : 'Añadir'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {report.unusedConcepts.length > 50 && (
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                        +{report.unusedConcepts.length - 50} más...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
