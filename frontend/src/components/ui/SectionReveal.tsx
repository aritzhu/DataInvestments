import { useEffect, useRef, useState, type ReactNode } from 'react';

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  initialVisible?: boolean;
}

export function SectionReveal({ children, className = '', delay = 0, threshold = 0.1, initialVisible = false }: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(initialVisible);

  useEffect(() => {
    if (initialVisible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold, initialVisible]);

  return (
    <div
      ref={ref}
      className={`ui-section-reveal ${visible ? 'ui-section-reveal--visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
