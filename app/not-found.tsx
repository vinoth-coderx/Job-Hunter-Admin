import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="text-center max-w-md reveal">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-panel text-fg-muted">
          <span className="font-mono text-[15px] font-semibold text-fg">
            404
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Page not found
        </h1>
        <p className="mt-2 text-[14px] text-fg-muted leading-relaxed">
          That route isn&apos;t on the admin console. It may have been moved, or
          never existed in the first place.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-accent text-accent-fg text-[13.5px] font-medium hover:bg-accent-hover transition-colors"
          >
            <Icon.arrowRight width={14} height={14} className="rotate-180" />
            Back to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
