"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
}

const sizeMap: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-sm",
  md: "h-9 px-3.5 text-sm gap-2 rounded-md",
  lg: "h-10 px-4 text-sm gap-2 rounded-md",
};

const variantMap: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover shadow-soft",
  secondary:
    "bg-panel text-fg border border-border hover:bg-panel-hover hover:border-border-strong",
  outline:
    "bg-transparent text-fg border border-border-strong hover:bg-panel-hover",
  ghost:
    "bg-transparent text-fg-muted hover:bg-panel-hover hover:text-fg",
  danger:
    "bg-danger text-white hover:opacity-90 shadow-soft",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      leading,
      trailing,
      loading,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none transition-all duration-150",
          "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
          sizeMap[size],
          variantMap[variant],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
          />
        ) : (
          leading
        )}
        {children}
        {!loading && trailing}
      </button>
    );
  },
);
