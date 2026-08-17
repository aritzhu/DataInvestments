import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { DEFAULT_BOOKS, type Book } from '../BookCarousel';
import { markSectionVisited } from '../../utils/courseProgress';

interface ContentSection {
  tipo: string;
  titulo?: string;
  contenido?: string;
  imagen?: string;
  caption?: string;
  layout?: 'left' | 'right' | 'bottom';
  author?: string;
  libros?: string[];
  url?: string;
}

interface CourseContentProps {
  contenido: string;
  courseId?: string;
  className?: string;
}

function bookCoverUrl(book: { coverUrl?: string | null; isbn?: string | null }): string | null {
  if (book.coverUrl) return book.coverUrl;
  if (book.isbn) return `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`;
  return null;
}

function amazonSearchUrl(title: string): string {
  return `https://www.amazon.es/s?k=${encodeURIComponent(title)}`;
}

function BooksSection({ section, idx }: { section: ContentSection; idx: number }) {
  const books = (section.libros || [])
    .map((isbn) => DEFAULT_BOOKS.find((b) => b.isbn === isbn && b.active !== false))
    .filter((b): b is Book => b !== null);

  if (books.length === 0) return null;

  return (
    <div data-section-idx={idx} className="course-section course-section--books">
      <h3 className="course-books-title">{section.titulo || 'Libros relacionados'}</h3>
      {section.contenido && <p className="course-books-intro">{section.contenido}</p>}
      <div className="course-books-grid">
        {books.map((book, i) => {
          const cover = bookCoverUrl(book);
          return (
            <a
              key={book.isbn || book.title || i}
              href={book.link || amazonSearchUrl(book.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="book-card course-book-card"
              title={`Ver "${book.title}"`}
            >
              <div className="book-card-cover">
                <div className="book-card-cover-fallback">
                  <span>📖</span>
                </div>
                {cover && (
                  <img
                    src={cover}
                    alt={`Portada de ${book.title}`}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="book-card-body">
                <div className="book-card-title">{book.title}</div>
                <div className="book-card-author">{book.author}</div>
                <p className="book-card-desc">{book.desc}</p>
                <span className="book-card-cta">Ver libro →</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function parseCourseContent(raw: string): ContentSection[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? (parsed as ContentSection[]) : [];
  } catch {
    return [];
  }
}

export function CourseContent({ contenido, courseId, className = '' }: CourseContentProps) {
  const sections = parseCourseContent(contenido);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!courseId || sections.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-section-idx'));
            if (!Number.isNaN(idx)) markSectionVisited(courseId, idx);
          }
        });
      },
      { rootMargin: '-10% 0px -40% 0px', threshold: 0 },
    );

    container.querySelectorAll<HTMLElement>('[data-section-idx]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [courseId, sections.length]);

  if (sections.length === 0) {
    return <div className="course-detail-content">{contenido}</div>;
  }

  return (
    <div ref={containerRef} className={`course-content ${className}`}>
      {sections.map((section, idx) => {
        switch (section.tipo) {
          case 'heading':
            return (
              <div key={idx} data-section-idx={idx} className="course-section course-section--heading">
                <h2 className="course-section-heading">{section.contenido}</h2>
              </div>
            );
          case 'text':
            return (
              <div key={idx} data-section-idx={idx} className="course-section course-section--text">
                {section.titulo && <h3 className="course-section-title">{section.titulo}</h3>}
                {section.contenido && <p className="course-section-content">{section.contenido}</p>}
              </div>
            );
          case 'image':
            return (
              <div key={idx} data-section-idx={idx} className="course-section course-section--image">
                {section.imagen && (
                  <img src={section.imagen} alt={section.caption || ''} className="course-section-image" loading="lazy" />
                )}
                {section.caption && <div className="course-section-caption">{section.caption}</div>}
              </div>
            );
          case 'text_image':
            return (
              <div key={idx} data-section-idx={idx} className={`course-section course-section--text-image course-section-layout--${section.layout || 'right'}`}>
                <div className="course-section-body">
                  {section.titulo && <h3 className="course-section-title">{section.titulo}</h3>}
                  {section.contenido && <p className="course-section-content">{section.contenido}</p>}
                </div>
                {section.imagen && (
                  <div className="course-section-image-wrap">
                    <img src={section.imagen} alt={section.caption || ''} loading="lazy" />
                  </div>
                )}
              </div>
            );
          case 'quote':
            return (
              <div key={idx} data-section-idx={idx} className="course-section course-section--quote">
                <blockquote className="course-section-quote">{section.contenido}</blockquote>
                {section.author && <div className="course-section-author">— {section.author}</div>}
              </div>
            );
          case 'books':
            return <BooksSection key={idx} section={section} idx={idx} />;
          case 'link':
            return (
              <div key={idx} data-section-idx={idx} className="course-section course-section--link">
                <a
                  href={section.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="course-section-link-btn"
                >
                  <ExternalLink size={18} className="course-link-icon" />
                  <div className="course-link-text">
                    {section.titulo && <span className="course-link-title">{section.titulo}</span>}
                    {section.contenido && <span className="course-link-desc">{section.contenido}</span>}
                  </div>
                </a>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
