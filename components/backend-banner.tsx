"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { API_BASE_URL } from "@/lib/api";

export function BackendBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="reveal mb-6 surface flex items-start gap-3 p-4 border-[color-mix(in_oklab,var(--warn)_30%,var(--border))]">
      <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_oklab,var(--warn)_18%,transparent)] text-warn shrink-0">
        <Icon.warning width={14} height={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-fg">
          Backend admin routes are not deployed yet
        </div>
        <p className="mt-0.5 text-[12.5px] text-fg-muted leading-relaxed">
          This console talks to{" "}
          <code className="font-mono text-[12px] text-fg bg-panel-hover px-1.5 py-0.5 rounded">
            {API_BASE_URL}
          </code>
          . Requests under{" "}
          <code className="font-mono text-[12px] text-fg bg-panel-hover px-1.5 py-0.5 rounded">
            /admin/*
          </code>{" "}
          will 404 until the routes in <em>OPERATIONS.md §18</em> are built.
          Sections render empty/error states honestly — no mock data.
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-fg-subtle hover:bg-panel-hover hover:text-fg transition-colors"
      >
        <Icon.x width={14} height={14} />
      </button>
    </div>
  );
}
