export default function SectionCard({ title, score, children, meta }) {
  const color =
    score === null || score === undefined
      ? '#8B95A1'
      : score >= 75
      ? '#3FB950'
      : score >= 50
      ? '#D29922'
      : '#F85149';

  return (
    <div className="border border-line rounded-lg bg-panel p-5 animate-rise">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-mono text-sm text-ink tracking-wide">{title}</h3>
        <span className="font-mono text-sm tabular-nums" style={{ color }}>
          {score === null || score === undefined ? 'n/a' : `${score}`}
        </span>
      </div>
      {meta && <p className="text-xs text-muted mb-3">{meta}</p>}
      <div className="h-1.5 w-full bg-line rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${score ?? 0}%`, backgroundColor: color }}
        />
      </div>
      {children}
    </div>
  );
}
