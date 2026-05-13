"use client";

import { cn } from "@/lib/cn";

interface PillOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterPillsProps<T extends string> {
  options: PillOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterPillsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "group inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-all duration-200",
              active
                ? "bg-fg text-bg shadow-soft"
                : "bg-panel border border-border text-fg-muted hover:bg-panel-hover hover:border-border-strong hover:text-fg",
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" ? (
              <span
                className={cn(
                  "min-w-[18px] text-center rounded-full px-1.5 text-[10.5px] font-mono tabular-nums",
                  active
                    ? "bg-bg/15 text-bg"
                    : "bg-panel-hover text-fg-subtle group-hover:bg-bg-elevated",
                )}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
