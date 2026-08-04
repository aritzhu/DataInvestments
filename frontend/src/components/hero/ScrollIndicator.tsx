import { ChevronDown } from 'lucide-react';

export function ScrollIndicator() {
  return (
    <a href="#companies" className="hero-scroll" aria-label="Ver contenido">
      <span className="hero-scroll-text">Descubre más</span>
      <ChevronDown size={22} />
    </a>
  );
}
