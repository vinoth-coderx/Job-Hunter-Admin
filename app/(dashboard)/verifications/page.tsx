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
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { verificationApi, VerificationItem } from "@/lib/moderation";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "auto_verified", label: "Auto-verified" },
  { value: "all", label: "All" },
];

export default function VerificationsPage() {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState<VerificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<VerificationItem | null>(null);
  const [note, setNote] = useState("");
  const [inFlight, setInFlight] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verificationApi.list(status);
      setItems(res.data);
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
    setInFlight(true);
    try {
      await verificationApi.review(reviewing._id, decision, note || undefined);
      setReviewing(null);
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
        title="Verifications"
        description="Review hirer GST / domain / website / LinkedIn proofs."
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
      ) : items && items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((v) => (
            <Card key={v._id}>
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{v.channel}</Badge>
                    <Badge tone="muted">{v.status}</Badge>
                    <span className="text-xs text-zinc-500">
                      {formatRelative(v.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {v.company?.companyName ?? "?"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {v.hirer?.email} ·{" "}
                    {v.company?.website ?? "no website"}
                  </p>
                  <ChannelHelper item={v} />
                  <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 text-[11px] text-zinc-400">
                    {JSON.stringify(v.payload, null, 2)}
                  </pre>
                </div>
                {v.status === "pending" && (
                  <Button variant="ghost" onClick={() => setReviewing(v)}>
                    Review
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Icon.badge className="h-8 w-8 text-zinc-500" />}
          title="Nothing to verify"
          description="Hirers' verification submissions show up here for admin review."
        />
      )}

      {reviewing && (
        <Modal
          open
          onClose={() => !inFlight && setReviewing(null)}
          title={`Review ${reviewing.channel} verification`}
        >
          <div className="space-y-4">
            <div className="text-sm text-zinc-400">
              {reviewing.company?.companyName} ({reviewing.hirer?.email})
            </div>
            <Textarea
              label="Reviewer note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Reason for approving or rejecting"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setReviewing(null)}
                disabled={inFlight}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                onClick={() => decide("reject")}
                disabled={inFlight}
              >
                Reject
              </Button>
              <Button onClick={() => decide("approve")} disabled={inFlight}>
                Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChannelHelper({ item }: { item: VerificationItem }) {
  const p = item.payload as Record<string, unknown>;
  if (item.channel === "gst") {
    const gst = (p.gstNumber as string | undefined) ?? "";
    if (!gst) return null;
    const url = `https://services.gst.gov.in/services/searchtp`;
    return (
      <p className="mt-2 text-xs text-zinc-400">
        Look up on{" "}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 underline"
        >
          GST portal
        </a>{" "}
        — paste{" "}
        <code className="rounded bg-zinc-800 px-1 text-[11px]">{gst}</code>
      </p>
    );
  }
  if (item.channel === "website") {
    const site = (p.website as string | undefined) ?? "";
    const token = (p.websiteFileToken as string | undefined) ?? "";
    if (!site || !token) return null;
    const url = `${site.replace(/\/$/, "")}/.well-known/jobhunter-verification.txt`;
    return (
      <p className="mt-2 text-xs text-zinc-400">
        Expected token:{" "}
        <code className="rounded bg-zinc-800 px-1 text-[11px]">{token}</code>
        <br />
        Fetch{" "}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 underline"
        >
          {url}
        </a>{" "}
        — body must match the token above.
      </p>
    );
  }
  if (item.channel === "linkedin") {
    const url = (p.linkedinUrl as string | undefined) ?? "";
    if (!url) return null;
    return (
      <p className="mt-2 text-xs text-zinc-400">
        Open{" "}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 underline"
        >
          {url}
        </a>{" "}
        — confirm the company logo + the hirer's name appears on the page.
      </p>
    );
  }
  return null;
}
