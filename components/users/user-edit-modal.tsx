"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { usersApi } from "@/lib/users";
import type { AdminUser, Role } from "@/lib/types";

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

  useEffect(() => {
    if (user) {
      setFullName(user.profile?.fullName ?? "");
      setRole(user.activeRole);
      setVerified(user.isEmailVerified);
      setError(null);
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
