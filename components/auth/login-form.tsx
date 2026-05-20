"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { performLogin } from "@/lib/auth-api";
import { ApiError } from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import {
  RUNTIME_MODE_EVENT,
  getRuntimeMode,
  setRuntimeMode,
} from "@/lib/runtime-mode";
import type { RuntimeMode } from "@/lib/types";

// Subscribe to both the cross-tab `storage` event and the same-tab
// custom event dispatched by `setRuntimeMode`, so React re-renders
// whenever the persisted mode changes from any source.
const subscribeRuntimeMode = (cb: () => void) => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === "admin.runtime-mode.v1") cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(RUNTIME_MODE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(RUNTIME_MODE_EVENT, cb);
  };
};

const getServerRuntimeMode = (): RuntimeMode => "live";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/overview";

  const mode = useSyncExternalStore(
    subscribeRuntimeMode,
    getRuntimeMode,
    getServerRuntimeMode,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flipping mode invalidates any stale token: a JWT minted against
  // the live cluster won't resolve a user in the test cluster, so
  // forcing a fresh login on switch avoids the confusing "logged in
  // but every read fails" state.
  const onPickMode = (next: RuntimeMode) => {
    if (next === mode) return;
    setRuntimeMode(next);
    clearTokens();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    // Persist the chosen mode before login so the request carries the
    // matching X-Runtime-Mode header and the backend authenticates
    // against the right Mongo cluster.
    setRuntimeMode(mode);
    try {
      await performLogin(email.trim(), password);
      router.replace(next);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 0
            ? `Can't reach backend — ${err.message}`
            : err.message
          : (err as Error).message;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isLive = mode === "live";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle font-medium mb-1.5">
          Environment
        </div>
        <div
          role="radiogroup"
          aria-label="Runtime mode"
          className="inline-flex w-full items-stretch rounded-md border border-border bg-panel p-0.5"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!isLive}
            onClick={() => onPickMode("test")}
            className={`flex-1 px-2.5 py-1.5 rounded text-[12px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
              !isLive
                ? "bg-[color-mix(in_oklab,var(--warn)_22%,transparent)] text-warn"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <span aria-hidden>🧪</span>
            Test (dev DB)
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isLive}
            onClick={() => onPickMode("live")}
            className={`flex-1 px-2.5 py-1.5 rounded text-[12px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
              isLive
                ? "bg-[color-mix(in_oklab,var(--success)_22%,transparent)] text-success"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <span aria-hidden>🚀</span>
            Live (prod DB)
          </button>
        </div>
        <p className="mt-1.5 text-[11.5px] text-fg-subtle leading-relaxed">
          Picks which Mongo cluster you authenticate against. The whole
          dashboard stays scoped to this mode until you sign out.
        </p>
      </div>

      {error ? (
        <div className="surface border-[color-mix(in_oklab,var(--danger)_30%,var(--border))] p-3 flex items-start gap-2.5 reveal">
          <Icon.warning width={14} height={14} className="text-danger mt-0.5" />
          <div className="text-[12.5px] text-fg-muted">
            <span className="font-medium text-fg">Sign-in failed.</span>{" "}
            <span className="font-mono text-danger">{error}</span>
          </div>
        </div>
      ) : null}

      <Input
        type="email"
        label="Email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        leading={<Icon.users width={13} height={13} />}
        required
      />
      <Input
        type="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />
      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        className="w-full"
        trailing={
          !submitting ? <Icon.arrowRight width={14} height={14} /> : undefined
        }
      >
        Sign in
      </Button>
    </form>
  );
}
