import { useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface Book {
  title: string;
  author: string;
  isbn: string;
  desc: string;
}

const BOOKS: Book[] = [
  {
    title: 'The Intelligent Investor',
    author: 'Benjamin Graham',
    isbn: '9780060555665',
    desc: 'El manual clásico del value investing: margen de seguridad y valor intrínseco.',
  },
  {
    title: 'Security Analysis',
    author: 'Benjamin Graham y David Dodd',
    isbn: '9780071592536',
    desc: 'La obra fundacional del análisis de valores y las finanzas.',
  },
  {
    title: 'Common Stocks and Uncommon Profits',
    author: 'Philip Fisher',
    isbn: '9780471445500',
    desc: 'Análisis cualitativo: ventajas competitivas, gestión y crecimiento.',
  },
  {
    title: 'One Up on Wall Street',
    author: 'Peter Lynch',
    isbn: '9780743200400',
    desc: 'Invertir en lo que conoces con método, paciencia y sentido común.',
  },
  {
    title: 'The Snowball',
    author: 'Alice Schroeder',
    isbn: '9780553384611',
    desc: 'La biografía definitiva de Warren Buffett, el inversor más famoso del mundo.',
  },
  {
    title: 'Margin of Safety',
    author: 'Seth A. Klarman',
    isbn: '9780887305108',
    desc: 'El libro más buscado del value investing: riesgo y descuento.',
  },
  {
    title: 'Value Investing',
    author: 'Bruce C. N. Greenwald',
    isbn: '9780471463399',
    desc: 'La evolución del value investing desde Graham hasta Buffett.',
  },
  {
    title: 'The Little Book That Beats the Market',
    author: 'Joel Greenblatt',
    isbn: '9780470624159',
    desc: 'La fórmula mágica: buenas empresas a precios atractivos.',
  },
  {
    title: 'The Dhandho Investor',
    author: 'Mohnish Pabrai',
    isbn: '9780470289634',
    desc: 'Inversiones de bajo riesgo y alto retorno inspiradas en Buffett.',
  },
  {
    title: 'You Can Be a Stock Market Genius',
    author: 'Joel Greenblatt',
    isbn: '9780684840079',
    desc: 'Oportunidades especiales y enfoques no convencionales.',
  },
];

function amazonUrl(title: string): string {
  return `https://www.amazon.es/s?k=${encodeURIComponent(title)}`;
}

function coverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
}

export function BookCarousel() {
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: 1 | -1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const card = viewport.querySelector<HTMLElement>('.book-card');
    if (!card) return;
    const gap = 1.25 * 16;
    viewport.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: 'smooth' });
  };

  return (
    <div className="book-carousel">
      <button
        type="button"
        className="book-carousel-btn book-carousel-btn--prev"
        onClick={() => scrollByCard(-1)}
        aria-label="Anterior"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="book-carousel-viewport" ref={viewportRef}>
        <div className="book-carousel-track">
          {BOOKS.map((book) => (
            <a
              key={book.isbn}
              href={amazonUrl(book.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="book-card"
              title={`Ver "${book.title}" en Amazon`}
            >
              <div className="book-card-cover">
                <div className="book-card-cover-fallback">
                  <BookOpen size={28} />
                </div>
                <img
                  src={coverUrl(book.isbn)}
                  alt={`Portada de ${book.title}`}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="book-card-body">
                <div className="book-card-title">{book.title}</div>
                <div className="book-card-author">{book.author}</div>
                <p className="book-card-desc">{book.desc}</p>
                <span className="book-card-cta">Ver en Amazon →</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="book-carousel-btn book-carousel-btn--next"
        onClick={() => scrollByCard(1)}
        aria-label="Siguiente"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
