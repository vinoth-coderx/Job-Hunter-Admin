"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  id?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
  id,
}: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 select-none",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 mt-0.5",
          checked
            ? "bg-accent"
            : "bg-panel-hover border border-border",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-bg-elevated shadow-soft transition-transform duration-200 will-change-transform",
            checked ? "translate-x-[18px]" : "translate-x-[3px]",
          )}
        />
      </button>
      {(label || description) && (
        <div className="min-w-0">
          {label ? (
            <div className="text-[13px] font-medium text-fg leading-tight">
              {label}
            </div>
          ) : null}
          {description ? (
            <div className="mt-0.5 text-[11.5px] text-fg-muted leading-snug">
              {description}
            </div>
          ) : null}
        </div>
      )}
    </label>
  );
}
