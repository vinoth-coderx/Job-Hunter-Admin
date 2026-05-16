"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { usersApi, UserTrustPayload } from "@/lib/users";
import type { AdminUser, Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "seeker", label: "Job seeker" },
  { value: "hirer", label: "Hirer" },
  { value: "admin", label: "Admin" },
];

export function UserEditModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: (u: AdminUser) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("seeker");
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trust, setTrust] = useState<UserTrustPayload | null>(null);
  const [loadingTrust, setLoadingTrust] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.profile?.fullName ?? "");
      setRole(user.activeRole);
      setVerified(user.isEmailVerified);
      setError(null);
      setTrust(null);
      setLoadingTrust(true);
      usersApi
        .trust(user._id)
        .then(setTrust)
        .catch(() => undefined)
        .finally(() => setLoadingTrust(false));
    }
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await usersApi.update(user._id, {
        fullName: fullName.trim() || undefined,
        activeRole: role,
        isEmailVerified: verified,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      onClose={() => (saving ? undefined : onClose())}
      title={
        user ? (
          <span className="font-mono text-[14px]">{user.email}</span>
        ) : (
          "Edit user"
        )
      }
      description="Promoting to admin grants full console access on next sign-in."
      busy={saving}
    >
      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
        >
          {error ? (
            <div className="surface border-[color-mix(in_oklab,var(--danger)_30%,var(--border))] p-3 flex items-start gap-2.5 reveal">
              <Icon.warning width={14} height={14} className="text-danger mt-0.5" />
              <div className="text-[12.5px] text-fg-muted">
                <span className="font-medium text-fg">Save failed.</span>{" "}
                <span className="font-mono text-danger">{error}</span>
              </div>
            </div>
          ) : null}

          <Input
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Display name"
            leading={<Icon.users width={13} height={13} />}
          />

          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            hint="Role gates which UI surfaces the user sees."
          />

          <div className="surface p-3">
            <Toggle
              checked={verified}
              onChange={setVerified}
              label="Email verified"
              description="Manually override Firebase's emailVerified flag."
            />
          </div>

          <TrustPanel user={user} trust={trust} loading={loadingTrust} />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

function trustBand(score?: number): {
  tone: "success" | "warn" | "danger" | "muted";
  label: string;
} {
  if (score === undefined) return { tone: "muted", label: "unknown" };
  if (score >= 70) return { tone: "success", label: "high" };
  if (score >= 40) return { tone: "warn", label: "medium" };
  return { tone: "danger", label: "low" };
}

function sevTone(s: string): "success" | "muted" | "warn" | "danger" {
  if (s === "critical" || s === "high") return "danger";
  if (s === "medium") return "warn";
  if (s === "info") return "success";
  return "muted";
}

function TrustPanel({
  user,
  trust,
  loading,
}: {
  user: AdminUser;
  trust: UserTrustPayload | null;
  loading: boolean;
}) {
  const band = trustBand(user.security?.trustScore);
  return (
    <div className="surface p-3 space-y-3">
      <div className="text-[12.5px] font-semibold uppercase tracking-wider text-fg-muted">
        Trust & Safety
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12.5px]">
        <div className="flex items-center justify-between rounded-md border border-border p-2">
          <span className="text-fg-muted">Trust score</span>
          <Badge tone={band.tone}>
            {user.security?.trustScore ?? "?"} · {band.label}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-2">
          <span className="text-fg-muted">2FA</span>
          <Badge tone={user.twoFactor?.enabled ? "success" : "muted"}>
            {user.twoFactor?.enabled ? user.twoFactor.method ?? "on" : "off"}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-2">
          <span className="text-fg-muted">Email verified</span>
          <Badge tone={user.isEmailVerified ? "success" : "warn"}>
            {user.isEmailVerified ? "yes" : "no"}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-2">
          <span className="text-fg-muted">Phone verified</span>
          <Badge tone={user.isPhoneVerified ? "success" : "muted"}>
            {user.isPhoneVerified ? "yes" : "no"}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="text-[12px] text-fg-subtle">Loading sessions…</div>
      ) : trust ? (
        <>
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-fg-muted">
              Active sessions ({trust.sessions.length} of {trust.sessionCount})
            </div>
            {trust.sessions.length === 0 ? (
              <div className="text-[12px] text-fg-subtle">
                No active sessions.
              </div>
            ) : (
              <ul className="space-y-1">
                {trust.sessions.slice(0, 4).map((s) => (
                  <li
                    key={s._id}
                    className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-[12px]"
                  >
                    <span className="truncate">
                      {(s.platform ?? "unknown") + " · " + (s.ip ?? "—")}
                    </span>
                    <span className="text-fg-subtle">
                      {s.geo?.city ?? s.geo?.country ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-fg-muted">
              Recent security events
            </div>
            {trust.recentEvents.length === 0 ? (
              <div className="text-[12px] text-fg-subtle">No events.</div>
            ) : (
              <ul className="space-y-1">
                {trust.recentEvents.slice(0, 5).map((e) => (
                  <li
                    key={e._id}
                    className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-[12px]"
                  >
                    <span>{e.type.replaceAll("_", " ")}</span>
                    <Badge tone={sevTone(e.severity)}>{e.severity}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="text-[12px] text-fg-subtle">
          Trust details unavailable.
        </div>
      )}
    </div>
  );
}
