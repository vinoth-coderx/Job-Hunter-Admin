"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/icons";
import { jobsApi, SOURCE_META } from "@/lib/jobs";
import { configApi } from "@/lib/config";
import { ApiError, isMissingBackend } from "@/lib/api";
import { formatNumber, formatRelative } from "@/lib/format";
import type { JobSourceStat } from "@/lib/types";
import { JobSourceForm } from "@/components/jobs/job-source-form";

const FRESHNESS_KEY = (source: string) =>
  `JOB_FRESHNESS_DAYS_${source.toUpperCase()}`;

export default function JobsPage() {
  const [sources, setSources] = useState<JobSourceStat[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);
  const [running, setRunning] = useState(false);
  const [runningOne, setRunningOne] = useState<string | null>(null);
  const [togglingOne, setTogglingOne] = useState<string | null>(null);
  const [lastTrigger, setLastTrigger] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<JobSourceStat | null>(null);
  const [deleting, setDeleting] = useState<JobSourceStat | null>(null);
  const [freshnessDays, setFreshnessDays] = useState<Record<string, number>>(
    {},
  );
  const [savingFreshness, setSavingFreshness] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sourcesRes, configRes] = await Promise.all([
        jobsApi.sources(),
        configApi.list().catch(() => ({ entries: [] })),
      ]);
      setSources(sourcesRes.sources);
      // Build source → days map from JOB_FRESHNESS_DAYS_<SOURCE> keys.
      // Missing entries fall back to the backend default (20d) — the
      // input renders a placeholder rather than a hard 20 so the admin
      // can tell which sources have an explicit override.
      const days: Record<string, number> = {};
      for (const e of configRes.entries) {
        if (!e.key.startsWith("JOB_FRESHNESS_DAYS_")) continue;
        const source = e.key.replace("JOB_FRESHNESS_DAYS_", "").toLowerCase();
        // Mode-agnostic numeric override — prefer the legacy slot, then
        // fall back to whichever side is populated.
        const raw = e.legacyValue ?? e.liveValue ?? e.testValue;
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) days[source] = n;
      }
      setFreshnessDays(days);
      setMissingBackend(false);
    } catch (err) {
      if (isMissingBackend(err)) {
        setMissingBackend(true);
        setSources([]);
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

  const runAll = async () => {
    setRunning(true);
    try {
      const r = await jobsApi.run();
      setLastTrigger(r.startedAt);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  const handleSaved = async () => {
    setCreating(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await jobsApi.remove(deleting.name);
      setDeleting(null);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
      setDeleting(null);
    }
  };

  const toggleOne = async (name: string, next: boolean) => {
    // Optimistic flip so the switch animates instantly; revert on failure.
    setSources((prev) =>
      prev ? prev.map((s) => (s.name === name ? { ...s, enabled: next } : s)) : prev,
    );
    setTogglingOne(name);
    try {
      await jobsApi.toggle(name, next);
    } catch (err) {
      setSources((prev) =>
        prev
          ? prev.map((s) => (s.name === name ? { ...s, enabled: !next } : s))
          : prev,
      );
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setTogglingOne(null);
    }
  };

  const runOne = async (name: string) => {
    setRunningOne(name);
    try {
      const r = await jobsApi.run([name]);
      setLastTrigger(r.startedAt);
      setSources((prev) =>
        prev
          ? prev.map((s) =>
              s.name === name
                ? { ...s, lastRunAt: r.startedAt, lastError: undefined }
                : s,
            )
          : prev,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setRunningOne(null);
    }
  };

  const saveFreshness = async (source: string, days: number) => {
    // Snapshot the previous value so we can roll back if the upsert
    // fails — UX expectation is "edit, blur, done" with no spinner.
    const previous = freshnessDays[source];
    setFreshnessDays((prev) => ({ ...prev, [source]: days }));
    setSavingFreshness(source);
    try {
      await configApi.upsert({
        key: FRESHNESS_KEY(source),
        category: "job-board",
        isSecret: false,
        legacyValue: String(days),
        notes: `Freshness window (days) for the ${source} scraper`,
      });
    } catch (err) {
      // Roll back on failure and surface the error inline.
      setFreshnessDays((prev) => {
        const next = { ...prev };
        if (previous === undefined) delete next[source];
        else next[source] = previous;
        return next;
      });
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setSavingFreshness(null);
    }
  };

  const enabled = (sources ?? []).filter((s) => s.enabled);
  const disabled = (sources ?? []).filter((s) => !s.enabled);
  const failed = (sources ?? []).filter((s) => Boolean(s.lastError));
  const missingKey = (sources ?? []).filter(
    (s) => s.enabled && s.configured === false,
  );
  const totalLast =
    (sources ?? []).reduce((acc, s) => acc + (s.lastJobCount ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Jobs & Sources"
        description="Every scraper the backend can dispatch. Per-source last run, counts and errors at a glance."
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
              variant="secondary"
              leading={<Icon.plus width={14} height={14} />}
              onClick={() => setCreating(true)}
            >
              Add source
            </Button>
            <Button
              variant="primary"
              leading={<Icon.briefcase width={14} height={14} />}
              onClick={runAll}
              loading={running}
            >
              Run all sources
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
              Backend admin route not deployed
            </div>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              <code className="font-mono text-fg bg-panel-hover px-1.5 py-0.5 rounded">
                GET /admin/jobs/sources
              </code>{" "}
              returned 404. The run-now buttons are wired and will work the
              moment the route lands.
            </p>
          </div>
        </div>
      ) : null}

      {error && !missingBackend && !sources ? (
        <EmptyState
          tone="danger"
          icon={<Icon.warning width={18} height={18} />}
          title="Couldn't load source registry"
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
              label="Enabled sources"
              loading={loading && !sources}
              value={sources ? enabled.length : "—"}
              hint={`${sources?.length ?? 0} registered`}
              icon={<Icon.briefcase width={15} height={15} />}
            />
            <StatCard
              label="Disabled"
              loading={loading && !sources}
              value={sources ? disabled.length : "—"}
              hint="off via config"
              icon={<Icon.x width={15} height={15} />}
            />
            <StatCard
              label="Last batch · jobs"
              loading={loading && !sources}
              value={sources ? formatNumber(totalLast) : "—"}
              hint="sum across sources"
              icon={<Icon.spark width={15} height={15} />}
            />
            <StatCard
              label="Needs attention"
              loading={loading && !sources}
              value={sources ? failed.length + missingKey.length : "—"}
              hint={
                missingKey.length > 0
                  ? `${missingKey.length} missing key · ${failed.length} errors`
                  : "last-run errors"
              }
              delta={
                failed.length + missingKey.length > 0
                  ? {
                      value:
                        missingKey.length > 0
                          ? `${missingKey.length} key gap`
                          : `${failed.length} failing`,
                      tone: "danger",
                    }
                  : undefined
              }
              icon={<Icon.warning width={15} height={15} />}
            />
          </section>

          <Card padding="none" className="mt-8">
            <CardHeader
              title="Source registry"
              description="Switch a source on or off per row, or run any single source on demand. API keys still live in App Config."
              action={
                lastTrigger ? (
                  <Badge tone="success" variant="dot">
                    last triggered {formatRelative(lastTrigger)}
                  </Badge>
                ) : (
                  <Badge tone="muted" variant="soft" className="font-mono">
                    {sources?.length ?? 0} sources
                  </Badge>
                )
              }
              className="px-5 pt-5 mb-0"
            />

            {loading && !sources ? (
              <div className="px-5 pb-5 pt-1 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" rounded="lg" />
                ))}
              </div>
            ) : (sources?.length ?? 0) === 0 ? (
              <div className="px-5 pb-6">
                <EmptyState
                  icon={<Icon.briefcase width={18} height={18} />}
                  title="No source registry yet"
                  description="Once the backend exposes GET /admin/jobs/sources, every configured scraper will list here."
                />
              </div>
            ) : (
              <ul className="reveal-stagger">
                {sources!.map((s) => {
                  const meta = SOURCE_META[s.name] ?? {
                    label: s.name,
                    free: "—",
                    notes: "",
                  };
                  const needsKey =
                    s.enabled && s.configured === false;
                  const missingKeyList =
                    needsKey && s.keyConfigKeys && s.keyConfigKeys.length > 0
                      ? s.keyConfigKeys.join(", ")
                      : null;
                  const tone = !s.enabled
                    ? "muted"
                    : s.lastError || needsKey
                      ? "danger"
                      : "success";
                  return (
                    <li
                      key={s.name}
                      className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 py-4 px-5 border-t border-border first:border-t-0"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <StatusDot
                          tone={tone}
                          pulse={s.enabled && !s.lastError}
                          size="md"
                          className="mt-1.5"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-semibold text-fg">
                              {meta.label}
                            </span>
                            <span className="font-mono text-[11px] text-fg-subtle">
                              {s.name}
                            </span>
                            {!s.enabled ? (
                              <Badge tone="muted" variant="soft">
                                disabled
                              </Badge>
                            ) : null}
                            {needsKey ? (
                              <Badge tone="danger" variant="soft">
                                key missing
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-[12px] text-fg-muted">
                            {meta.notes}
                          </div>
                          {needsKey && missingKeyList ? (
                            <div className="mt-1 text-[11.5px] text-danger">
                              No API call goes out — set{" "}
                              <span className="font-mono text-fg">
                                {missingKeyList}
                              </span>{" "}
                              in App Config.
                            </div>
                          ) : null}
                          {s.lastError ? (
                            <div className="mt-1 font-mono text-[11.5px] text-danger truncate max-w-md">
                              error: {s.lastError}
                            </div>
                          ) : null}
                          {!s.lastError && s.lastStatus && s.lastStatus !== "ok" ? (
                            <div
                              className={`mt-1 font-mono text-[11.5px] truncate max-w-md ${
                                ["auth_error", "rate_limited", "parse_error"].includes(
                                  s.lastStatus,
                                )
                                  ? "text-danger"
                                  : "text-warn"
                              }`}
                            >
                              {s.lastStatus.replaceAll("_", " ")}
                              {s.lastStatusDetail
                                ? ` · ${s.lastStatusDetail}`
                                : null}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-[11.5px] shrink-0">
                        <div>
                          <div className="uppercase tracking-widest text-fg-subtle">
                            Last run
                          </div>
                          <div className="text-fg mt-0.5">
                            {formatRelative(s.lastRunAt)}
                          </div>
                        </div>
                        <div>
                          <div className="uppercase tracking-widest text-fg-subtle">
                            Last count
                          </div>
                          <div className="text-fg mt-0.5 font-mono tabular-nums">
                            {formatNumber(s.lastJobCount)}
                          </div>
                        </div>
                        <div>
                          <div className="uppercase tracking-widest text-fg-subtle">
                            Free tier
                          </div>
                          <div className="text-fg mt-0.5">{meta.free}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-widest text-fg-subtle">
                            Freshness
                          </div>
                          <div className="mt-0.5">
                            <FreshnessInput
                              source={s.name}
                              value={freshnessDays[s.name]}
                              saving={savingFreshness === s.name}
                              onCommit={(days) => saveFreshness(s.name, days)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Toggle
                          checked={s.enabled}
                          onChange={(next) => toggleOne(s.name, next)}
                          disabled={togglingOne === s.name}
                          label={s.enabled ? "On" : "Off"}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => runOne(s.name)}
                          loading={runningOne === s.name}
                          leading={<Icon.refresh width={12} height={12} />}
                          disabled={!s.enabled}
                        >
                          Run now
                        </Button>
                        {s.type === "generic" ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditing(s)}
                              leading={<Icon.pencil width={12} height={12} />}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setDeleting(s)}
                              leading={<Icon.trash width={12} height={12} />}
                            >
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {error && sources ? (
            <div className="mt-4 surface p-3 border-[color-mix(in_oklab,var(--warn)_30%,var(--border))] flex items-start gap-2.5 reveal">
              <Icon.warning width={14} height={14} className="text-warn mt-0.5" />
              <div className="text-[12.5px] text-fg-muted">
                Action failed —{" "}
                <span className="font-mono text-warn">{error}</span>.
              </div>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add custom job source"
        description="Generic REST source — point it at any JSON API, map the response fields, and it'll join the regular fetch pipeline."
        size="lg"
      >
        <JobSourceForm
          onSaved={handleSaved}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          editing ? (
            <span className="font-mono text-[14px]">{editing.label ?? editing.name}</span>
          ) : (
            "Edit source"
          )
        }
        description="Update endpoint, field mapping or overrides."
        size="lg"
      >
        {editing ? (
          <JobSourceForm
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
        title={`Delete source "${deleting?.label ?? deleting?.name ?? ""}"?`}
        description="This removes the source config. Jobs already fetched from it stay in the DB but no future runs will hit this endpoint. Builtin sources can't be deleted."
        confirmLabel="Delete"
        tone="danger"
      />
    </>
  );
}

/// Inline numeric editor for a single source's freshness window. Commits
/// on blur or Enter; ignores invalid values and snaps back to the
/// saved value. Placeholder reads "20" (the backend default) when no
/// override has been set yet — so the admin can see at a glance which
/// rows are using the global default vs an explicit override.
function FreshnessInput({
  source,
  value,
  saving,
  onCommit,
}: {
  source: string;
  value: number | undefined;
  saving: boolean;
  onCommit: (days: number) => void;
}) {
  const [draft, setDraft] = useState<string>(
    value === undefined ? "" : String(value),
  );
  // Re-sync the local draft whenever the upstream value changes (e.g.
  // optimistic update settles or a rollback after error).
  useEffect(() => {
    setDraft(value === undefined ? "" : String(value));
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n <= 0) {
      // Invalid input — snap back to the last known good value.
      setDraft(value === undefined ? "" : String(value));
      return;
    }
    const clamped = Math.max(1, Math.min(365, Math.round(n)));
    if (clamped === value) {
      setDraft(String(clamped));
      return;
    }
    onCommit(clamped);
  };

  return (
    <label
      className="flex items-center gap-1 text-[11px] text-fg-subtle"
      title={`Freshness window for the ${source} scraper (days back from today). Falls back to the global default when blank.`}
    >
      <input
        type="number"
        min={1}
        max={365}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(value === undefined ? "" : String(value));
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        placeholder="20"
        disabled={saving}
        className="w-12 rounded-md border border-border bg-bg px-2 py-1 text-[12px] text-fg font-mono tabular-nums text-right outline-none focus:border-fg-muted disabled:opacity-50"
        aria-label={`Freshness days for ${source}`}
      />
      <span>days</span>
    </label>
  );
}
