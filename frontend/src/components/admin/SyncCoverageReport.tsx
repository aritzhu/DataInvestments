import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, BarChart3, X, Loader2, Plus, Check } from 'lucide-react';
import { FIELD_LABELS, guessField } from '../../utils/tagDiscovery';
import { apiFetch } from '../../utils/api';

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

      const res = await apiFetch('/api/admin/field-config');
      const { catalog } = await res.json();
      const field = catalog?.find((f: { fieldName: string }) => f.fieldName === fieldName);
      const existingCustom = field?.sources?.european?.customTags || [];
      const merged = [...new Set([...existingCustom, tag])];

      await apiFetch('/api/admin/field-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, source: 'european', customTags: merged }),
      });

      await apiFetch('/api/admin/concept-mappings', {
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
        const res = await apiFetch(`/api/admin/sync/${ticker}/coverage`);
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
          background: 'var(--surface-1)', borderRadius: '1rem', width: '100%', maxWidth: '48rem',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-default)',
          background: 'linear-gradient(135deg, var(--blue-pale) 0%, var(--blue-pale) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--info)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Cobertura de Datos — {ticker}
              </h3>
              {report && (
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Año {report.year} · Fuente: {SOURCE_LABELS[report.source] || report.source}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: '1.5rem' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem', color: 'var(--text-tertiary)' }}>
              <Loader2 size={16} className="admin-spinner" />
              <span>Cargando reporte...</span>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--red)' }}>
              <XCircle size={24} style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Error</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{error}</p>
            </div>
          )}

          {report && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary bar */}
              <div style={{
                display: 'flex', gap: '1rem', padding: '1rem',
                background: 'var(--surface-2)', borderRadius: '0.75rem',
                border: '1px solid var(--border-default)',
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--blue-light)' }}>{report.populatedFields.length}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Campos rellenados</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-default)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--red)' }}>{report.missingFields.length}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Campos no rellenados</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-default)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--amber)' }}>{report.totalConceptsExtracted}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Conceptos XBRL extraídos</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-default)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--info)' }}>{report.mappedConcepts}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Conceptos mapeados</div>
                </div>
              </div>

              {/* Populated fields */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blue-light)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <CheckCircle2 size={14} /> Campos rellenados ({report.populatedFields.length})
                </h4>
                {report.populatedFields.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {report.populatedFields.map((f) => (
                      <span key={f.fieldName} style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: 'var(--blue-pale)', color: 'var(--blue-light)',
                        borderRadius: '0.25rem', border: '1px solid var(--blue-line)',
                        fontFamily: 'monospace',
                      }}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Ningún campo rellenado</p>
                )}
              </div>

              {/* Missing fields */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--red)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <XCircle size={14} /> Campos no rellenados ({report.missingFields.length})
                </h4>
                {report.missingFields.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {report.missingFields.map((f) => (
                      <span key={f.fieldName} style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: 'var(--red-pale)', color: 'var(--red-deep)',
                        borderRadius: '0.25rem', border: '1px solid var(--red-line)',
                        fontFamily: 'monospace',
                      }}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Todos los campos esperados están rellenados</p>
                )}
              </div>

              {/* Unused concepts */}
              {report.unusedConcepts.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--amber)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <AlertTriangle size={14} /> Conceptos XBRL sin mapping ({report.unusedConcepts.length})
                  </h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.375rem' }}>
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
                          background: guessed ? 'var(--amber-pale)' : 'var(--surface-2)',
                          border: `1px solid ${guessed ? 'var(--amber-line)' : 'var(--border-default)'}`,
                          fontSize: '0.7rem',
                        }}>
                          <code style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.concept}
                          </code>
                          {guessed && (
                            <span style={{
                              padding: '0.1rem 0.3rem', borderRadius: '0.2rem',
                              background: 'var(--amber-pale)', fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                            }}>
                              → {FIELD_LABELS[guessed] || guessed}
                            </span>
                          )}
                          {guessed && (
                            <button
                              onClick={() => handleAddTag(u.concept, guessed)}
                              disabled={addingTag === u.concept || alreadyAdded}
                              style={{
                                background: alreadyAdded ? 'var(--blue-pale)' : 'var(--info)',
                                color: alreadyAdded ? 'var(--blue-light)' : '#fff',
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
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
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
