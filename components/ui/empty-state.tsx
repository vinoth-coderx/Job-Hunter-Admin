import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  tone?: "neutral" | "warn" | "danger";
}

const toneRing: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  neutral: "border-border text-fg-muted",
  warn: "border-[color-mix(in_oklab,var(--warn)_40%,transparent)] text-warn",
  danger:
    "border-[color-mix(in_oklab,var(--danger)_40%,transparent)] text-danger",
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface flex flex-col items-center justify-center text-center px-6 py-12 reveal",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "mb-4 grid place-items-center h-12 w-12 rounded-full border",
            toneRing[tone],
          )}
        >
          {icon}
        </div>
      ) : null}
      <h4 className="text-[15px] font-semibold tracking-tight text-fg">
        {title}
      </h4>
      {description ? (
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-fg-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
