"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { navGroups } from "@/lib/nav";
import { API_BASE_URL } from "@/lib/api";
import { Icon } from "./icons";
import { cn } from "@/lib/cn";

export function Sidebar() {
  const pathname = usePathname();
  const host = useMemo(() => {
    try {
      return new URL(API_BASE_URL).host;
    } catch {
      return API_BASE_URL;
    }
  }, []);

  return (
    <aside
      className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-border bg-bg-elevated sticky top-0 h-screen"
      aria-label="Primary navigation"
    >
      <Link
        href="/overview"
        className="flex items-center gap-2.5 h-14 px-5 border-b border-border"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-fg">
          <Icon.logo width={16} height={16} strokeWidth={1.6} />
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-fg">
            Job Hunter
          </div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle font-medium">
            Admin Console
          </div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2.5 mb-1.5 text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle font-medium">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Glyph = Icon[item.icon];
                const active =
                  pathname === item.href ||
                  (item.href !== "/overview" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 h-8 px-2.5 rounded-sm text-[13px] transition-colors duration-150",
                        active
                          ? "bg-panel-hover text-fg"
                          : "text-fg-muted hover:bg-panel-hover hover:text-fg",
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent"
                        />
                      )}
                      <Glyph
                        width={15}
                        height={15}
                        className={cn(
                          "shrink-0 transition-colors",
                          active
                            ? "text-fg"
                            : "text-fg-subtle group-hover:text-fg-muted",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.pending ? (
                        <span
                          title="Backend endpoint pending"
                          className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle"
                        >
                          soon
                        </span>
                      ) : active ? (
                        <Icon.arrowRight
                          width={12}
                          height={12}
                          className="text-fg-subtle"
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="surface flex items-center gap-2.5 p-2.5 text-[12px]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-panel-hover text-fg-muted shrink-0">
            <Icon.spark width={13} height={13} />
          </span>
          <div className="leading-snug min-w-0">
            <div className="font-medium text-fg">API target</div>
            <div
              className="font-mono text-[10.5px] text-fg-subtle truncate"
              title={host}
            >
              {host}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
