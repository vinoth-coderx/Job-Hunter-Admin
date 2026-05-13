"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemePreference;
  resolved: ResolvedTheme;
  setTheme: (next: ThemePreference) => void;
  toggle: () => void;
}

const STORAGE_KEY = "jh_admin_theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystem(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  // Hydrate from localStorage on mount. The pre-paint script (in layout.tsx)
  // already set the class so this is just state sync — no flash.
  useEffect(() => {
    const stored = (window.localStorage.getItem(STORAGE_KEY) ??
      "dark") as ThemePreference;
    const next: ThemePreference = ["light", "dark", "system"].includes(stored)
      ? stored
      : "dark";
    setThemeState(next);
    setResolved(next === "system" ? readSystem() : next);
  }, []);

  // Track system changes if user picked "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      setResolved(next);
      applyTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setResolved(next === "system" ? readSystem() : next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

// Inline script — runs before paint, prevents the dreaded flash of wrong
// theme. Kept as a small string so layout.tsx can drop it into <head>.
export const themeBootstrapScript = `
(function() {
  try {
    var s = localStorage.getItem('${STORAGE_KEY}') || 'dark';
    var d;
    if (s === 'system') {
      d = matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      d = s === 'dark';
    }
    var c = document.documentElement.classList;
    if (d) c.add('dark'); else c.remove('dark');
    document.documentElement.style.colorScheme = d ? 'dark' : 'light';
  } catch (_) {}
})();
`.trim();
