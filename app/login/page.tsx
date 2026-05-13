import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL } from "@/lib/api";

export default function LoginPage() {
  let host = API_BASE_URL;
  try {
    host = new URL(API_BASE_URL).host;
  } catch {}
  return (
    <div className="min-h-screen grid place-items-center px-6 py-12 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 60%)",
        }}
      />
      <div className="w-full max-w-sm reveal">
        <div className="flex items-center gap-3 mb-8">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-fg">
            <Icon.logo width={18} height={18} strokeWidth={1.6} />
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-fg leading-tight">
              Job Hunter
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle font-medium">
              Admin Console
            </div>
          </div>
        </div>

        <div className="surface p-6">
          <h1 className="text-[18px] font-semibold tracking-tight text-fg">
            Welcome back
          </h1>
          <p className="mt-1 text-[13px] text-fg-muted leading-relaxed">
            Sign in with your admin account. New here? An existing admin needs
            to grant you access via{" "}
            <code className="font-mono text-fg bg-panel-hover px-1 py-0.5 rounded text-[12px]">
              npm run seed:admin
            </code>
            .
          </p>
          <div className="mt-5">
            <Suspense
              fallback={
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" rounded="md" />
                  <Skeleton className="h-9 w-full" rounded="md" />
                  <Skeleton className="h-9 w-full" rounded="md" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11.5px]">
          <span className="text-fg-subtle">
            API ·{" "}
            <span className="font-mono text-fg-muted" title={API_BASE_URL}>
              {host}
            </span>
          </span>
          <span className="text-fg-subtle font-mono">v1 · admin</span>
        </div>
      </div>
    </div>
  );
}
