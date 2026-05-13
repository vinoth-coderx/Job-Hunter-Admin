"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leading,
    trailing,
    mono,
    className,
    id,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-[12.5px] font-medium text-fg"
        >
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "group relative flex items-center gap-2 h-9 rounded-md border bg-bg-elevated transition-colors",
          error
            ? "border-danger focus-within:border-danger"
            : "border-border focus-within:border-border-strong",
        )}
      >
        {leading ? (
          <span className="pl-2.5 text-fg-subtle shrink-0">{leading}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none text-[13.5px] text-fg placeholder:text-fg-subtle px-3",
            leading ? "pl-0" : null,
            trailing ? "pr-0" : null,
            mono ? "font-mono" : null,
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="pr-1.5 shrink-0">{trailing}</span>
        ) : null}
      </div>
      {error ? (
        <div className="text-[11.5px] text-danger">{error}</div>
      ) : hint ? (
        <div className="text-[11.5px] text-fg-subtle">{hint}</div>
      ) : null}
    </div>
  );
});
