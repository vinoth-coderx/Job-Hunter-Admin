"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { configApi, CATEGORY_META } from "@/lib/config";
import { formatRelative } from "@/lib/format";
import type { AppConfigEntry } from "@/lib/types";

type ProbeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; latencyMs?: number; message?: string }
  | { kind: "fail"; message: string; latencyMs?: number };

export function ConfigRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: AppConfigEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [probe, setProbe] = useState<ProbeState>({ kind: "idle" });
  const [revealed, setRevealed] = useState(false);

  const doProbe = async () => {
    setProbe({ kind: "loading" });
    try {
      const r = await configApi.probe(entry.key);
      setProbe({
        kind: r.ok ? "ok" : "fail",
        latencyMs: r.latencyMs,
        message: r.detail ?? "",
      } as ProbeState);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setProbe({ kind: "fail", message: msg });
    }
  };

  const valueDisplay = entry.isSecret ? (
    entry.hasValue ? (
      <span className="inline-flex items-center gap-2">
        <span className="font-mono text-fg-subtle tracking-widest">
          {revealed ? "stored" : "••••••••••••"}
        </span>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="text-[11px] text-fg-subtle hover:text-fg transition-colors"
          title="Reveal whether a value is stored"
        >
          {revealed ? "hide" : "info"}
        </button>
      </span>
    ) : (
      <span className="text-fg-subtle italic">not set</span>
    )
  ) : entry.value ? (
    <span className="font-mono text-fg truncate inline-block max-w-[360px] align-bottom">
      {entry.value}
    </span>
  ) : (
    <span className="text-fg-subtle italic">empty</span>
  );

  return (
    <tr className="group border-b border-border last:border-b-0 hover:bg-panel-hover transition-colors">
      <td className="py-3 pl-5 pr-3 align-top">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-mono text-[12.5px] font-medium text-fg">
            {entry.key}
          </div>
          {entry.managedBy ? (
            <Badge
              tone="accent"
              variant="soft"
              title={`Auto-managed by ${entry.managedBy.surface}. Direct edits here are overwritten on the next sync.`}
            >
              managed by {entry.managedBy.surface.split(" ")[0]}
            </Badge>
          ) : null}
        </div>
        {entry.notes ? (
          <div className="mt-0.5 text-[11.5px] text-fg-muted line-clamp-2 max-w-[420px]">
            {entry.notes}
          </div>
        ) : null}
      </td>
      <td className="py-3 px-3 align-top">
        <Badge
          tone={entry.category === "cron" ? "warn" : "neutral"}
          variant="soft"
          title={CATEGORY_META[entry.category].description}
        >
          {entry.category}
        </Badge>
      </td>
      <td className="py-3 px-3 align-top text-[12.5px]">{valueDisplay}</td>
      <td className="py-3 px-3 align-top">
        {entry.isSecret ? (
          <Badge tone="accent" variant="soft">
            encrypted
          </Badge>
        ) : (
          <Badge tone="muted" variant="soft">
            plain
          </Badge>
        )}
      </td>
      <td className="py-3 px-3 align-top text-[11.5px] text-fg-muted whitespace-nowrap">
        {formatRelative(entry.updatedAt)}
      </td>
      <td className="py-3 px-3 align-top">
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={doProbe}
            loading={probe.kind === "loading"}
            title="Probe upstream"
            leading={<Icon.pulse width={12} height={12} />}
          >
            Probe
          </Button>
          {entry.managedBy ? (
            <a
              href={entry.managedBy.href}
              className="inline-flex h-7 items-center gap-1 px-2 rounded-md text-[11.5px] text-fg-muted hover:text-fg hover:bg-panel-hover transition-colors"
              title={`Edit this on the ${entry.managedBy.surface}`}
            >
              <Icon.sliders width={12} height={12} />
              Edit in {entry.managedBy.href}
            </a>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                title="Edit"
                leading={<Icon.sliders width={12} height={12} />}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                title="Delete"
                className="hover:text-danger"
                leading={<Icon.x width={12} height={12} />}
              >
                Delete
              </Button>
            </>
          )}
        </div>
        {probe.kind === "ok" || probe.kind === "fail" ? (
          <div className="mt-1.5 flex items-start gap-1.5 text-[11px] max-w-90">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full mt-1 shrink-0 ${
                probe.kind === "ok" ? "bg-success" : "bg-danger"
              }`}
            />
            <span
              className={
                probe.kind === "ok" ? "text-success" : "text-danger"
              }
            >
              {probe.kind === "ok"
                ? `${probe.message || "ok"}${probe.latencyMs ? ` · ${probe.latencyMs}ms` : ""}`
                : `${probe.message || "failed"}${probe.latencyMs ? ` · ${probe.latencyMs}ms` : ""}`}
            </span>
          </div>
        ) : null}
      </td>
                  <td className="py-3 pl-3 pr-5 align-top" aria-hidden />
    </tr>
  );
}
