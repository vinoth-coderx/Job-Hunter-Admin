"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { hasToken, performLogin } from "@/lib/auth-api";
import { ApiError } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/overview";

  // If already signed in, bounce straight to the dashboard. Prevents the
  // login form from showing for half a second after a refresh.
  useEffect(() => {
    if (hasToken()) router.replace(next);
  }, [router, next]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await performLogin(email.trim(), password);
      router.replace(next);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 0
            ? `Can't reach backend — ${err.message}`
            : err.message
          : (err as Error).message;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div className="surface border-[color-mix(in_oklab,var(--danger)_30%,var(--border))] p-3 flex items-start gap-2.5 reveal">
          <Icon.warning width={14} height={14} className="text-danger mt-0.5" />
          <div className="text-[12.5px] text-fg-muted">
            <span className="font-medium text-fg">Sign-in failed.</span>{" "}
            <span className="font-mono text-danger">{error}</span>
          </div>
        </div>
      ) : null}

      <Input
        type="email"
        label="Email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        leading={<Icon.users width={13} height={13} />}
        required
      />
      <Input
        type="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />
      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        className="w-full"
        trailing={
          !submitting ? <Icon.arrowRight width={14} height={14} /> : undefined
        }
      >
        Sign in
      </Button>
    </form>
  );
}
