import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import type { DeepHealthCheck } from "@/lib/types";

function toneFor(status: DeepHealthCheck["status"]) {
  if (status === "up") return "success" as const;
  if (status === "degraded") return "warn" as const;
  return "danger" as const;
}

export function ProbeRow({
  label,
  check,
  icon,
}: {
  label: string;
  check: DeepHealthCheck;
  icon?: ReactNode;
}) {
  const tone = toneFor(check.status);
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-panel-hover text-fg-muted border border-border shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-fg">
            <StatusDot tone={tone} pulse={check.status === "up"} />
            <span>{label}</span>
          </div>
          {check.error ? (
            <div className="mt-0.5 font-mono text-[11.5px] text-danger truncate max-w-[420px]">
              {check.error}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {typeof check.latencyMs === "number" ? (
          <span className="font-mono text-[11.5px] text-fg-subtle tabular-nums">
            {check.latencyMs}ms
          </span>
        ) : null}
        <Badge
          tone={tone === "success" ? "success" : tone === "warn" ? "warn" : "danger"}
          variant="soft"
        >
          {check.status}
        </Badge>
      </div>
    </div>
  );
}
