"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  RUNTIME_MODE_EVENT,
  getRuntimeMode,
  setRuntimeMode as persistRuntimeMode,
} from "@/lib/runtime-mode";
import type { RuntimeMode } from "@/lib/types";

interface RuntimeModeContextValue {
  mode: RuntimeMode;
  setMode: (next: RuntimeMode) => void;
}

const RuntimeModeContext = createContext<RuntimeModeContextValue | null>(null);

/**
 * Provides the active runtime mode + setter to the whole dashboard.
 * Mounted in `app/(dashboard)/layout.tsx` so every page inside the
 * authenticated shell can read or flip the mode. Setter writes
 * through to localStorage (via `lib/runtime-mode.ts`) and to React
 * state in one go, so the tab UI and `api.ts` header injection stay
 * in lockstep.
 */
export function RuntimeModeProvider({ children }: { children: ReactNode }) {
  // Initial state: read from localStorage on mount (Next.js renders
  // server-side first with the default; the hydration pass corrects).
  const [mode, setModeState] = useState<RuntimeMode>("live");

  useEffect(() => {
    setModeState(getRuntimeMode());

    // Sync state when another tab flips the mode (cross-tab via
    // `storage` event) or when the same tab fires our custom event.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "admin.runtime-mode.v1") {
        setModeState(getRuntimeMode());
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<RuntimeMode>).detail;
      if (detail === "test" || detail === "live") setModeState(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(RUNTIME_MODE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(RUNTIME_MODE_EVENT, onCustom);
    };
  }, []);

  const setMode = useCallback((next: RuntimeMode) => {
    persistRuntimeMode(next);
    setModeState(next);
  }, []);

  return (
    <RuntimeModeContext.Provider value={{ mode, setMode }}>
      {children}
    </RuntimeModeContext.Provider>
  );
}

export function useRuntimeMode(): RuntimeModeContextValue {
  const ctx = useContext(RuntimeModeContext);
  if (!ctx) {
    throw new Error(
      "useRuntimeMode must be used inside RuntimeModeProvider — wrap the dashboard layout.",
    );
  }
  return ctx;
}
