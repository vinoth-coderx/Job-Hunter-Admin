"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import {
  moderationAppealsApi,
  AppealItem,
  ListEnvelope,
} from "@/lib/moderation";

type AppealStatus = "pending" | "accepted" | "rejected";

const STATUSES: { value: AppealStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const tone = (s: AppealStatus): "warn" | "success" | "danger" =>
  s === "pending" ? "warn" : s === "accepted" ? "success" : "danger";

export default function ModerationAppealsPage() {
  const [status, setStatus] = useState<AppealStatus>("pending");
  const [data, setData] = useState<ListEnvelope<AppealItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<AppealItem | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [inFlight, setInFlight] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await moderationAppealsApi.list(status);
      setData(r.data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (decision: "accept" | "reject") => {
    if (!reviewing) return;
    setInFlight(true);
    try {
      await moderationAppealsApi.decide(reviewing._id, decision, adminNote || undefined);
      setReviewing(null);
      setAdminNote("");
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setInFlight(false);
    }
  };

  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Trust & Safety"
        title="Moderation appeals"
        description="Hirers contesting an auto-rejection. Accept republishes the job; reject leaves it as-is and locks the appeal."
      />

      <div className="mt-4">
        <FilterPills
          value={status}
          onChange={(v) => setStatus(v as AppealStatus)}
          options={STATUSES}
        />
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" rounded="md" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load appeals" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${status} appeals`}
          description={
            status === "pending"
              ? "Nothing to review right now — hirer appeals land here as they file them."
              : "No history in this band."
          }
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((it) => (
            <li key={it._id}>
              <Card>
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-fg font-semibold text-[15px] truncate">
                        {it.job?.title ?? "Job (deleted)"}
                      </div>
                      {it.job?.company ? (
                        <div className="text-fg-muted text-[12px]">
                          {it.job.company}
                        </div>
                      ) : null}
                    </div>
                    <Badge tone={tone(it.appeal.status)} variant="soft">
                      {it.appeal.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-muted">
                    <Badge tone="neutral" variant="soft">
                      Risk {it.riskScore}
                    </Badge>
                    <Badge tone="neutral" variant="soft">
                      {it.decision}
                    </Badge>
                    {it.flags.slice(0, 4).map((f) => (
                      <Badge key={f} tone="neutral" variant="soft">
                        {f}
                      </Badge>
                    ))}
                    <span className="ml-auto text-fg-subtle">
                      Filed {formatRelative(it.appeal.submittedAt)}
                    </span>
                  </div>

                  <div className="rounded-md bg-panel-hover/40 border border-border p-3">
                    <div className="text-[11px] uppercase tracking-wide text-fg-subtle font-medium mb-1">
                      Hirer's reason
                    </div>
                    <p className="text-[13px] text-fg leading-relaxed whitespace-pre-wrap">
                      {it.appeal.reason}
                    </p>
                  </div>

                  {it.appeal.adminNote ? (
                    <div className="rounded-md bg-panel-hover/40 border border-border p-3">
                      <div className="text-[11px] uppercase tracking-wide text-fg-subtle font-medium mb-1">
                        Admin note
                      </div>
                      <p className="text-[13px] text-fg leading-relaxed whitespace-pre-wrap">
                        {it.appeal.adminNote}
                      </p>
                    </div>
                  ) : null}

                  {it.appeal.status === "pending" ? (
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setReviewing(it);
                          setAdminNote("");
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!reviewing}
        onClose={() => (inFlight ? null : setReviewing(null))}
        title="Resolve appeal"
        description={
          reviewing?.job?.title
            ? `${reviewing.job.title} — risk ${reviewing.riskScore}`
            : undefined
        }
      >
        <div className="space-y-3">
          <div className="rounded-md bg-panel-hover/40 border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-fg-subtle font-medium mb-1">
              Hirer's reason
            </div>
            <p className="text-[13px] text-fg leading-relaxed whitespace-pre-wrap">
              {reviewing?.appeal.reason}
            </p>
          </div>
          <div>
            <label
              htmlFor="admin-note"
              className="block text-[12px] text-fg-muted mb-1"
            >
              Note to hirer (optional)
            </label>
            <Textarea
              id="admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Why this decision? Visible to the hirer."
              maxLength={2000}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setReviewing(null)}
              disabled={inFlight}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => decide("reject")}
              loading={inFlight}
            >
              Reject appeal
            </Button>
            <Button
              variant="primary"
              onClick={() => decide("accept")}
              loading={inFlight}
            >
              Accept &amp; republish
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
