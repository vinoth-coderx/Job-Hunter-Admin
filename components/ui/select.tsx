"use client";

import {
  forwardRef,
  type SelectHTMLAttributes,
  type ReactNode,
  useId,
} from "react";
import { cn } from "@/lib/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={fieldId}
          className="block text-[12.5px] font-medium text-fg"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          className={cn(
            "block w-full h-9 appearance-none rounded-md border bg-bg-elevated pl-3 pr-8 text-[13.5px] text-fg outline-none transition-colors",
            error
              ? "border-danger focus:border-danger"
              : "border-border focus:border-border-strong",
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
      {error ? (
        <div className="text-[11.5px] text-danger">{error}</div>
      ) : hint ? (
        <div className="text-[11.5px] text-fg-subtle">{hint}</div>
      ) : null}
    </div>
  );
});
