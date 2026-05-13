"use client";

import {
  forwardRef,
  type TextareaHTMLAttributes,
  type ReactNode,
  useId,
} from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, mono, className, id, rows = 4, ...props },
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
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={cn(
            "block w-full rounded-md border bg-bg-elevated px-3 py-2 text-[13.5px] text-fg placeholder:text-fg-subtle outline-none transition-colors resize-y",
            error
              ? "border-danger focus:border-danger"
              : "border-border focus:border-border-strong",
            mono && "font-mono leading-relaxed",
            className,
          )}
          {...props}
        />
        {error ? (
          <div className="text-[11.5px] text-danger">{error}</div>
        ) : hint ? (
          <div className="text-[11.5px] text-fg-subtle">{hint}</div>
        ) : null}
      </div>
    );
  },
);
