"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterPills } from "@/components/ui/filter-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/icons";
import { ConfigForm } from "@/components/config/config-form";
import { ConfigRow } from "@/components/config/config-row";
import { CATEGORIES, CATEGORY_META, configApi } from "@/lib/config";
import { ApiError, isMissingBackend } from "@/lib/api";
import type { AppConfigCategory, AppConfigEntry } from "@/lib/types";

type CategoryFilter = "all" | AppConfigCategory;

export default function ConfigPage() {
  const [entries, setEntries] = useState<AppConfigEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AppConfigEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AppConfigEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await configApi.list();
      setEntries(res.entries);
      setMissingBackend(false);
    } catch (err) {
      if (isMissingBackend(err)) {
        setMissingBackend(true);
        setEntries([]);
      } else {
        const msg =
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : (err as Error).message;
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries?.length ?? 0 };
    for (const e of entries ?? []) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (!q) return true;
      return (
        e.key.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, filter, search]);

  const handleSaved = (saved: AppConfigEntry) => {
    setEntries((prev) => {
      const list = prev ? [...prev] : [];
      const idx = list.findIndex((e) => e.key === saved.key);
      if (idx >= 0) list[idx] = saved;
      else list.unshift(saved);
      return list;
    });
    setCreating(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await configApi.remove(deleting.key);
    setEntries((prev) =>
      prev ? prev.filter((e) => e.key !== deleting.key) : prev,
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Configure"
        title="App Config"
        description="Rotate every backend secret + toggle without redeploying. Secrets are encrypted at rest with AES-256-GCM."
        actions={
          <>
            <Button
              variant="secondary"
              leading={<Icon.refresh width={14} height={14} />}
              onClick={load}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              leading={<Icon.sliders width={14} height={14} />}
              onClick={() => setCreating(true)}
            >
              Add config
            </Button>
          </>
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
                GET /admin/config
              </code>{" "}
              returned 404. The form preview still works — saves will surface
              the same error.
            </p>
          </div>
        </div>
      ) : null}

      {error && !missingBackend ? (
        <EmptyState
          tone="danger"
          icon={<Icon.warning width={18} height={18} />}
          title="Couldn't load config entries"
          description={
            <span className="font-mono text-[12px] text-danger">{error}</span>
          }
          action={
            <Button
              variant="primary"
              onClick={load}
              leading={<Icon.refresh width={14} height={14} />}
            >
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <FilterPills<CategoryFilter>
              ariaLabel="Filter by category"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: counts.all },
                ...CATEGORIES.map((c) => ({
                  value: c,
                  label: CATEGORY_META[c].label,
                  count: counts[c] ?? 0,
                })),
              ]}
            />
            <div className="sm:w-72 shrink-0">
              <Input
                placeholder="Search keys & notes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leading={<Icon.search width={13} height={13} />}
                mono
              />
            </div>
          </div>

          <Card padding="none">
            <CardHeader
              title={
                filter === "all"
                  ? "All configuration"
                  : CATEGORY_META[filter as AppConfigCategory].label
              }
              description={
                filter === "all"
                  ? "Every rotatable backend secret + toggle. Secrets never round-trip; you can only know whether one is set."
                  : CATEGORY_META[filter as AppConfigCategory].description
              }
              action={
                <Badge tone="muted" variant="soft" className="font-mono">
                  {filtered.length} of {entries?.length ?? 0}
                </Badge>
              }
              className="px-5 pt-5 mb-0"
            />

            {loading && !entries ? (
              <div className="px-5 pb-5 pt-1 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" rounded="md" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-5 pb-6">
                <EmptyState
                  icon={<Icon.sliders width={18} height={18} />}
                  title={
                    search
                      ? "No matches"
                      : missingBackend
                        ? "No config entries yet"
                        : `No entries in ${
                            filter === "all"
                              ? "any category"
                              : CATEGORY_META[filter as AppConfigCategory].label
                          }`
                  }
                  description={
                    search
                      ? `Nothing matched "${search}". Try a shorter query.`
                      : missingBackend
                        ? "Once the backend exposes GET /admin/config, entries will populate here."
                        : "Use Add config to seed the first key."
                  }
                  action={
                    !search ? (
                      <Button
                        variant="primary"
                        onClick={() => setCreating(true)}
                        leading={<Icon.sliders width={14} height={14} />}
                      >
                        Add config
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium border-b border-border">
                      <th className="py-2.5 pl-5 pr-3 font-medium">Key</th>
                      <th className="py-2.5 px-3 font-medium">Category</th>
                      <th className="py-2.5 px-3 font-medium">Value</th>
                      <th className="py-2.5 px-3 font-medium">Type</th>
                      <th className="py-2.5 px-3 font-medium">Updated</th>
                      <th className="py-2.5 px-3 font-medium">Actions</th>
                      <th className="py-2.5 pl-3 pr-5" />
                    </tr>
                  </thead>
                  <tbody className="reveal-stagger">
                    {filtered.map((e) => (
                      <ConfigRow
                        key={e.key}
                        entry={e}
                        onEdit={() => setEditing(e)}
                        onDelete={() => setDeleting(e)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add config entry"
        description="The key matches the historical env-var name. Secrets are encrypted at rest with AES-256-GCM."
        size="md"
      >
        <ConfigForm
          onSaved={handleSaved}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          editing ? (
            <span className="font-mono text-[14px]">{editing.key}</span>
          ) : (
            "Edit"
          )
        }
        description="Editing an existing entry. The key is immutable — delete and recreate if you need to rename."
        size="md"
      >
        {editing ? (
          <ConfigForm
            initial={editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleting?.key ?? ""}?`}
        description={
          <>
            This removes the entry from <code className="font-mono text-fg">app_configs</code>.
            The backend will fall back to <code className="font-mono text-fg">process.env</code>{" "}
            for this key on the next read — useful if you accidentally rotated a value and want
            to revert. Cannot be undone from here.
          </>
        }
        confirmLabel="Delete entry"
        tone="danger"
      />
    </>
  );
}
