"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { configApi, CATEGORY_META } from "@/lib/config";
import { formatRelative } from "@/lib/format";
import type { AppConfigEntry, RuntimeMode } from "@/lib/types";

type ProbeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; latencyMs?: number; message?: string }
  | { kind: "fail"; message: string; latencyMs?: number };

interface ConfigRowProps {
  entry: AppConfigEntry;
  mode: RuntimeMode;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Render a single config row across two columns — Test slot + Live slot.
 * The column matching the active runtime mode is visually emphasised so
 * an operator can tell at a glance which credentials the backend is
 * currently serving. Mode-agnostic rows (only the legacy slot populated)
 * span both columns with a single "shared" preview.
 */
export function ConfigRow({ entry, mode, onEdit, onDelete }: ConfigRowProps) {
  const [probe, setProbe] = useState<ProbeState>({ kind: "idle" });

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

  const renderSlot = (
    has: boolean,
    preview: string | null | undefined,
    plain: string | undefined,
    isSecret: boolean,
    active: boolean,
  ) => {
    if (!has) {
      return <span className="text-fg-subtle italic">not set</span>;
    }
    const text = isSecret ? preview ?? "••••" : plain ?? preview ?? "";
    return (
      <span
        className={`font-mono truncate inline-block max-w-[200px] align-bottom ${
          active ? "text-fg" : "text-fg-muted"
        }`}
      >
        {text}
      </span>
    );
  };

  // Mode-agnostic row — only the legacy slot is populated, span both columns
  const onlyLegacy =
    entry.hasLegacyValue && !entry.hasTestValue && !entry.hasLiveValue;

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

      {onlyLegacy ? (
        <td
          className="py-3 px-3 align-top text-[12.5px]"
          colSpan={2}
          title="Mode-agnostic — same value serves both Test and Live"
        >
          <span className="inline-flex items-center gap-1.5">
            <Badge tone="muted" variant="soft" className="text-[10px]">
              shared
            </Badge>
            {renderSlot(true, entry.legacyPreview, entry.legacyValue, entry.isSecret, true)}
          </span>
        </td>
      ) : (
        <>
          <td
            className={`py-3 px-3 align-top text-[12.5px] ${
              mode === "test"
                ? "bg-[color-mix(in_oklab,var(--warn)_8%,transparent)]"
                : ""
            }`}
          >
            {renderSlot(
              entry.hasTestValue,
              entry.testPreview,
              entry.testValue,
              entry.isSecret,
              mode === "test",
            )}
          </td>
          <td
            className={`py-3 px-3 align-top text-[12.5px] ${
              mode === "live"
                ? "bg-[color-mix(in_oklab,var(--success)_8%,transparent)]"
                : ""
            }`}
          >
            {renderSlot(
              entry.hasLiveValue,
              entry.livePreview,
              entry.liveValue,
              entry.isSecret,
              mode === "live",
            )}
          </td>
        </>
      )}

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
            title={`Probe upstream (active mode: ${mode})`}
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
