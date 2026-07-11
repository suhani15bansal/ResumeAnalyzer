export default function ScoreGauge({ score, grade }) {
  const ticks = 48;
  const filled = Math.round((score / 100) * ticks);
  const radius = 84;
  const center = 100;

  const color =
    score >= 85 ? '#3FB950' : score >= 65 ? '#D29922' : '#F85149';

  const items = Array.from({ length: ticks }, (_, i) => {
    const angle = (i / ticks) * 2 * Math.PI - Math.PI / 2;
    const isFilled = i < filled;
    const len = isFilled ? 14 : 9;
    const x1 = center + Math.cos(angle) * (radius - len);
    const y1 = center + Math.sin(angle) * (radius - len);
    const x2 = center + Math.cos(angle) * radius;
    const y2 = center + Math.sin(angle) * radius;
    return (
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isFilled ? color : '#2A313C'}
        strokeWidth={isFilled ? 3 : 2}
        strokeLinecap="round"
        style={{
          transition: `stroke 0.4s ease ${i * 6}ms, stroke-width 0.4s ease ${i * 6}ms`,
        }}
      />
    );
  });

  return (
    <div className="relative flex items-center justify-center w-[200px] h-[200px] shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {items}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-5xl font-semibold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted font-mono mt-1 tracking-widest">/ 100</span>
        <span
          className="mt-2 text-[11px] font-mono px-2 py-0.5 rounded border"
          style={{ color, borderColor: color + '55', backgroundColor: color + '15' }}
        >
          grade {grade}
        </span>
      </div>
    </div>
  );
}
