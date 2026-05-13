"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import { cronsApi, CRON_META } from "@/lib/crons";
import { ApiError, isMissingBackend } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { CronOverview, CronJob } from "@/lib/types";

export default function CronsPage() {
  const [data, setData] = useState<CronOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);
  const [runningName, setRunningName] = useState<string | null>(null);
  const [togglingMaster, setTogglingMaster] = useState(false);
  const [editing, setEditing] = useState<CronJob | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cronsApi.list();
      setData(res);
      setMissingBackend(false);
    } catch (err) {
      if (isMissingBackend(err)) {
        setMissingBackend(true);
        setData({ masterEnabled: false, jobs: [] });
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

  const toggleMaster = async (next: boolean) => {
    if (!data) return;
    setTogglingMaster(true);
    const prev = data.masterEnabled;
    setData({ ...data, masterEnabled: next });
    try {
      await cronsApi.setMaster(next);
    } catch (err) {
      setData({ ...data, masterEnabled: prev });
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setTogglingMaster(false);
    }
  };

  const openScheduleEditor = (job: CronJob) => {
    setEditing(job);
    setScheduleDraft(job.schedule);
    setScheduleError(null);
  };

  const closeScheduleEditor = () => {
    if (savingSchedule) return;
    setEditing(null);
    setScheduleError(null);
  };

  const saveSchedule = async () => {
    if (!editing) return;
    const trimmed = scheduleDraft.trim();
    if (!trimmed) {
      setScheduleError("Schedule cannot be empty");
      return;
    }
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      const res = await cronsApi.setSchedule(editing.name, trimmed);
      setData((d) =>
        d
          ? {
              ...d,
              jobs: d.jobs.map((j) =>
                j.name === editing.name
                  ? { ...j, schedule: res.schedule, nextRunAt: res.nextRunAt }
                  : j,
              ),
            }
          : d,
      );
      setEditing(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setScheduleError(msg);
    } finally {
      setSavingSchedule(false);
    }
  };

  const runNow = async (job: CronJob) => {
    setRunningName(job.name);
    try {
      const r = await cronsApi.runNow(job.name);
      setData((d) =>
        d
          ? {
              ...d,
              jobs: d.jobs.map((j) =>
                j.name === job.name
                  ? { ...j, lastRunAt: r.startedAt, lastError: undefined }
                  : j,
              ),
            }
          : d,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setRunningName(null);
    }
  };

  const masterEnabled = data?.masterEnabled ?? false;

  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Background jobs"
        description="Master kill-switch + per-cron schedule, last run, and one-tap manual trigger. Honors the CRON_ENABLED config flag."
        actions={
          <Button
            variant="secondary"
            leading={<Icon.refresh width={14} height={14} />}
            onClick={load}
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
                GET /admin/crons
              </code>{" "}
              returned 404. Toggling and triggering are wired and will work the
              moment the route lands.
            </p>
          </div>
        </div>
      ) : null}

      {error && !missingBackend && !data ? (
        <EmptyState
          tone="danger"
          icon={<Icon.warning width={18} height={18} />}
          title="Couldn't load cron overview"
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
          <Card className="mb-6 reveal">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl shrink-0 ${
                    masterEnabled
                      ? "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-success"
                      : "bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-danger"
                  }`}
                >
                  <Icon.clock width={20} height={20} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold tracking-tight text-fg">
                      Master switch
                    </h3>
                    <Badge
                      tone={masterEnabled ? "success" : "danger"}
                      variant="dot"
                    >
                      {masterEnabled ? "running" : "paused"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12.5px] text-fg-muted leading-relaxed max-w-xl">
                    Toggling this writes <code className="font-mono text-fg">CRON_ENABLED</code> in
                    AppConfig. All four crons honor it within 15 minutes. Use during
                    incidents and migrations.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {loading && !data ? (
                  <Skeleton className="h-7 w-12" rounded="full" />
                ) : (
                  <Toggle
                    checked={masterEnabled}
                    onChange={toggleMaster}
                    disabled={togglingMaster}
                    label={masterEnabled ? "Enabled" : "Disabled"}
                    description={
                      togglingMaster ? "Saving…" : "Click to flip"
                    }
                  />
                )}
              </div>
            </div>
          </Card>

          <Card padding="none">
            <CardHeader
              title="Scheduled jobs"
              description="Click 'edit' on a schedule to override the default expression; the cron restarts live. Master toggle pauses everything."
              action={
                <Badge tone="muted" variant="soft" className="font-mono">
                  {data?.jobs.length ?? 0} jobs
                </Badge>
              }
              className="px-5 pt-5 mb-0"
            />
            {loading && !data ? (
              <div className="px-5 pb-5 pt-1 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" rounded="lg" />
                ))}
              </div>
            ) : (data?.jobs.length ?? 0) === 0 ? (
              <div className="px-5 pb-6">
                <EmptyState
                  icon={<Icon.clock width={18} height={18} />}
                  title="No scheduled jobs yet"
                  description="Once the backend exposes the cron registry, jobs will appear here."
                />
              </div>
            ) : (
              <ul className="reveal-stagger">
                {data!.jobs.map((job) => (
                  <li
                    key={job.name}
                    className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 py-4 px-5 border-t border-border first:border-t-0"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <StatusDot
                        tone={
                          !job.enabled
                            ? "muted"
                            : job.lastError
                              ? "danger"
                              : "success"
                        }
                        pulse={job.enabled && !job.lastError}
                        size="md"
                        className="mt-1.5"
                      />
                      <div className="min-w-0">
                        <div className="font-mono text-[13px] font-medium text-fg">
                          {job.name}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-fg-muted">
                          {CRON_META[job.name]?.description ?? "Scheduled job."}
                        </div>
                        {job.lastError ? (
                          <div className="mt-1 font-mono text-[11.5px] text-danger truncate max-w-md">
                            last error: {job.lastError}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 md:gap-6 text-[11.5px] shrink-0">
                      <div>
                        <div className="uppercase tracking-widest text-fg-subtle">
                          Schedule
                        </div>
                        <div className="font-mono text-fg mt-0.5 tabular-nums flex items-center gap-1.5">
                          <span>{job.schedule}</span>
                          {job.editable !== false && job.schedule !== "manual" ? (
                            <button
                              type="button"
                              onClick={() => openScheduleEditor(job)}
                              className="text-[10.5px] text-fg-subtle hover:text-fg underline-offset-2 hover:underline transition"
                              title="Edit schedule"
                            >
                              edit
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase tracking-widest text-fg-subtle">
                          Last run
                        </div>
                        <div className="text-fg mt-0.5">
                          {formatRelative(job.lastRunAt)}
                          {typeof job.lastDurationMs === "number" ? (
                            <span className="text-fg-subtle ml-1">
                              · {job.lastDurationMs}ms
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase tracking-widest text-fg-subtle">
                          Next run
                        </div>
                        <div className="text-fg mt-0.5">
                          {formatRelative(job.nextRunAt)}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => runNow(job)}
                      loading={runningName === job.name}
                      leading={<Icon.refresh width={12} height={12} />}
                    >
                      Run now
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {error && data ? (
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
        open={editing !== null}
        onClose={closeScheduleEditor}
        title={editing ? `Edit schedule — ${editing.name}` : "Edit schedule"}
        description="5-field cron expression: min hr dom mon dow. Persists to AppConfig and restarts the cron live."
        busy={savingSchedule}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={closeScheduleEditor}
              disabled={savingSchedule}
            >
              Cancel
            </Button>
            {editing?.defaultSchedule && editing.defaultSchedule !== editing.schedule ? (
              <Button
                variant="secondary"
                onClick={() => setScheduleDraft(editing.defaultSchedule ?? "")}
                disabled={savingSchedule}
              >
                Reset to default
              </Button>
            ) : null}
            <Button
              variant="primary"
              onClick={saveSchedule}
              loading={savingSchedule}
            >
              Save & restart
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            value={scheduleDraft}
            onChange={(e) => setScheduleDraft(e.target.value)}
            placeholder="*/15 * * * *"
            className="font-mono"
            autoFocus
          />
          <div className="text-[11.5px] text-fg-subtle">
            Default:{" "}
            <code className="font-mono text-fg">{editing?.defaultSchedule ?? "—"}</code>
            {editing?.defaultSchedule && editing.defaultSchedule === editing.schedule
              ? " (currently in effect)"
              : null}
          </div>
          {scheduleError ? (
            <div className="text-[12px] text-danger font-mono">{scheduleError}</div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
