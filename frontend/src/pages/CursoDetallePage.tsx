import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Loader2 } from 'lucide-react';
import { coursesApi, type Course } from '../utils/coursesApi';
import { CourseContent } from '../components/course/CourseContent';
import '../styles/formacion.css';

export function CursoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    coursesApi
      .findById(id)
      .then((data) => setCourse(data))
      .catch(() => setError('No se pudo cargar el curso.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="formacion-loading formacion-loading--page">
        <Loader2 size={24} className="admin-spinner" />
        <p>Cargando curso...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="formacion-empty formacion-empty--page">
        <p>{error || 'Curso no encontrado.'}</p>
        <Link to="/formacion" className="formacion-back-btn">
          <ArrowLeft size={16} />
          Volver a formación
        </Link>
      </div>
    );
  }

  return (
    <div className="formacion-root">
      <article className="curso-detail">
        <div className="curso-detail-header">
          <Link to="/formacion" className="formacion-back-btn">
            <ArrowLeft size={16} />
            Formación
          </Link>
          {course.categoria && (
            <span className="formacion-card-categoria">{course.categoria}</span>
          )}
          <div className="curso-detail-badge">
            <GraduationCap size={18} />
            Curso
          </div>
          <h1 className="curso-detail-title">{course.titulo}</h1>
          {course.descripcion && <p className="curso-detail-desc">{course.descripcion}</p>}
          {course.imagen && (
            <div className="curso-detail-image">
              <img src={course.imagen} alt="" />
            </div>
          )}
        </div>

        {course.contenido ? (
          <CourseContent contenido={course.contenido} courseId={course.id} />
        ) : (
          <p className="curso-detail-empty">Este curso todavía no tiene contenido.</p>
        )}
      </article>
    </div>
  );
}
