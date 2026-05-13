import type { ReactNode } from "react";
import { Skeleton } from "./skeleton";
import { Badge } from "./badge";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value?: ReactNode;
  hint?: ReactNode;
  delta?: { value: string; tone: "success" | "danger" | "neutral" };
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  loading,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "surface surface-hover p-5 flex flex-col gap-3 reveal",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle font-medium">
          {label}
        </span>
        {icon ? (
          <span className="text-fg-subtle opacity-70">{icon}</span>
        ) : null}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" rounded="md" />
      ) : (
        <div className="text-3xl font-semibold tracking-tight tabular-nums text-fg">
          {value ?? "—"}
        </div>
      )}
      <div className="flex items-center gap-2 min-h-[18px]">
        {delta ? (
          <Badge
            tone={
              delta.tone === "success"
                ? "success"
                : delta.tone === "danger"
                  ? "danger"
                  : "neutral"
            }
            variant="soft"
          >
            {delta.value}
          </Badge>
        ) : null}
        {hint ? (
          <span className="text-[12px] text-fg-muted">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
