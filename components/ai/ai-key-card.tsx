"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Icon } from "@/components/icons";
import { aiApi, PROVIDER_META } from "@/lib/ai";
import { ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { AiKey } from "@/lib/types";

type TestState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; latencyMs?: number }
  | { kind: "fail"; message: string };

export function AiKeyCard({
  k,
  onUpdated,
  onEdit,
  onDelete,
}: {
  k: AiKey;
  onUpdated: (next: AiKey) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const [togglingActive, setTogglingActive] = useState(false);

  const provider = PROVIDER_META[k.provider];
  const pct = k.dailyLimit > 0
    ? Math.min(100, Math.round((k.usageToday / k.dailyLimit) * 100))
    : 0;
  const usageTone =
    pct >= 90 ? "danger" : pct >= 70 ? "warn" : "success";

  const setActive = async (next: boolean) => {
    setTogglingActive(true);
    const prev = k.isActive;
    onUpdated({ ...k, isActive: next });
    try {
      const r = await aiApi.toggle(k._id, next);
      onUpdated(r);
    } catch {
      onUpdated({ ...k, isActive: prev });
    } finally {
      setTogglingActive(false);
    }
  };

  const runTest = async () => {
    setTest({ kind: "loading" });
    try {
      const r = await aiApi.test(k._id);
      setTest({
        kind: r.ok ? "ok" : "fail",
        latencyMs: r.latencyMs,
        message: r.detail ?? "",
      } as TestState);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setTest({ kind: "fail", message: msg });
    }
  };

  return (
    <div className="surface surface-hover p-5 reveal flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="grid h-9 w-9 place-items-center rounded-md shrink-0 border border-border"
            style={{
              background: `color-mix(in oklab, ${provider.tone} 14%, transparent)`,
              color: provider.tone,
            }}
          >
            <Icon.spark width={16} height={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-fg truncate">
                {k.label}
              </h3>
              {!k.isActive ? (
                <Badge tone="muted" variant="soft">
                  inactive
                </Badge>
              ) : (
                <Badge tone="success" variant="dot">
                  routing
                </Badge>
              )}
              <Badge
                tone={k.tier === "paid" ? "accent" : "muted"}
                variant="soft"
              >
                {k.tier}
              </Badge>
            </div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">
              {provider.label} · <span className="font-mono">{k.model}</span>
            </div>
          </div>
        </div>
        <Toggle checked={k.isActive} onChange={setActive} disabled={togglingActive} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
            Priority
          </div>
          <div className="mt-0.5 font-mono text-[13px] text-fg tabular-nums">
            {k.priority}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
            Weight
          </div>
          <div className="mt-0.5 font-mono text-[13px] text-fg tabular-nums">
            {k.weight}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
            RPM
          </div>
          <div className="mt-0.5 font-mono text-[13px] text-fg tabular-nums">
            {k.rpmLimit}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between text-[11.5px] mb-1.5">
          <span className="text-fg-muted">Daily usage</span>
          <span className="font-mono text-fg tabular-nums">
            {k.usageToday.toLocaleString()} /{" "}
            {k.dailyLimit > 0 ? k.dailyLimit.toLocaleString() : "∞"}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-panel-hover overflow-hidden">
          <div
            className={`h-full rounded-full ${
              usageTone === "danger"
                ? "bg-danger"
                : usageTone === "warn"
                  ? "bg-warn"
                  : "bg-success"
            }`}
            style={{
              width: `${pct}%`,
              transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </div>
      </div>

      {k.allowedFeatures.length ? (
        <div className="flex flex-wrap gap-1">
          {k.allowedFeatures.map((f) => (
            <span
              key={f}
              className="font-mono text-[10.5px] text-fg-muted bg-panel-hover px-1.5 py-0.5 rounded"
            >
              {f}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="text-[11px] text-fg-subtle">
          {k.lastUsedAt
            ? `last used ${formatRelative(k.lastUsedAt)}`
            : "never used"}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={runTest}
            loading={test.kind === "loading"}
            leading={<Icon.pulse width={12} height={12} />}
          >
            Test
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            leading={<Icon.sliders width={12} height={12} />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="hover:text-danger"
            leading={<Icon.x width={12} height={12} />}
          >
            Delete
          </Button>
        </div>
      </div>

      {test.kind === "ok" || test.kind === "fail" ? (
        <div className="text-[11.5px] flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              test.kind === "ok" ? "bg-success" : "bg-danger"
            }`}
          />
          <span
            className={test.kind === "ok" ? "text-success" : "text-danger"}
          >
            {test.kind === "ok"
              ? `ok${test.latencyMs ? ` · ${test.latencyMs}ms` : ""}`
              : test.message || "failed"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
