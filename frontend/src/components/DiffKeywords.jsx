export default function DiffKeywords({ matched = [], missing = [] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <div className="text-[11px] font-mono text-muted mb-2 tracking-wide">
          IN RESUME · {matched.length}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {matched.length === 0 && (
            <span className="text-xs text-muted font-mono">— none matched —</span>
          )}
          {matched.map((w) => (
            <span
              key={w}
              className="font-mono text-xs px-2 py-1 rounded-sm bg-addDim text-add border border-add/30"
            >
              + {w}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-mono text-muted mb-2 tracking-wide">
          MISSING FROM RESUME · {missing.length}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {missing.length === 0 && (
            <span className="text-xs text-muted font-mono">— nothing missing —</span>
          )}
          {missing.map((w) => (
            <span
              key={w}
              className="font-mono text-xs px-2 py-1 rounded-sm bg-delDim text-del border border-del/30"
            >
              − {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
