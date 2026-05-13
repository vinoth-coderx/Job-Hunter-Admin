"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hasToken } from "@/lib/auth-api";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Client-side gate. The admin SPA is fully static (no SSR auth), so we
 * check token presence on mount and redirect to /login if missing. The
 * brief skeleton during the check prevents the protected UI from
 * flashing before the redirect lands.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (hasToken()) {
      setAuthed(true);
    } else {
      setAuthed(false);
      const next = encodeURIComponent(pathname || "/overview");
      router.replace(`/login?next=${next}`);
    }
  }, [pathname, router]);

  if (authed === null || authed === false) {
    return (
      <div className="min-h-screen p-8 grid place-items-center">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-40" rounded="md" />
          <Skeleton className="h-4 w-72" rounded="sm" />
          <Skeleton className="h-4 w-64" rounded="sm" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
