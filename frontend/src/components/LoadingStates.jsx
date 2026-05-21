export function SkeletonBlock({ className = '', lines = 1 }) {
  return (
    <span className={`skeleton-block ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="standard-table-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="standard-table-skeleton-row" key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <span key={columnIndex} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ cards = 4 }) {
  return (
    <div className="card-skeleton-grid" aria-hidden="true">
      {Array.from({ length: cards }, (_, index) => (
        <div className="card-skeleton" key={index}>
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 8 }) {
  return (
    <div className="form-skeleton" aria-hidden="true">
      {Array.from({ length: fields }, (_, index) => (
        <SkeletonBlock key={index} />
      ))}
    </div>
  );
}

export function PageLoadingFallback({ message = 'Carregando tela...' }) {
  return (
    <div className="soft-loading-state" role="status" aria-live="polite">
      <span className="soft-loading-spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
