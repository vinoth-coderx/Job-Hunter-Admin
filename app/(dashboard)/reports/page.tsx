"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { reportsApi, ReportItem } from "@/lib/moderation";

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const ACTIONS: { value: string; label: string }[] = [
  { value: "job_unpublished", label: "Unpublish job" },
  { value: "recruiter_warned", label: "Warn recruiter" },
  { value: "recruiter_suspended", label: "Suspend recruiter" },
  { value: "recruiter_banned", label: "Ban recruiter" },
  { value: "company_flagged", label: "Flag company" },
  { value: "no_action", label: "Dismiss (no action)" },
];

export default function ReportsPage() {
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<ReportItem | null>(null);
  const [action, setAction] = useState("no_action");
  const [note, setNote] = useState("");
  const [inFlight, setInFlight] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.list(status);
      setReports(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!resolving) return;
    setInFlight(true);
    try {
      await reportsApi.resolve(
        resolving._id,
        action as Parameters<typeof reportsApi.resolve>[1],
        note || undefined,
      );
      setResolving(null);
      setAction("no_action");
      setNote("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setInFlight(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Fake job / recruiter reports filed by users. Triage from the top down."
      />

      <FilterPills options={STATUSES} value={status} onChange={setStatus} />

      {error && (
        <Card>
          <div className="p-4 text-sm text-red-500">{error}</div>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="grid gap-3">
          {reports.map((r) => (
            <Card key={r._id}>
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warn">{r.reason.replaceAll("_", " ")}</Badge>
                    <Badge tone="muted">{r.subjectType}</Badge>
                    <span className="text-xs text-zinc-500">
                      {formatRelative(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-zinc-300">
                    {r.description || (
                      <span className="text-zinc-500">No description</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Reporter:{" "}
                    {r.reporter?.profile?.fullName ??
                      r.reporter?.email ??
                      "unknown"}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setResolving(r)}>
                  Resolve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon.flag className="h-8 w-8 text-zinc-500" />}
          title="No reports in this queue"
          description="When users report a job or recruiter, the report shows here."
        />
      )}

      {resolving && (
        <Modal
          open
          onClose={() => !inFlight && setResolving(null)}
          title="Resolve report"
        >
          <div className="space-y-4">
            <Select
              label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              options={ACTIONS}
            />
            <Textarea
              label="Note (visible to your team in audit log)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setResolving(null)}
                disabled={inFlight}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={inFlight}>
                Apply
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
