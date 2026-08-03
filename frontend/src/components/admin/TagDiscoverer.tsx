import { useState, useMemo } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { FIELD_LABELS, guessField } from '../../utils/tagDiscovery';
import { apiFetch } from '../../utils/api';

interface TagDiscovererProps {
  availableTags: string[];
  fieldDetails: Record<string, { found: boolean; yearsCount: number; latestYear?: number }> | null;
  onTagAdded?: () => void;
}

const FAILED_FIELDS = Object.keys(FIELD_LABELS);

export function TagDiscoverer({ availableTags, fieldDetails, onTagAdded }: TagDiscovererProps) {
  const [search, setSearch] = useState('');
  const [addingTag, setAddingTag] = useState<string | null>(null);
  const [addedTags, setAddedTags] = useState<Set<string>>(new Set());

  const failedFields = useMemo(() => {
    if (!fieldDetails) return [];
    return FAILED_FIELDS.filter(f => !fieldDetails[f]?.found);
  }, [fieldDetails]);

  const filteredTags = useMemo(() => {
    if (!search.trim()) return availableTags;
    const q = search.toLowerCase();
    return availableTags.filter(tag => tag.toLowerCase().includes(q));
  }, [availableTags, search]);

  const handleAddTag = async (tag: string, fieldName: string) => {
    setAddingTag(tag);
    try {
      // Extract base concept name (strip company prefix)
      const colonIdx = tag.indexOf(':');
      const conceptName = colonIdx >= 0 ? tag.substring(colonIdx + 1) : tag;

      // Fetch existing config first to append
      const res = await apiFetch('/api/admin/field-config');
      const { catalog } = await res.json();
      const field = catalog?.find((f: { fieldName: string }) => f.fieldName === fieldName);
      const existingCustom = field?.sources?.european?.customTags || [];
      const merged = [...new Set([...existingCustom, tag])];

      // Save to FieldConfig (custom tag)
      await apiFetch('/api/admin/field-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName, source: 'european', customTags: merged }),
      });

      // Save to ConceptMapping (learned mapping)
      await apiFetch('/api/admin/concept-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptName,
          fieldName,
          source: 'european',
          confirmedBy: 'admin',
        }),
      });

      setAddedTags(prev => new Set(prev).add(tag));
      onTagAdded?.();
    } catch (err) {
      console.error('Error adding tag:', err);
    } finally {
      setAddingTag(null);
    }
  };

  if (availableTags.length === 0) return null;

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-default)' }}>
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
        Tag Discovery — {availableTags.length} XBRL tags disponibles
      </div>

      <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
        <Search size={12} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tag XBRL..."
          style={{
            width: '100%', padding: '0.375rem 0.5rem 0.375rem 1.5rem',
            border: '1px solid var(--border-default)', borderRadius: '0.375rem',
            fontSize: '0.75rem', outline: 'none', background: 'var(--surface-1)',
          }}
        />
      </div>

      {failedFields.length > 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.375rem' }}>
          Campos sin datos: {failedFields.map(f => FIELD_LABELS[f]).join(', ')}
        </div>
      )}

      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {filteredTags.slice(0, 100).map((tag, i) => {
          const guessedField = guessField(tag);
          const isFailed = guessedField && !fieldDetails?.[guessedField]?.found;
          const alreadyAdded = addedTags.has(tag);
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
              background: isFailed ? 'var(--amber-pale)' : 'var(--surface-2)',
              border: `1px solid ${isFailed ? 'var(--amber-line)' : 'var(--border-default)'}`,
              fontSize: '0.7rem',
            }}>
              <code style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tag}
              </code>
              {guessedField && (
                <span style={{
                  padding: '0.1rem 0.3rem', borderRadius: '0.2rem',
                  background: isFailed ? 'var(--amber-pale)' : 'var(--cyan-pale)',
                  fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                }}>
                  → {FIELD_LABELS[guessedField] || guessedField}
                </span>
              )}
              {guessedField && isFailed && (
                <button
                  onClick={() => handleAddTag(tag, guessedField)}
                  disabled={addingTag === tag || alreadyAdded}
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
        {filteredTags.length > 100 && (
          <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '0.25rem' }}>
            Mostrando 100 de {filteredTags.length} resultados
          </div>
        )}
      </div>
    </div>
  );
}
