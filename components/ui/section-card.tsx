import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Badge } from "./badge";
import { cn } from "@/lib/cn";

interface SectionCardProps {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  meta?: ReactNode;
  pending?: boolean;
  accent?: "neutral" | "accent" | "warn" | "success" | "danger";
}

const accentTint: Record<NonNullable<SectionCardProps["accent"]>, string> = {
  neutral: "from-transparent to-transparent",
  accent: "from-[color-mix(in_oklab,var(--accent)_18%,transparent)] to-transparent",
  warn: "from-[color-mix(in_oklab,var(--warn)_16%,transparent)] to-transparent",
  success: "from-[color-mix(in_oklab,var(--success)_16%,transparent)] to-transparent",
  danger: "from-[color-mix(in_oklab,var(--danger)_16%,transparent)] to-transparent",
};

export function SectionCard({
  icon,
  title,
  description,
  href,
  meta,
  pending,
  accent = "neutral",
}: SectionCardProps) {
  const Glyph = Icon[icon];
  return (
    <Link
      href={href}
      className="group surface surface-hover p-5 flex flex-col gap-3 relative overflow-hidden reveal"
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          accentTint[accent],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-panel-hover text-fg border border-border transition-transform duration-200 group-hover:-translate-y-0.5">
          <Glyph width={17} height={17} />
        </div>
        <div className="flex items-center gap-2">
          {pending ? (
            <Badge tone="muted" variant="soft">
              soon
            </Badge>
          ) : null}
          <span
            aria-hidden
            className="text-fg-subtle group-hover:text-fg group-hover:translate-x-0.5 transition-all"
          >
            <Icon.arrowRight width={14} height={14} />
          </span>
        </div>
      </div>
      <div className="relative">
        <div className="text-[15px] font-semibold tracking-tight text-fg">
          {title}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
          {description}
        </p>
      </div>
      {meta ? (
        <div className="relative mt-1 pt-3 border-t border-border text-[12px] text-fg-subtle flex items-center gap-3">
          {meta}
        </div>
      ) : null}
    </Link>
  );
}
