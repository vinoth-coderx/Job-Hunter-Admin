"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterPills } from "@/components/ui/filter-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/icons";
import { AiKeyForm } from "@/components/ai/ai-key-form";
import { AiKeyCard } from "@/components/ai/ai-key-card";
import { aiApi } from "@/lib/ai";
import { ApiError, isMissingBackend } from "@/lib/api";
import type { AiKey, AiProvider } from "@/lib/types";

type ProviderFilter = "all" | AiProvider;

const PROVIDER_PILLS: { value: ProviderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
];

export default function AiPage() {
  const [keys, setKeys] = useState<AiKey[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);
  const [filter, setFilter] = useState<ProviderFilter>("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AiKey | null>(null);
  const [deleting, setDeleting] = useState<AiKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await aiApi.list();
      setKeys(r.keys);
      setMissingBackend(false);
    } catch (err) {
      if (isMissingBackend(err)) {
        setMissingBackend(true);
        setKeys([]);
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
    const c: Record<string, number> = { all: keys?.length ?? 0 };
    for (const k of keys ?? []) c[k.provider] = (c[k.provider] ?? 0) + 1;
    return c;
  }, [keys]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (keys ?? []).filter((k) => {
      if (filter !== "all" && k.provider !== filter) return false;
      if (!q) return true;
      return (
        k.label.toLowerCase().includes(q) ||
        k.model.toLowerCase().includes(q) ||
        k.notes?.toLowerCase().includes(q)
      );
    });
  }, [keys, filter, search]);

  const activeCount = (keys ?? []).filter((k) => k.isActive).length;
  const usedToday = (keys ?? []).reduce((acc, k) => acc + k.usageToday, 0);
  const dailyTotal = (keys ?? []).reduce(
    (acc, k) => acc + (k.dailyLimit || 0),
    0,
  );

  const handleSaved = (saved: AiKey) => {
    setKeys((prev) => {
      const list = prev ? [...prev] : [];
      const idx = list.findIndex((x) => x._id === saved._id);
      if (idx >= 0) list[idx] = saved;
      else list.unshift(saved);
      return list;
    });
    setCreating(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await aiApi.remove(deleting._id);
    setKeys((prev) =>
      prev ? prev.filter((k) => k._id !== deleting._id) : prev,
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Configure"
        title="AI Providers"
        description="Per-key routing across Gemini and Claude. Priority + weight + per-feature allowlist drive every request."
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
              leading={<Icon.spark width={14} height={14} />}
              onClick={() => setCreating(true)}
            >
              Add key
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
                GET /admin/ai/keys
              </code>{" "}
              returned 404. Add / edit / toggle / test are wired and surface
              the same error on use.
            </p>
          </div>
        </div>
      ) : null}

      {error && !missingBackend && !keys ? (
        <EmptyState
          tone="danger"
          icon={<Icon.warning width={18} height={18} />}
          title="Couldn't load AI keys"
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
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 reveal-stagger">
            <StatCard
              label="Keys configured"
              loading={loading && !keys}
              value={keys ? keys.length : "—"}
              hint={keys ? `${activeCount} active in routing` : undefined}
              icon={<Icon.spark width={15} height={15} />}
            />
            <StatCard
              label="Calls today"
              loading={loading && !keys}
              value={keys ? usedToday.toLocaleString() : "—"}
              hint={
                keys && dailyTotal > 0
                  ? `of ${dailyTotal.toLocaleString()} daily quota`
                  : undefined
              }
              icon={<Icon.pulse width={15} height={15} />}
            />
            <StatCard
              label="Gemini keys"
              loading={loading && !keys}
              value={keys ? (counts.gemini ?? 0) : "—"}
              hint="primary provider by default"
              icon={<Icon.spark width={15} height={15} />}
            />
            <StatCard
              label="Claude keys"
              loading={loading && !keys}
              value={keys ? (counts.claude ?? 0) : "—"}
              hint="fallback / specific features"
              icon={<Icon.spark width={15} height={15} />}
            />
          </section>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterPills<ProviderFilter>
              ariaLabel="Filter by provider"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: counts.all },
                {
                  value: "gemini",
                  label: "Gemini",
                  count: counts.gemini ?? 0,
                },
                {
                  value: "claude",
                  label: "Claude",
                  count: counts.claude ?? 0,
                },
              ]}
            />
            <div className="sm:w-72 shrink-0">
              <Input
                placeholder="Search label / model / notes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leading={<Icon.search width={13} height={13} />}
              />
            </div>
          </div>

          {loading && !keys ? (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full" rounded="lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="mt-4">
              <EmptyState
                icon={<Icon.spark width={18} height={18} />}
                title={
                  search
                    ? "No matches"
                    : missingBackend
                      ? "No keys configured"
                      : "Add the first AI key"
                }
                description={
                  search
                    ? `Nothing matched "${search}".`
                    : missingBackend
                      ? "Once the backend exposes GET /admin/ai/keys, configured keys will render here."
                      : "Adding a Gemini or Claude key here enables AI features across the platform."
                }
                action={
                  !search ? (
                    <Button
                      variant="primary"
                      onClick={() => setCreating(true)}
                      leading={<Icon.spark width={14} height={14} />}
                    >
                      Add key
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 reveal-stagger">
              {filtered.map((k) => (
                <AiKeyCard
                  key={k._id}
                  k={k}
                  onUpdated={(next) =>
                    setKeys((prev) =>
                      prev
                        ? prev.map((x) => (x._id === next._id ? next : x))
                        : prev,
                    )
                  }
                  onEdit={() => setEditing(k)}
                  onDelete={() => setDeleting(k)}
                />
              ))}
            </div>
          )}

          <Card padding="md" className="mt-6">
            <CardHeader
              title="How routing works"
              description="The provider router in services/ai/providers/index.ts picks a key per request."
            />
            <ol className="space-y-2 text-[12.5px] text-fg-muted">
              <li className="flex gap-2">
                <span className="font-mono text-fg-subtle">1.</span> Filter to
                keys whose <span className="font-mono text-fg">allowedFeatures</span> includes the
                current feature.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-fg-subtle">2.</span> Filter to
                keys with{" "}
                <span className="font-mono text-fg">isActive: true</span> and
                remaining daily quota.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-fg-subtle">3.</span> Sort by{" "}
                <span className="font-mono text-fg">priority</span> ascending,
                then sample by{" "}
                <span className="font-mono text-fg">weight</span> within the
                top tier.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-fg-subtle">4.</span> If the
                request errors with a quota/rate-limit signature, fall through
                to the next-priority key automatically.
              </li>
            </ol>
          </Card>
        </>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add AI provider key"
        description="Choose the provider, paste the key, set routing weights. Encrypted at rest."
        size="lg"
      >
        <AiKeyForm
          onSaved={handleSaved}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          editing ? (
            <span className="font-mono text-[14px]">{editing.label}</span>
          ) : (
            "Edit key"
          )
        }
        description="Leave the API key blank to keep the existing encrypted value."
        size="lg"
      >
        {editing ? (
          <AiKeyForm
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
        title={`Delete ${deleting?.label ?? "key"}?`}
        description="Routing immediately drops this key. If it was the last active key for a feature, that feature will fail until another is added."
        confirmLabel="Delete key"
        tone="danger"
      />
    </>
  );
}
