import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const TIPO_LABELS: Record<string, string> = {
  heading: 'Título',
  text: 'Texto',
  image: 'Imagen',
  text_image: 'Texto + Imagen',
  quote: 'Cita',
  books: 'Libros',
  link: 'Enlace',
};

const TIPOS = ['heading', 'text', 'image', 'text_image', 'quote', 'books', 'link'] as const;
type SectionTipo = (typeof TIPOS)[number];

interface Section {
  tipo: SectionTipo;
  titulo?: string;
  contenido?: string;
  imagen?: string;
  caption?: string;
  layout?: 'left' | 'right' | 'bottom';
  author?: string;
  libros?: string[];
  url?: string;
}

interface SectionBuilderProps {
  value: string;
  onChange: (json: string) => void;
}

function typeDefault(tipo: SectionTipo): Section {
  const base: Section = { tipo };
  switch (tipo) {
    case 'heading':
      base.contenido = '';
      break;
    case 'text':
      base.titulo = '';
      base.contenido = '';
      break;
    case 'image':
      base.imagen = '';
      base.caption = '';
      break;
    case 'text_image':
      base.titulo = '';
      base.contenido = '';
      base.imagen = '';
      base.layout = 'right';
      break;
    case 'quote':
      base.contenido = '';
      base.author = '';
      break;
    case 'books':
      base.titulo = 'Libros relacionados';
      base.contenido = '';
      base.libros = [];
      break;
    case 'link':
      base.url = '';
      base.titulo = '';
      base.contenido = '';
      break;
  }
  return base;
}

function parseSections(val: string): Section[] {
  try {
    const parsed = JSON.parse(val || '[]');
    return Array.isArray(parsed) ? (parsed as Section[]) : [];
  } catch {
    return [];
  }
}

export function SectionBuilder({ value, onChange }: SectionBuilderProps) {
  const sections = parseSections(value);

  const emit = (next: Section[]) => {
    onChange(JSON.stringify(next));
  };

  const addSection = () => emit([...sections, typeDefault('text')]);

  const removeSection = (index: number) => emit(sections.filter((_, i) => i !== index));

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    emit(next);
  };

  const updateSection = (index: number, patch: Partial<Section>) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    emit(next);
  };

  return (
    <div className="section-builder">
      {sections.map((section, index) => (
        <div key={index} className="section-builder-card">
          <div className="section-builder-header">
            <span className="section-builder-number">{index + 1}</span>
            <select
              value={section.tipo}
              onChange={(e) => {
                const newTipo = e.target.value as SectionTipo;
                updateSection(index, { ...typeDefault(newTipo), ...section, tipo: newTipo });
              }}
              className="section-builder-type-select"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="section-builder-actions">
              <button type="button" className="btn-icon-sm" onClick={() => moveSection(index, index - 1)} title="Subir">
                <ChevronUp size={16} />
              </button>
              <button type="button" className="btn-icon-sm" onClick={() => moveSection(index, index + 1)} title="Bajar">
                <ChevronDown size={16} />
              </button>
              <button type="button" className="btn-icon-sm" onClick={() => removeSection(index)} title="Eliminar">
                <Trash2 size={16} className="icon-danger" />
              </button>
            </div>
          </div>

          <div className="section-builder-fields">
            {section.tipo === 'heading' && (
              <div className="section-builder-field">
                <label>Contenido</label>
                <input
                  type="text"
                  value={section.contenido || ''}
                  onChange={(e) => updateSection(index, { contenido: e.target.value })}
                  placeholder="Título de la sección"
                />
              </div>
            )}

            {section.tipo === 'text' && (
              <>
                <div className="section-builder-field">
                  <label>Título (opcional)</label>
                  <input
                    type="text"
                    value={section.titulo || ''}
                    onChange={(e) => updateSection(index, { titulo: e.target.value })}
                    placeholder="Título del paso"
                  />
                </div>
                <div className="section-builder-field">
                  <label>Contenido</label>
                  <textarea
                    value={section.contenido || ''}
                    onChange={(e) => updateSection(index, { contenido: e.target.value })}
                    placeholder="Texto del paso..."
                    rows={4}
                  />
                </div>
              </>
            )}

            {section.tipo === 'image' && (
              <>
                <div className="section-builder-field">
                  <label>URL de la imagen</label>
                  <input
                    type="text"
                    value={section.imagen || ''}
                    onChange={(e) => updateSection(index, { imagen: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="section-builder-field">
                  <label>Pie de foto (opcional)</label>
                  <input
                    type="text"
                    value={section.caption || ''}
                    onChange={(e) => updateSection(index, { caption: e.target.value })}
                    placeholder="Descripción de la imagen"
                  />
                </div>
              </>
            )}

            {section.tipo === 'text_image' && (
              <>
                <div className="section-builder-field">
                  <label>Título (opcional)</label>
                  <input
                    type="text"
                    value={section.titulo || ''}
                    onChange={(e) => updateSection(index, { titulo: e.target.value })}
                    placeholder="Título"
                  />
                </div>
                <div className="section-builder-field">
                  <label>Contenido</label>
                  <textarea
                    value={section.contenido || ''}
                    onChange={(e) => updateSection(index, { contenido: e.target.value })}
                    placeholder="Texto del paso..."
                    rows={4}
                  />
                </div>
                <div className="section-builder-field">
                  <label>URL de la imagen</label>
                  <input
                    type="text"
                    value={section.imagen || ''}
                    onChange={(e) => updateSection(index, { imagen: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="section-builder-field">
                  <label>Disposición</label>
                  <select
                    value={section.layout || 'right'}
                    onChange={(e) => updateSection(index, { layout: e.target.value as 'left' | 'right' | 'bottom' })}
                  >
                    <option value="right">Imagen a la derecha</option>
                    <option value="left">Imagen a la izquierda</option>
                    <option value="bottom">Imagen debajo</option>
                  </select>
                </div>
              </>
            )}

            {section.tipo === 'quote' && (
              <>
                <div className="section-builder-field">
                  <label>Contenido</label>
                  <textarea
                    value={section.contenido || ''}
                    onChange={(e) => updateSection(index, { contenido: e.target.value })}
                    placeholder="Cita..."
                    rows={3}
                  />
                </div>
                <div className="section-builder-field">
                  <label>Autor (opcional)</label>
                  <input
                    type="text"
                    value={section.author || ''}
                    onChange={(e) => updateSection(index, { author: e.target.value })}
                    placeholder="Autor"
                  />
                </div>
              </>
            )}

            {section.tipo === 'books' && (
              <>
                <div className="section-builder-field">
                  <label>Título del bloque</label>
                  <input
                    type="text"
                    value={section.titulo || ''}
                    onChange={(e) => updateSection(index, { titulo: e.target.value })}
                    placeholder="Libros relacionados"
                  />
                </div>
                <div className="section-builder-field">
                  <label>Introducción (opcional)</label>
                  <textarea
                    value={section.contenido || ''}
                    onChange={(e) => updateSection(index, { contenido: e.target.value })}
                    placeholder="Breve texto antes de los libros..."
                    rows={2}
                  />
                </div>
                <div className="section-builder-field">
                  <label>ISBN de los libros (uno por línea)</label>
                  <textarea
                    value={(section.libros || []).join('\n')}
                    onChange={(e) =>
                      updateSection(index, {
                        libros: e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="9780060555665&#10;9780071592536"
                    rows={4}
                  />
                  <small style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>
                    Solo se muestran los ISBN que coinciden con los libros de la landing.
                  </small>
                </div>
              </>
            )}

            {section.tipo === 'link' && (
              <>
                <div className="section-builder-field">
                  <label>URL del enlace</label>
                  <input
                    type="text"
                    value={section.url || ''}
                    onChange={(e) => updateSection(index, { url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="section-builder-field">
                  <label>Título del enlace</label>
                  <input
                    type="text"
                    value={section.titulo || ''}
                    onChange={(e) => updateSection(index, { titulo: e.target.value })}
                    placeholder="Texto que se mostrará en el botón"
                  />
                </div>
                <div className="section-builder-field">
                  <label>Descripción (opcional)</label>
                  <textarea
                    value={section.contenido || ''}
                    onChange={(e) => updateSection(index, { contenido: e.target.value })}
                    placeholder="Descripción breve del enlace..."
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      <button type="button" className="btn-primary" onClick={addSection} style={{ marginTop: 12 }}>
        <Plus size={18} /> Añadir apartado
      </button>
    </div>
  );
}
