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
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import {
  moderationApi,
  ModerationJob,
  ListEnvelope,
} from "@/lib/moderation";

const STATUSES = [
  { label: "Queued", value: "queued" },
  { label: "Auto-rejected", value: "auto_rejected" },
  { label: "Auto-approved", value: "auto_approved" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

const riskTone = (
  score?: number,
): "neutral" | "warn" | "danger" | "success" => {
  if (score === undefined) return "neutral";
  if (score >= 75) return "danger";
  if (score >= 35) return "warn";
  return "success";
};

export default function ModerationPage() {
  const [status, setStatus] = useState("queued");
  const [data, setData] = useState<ListEnvelope<ModerationJob> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<ModerationJob | null>(null);
  const [note, setNote] = useState("");
  const [actionInFlight, setActionInFlight] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await moderationApi.listQueue(status, 50, 0);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (decision: "approve" | "reject") => {
    if (!reviewing) return;
    setActionInFlight(true);
    try {
      await moderationApi.decide(reviewing._id, decision, note || undefined);
      setReviewing(null);
      setNote("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setActionInFlight(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation queue"
        description="Native job postings flagged or queued by the AI moderation pipeline."
      />

      <FilterPills
        options={STATUSES}
        value={status}
        onChange={(v) => setStatus(v)}
      />

      {error && (
        <Card>
          <div className="p-4 text-sm text-red-500">{error}</div>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-3">
          {data.items.map((j) => (
            <Card key={j._id}>
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold">
                      {j.title}
                    </h3>
                    <Badge tone={riskTone(j.moderation.riskScore)}>
                      risk {j.moderation.riskScore ?? "?"}
                    </Badge>
                    {j.moderation.duplicateOf && (
                      <Badge tone="warn">duplicate</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {j.company} · {j.location} · {formatRelative(j.createdAt)}
                  </p>
                  {j.moderation.flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {j.moderation.flags.map((f) => (
                        <span
                          key={f}
                          className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-300"
                        >
                          {f.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                  )}
                  {j.hirerProfile && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Recruiter: {j.hirerProfile.companyName} · trust{" "}
                      {j.hirerProfile.trustScore ?? "?"} ·{" "}
                      {j.hirerProfile.verification?.isVerified
                        ? "verified"
                        : "unverified"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" onClick={() => setReviewing(j)}>
                    Review
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon.shield className="h-8 w-8 text-zinc-500" />}
          title="Nothing in this queue"
          description="All clear right now. New flagged listings will appear here."
        />
      )}

      {reviewing && (
        <Modal
          open
          onClose={() => {
            if (!actionInFlight) {
              setReviewing(null);
              setNote("");
            }
          }}
          title={reviewing.title}
        >
          <div className="space-y-4">
            <div className="text-sm text-zinc-400">
              {reviewing.company} · {reviewing.location}
            </div>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm">
              {reviewing.description}
            </div>
            <Textarea
              label="Reviewer note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Why approving or rejecting…"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setReviewing(null)}
                disabled={actionInFlight}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                onClick={() => decide("reject")}
                disabled={actionInFlight}
              >
                Reject
              </Button>
              <Button
                onClick={() => decide("approve")}
                disabled={actionInFlight}
              >
                Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
