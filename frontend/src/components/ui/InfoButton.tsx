import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Info, Lightbulb, X } from 'lucide-react';
import '../../styles/info.css';

export interface InfoBadge {
  label: string;
  tone?: 'pos' | 'neg' | 'warn' | 'neutral' | 'gold';
}

export interface InfoContent {
  title: string;
  body: ReactNode;
  badges?: InfoBadge[];
  tip?: string;
}

function renderInline(seg: string): ReactNode {
  const parts = seg.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
  );
}

function renderBody(body: ReactNode): ReactNode {
  if (typeof body !== 'string') return body;
  const segments = body.split('`');
  return segments.map((seg, i) =>
    i % 2 === 1 ? <code key={i}>{seg}</code> : <>{renderInline(seg)}</>,
  );
}

export function InfoButton({
  content,
  align = 'left',
  variant = 'default',
}: {
  content: InfoContent;
  align?: 'left' | 'right' | 'center';
  variant?: 'default' | 'danger';
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc as unknown as EventListener);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc as unknown as EventListener);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const visible = open || hovered;

  return (
    <div
      className="info-btn-root"
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={`info-btn${variant === 'danger' ? ' info-btn--danger' : ''}`}
        aria-label={`Información: ${content.title}`}
        aria-expanded={visible}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Info size={14} aria-hidden />
      </button>
      {visible && (
        <div className={`info-pop info-pop--${align}`} role="dialog" aria-label={content.title}>
          <div className="info-pop-head">
            <span className="info-pop-icon">
              <Info size={14} aria-hidden />
            </span>
            <span className="info-pop-title">{content.title}</span>
            <button
              type="button"
              className="info-pop-close"
              aria-label="Cerrar"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
            >
              <X size={13} aria-hidden />
            </button>
          </div>
          <div className="info-pop-body">{renderBody(content.body)}</div>
          {content.badges && content.badges.length > 0 && (
            <div className="info-pop-badges">
              {content.badges.map((b) => (
                <span key={b.label} className={`info-badge info-badge--${b.tone ?? 'neutral'}`}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
          {content.tip && (
            <div className="info-pop-tip">
              <Lightbulb size={13} aria-hidden />
              <span>{content.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
