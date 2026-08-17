import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, FileDown, ArrowRight, BookOpen, Loader2, CheckCircle2, Check, RotateCcw } from 'lucide-react';
import { coursesApi, type Course } from '../utils/coursesApi';
import { getCourseProgress, resetAllProgress } from '../utils/courseProgress';
import { parseCourseContent } from '../components/course/CourseContent';
import '../styles/formacion.css';

const CATEGORY_LABELS: Record<string, string> = {
  'value-investing': 'Value Investing',
  finanzas: 'Finanzas',
  guia: 'Guía',
  fundamental: 'Fundamental',
};

function totalSections(course: Course): number {
  if (!course.contenido) return 0;
  return parseCourseContent(course.contenido).length;
}

export function FormacionPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [guidePdfUrl, setGuidePdfUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    coursesApi
      .findAll()
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.guide_pdf_url) setGuidePdfUrl(data.guide_pdf_url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('formacion-progress-')) setProgressTick((t) => t + 1);
    };
    window.addEventListener('storage', onStorage);
    const id = setInterval(() => setProgressTick((t) => t + 1), 2000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(id);
    };
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach((c) => {
      if (c.categoria) cats.add(c.categoria);
    });
    return Array.from(cats);
  }, [courses]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return courses;
    return courses.filter((c) => c.categoria === activeTab);
  }, [courses, activeTab]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.orden - b.orden);
  }, [filtered]);

  // Force re-calc when progressTick changes
  void progressTick;

  const handleReset = useCallback(() => {
    if (!window.confirm('¿Reiniciar todo el progreso de formación?')) return;
    resetAllProgress();
    setProgressTick((t) => t + 1);
  }, []);

  return (
    <div className="formacion-root">
      <section className="formacion-hero">
        <div className="formacion-hero-inner">
          <div className="formacion-badge">
            <GraduationCap size={16} />
            Formación
          </div>
          <h1 className="formacion-title">Aprende a invertir con criterio</h1>
          <p className="formacion-subtitle">
            Descarga la guía de la aplicación y sigue el curso paso a paso para entender qué es el
            value investing y cómo usar DataInvestments para encontrar valor real en las empresas.
          </p>
          {guidePdfUrl && (
            <a href={guidePdfUrl} target="_blank" rel="noopener noreferrer" className="formacion-guide-btn">
              <FileDown size={18} />
              Descargar PDF — Guía de la aplicación
            </a>
          )}
        </div>
      </section>

      <section className="formacion-courses">
        <div className="formacion-courses-inner">
          <div className="formacion-courses-header">
            <div className="section-title-wrap">
              <h2 className="formacion-courses-title">Roadmap de formación</h2>
              <span className="formacion-kicker">Aprende a tu ritmo</span>
            </div>
            <p className="formacion-courses-subtitle">
              Sigue el camino o empieza por cualquier punto — puedes saltar al curso que más te interese
            </p>
          </div>

          {loading ? (
            <div className="formacion-loading">
              <Loader2 size={24} className="admin-spinner" />
              <p>Cargando cursos...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="formacion-empty">
              <BookOpen size={32} />
              <p>Próximamente más cursos de formación.</p>
            </div>
          ) : (
            <>
              <div className="formacion-tabs">
                <button
                  className={`formacion-tab ${activeTab === 'all' ? 'formacion-tab--active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`formacion-tab ${activeTab === cat ? 'formacion-tab--active' : ''}`}
                    onClick={() => setActiveTab(cat)}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>

              <div className="formacion-roadmap">
                {sorted.map((course, i) => {
                  const total = totalSections(course);
                  const prog = getCourseProgress(course.id, total);
                  const isComplete = prog.percent === 100 && total > 0;
                  const hasStarted = prog.visited > 0;
                  const isLast = i === sorted.length - 1;

                  return (
                    <Link
                      key={course.id}
                      to={`/formacion/${course.slug || course.id}`}
                      className="formacion-step"
                    >
                      {!isLast && (
                        <div className="formacion-step-segment">
                          <div
                            className="formacion-step-segment-fill"
                            style={{ height: `${prog.percent}%` }}
                          />
                        </div>
                      )}
                      <div className={`formacion-step-node ${isComplete ? 'formacion-step-node--completed' : ''}`}>
                        {isComplete ? (
                          <Check size={18} />
                        ) : (
                          <span className="formacion-step-number">{i + 1}</span>
                        )}
                      </div>
                      <div className="formacion-step-card">
                        {course.imagen && (
                          <div className="formacion-step-image">
                            <img src={course.imagen} alt="" />
                          </div>
                        )}
                        <div className="formacion-step-top">
                          {course.categoria && (
                            <span className="formacion-card-categoria">
                              {CATEGORY_LABELS[course.categoria] || course.categoria}
                            </span>
                          )}
                          {isComplete && (
                            <span className="formacion-step-complete">
                              <CheckCircle2 size={14} />
                              Completado
                            </span>
                          )}
                        </div>
                        <h3 className="formacion-step-title">{course.titulo}</h3>
                        {course.descripcion && (
                          <p className="formacion-step-desc">{course.descripcion}</p>
                        )}
                        <div className="formacion-progress">
                          <div className="formacion-progress-bar">
                            <div
                              className="formacion-progress-fill"
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                          <span className="formacion-progress-label">
                            {total > 0
                              ? `${prog.visited}/${total} secciones`
                              : 'Sin contenido'}
                          </span>
                        </div>
                        <span className="formacion-step-link">
                          {hasStarted ? 'Continuar' : 'Empezar curso'}
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {sorted.some((c) => getCourseProgress(c.id, totalSections(c)).visited > 0) && (
                <button className="formacion-reset-btn" onClick={handleReset}>
                  <RotateCcw size={14} />
                  Reiniciar progreso
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
