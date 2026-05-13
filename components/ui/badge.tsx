import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warn" | "danger" | "muted";
type Variant = "soft" | "outline" | "solid" | "dot";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
  children: ReactNode;
}

const softMap: Record<Tone, string> = {
  neutral:
    "bg-panel-hover text-fg border-border",
  accent:
    "bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-accent border-[color-mix(in_oklab,var(--accent)_28%,transparent)]",
  success:
    "bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success border-[color-mix(in_oklab,var(--success)_28%,transparent)]",
  warn: "bg-[color-mix(in_oklab,var(--warn)_18%,transparent)] text-warn border-[color-mix(in_oklab,var(--warn)_30%,transparent)]",
  danger:
    "bg-[color-mix(in_oklab,var(--danger)_16%,transparent)] text-danger border-[color-mix(in_oklab,var(--danger)_28%,transparent)]",
  muted:
    "bg-transparent text-fg-subtle border-border",
};

const outlineMap: Record<Tone, string> = {
  neutral: "border-border-strong text-fg-muted",
  accent: "border-accent text-accent",
  success: "border-success text-success",
  warn: "border-warn text-warn",
  danger: "border-danger text-danger",
  muted: "border-border text-fg-subtle",
};

const solidMap: Record<Tone, string> = {
  neutral: "bg-[var(--fg)] text-[var(--bg)] border-transparent",
  accent: "bg-accent text-accent-fg border-transparent",
  success: "bg-success text-white border-transparent",
  warn: "bg-warn text-white border-transparent",
  danger: "bg-danger text-white border-transparent",
  muted: "bg-panel-hover text-fg-muted border-transparent",
};

const dotMap: Record<Tone, string> = {
  neutral: "text-fg-muted",
  accent: "text-accent",
  success: "text-success",
  warn: "text-warn",
  danger: "text-danger",
  muted: "text-fg-subtle",
};

export function Badge({
  tone = "neutral",
  variant = "soft",
  className,
  children,
  ...props
}: BadgeProps) {
  if (variant === "dot") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[12px] font-medium",
          dotMap[tone],
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "relative inline-block h-1.5 w-1.5 rounded-full bg-current",
            tone === "success" && "pulse-dot",
          )}
        />
        <span className="text-fg-muted">{children}</span>
      </span>
    );
  }
  const map =
    variant === "outline"
      ? outlineMap
      : variant === "solid"
        ? solidMap
        : softMap;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        map[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
