import type { ReactNode } from "react";

interface Segment {
  key: string;
  label: string;
  value: number;
  tone: string; // CSS color (var ref ok)
  hint?: ReactNode;
}

export function DistributionBar({
  segments,
  total,
  label,
}: {
  segments: Segment[];
  total: number;
  label?: ReactNode;
}) {
  const safeTotal = total > 0 ? total : 1;
  return (
    <div>
      {label ? (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
            {label}
          </span>
          <span className="font-mono text-[12px] text-fg tabular-nums">
            {total.toLocaleString()}
          </span>
        </div>
      ) : null}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-panel-hover">
        {segments.map((s, i) => {
          const pct = (s.value / safeTotal) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={s.key}
              title={`${s.label}: ${s.value.toLocaleString()} (${pct.toFixed(1)}%)`}
              className="h-full"
              style={{
                width: `${pct}%`,
                background: s.tone,
                transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
                marginLeft: i === 0 ? 0 : 1,
              }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <div
            key={s.key}
            className="inline-flex items-center gap-1.5 text-[12px]"
          >
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.tone }}
            />
            <span className="text-fg-muted">{s.label}</span>
            <span className="font-mono text-fg tabular-nums">
              {s.value.toLocaleString()}
            </span>
            {s.hint ? (
              <span className="text-fg-subtle">{s.hint}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
