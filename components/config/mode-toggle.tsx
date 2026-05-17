"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { configApi } from "@/lib/config";
import type { RuntimeMode } from "@/lib/types";

interface ModeToggleProps {
  mode: RuntimeMode;
  loading?: boolean;
  onModeChange: (mode: RuntimeMode) => void;
}

/**
 * Big visual segmented control that owns the active runtime mode for the
 * whole backend. Flipping it persists `RUNTIME_MODE` server-side,
 * invalidates the Firebase admin cache, and causes every subsequent
 * `getAppConfig(...)` read to return the matching slot.
 */
export function ModeToggle({ mode, loading, onModeChange }: ModeToggleProps) {
  const [pending, setPending] = useState<RuntimeMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flip = async (next: RuntimeMode) => {
    if (next === mode || pending) return;
    setPending(next);
    setError(null);
    try {
      const r = await configApi.setMode(next);
      onModeChange(r.mode);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setPending(null);
    }
  };

  const isLive = mode === "live";
  const busy = loading || pending !== null;

  return (
    <div className="surface p-4 reveal border-[color-mix(in_oklab,var(--accent)_25%,var(--border))]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-fg">
            <Icon.pulse width={14} height={14} className="text-accent" />
            Runtime mode
          </div>
          <p className="mt-1 text-[12px] text-fg-muted">
            Every credential read by the backend (Cloudinary, Firebase,
            Razorpay, SMTP, AI…) switches to the matching slot the next time
            it&apos;s consumed. Flip is live — no redeploy.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Runtime mode"
          className="inline-flex items-stretch rounded-lg border border-border bg-panel p-1 shrink-0"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!isLive}
            onClick={() => flip("test")}
            disabled={busy}
            className={`px-3.5 py-1.5 rounded-md text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 ${
              !isLive
                ? "bg-[color-mix(in_oklab,var(--warn)_22%,transparent)] text-warn"
                : "text-fg-muted hover:text-fg"
            } ${busy ? "opacity-60 cursor-wait" : ""}`}
          >
            <span aria-hidden>🧪</span>
            Test
            {pending === "test" ? (
              <Icon.refresh
                width={11}
                height={11}
                className="animate-spin opacity-70"
              />
            ) : null}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isLive}
            onClick={() => flip("live")}
            disabled={busy}
            className={`px-3.5 py-1.5 rounded-md text-[12.5px] font-medium transition-colors inline-flex items-center gap-1.5 ${
              isLive
                ? "bg-[color-mix(in_oklab,var(--success)_22%,transparent)] text-success"
                : "text-fg-muted hover:text-fg"
            } ${busy ? "opacity-60 cursor-wait" : ""}`}
          >
            <span aria-hidden>🚀</span>
            Live
            {pending === "live" ? (
              <Icon.refresh
                width={11}
                height={11}
                className="animate-spin opacity-70"
              />
            ) : null}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-2 text-[11.5px] text-danger font-mono">{error}</div>
      ) : null}
    </div>
  );
}
