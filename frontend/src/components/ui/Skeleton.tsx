import '../../styles/ui.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width, height = '1rem', borderRadius = '8px', className = '' }: SkeletonProps) {
  return (
    <div
      className={`ui-skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`ui-skeleton-card ${className}`}>
      <Skeleton width="40%" height="0.75rem" />
      <Skeleton width="70%" height="1.5rem" />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width="60px" height="0.6rem" borderRadius="4px" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="ui-skeleton-table">
      <div className="ui-skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width="80px" height="0.6rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="ui-skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? '120px' : '60px'} height="0.8rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="ui-skeleton-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ui-skeleton-stat">
          <Skeleton width="50px" height="0.6rem" />
          <Skeleton width="80px" height="1.5rem" />
        </div>
      ))}
    </div>
  );
}
