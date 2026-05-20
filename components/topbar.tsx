"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { navGroups } from "@/lib/nav";
import { ThemeToggle } from "./theme-toggle";
import { Icon } from "./icons";
import { Badge } from "./ui/badge";
import { API_BASE_URL } from "@/lib/api";
import { authApi, performLogout } from "@/lib/auth-api";
import { useRuntimeMode } from "@/components/layout/runtime-mode-provider";

function findCrumbs(pathname: string) {
  for (const g of navGroups) {
    for (const item of g.items) {
      if (
        pathname === item.href ||
        (item.href !== "/overview" && pathname.startsWith(item.href))
      ) {
        return { group: g.label, page: item.label };
      }
    }
  }
  return { group: "Workspace", page: "Overview" };
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = useMemo(() => findCrumbs(pathname), [pathname]);
  const host = useMemo(() => {
    try {
      return new URL(API_BASE_URL).host;
    } catch {
      return API_BASE_URL;
    }
  }, []);

  const { mode } = useRuntimeMode();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    authApi
      .me()
      .then((r) => {
        if (alive && r?.data?.user?.email) setEmail(r.data.user.email);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const initial = (email?.[0] ?? "A").toUpperCase();

  const onLogout = async () => {
    await performLogout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-[color-mix(in_oklab,var(--bg-elevated)_92%,transparent)] backdrop-blur-md">
      <div className="h-full flex items-center justify-between px-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-[12.5px] text-fg-subtle hidden sm:flex items-center gap-1.5">
            <span>{crumbs.group}</span>
            <Icon.arrowRight width={12} height={12} className="opacity-50" />
            <span className="text-fg font-medium">{crumbs.page}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            tone={mode === "live" ? "success" : "warn"}
            variant="soft"
            className="font-mono"
            title={`Authenticated against the ${mode.toUpperCase()} Mongo cluster. Sign out to switch.`}
          >
            <span aria-hidden>{mode === "live" ? "🚀" : "🧪"}</span>
            {mode === "live" ? "LIVE" : "TEST"}
          </Badge>

          <button
            type="button"
            className="hidden md:inline-flex items-center gap-2 h-8 pl-3 pr-2 rounded-md border border-border bg-panel text-[12.5px] text-fg-muted hover:bg-panel-hover hover:border-border-strong transition-colors"
          >
            <Icon.search width={14} height={14} />
            <span>Search</span>
            <span className="ml-4 inline-flex items-center gap-0.5 rounded border border-border bg-bg px-1.5 py-0.5 text-[10.5px] font-mono text-fg-subtle">
              ⌘K
            </span>
          </button>

          <Badge
            tone="muted"
            variant="soft"
            className="hidden xl:inline-flex font-mono"
            title={`API base: ${API_BASE_URL}`}
          >
            api · {host}
          </Badge>

          <button
            type="button"
            aria-label="Notifications"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-panel text-fg-muted hover:bg-panel-hover hover:text-fg transition-colors"
          >
            <Icon.bell width={15} height={15} />
          </button>

          <ThemeToggle />

          <div ref={menuRef} className="relative ml-1">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="grid h-8 w-8 place-items-center rounded-full bg-panel-hover text-[12px] font-semibold text-fg hover:ring-2 hover:ring-accent transition-shadow"
            >
              {initial}
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 surface shadow-pop p-2"
                style={{ animation: "reveal 180ms ease-out" }}
              >
                <div className="px-2.5 py-2 border-b border-border mb-1">
                  <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                    Signed in as
                  </div>
                  <div className="mt-0.5 font-mono text-[12.5px] text-fg truncate">
                    {email ?? "—"}
                  </div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onLogout}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-sm text-[13px] text-fg-muted hover:bg-panel-hover hover:text-fg transition-colors"
                >
                  <Icon.x width={13} height={13} />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
