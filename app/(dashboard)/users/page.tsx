"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FilterPills } from "@/components/ui/filter-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/icons";
import { UserEditModal } from "@/components/users/user-edit-modal";
import { usersApi } from "@/lib/users";
import { ApiError, isMissingBackend } from "@/lib/api";
import { useDebounced } from "@/lib/use-debounce";
import { formatRelative } from "@/lib/format";
import type { AdminUser, Role, UserStats } from "@/lib/types";

type RoleFilter = Role | "all";
type StatusFilter = "all" | "banned" | "verified" | "unverified";

const PER_PAGE = 20;

const ROLE_PILLS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "seeker", label: "Seekers" },
  { value: "hirer", label: "Hirers" },
  { value: "admin", label: "Admins" },
];

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
  { value: "banned", label: "Banned" },
];

export default function UsersPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<AdminUser | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await usersApi.stats();
      setStats(s);
    } catch {
      setStats(null);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await usersApi.list({
        q: debouncedSearch || undefined,
        role,
        status,
        page,
        perPage: PER_PAGE,
      });
      setUsers(res.users);
      setTotal(res.total);
      setMissingBackend(false);
    } catch (err) {
      if (isMissingBackend(err)) {
        setMissingBackend(true);
        setUsers([]);
        setTotal(0);
      } else {
        const msg =
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : (err as Error).message;
        setListError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, role, status, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  const handleBan = async () => {
    if (!banTarget) return;
    const updated = await usersApi.ban(banTarget._id);
    setUsers((prev) =>
      prev ? prev.map((u) => (u._id === updated._id ? updated : u)) : prev,
    );
  };

  const handleUnban = async () => {
    if (!unbanTarget) return;
    const updated = await usersApi.unban(unbanTarget._id);
    setUsers((prev) =>
      prev ? prev.map((u) => (u._id === updated._id ? updated : u)) : prev,
    );
  };

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Users"
        description="Search, edit, ban or promote across every signed-up user. Filters compose; the URL stays clean."
        actions={
          <Button
            variant="secondary"
            leading={<Icon.refresh width={14} height={14} />}
            onClick={() => {
              loadStats();
              loadList();
            }}
            loading={loading}
          >
            Refresh
          </Button>
        }
      />

      {missingBackend ? (
        <div className="mb-6 surface p-4 reveal border-[color-mix(in_oklab,var(--warn)_30%,var(--border))] flex items-start gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_oklab,var(--warn)_18%,transparent)] text-warn shrink-0 mt-0.5">
            <Icon.warning width={14} height={14} />
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-fg">
              Backend admin routes not deployed
            </div>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              <code className="font-mono text-fg bg-panel-hover px-1.5 py-0.5 rounded">
                GET /admin/users
              </code>{" "}
              returned 404. Search, filters and pagination are wired and will
              work the moment the route lands.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 reveal-stagger">
        <StatCard
          label="Total users"
          loading={!stats && !missingBackend}
          value={stats ? stats.totalUsers.toLocaleString() : "—"}
          hint={stats ? `${stats.newToday.toLocaleString()} new today` : undefined}
          icon={<Icon.users width={15} height={15} />}
        />
        <StatCard
          label="Seekers"
          loading={!stats && !missingBackend}
          value={stats ? stats.totalSeekers.toLocaleString() : "—"}
          hint="active role"
          icon={<Icon.users width={15} height={15} />}
        />
        <StatCard
          label="Hirers"
          loading={!stats && !missingBackend}
          value={stats ? stats.totalHirers.toLocaleString() : "—"}
          hint={stats ? `${stats.totalAdmins.toLocaleString()} admins` : undefined}
          icon={<Icon.briefcase width={15} height={15} />}
        />
        <StatCard
          label="Active today"
          loading={!stats && !missingBackend}
          value={stats ? stats.activeToday.toLocaleString() : "—"}
          hint={
            stats
              ? `${stats.totalVerified.toLocaleString()} verified · ${stats.totalBanned.toLocaleString()} banned`
              : undefined
          }
          icon={<Icon.pulse width={15} height={15} />}
        />
      </section>

      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPills<RoleFilter>
            ariaLabel="Filter by role"
            value={role}
            onChange={setRole}
            options={ROLE_PILLS}
          />
          <div className="hidden lg:block divider w-px h-6" />
          <FilterPills<StatusFilter>
            ariaLabel="Filter by status"
            value={status}
            onChange={setStatus}
            options={STATUS_PILLS}
          />
        </div>
        <div className="lg:w-80 shrink-0">
          <Input
            placeholder="Search email or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leading={<Icon.search width={13} height={13} />}
          />
        </div>
      </div>

      <Card padding="none" className="mt-4">
        {listError && !missingBackend ? (
          <div className="p-5">
            <EmptyState
              tone="danger"
              icon={<Icon.warning width={18} height={18} />}
              title="Couldn't load users"
              description={
                <span className="font-mono text-[12px] text-danger">
                  {listError}
                </span>
              }
              action={
                <Button
                  variant="primary"
                  onClick={loadList}
                  leading={<Icon.refresh width={14} height={14} />}
                >
                  Try again
                </Button>
              }
            />
          </div>
        ) : loading && !users ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" rounded="md" />
            ))}
          </div>
        ) : (users?.length ?? 0) === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Icon.users width={18} height={18} />}
              title={debouncedSearch ? "No matches" : "No users yet"}
              description={
                debouncedSearch
                  ? `Nothing matched "${debouncedSearch}".`
                  : missingBackend
                    ? "Sign-ups will appear here once the backend list endpoint is wired."
                    : "Once seekers and hirers sign up, they'll appear here."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium border-b border-border">
                  <th className="py-2.5 pl-5 pr-3 font-medium">User</th>
                  <th className="py-2.5 px-3 font-medium">Role</th>
                  <th className="py-2.5 px-3 font-medium">Plan</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Joined</th>
                  <th className="py-2.5 pl-3 pr-5 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="reveal-stagger">
                {users!.map((u) => (
                  <tr
                    key={u._id}
                    className="group border-b border-border last:border-b-0 hover:bg-panel-hover transition-colors"
                  >
                    <td className="py-3 pl-5 pr-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-panel-hover text-fg font-semibold text-[12px] shrink-0">
                          {(u.profile?.fullName?.[0] || u.email[0]).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-fg truncate">
                            {u.profile?.fullName || u.email.split("@")[0]}
                          </div>
                          <div className="font-mono text-[11.5px] text-fg-muted truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <Badge
                        tone={u.activeRole === "admin" ? "accent" : "neutral"}
                        variant="soft"
                      >
                        {u.activeRole}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 align-middle text-[12.5px]">
                      <span className="capitalize text-fg">
                        {u.subscription?.tier ?? "free"}
                      </span>
                      <span className="ml-1 text-fg-subtle">
                        · {u.subscription?.status ?? "active"}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.isEmailVerified ? (
                          <Badge tone="success" variant="dot">
                            verified
                          </Badge>
                        ) : (
                          <Badge tone="warn" variant="dot">
                            unverified
                          </Badge>
                        )}
                        {u.isBanned ? (
                          <Badge tone="danger" variant="soft">
                            banned
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle text-[11.5px] text-fg-muted whitespace-nowrap">
                      {formatRelative(u.createdAt)}
                    </td>
                    <td className="py-3 pl-3 pr-5 align-middle">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(u)}
                          leading={<Icon.sliders width={12} height={12} />}
                        >
                          Edit
                        </Button>
                        {u.isBanned ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setUnbanTarget(u)}
                            leading={<Icon.check width={12} height={12} />}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setBanTarget(u)}
                            className="hover:text-danger"
                            leading={<Icon.x width={12} height={12} />}
                          >
                            Ban
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(users?.length ?? 0) > 0 ? (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border text-[12px]">
            <span className="text-fg-muted">
              Showing{" "}
              <span className="font-mono text-fg tabular-nums">
                {(page - 1) * PER_PAGE + 1}–
                {Math.min(page * PER_PAGE, total)}
              </span>{" "}
              of{" "}
              <span className="font-mono text-fg tabular-nums">
                {total.toLocaleString()}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                leading={
                  <Icon.arrowRight
                    width={12}
                    height={12}
                    className="rotate-180"
                  />
                }
              >
                Prev
              </Button>
              <span className="font-mono text-fg-subtle">
                {page} / {pages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= pages || loading}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                trailing={<Icon.arrowRight width={12} height={12} />}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <UserEditModal
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={(u) =>
          setUsers((prev) =>
            prev ? prev.map((x) => (x._id === u._id ? u : x)) : prev,
          )
        }
      />

      <ConfirmDialog
        open={Boolean(banTarget)}
        onClose={() => setBanTarget(null)}
        onConfirm={handleBan}
        title={`Ban ${banTarget?.email ?? "user"}?`}
        description="They'll be signed out and refused login until you unban. Active sessions invalidate within a few minutes."
        confirmLabel="Ban user"
        tone="danger"
      />

      <ConfirmDialog
        open={Boolean(unbanTarget)}
        onClose={() => setUnbanTarget(null)}
        onConfirm={handleUnban}
        title={`Unban ${unbanTarget?.email ?? "user"}?`}
        description="The user will be able to sign in again immediately."
        confirmLabel="Unban"
        tone="warn"
      />
    </>
  );
}
