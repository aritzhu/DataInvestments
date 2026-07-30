import { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp, Search, Plus, X } from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface SourceData {
  baseTags: string[];
  customTags: string[];
  active: boolean;
}

interface FieldCatalogItem {
  fieldName: string;
  label: string;
  category: string;
  description: string;
  sources: {
    sec: SourceData;
    european: SourceData;
    yahoo: SourceData;
  };
}

interface CategoryInfo {
  id: string;
  label: string;
  color: string;
}

interface FieldConfigData {
  catalog: FieldCatalogItem[];
  categories: CategoryInfo[];
}

interface ApplyProgress {
  type: 'start' | 'progress' | 'complete' | 'error';
  total?: number;
  completed?: number;
  succeeded?: number;
  failed?: number;
  ticker?: string;
  error?: string;
}

type SourceKey = 'sec' | 'european' | 'yahoo';

const SOURCE_LABELS: Record<SourceKey, string> = {
  sec: 'SEC EDGAR',
  european: 'IFRS / European',
  yahoo: 'Yahoo Finance',
};

const SOURCE_COLORS: Record<SourceKey, { bg: string; text: string; border: string }> = {
  sec: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  european: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  yahoo: { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
};

export function FieldConfigPanel() {
  const [data, setData] = useState<FieldConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<ApplyProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<string, { source: SourceKey; customTags?: string[]; active?: boolean }>>(new Map());
  const [newTagInputs, setNewTagInputs] = useState<Map<string, string>>(new Map());

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/field-config');
      if (!res.ok) throw new Error('Error fetching field config');
      const result = await res.json();
      setData(result);
      setExpandedCategories(new Set(result.categories.map((c: CategoryInfo) => c.id)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const getPendingState = (fieldName: string, source: SourceKey): { customTags?: string[]; active?: boolean } | undefined => {
    const key = `${fieldName}:${source}`;
    const change = pendingChanges.get(key);
    if (!change || change.source !== source) return undefined;
    return { customTags: change.customTags, active: change.active };
  };

  const getSourceActive = (field: FieldCatalogItem, source: SourceKey): boolean => {
    const pending = getPendingState(field.fieldName, source);
    if (pending?.active !== undefined) return pending.active;
    return field.sources[source].active;
  };

  const getSourceCustomTags = (field: FieldCatalogItem, source: SourceKey): string[] => {
    const pending = getPendingState(field.fieldName, source);
    if (pending?.customTags !== undefined) return pending.customTags;
    return field.sources[source].customTags;
  };

  const handleToggleSource = (fieldName: string, source: SourceKey, active: boolean) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      const key = `${fieldName}:${source}`;
      const existing = next.get(key);
      if (existing && existing.source === source) {
        next.set(key, { ...existing, active });
      } else {
        next.set(key, { source, active });
      }
      return next;
    });
  };

  const handleUpdateCustomTags = (fieldName: string, source: SourceKey, customTags: string[]) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      const key = `${fieldName}:${source}`;
      const existing = next.get(key);
      if (existing && existing.source === source) {
        next.set(key, { ...existing, customTags });
      } else {
        next.set(key, { source, customTags });
      }
      return next;
    });
  };

  const handleRemoveTag = (fieldName: string, source: SourceKey, tagToRemove: string) => {
    const currentTags = getSourceCustomTags(
      data!.catalog.find(f => f.fieldName === fieldName)!,
      source
    );
    handleUpdateCustomTags(fieldName, source, currentTags.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) return;
    try {
      setSaving(true);
      const properUpdates: Array<{ fieldName: string; source: string; customTags?: string[]; active?: boolean }> = [];
      for (const [key, change] of pendingChanges.entries()) {
        const [fieldName] = key.split(':');
        properUpdates.push({
          fieldName,
          source: change.source,
          ...(change.customTags !== undefined && { customTags: change.customTags }),
          ...(change.active !== undefined && { active: change.active }),
        });
      }

      const res = await apiFetch('/api/admin/field-config/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: properUpdates }),
      });
      if (!res.ok) throw new Error('Error saving field config');

      // Update local state
      setData(prev => {
        if (!prev) return prev;
        const newCatalog = prev.catalog.map(f => {
          const newSources = { ...f.sources } as FieldCatalogItem['sources'];
          for (const source of ['sec', 'european', 'yahoo'] as SourceKey[]) {
            const key = `${f.fieldName}:${source}`;
            const change = pendingChanges.get(key);
            if (change && change.source === source) {
              newSources[source] = {
                ...newSources[source],
                ...(change.active !== undefined && { active: change.active }),
                ...(change.customTags !== undefined && { customTags: change.customTags }),
              };
            }
          }
          return { ...f, sources: newSources };
        });
        return { ...prev, catalog: newCatalog };
      });

      setPendingChanges(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (applying) return;
    try {
      setApplying(true);
      setApplyProgress({ type: 'start', total: 0 });
      const res = await apiFetch('/api/admin/field-config/apply', { method: 'POST' });
      if (!res.ok) throw new Error('Error applying field config');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              setApplyProgress(JSON.parse(line.slice(6)));
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      setApplyProgress({ type: 'error', error: err instanceof Error ? err.message : 'Error desconocido' });
    } finally {
      setApplying(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
      return next;
    });
  };

  const toggleField = (fieldName: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldName)) next.delete(fieldName); else next.add(fieldName);
      return next;
    });
  };

  const filteredCatalog = data?.catalog.filter(f => {
    const matchesSearch = searchTerm === '' ||
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const groupedFields: Record<string, FieldCatalogItem[]> = {};
  for (const field of filteredCatalog) {
    if (!groupedFields[field.category]) groupedFields[field.category] = [];
    groupedFields[field.category].push(field);
  }

  const totalPending = pendingChanges.size;

  if (loading) {
    return (
      <div className="admin-form-section">
        <div className="stats-loading">
          <div className="stats-loading-spinner" />
          <span style={{ fontSize: '0.875rem' }}>Cargando configuración de campos...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="admin-form-section">
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <p style={{ fontWeight: 600 }}>Error cargando configuración</p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>{error}</p>
          <button onClick={fetchConfig} className="admin-form-btn" style={{ marginTop: '1rem' }}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-form-section" style={{ border: '2px solid #e0e7ff', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Settings size={18} />
          </div>
          <div>
            <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Configuración de Tags por Fuente</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              {data?.catalog.length || 0} campos · SEC es el modelo de referencia
            </p>
          </div>
        </div>
        <button onClick={fetchConfig} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }} title="Actualizar">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar campos..."
            className="admin-form-input"
            style={{ paddingLeft: '2rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={handleSave}
          disabled={saving || totalPending === 0}
          className="admin-form-btn"
          style={{
            background: totalPending > 0 ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' : '#94a3b8',
            opacity: totalPending === 0 ? 0.5 : 1,
          }}
        >
          {saving ? 'Guardando...' : `Guardar cambios (${totalPending})`}
        </button>
        <button
          onClick={handleApply}
          disabled={applying || totalPending > 0}
          className="admin-form-btn"
          style={{
            background: totalPending === 0 ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#94a3b8',
            opacity: totalPending > 0 ? 0.5 : 1,
          }}
        >
          {applying ? 'Re-sincronizando...' : 'Aplicar y Re-sincronizar'}
        </button>
      </div>

      {/* Apply Progress */}
      {applyProgress && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          {applyProgress.type === 'start' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7c3aed' }}>
              <RefreshCw size={16} className="animate-spin" />
              <span style={{ fontSize: '0.875rem' }}>Iniciando re-sincronización...</span>
            </div>
          )}
          {applyProgress.type === 'progress' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{applyProgress.ticker}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{applyProgress.completed}/{applyProgress.total}</span>
              </div>
              <div style={{ height: '0.5rem', background: '#e2e8f0', borderRadius: '0.25rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', width: `${((applyProgress.completed || 0) / (applyProgress.total || 1)) * 100}%`, transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ color: '#059669' }}>✓ {applyProgress.succeeded || 0} éxitos</span>
                {applyProgress.failed && applyProgress.failed > 0 && <span style={{ color: '#dc2626' }}>✗ {applyProgress.failed} fallos</span>}
              </div>
            </div>
          )}
          {applyProgress.type === 'complete' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669' }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: '0.875rem' }}>Completado: {applyProgress.succeeded} éxitos, {applyProgress.failed} fallos</span>
            </div>
          )}
          {applyProgress.type === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
              <XCircle size={16} />
              <span style={{ fontSize: '0.875rem' }}>{applyProgress.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data?.categories.map((category) => {
          const fields = groupedFields[category.id] || [];
          if (fields.length === 0) return null;
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id} style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(category.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', background: `${category.color}10`,
                  borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: category.color }} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{category.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{fields.length} campos</span>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {/* Fields */}
              {isExpanded && (
                <div style={{ padding: '0.5rem' }}>
                  {fields.map((field) => {
                    const isFieldExpanded = expandedFields.has(field.fieldName);

                    return (
                      <div key={field.fieldName} style={{ marginBottom: '0.25rem', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
                        {/* Field Header */}
                        <div
                          onClick={() => toggleField(field.fieldName)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem', cursor: 'pointer',
                            background: isFieldExpanded ? '#f8fafc' : 'transparent',
                            borderRadius: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#0f172a' }}>{field.label}</span>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>{field.fieldName}</span>
                            {/* Source badges */}
                            {(['sec', 'european', 'yahoo'] as SourceKey[]).map(src => {
                              const totalTags = field.sources[src].baseTags.length + getSourceCustomTags(field, src).length;
                              const isActive = getSourceActive(field, src);
                              return (
                                <span key={src} style={{
                                  fontSize: '0.55rem', padding: '0.1rem 0.35rem',
                                  background: isActive ? SOURCE_COLORS[src].bg : '#f1f5f9',
                                  color: isActive ? SOURCE_COLORS[src].text : '#94a3b8',
                                  borderRadius: '0.25rem', fontWeight: 600, textTransform: 'uppercase',
                                  border: `1px solid ${isActive ? SOURCE_COLORS[src].border : '#e2e8f0'}`,
                                }}>
                                  {src} ({totalTags})
                                </span>
                              );
                            })}
                          </div>
                          {isFieldExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>

                        {/* Expanded: 3 source columns */}
                        {isFieldExpanded && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', padding: '0.5rem 0.75rem 0.75rem' }}>
                            {(['sec', 'european', 'yahoo'] as SourceKey[]).map(src => (
                              <SourceColumn
                                key={src}
                                sourceKey={src}
                                field={field}
                                active={getSourceActive(field, src)}
                                customTags={getSourceCustomTags(field, src)}
                                newTagValue={newTagInputs.get(`${field.fieldName}:${src}`) || ''}
                                onToggle={(active) => handleToggleSource(field.fieldName, src, active)}
                                onAddTag={(tag) => {
                                  const currentTags = getSourceCustomTags(field, src);
                                  if (!currentTags.includes(tag)) {
                                    handleUpdateCustomTags(field.fieldName, src, [...currentTags, tag]);
                                  }
                                }}
                                onRemoveTag={(tag) => handleRemoveTag(field.fieldName, src, tag)}
                                onNewTagChange={(val) => setNewTagInputs(prev => { const next = new Map(prev); next.set(`${field.fieldName}:${src}`, val); return next; })}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>Leyenda</h3>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ padding: '0.1rem 0.3rem', background: SOURCE_COLORS.sec.bg, color: SOURCE_COLORS.sec.text, borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.6rem' }}>SEC</span>
            Tags base XBRL (modelo de referencia)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ padding: '0.1rem 0.3rem', background: SOURCE_COLORS.european.bg, color: SOURCE_COLORS.european.text, borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.6rem' }}>EUROPEAN</span>
            Tags IFRS para empresas europeas
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ padding: '0.1rem 0.3rem', background: SOURCE_COLORS.yahoo.bg, color: SOURCE_COLORS.yahoo.text, borderRadius: '0.25rem', fontWeight: 600, fontSize: '0.6rem' }}>YAHOO</span>
            Campos de Yahoo Finance
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '0.5rem', height: '0.5rem', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
            Fuente activa (se importa)
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Source Column Component =====

interface SourceColumnProps {
  sourceKey: SourceKey;
  field: FieldCatalogItem;
  active: boolean;
  customTags: string[];
  newTagValue: string;
  onToggle: (active: boolean) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onNewTagChange: (val: string) => void;
}

function SourceColumn({ sourceKey, field, active, customTags, newTagValue, onToggle, onAddTag, onRemoveTag, onNewTagChange }: SourceColumnProps) {
  const colors = SOURCE_COLORS[sourceKey];
  const baseTags = field.sources[sourceKey].baseTags;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagValue.trim()) {
      onAddTag(newTagValue.trim());
    }
  };

  return (
    <div style={{
      background: active ? colors.bg : '#fafafa',
      border: `1px solid ${active ? colors.border : '#e2e8f0'}`,
      borderRadius: '0.5rem',
      padding: '0.625rem',
      opacity: active ? 1 : 0.7,
      transition: 'all 0.2s',
    }}>
      {/* Source Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.text, textTransform: 'uppercase' }}>
          {SOURCE_LABELS[sourceKey]}
        </span>
        <label style={{ position: 'relative', display: 'inline-block', width: '2rem', height: '1rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: active ? '#10b981' : '#cbd5e1',
            borderRadius: '0.5rem', transition: 'all 0.2s',
          }}>
            <span style={{
              position: 'absolute', height: '0.8rem', width: '0.8rem',
              left: active ? '1rem' : '0.1rem', bottom: '0.1rem',
              background: 'white', borderRadius: '50%', transition: 'all 0.2s',
            }} />
          </span>
        </label>
      </div>

      {/* Base Tags */}
      {baseTags.length > 0 && (
        <div style={{ marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>Tags base:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem' }}>
            {baseTags.map(tag => (
              <span key={tag} style={{
                fontSize: '0.55rem', padding: '0.1rem 0.3rem',
                background: '#f1f5f9', color: '#475569',
                borderRadius: '0.2rem', fontFamily: 'monospace',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Custom Tags */}
      {customTags.length > 0 && (
        <div style={{ marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.6rem', color: colors.text, fontWeight: 600 }}>Tags personalizados:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.15rem' }}>
            {customTags.map(tag => (
              <span key={tag} style={{
                fontSize: '0.55rem', padding: '0.1rem 0.2rem 0.1rem 0.35rem',
                background: colors.bg, color: colors.text,
                borderRadius: '0.2rem', fontFamily: 'monospace',
                border: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', gap: '0.15rem',
              }}>
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.text, padding: 0, display: 'flex',
                    alignItems: 'center', opacity: 0.6,
                  }}
                  title="Eliminar tag"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add Tag Input */}
      {active && (
        <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.25rem' }}>
          <input
            type="text"
            value={newTagValue}
            onChange={(e) => onNewTagChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nuevo tag..."
            style={{
              flex: 1, fontSize: '0.6rem', padding: '0.2rem 0.35rem',
              border: `1px solid ${colors.border}`, borderRadius: '0.2rem',
              background: 'white', color: '#0f172a', outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={() => { if (newTagValue.trim()) onAddTag(newTagValue.trim()); }}
            disabled={!newTagValue.trim()}
            style={{
              background: newTagValue.trim() ? colors.text : '#e2e8f0',
              color: newTagValue.trim() ? 'white' : '#94a3b8',
              border: 'none', borderRadius: '0.2rem', cursor: newTagValue.trim() ? 'pointer' : 'default',
              padding: '0.15rem 0.3rem', display: 'flex', alignItems: 'center',
            }}
          >
            <Plus size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
