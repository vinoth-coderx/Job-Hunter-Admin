import type { RuntimeMode } from "./types";

/**
 * Browser-local source of truth for the active runtime mode. Persisted
 * in `localStorage` so a refresh stays on whichever side (Test / Live)
 * the operator was last viewing. `api.ts` reads this value on every
 * request to inject the `X-Runtime-Mode` header so the backend scopes
 * the response to the matching Mongo.
 *
 * `localStorage` is checked once per call; React components subscribe
 * via `RuntimeModeProvider` (see `components/layout/runtime-mode-provider.tsx`)
 * which keeps a separate React state in sync.
 */
const STORAGE_KEY = "admin.runtime-mode.v1";
const DEFAULT_MODE: RuntimeMode = "live";

const isMode = (v: unknown): v is RuntimeMode => v === "test" || v === "live";

/**
 * Read the current mode. Safe on the server — returns the default
 * (`live`) when called outside a browser context so Next.js SSR
 * doesn't crash.
 */
export const getRuntimeMode = (): RuntimeMode => {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isMode(raw) ? raw : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
};

/**
 * Persist the new mode. Fires a `storage` event so other tabs in the
 * same origin update their context.
 */
export const setRuntimeMode = (mode: RuntimeMode): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    // Notify same-tab subscribers — `storage` events only fire cross-tab.
    window.dispatchEvent(
      new CustomEvent("admin:runtime-mode-changed", { detail: mode }),
    );
  } catch {
    /* localStorage unavailable; ignore */
  }
};

export const RUNTIME_MODE_EVENT = "admin:runtime-mode-changed";
