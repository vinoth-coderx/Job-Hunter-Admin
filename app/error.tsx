"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Admin console error:", error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="surface max-w-lg w-full p-6 reveal">
        <div className="flex items-center gap-3 mb-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-danger">
            <Icon.warning width={16} height={16} />
          </span>
          <h2 className="text-[16px] font-semibold tracking-tight text-fg">
            Something broke while rendering this page
          </h2>
        </div>
        <p className="text-[13px] text-fg-muted leading-relaxed">
          The page handler threw an error. This is usually a backend
          unavailability or a code regression. The error has been logged to
          your browser console.
        </p>
        {error.digest ? (
          <div className="mt-3 font-mono text-[11.5px] text-fg-subtle">
            digest: {error.digest}
          </div>
        ) : null}
        <div className="mt-5 flex items-center gap-2">
          <Button
            variant="primary"
            onClick={reset}
            leading={<Icon.refresh width={14} height={14} />}
          >
            Retry
          </Button>
          <Button
            variant="secondary"
            onClick={() => (window.location.href = "/overview")}
          >
            Go to Overview
          </Button>
        </div>
      </div>
    </div>
  );
}
