import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

const MOBILE_BREAKPOINT = 767;
const POPUP_GAP = 8;
const POPUP_MAX_WIDTH = 320;

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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mobile, setMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<number | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setHovered(false);
  }, []);

  const showHover = useCallback(() => {
    if (hoverTimeout.current !== null) {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setHovered(true);
  }, []);

  const hideHover = useCallback(() => {
    if (hoverTimeout.current !== null) {
      window.clearTimeout(hoverTimeout.current);
    }
    hoverTimeout.current = window.setTimeout(() => setHovered(false), 120);
  }, []);

  useEffect(() => () => {
    if (hoverTimeout.current !== null) {
      window.clearTimeout(hoverTimeout.current);
    }
  }, []);

  const visible = open || hovered;

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideRoot = rootRef.current ? rootRef.current.contains(target) : false;
      const insidePop = popRef.current ? popRef.current.contains(target) : false;
      if (!insideRoot && !insidePop) close();
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

  useLayoutEffect(() => {
    if (!visible) return;
    if (mobile) {
      setPos(null);
      return;
    }
    const update = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pop = popRef.current;
      const popW = pop?.offsetWidth ?? Math.min(POPUP_MAX_WIDTH, vw - 32);
      const popH = pop?.offsetHeight ?? 200;

      let top: number;
      if (r.bottom + POPUP_GAP + popH <= vh) {
        top = r.bottom + POPUP_GAP;
      } else if (r.top - POPUP_GAP - popH >= 0) {
        top = r.top - POPUP_GAP - popH;
      } else {
        top = Math.max(POPUP_GAP, vh - popH - POPUP_GAP);
      }

      let left: number;
      if (align === 'right') left = r.right - popW;
      else if (align === 'center') left = r.left + r.width / 2 - popW / 2;
      else left = r.left;
      left = Math.max(POPUP_GAP, Math.min(left, vw - popW - POPUP_GAP));

      setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [visible, align, mobile]);

  const popupEl = (
    <div
      ref={popRef}
      className={`info-pop info-pop--${align}`}
      role="dialog"
      aria-label={content.title}
      style={!mobile && pos ? { position: 'fixed', top: pos.top, left: pos.left } : undefined}
      onMouseEnter={showHover}
      onMouseLeave={hideHover}
    >
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
  );

  return (
    <div
      className="info-btn-root"
      ref={rootRef}
      onMouseEnter={showHover}
      onMouseLeave={hideHover}
    >
      <button
        ref={btnRef}
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
      {visible && createPortal(popupEl, document.body)}
    </div>
  );
}
