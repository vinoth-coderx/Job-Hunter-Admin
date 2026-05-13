"use client";

import { useTheme, type ThemePreference } from "./theme-provider";
import { Icon } from "./icons";
import { cn } from "@/lib/cn";

const segments: { value: ThemePreference; label: string; icon: keyof typeof Icon }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "monitor" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative inline-flex items-center gap-0.5 rounded-full border border-border bg-panel p-0.5 shadow-soft"
    >
      {segments.map((seg) => {
        const Glyph = Icon[seg.icon];
        const active = theme === seg.value;
        return (
          <button
            key={seg.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(seg.value)}
            title={seg.label}
            className={cn(
              "relative inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200",
              active
                ? "text-fg"
                : "text-fg-subtle hover:text-fg-muted",
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-panel-hover shadow-soft"
                style={{ animation: "reveal 220ms ease-out" }}
              />
            )}
            <Glyph className="relative" />
          </button>
        );
      })}
    </div>
  );
}
