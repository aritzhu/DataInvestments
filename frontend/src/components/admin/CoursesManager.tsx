import { useState, useEffect } from 'react';
import {
  Save, Plus, Trash2, FileDown, X, Loader2, Copy, ClipboardPaste, Check, ExternalLink, Upload,
} from 'lucide-react';
import { coursesApi, type Course } from '../../utils/coursesApi';
import { SectionBuilder } from './SectionBuilder';
import { CourseContent, parseCourseContent } from '../course/CourseContent';

const CATEGORIAS = [
  { value: 'value-investing', label: 'Value Investing' },
  { value: 'fundamental', label: 'Análisis Fundamental' },
  { value: 'finanzas', label: 'Finanzas Básicas' },
  { value: 'guia', label: 'Guía de la App' },
];

interface CourseForm {
  titulo: string;
  descripcion: string;
  contenido: string;
  imagen: string;
  categoria: string;
  orden: number;
  activo: boolean;
  slug: string;
}

const EMPTY_FORM: CourseForm = {
  titulo: '',
  descripcion: '',
  contenido: '[]',
  imagen: '',
  categoria: 'value-investing',
  orden: 0,
  activo: true,
  slug: '',
};

function getAuth() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : undefined;
}

export function CoursesManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [guidePdfUrl, setGuidePdfUrl] = useState('');
  const [guideUploading, setGuideUploading] = useState(false);
  const [guideSaving, setGuideSaving] = useState(false);
  const [guideError, setGuideError] = useState('');
  const [guideSaved, setGuideSaved] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview' | 'json'>('edit');
  const [jsonTextarea, setJsonTextarea] = useState('');
  const [isJsonEditable, setIsJsonEditable] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const loadCourses = async () => {
    try {
      const data = await coursesApi.findAllAdmin();
      if (Array.isArray(data)) setCourses(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.guide_pdf_url) setGuidePdfUrl(data.guide_pdf_url);
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingCourse(null);
    setForm({ ...EMPTY_FORM });
    setJsonTextarea('');
    setIsJsonEditable(false);
    setJsonError('');
    setSaveError('');
    setPreviewTab('edit');
    setShowModal(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({
      titulo: course.titulo,
      descripcion: course.descripcion || '',
      contenido: course.contenido || '[]',
      imagen: course.imagen || '',
      categoria: course.categoria || 'value-investing',
      orden: course.orden,
      activo: course.activo !== false,
      slug: course.slug || '',
    });
    setJsonTextarea('');
    setIsJsonEditable(false);
    setJsonError('');
    setSaveError('');
    setPreviewTab('edit');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      setSaveError('El título es obligatorio');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const payload: Record<string, unknown> = {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        contenido: form.contenido,
        imagen: form.imagen || null,
        categoria: form.categoria || null,
        orden: form.orden,
        activo: form.activo,
        slug: form.slug || null,
      };
      if (editingCourse) {
        await coursesApi.update(editingCourse.id, payload);
      } else {
        await coursesApi.create(payload);
      }
      setShowModal(false);
      loadCourses();
    } catch (e: any) {
      setSaveError(e?.message || 'Error al guardar el curso');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`¿Eliminar el curso "${course.titulo}"?`)) return;
    try {
      await coursesApi.remove(course.id);
      loadCourses();
    } catch {
      /* ignore */
    }
  };

  const handleGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGuideUploading(true);
    setGuideError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: getAuth(),
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setGuidePdfUrl(data.url);
      } else {
        setGuideError(data.error || 'Error al subir el PDF');
      }
    } catch {
      setGuideError('Error de conexión al subir el PDF');
    } finally {
      setGuideUploading(false);
    }
  };

  const handleSaveGuide = async () => {
    setGuideSaving(true);
    setGuideSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuth() },
        body: JSON.stringify({ guide_pdf_url: guidePdfUrl }),
      });
      setGuideSaved(true);
      setTimeout(() => setGuideSaved(false), 2500);
    } finally {
      setGuideSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: getAuth(),
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setForm((prev) => ({ ...prev, imagen: data.url }));
      }
    } catch {
      /* ignore */
    } finally {
      setImageUploading(false);
    }
  };

  const serializeToJson = () => {
    setJsonTextarea(
      JSON.stringify(
        {
          titulo: form.titulo,
          descripcion: form.descripcion,
          contenido: parseCourseContent(form.contenido),
          imagen: form.imagen,
          categoria: form.categoria,
          orden: form.orden,
          activo: form.activo,
        },
        null,
        2,
      ),
    );
    setIsJsonEditable(false);
    setJsonError('');
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonTextarea);
      const contenido = typeof parsed.contenido === 'string' ? parsed.contenido : JSON.stringify(parsed.contenido || []);
      setForm((prev) => ({
        ...prev,
        titulo: parsed.titulo || '',
        descripcion: parsed.descripcion || '',
        contenido,
        imagen: parsed.imagen || '',
        categoria: parsed.categoria || prev.categoria || 'value-investing',
        orden: typeof parsed.orden === 'number' ? parsed.orden : 0,
        activo: parsed.activo !== false,
      }));
      setJsonError('');
      setIsJsonEditable(false);
      setPreviewTab('edit');
    } catch {
      setJsonError('JSON inválido. Revisa el formato.');
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonTextarea);
    } catch {
      /* ignore */
    }
  };

  const previewSections = parseCourseContent(form.contenido);

  return (
    <div className="admin-form-section" style={{ border: '2px solid var(--amber-pale)', borderRadius: '1rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--amber-pale) 0%, var(--amber-line) 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🎓</span>
          <h2 className="admin-form-title" style={{ marginBottom: 0 }}>Formación y Cursos</h2>
        </div>
      </div>

      {/* Guide PDF */}
      <div style={{ padding: '1rem', background: 'var(--surface-1)', borderRadius: '0.75rem', border: '1px solid var(--border-default)', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--amber)', marginBottom: '0.75rem' }}>Guía de la aplicación (PDF)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '0 0 0.75rem' }}>
          Sube el PDF que explica las funcionalidades de la app. Se mostrará con el botón "Descargar PDF" en la sección Formación.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label className="admin-hero-upload-btn" style={{ padding: '0.5rem 1rem', background: 'var(--amber)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: guideUploading ? 0.6 : 1 }}>
            {guideUploading ? 'Subiendo...' : 'Subir PDF'}
            <input type="file" accept=".pdf,application/pdf" onChange={handleGuideUpload} style={{ display: 'none' }} disabled={guideUploading} />
          </label>
          {guidePdfUrl && (
            <>
              <a href={guidePdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--amber)', fontWeight: 600 }}>
                <FileDown size={14} />
                Ver PDF actual
              </a>
              <button
                onClick={() => setGuidePdfUrl('')}
                style={{ padding: '0.4rem 0.8rem', background: 'var(--red-pale)', color: 'var(--red)', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Eliminar
              </button>
            </>
          )}
          <button
            onClick={handleSaveGuide}
            disabled={guideSaving}
            style={{ padding: '0.5rem 1.25rem', background: 'var(--amber)', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: guideSaving ? 0.6 : 1 }}
          >
            {guideSaving ? 'Guardando...' : 'Guardar guía'}
          </button>
          {guideSaved && <span className="bulk-badge bulk-badge--success"><Check size={14} /> Guardado</span>}
        </div>
        {guideError && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--red-pale)', color: 'var(--red)', borderRadius: '0.5rem', fontSize: '0.75rem' }}>
            {guideError}
          </div>
        )}
      </div>

      {/* Courses list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--amber)', margin: 0 }}>Cursos</h3>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', background: 'var(--amber)', color: 'white', border: 'none', borderRadius: '9999px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo curso
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '0 0 1rem' }}>
        Usa la pestaña <strong>JSON</strong> del editor para importar o exportar cursos en formato JSON y crearlos con IA.
      </p>

      {loading ? (
        <div className="admin-empty"><div className="admin-spinner" style={{ margin: '0 auto 1rem' }} /><p>Cargando cursos...</p></div>
      ) : courses.length === 0 ? (
        <div className="admin-empty"><p>No hay cursos. Crea el primero con "Nuevo curso".</p></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoría</th>
                <th style={{ textAlign: 'center' }}>Orden</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>{course.titulo.substring(0, 60)}{course.titulo.length > 60 ? '...' : ''}</td>
                  <td>{course.categoria || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{course.orden}</td>
                  <td style={{ textAlign: 'center' }}>{course.activo ? 'Activo' : 'Inactivo'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <a href={`/formacion/${course.slug || course.id}`} target="_blank" rel="noopener noreferrer" title="Ver en web" style={{ color: 'var(--text-tertiary)' }}>
                        <ExternalLink size={16} />
                      </a>
                      <button onClick={() => openEdit(course)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                        <Save size={16} />
                      </button>
                      <button onClick={() => handleDelete(course)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingCourse ? 'Editar curso' : 'Nuevo curso'}</h3>
              <button onClick={() => setShowModal(false)} className="admin-modal-close" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="admin-tabs">
              <button className={`admin-tab ${previewTab === 'edit' ? 'active' : ''}`} onClick={() => setPreviewTab('edit')}>Editar</button>
              <button className={`admin-tab ${previewTab === 'preview' ? 'active' : ''}`} onClick={() => setPreviewTab('preview')}>Vista previa</button>
              <button className={`admin-tab ${previewTab === 'json' ? 'active' : ''}`} onClick={() => { serializeToJson(); setPreviewTab('json'); }}>JSON</button>
            </div>

            {previewTab === 'edit' && (
              <div className="admin-modal-body">
                <div className="form-group">
                  <label className="admin-label">
                    Título *
                    <input className="admin-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Curso de Value Investing" />
                  </label>
                  <label className="admin-label">
                    Descripción
                    <textarea className="admin-input admin-textarea" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Resumen breve del curso..." rows={2} />
                  </label>
                  <label className="admin-label">
                    Imagen de portada (opcional)
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'var(--amber)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: imageUploading ? 'default' : 'pointer', opacity: imageUploading ? 0.6 : 1 }}>
                        <Upload size={14} />
                        {imageUploading ? 'Subiendo...' : 'Subir imagen'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} style={{ display: 'none' }} disabled={imageUploading} />
                      </label>
                      {form.imagen && (
                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, imagen: '' }))} style={{ padding: '0.4rem 0.8rem', background: 'var(--red-pale)', color: 'var(--red)', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                          Eliminar
                        </button>
                      )}
                    </div>
                    {form.imagen && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <img src={form.imagen} alt="Preview" style={{ maxWidth: '200px', maxHeight: '120px', borderRadius: '0.5rem', border: '1px solid var(--border-default)', objectFit: 'cover' }} />
                      </div>
                    )}
                  </label>
                  <label className="admin-label">
                    Categoría
                    <select className="admin-input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                      {CATEGORIAS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center' }}>
                    <label className="admin-label">
                      Slug (opcional)
                      <input className="admin-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="curso-value-investing" />
                    </label>
                    <label className="admin-label">
                      Orden
                      <input className="admin-input" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) || 0 })} />
                    </label>
                    <label className="admin-book-active">
                      <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                      Activo
                    </label>
                  </div>

                  <label className="admin-label" style={{ marginTop: '0.5rem' }}>
                    Contenido (pasos del curso)
                  </label>
                  <SectionBuilder value={form.contenido} onChange={(json) => setForm({ ...form, contenido: json })} />

                  {saveError && <div className="alert error" style={{ marginTop: '12px' }}>{saveError}</div>}
                  <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {saving ? <><Loader2 size={18} className="admin-spinner" /> Guardando...</> : <><Save size={18} /> Guardar curso</>}
                  </button>
                </div>
              </div>
            )}

            {previewTab === 'preview' && (
              <div className="admin-modal-body">
                <div className="admin-modal-preview">
                  <h3 className="curso-detail-title" style={{ margin: '0 0 0.5rem' }}>{form.titulo || 'Sin título'}</h3>
                  {form.descripcion && <p className="curso-detail-desc" style={{ margin: '0 0 1rem' }}>{form.descripcion}</p>}
                  {previewSections.length > 0 ? (
                    <CourseContent contenido={form.contenido} />
                  ) : (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Añade secciones en la pestaña Editar.</p>
                  )}
                </div>
              </div>
            )}

            {previewTab === 'json' && (
              <div className="admin-modal-body">
                <textarea
                  className="admin-json-textarea"
                  value={jsonTextarea}
                  onChange={(e) => setJsonTextarea(e.target.value)}
                  readOnly={!isJsonEditable}
                  rows={18}
                  placeholder='{"titulo": "...", "contenido": [...]}'
                />
                {jsonError && <div className="alert error" style={{ marginTop: '8px' }}>{jsonError}</div>}
                <div className="admin-json-actions">
                  <button className="admin-form-btn" onClick={copyJson}><Copy size={14} /> Copiar JSON</button>
                  <button className="admin-form-btn" onClick={() => setIsJsonEditable(true)}><ClipboardPaste size={14} /> Pegar JSON</button>
                  <button className="admin-form-btn" onClick={applyJson}><Check size={14} /> Aplicar JSON</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
