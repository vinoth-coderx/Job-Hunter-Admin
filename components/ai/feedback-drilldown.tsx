"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { aiAnalyticsApi, type AiFeedbackSample } from "@/lib/ai";
import { ApiError } from "@/lib/api";

interface FeedbackDrilldownProps {
  feature: string | null;
  fromIso?: string;
  toIso?: string;
  onClose: () => void;
}

const formatWhen = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

/**
 * Admin drill-down for AI feedback. Opens from the "User satisfaction"
 * row click; loads the most recent thumbs-down notes (or all ratings
 * via the toggle) so the operator can read what users actually said
 * when they marked the output bad.
 *
 * Mounted as a modal — controlled by setting `feature` to a non-null
 * string. `onClose` clears the selection in the parent.
 */
export function FeedbackDrilldown({
  feature,
  fromIso,
  toIso,
  onClose,
}: FeedbackDrilldownProps) {
  const [rating, setRating] = useState<"down" | "up" | "all">("down");
  const [samples, setSamples] = useState<AiFeedbackSample[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feature) {
      setSamples(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    aiAnalyticsApi
      .feedbackSamples({
        feature,
        rating,
        limit: 100,
        from: fromIso,
        to: toIso,
      })
      .then((res) => {
        if (cancelled) return;
        setSamples(res.data.samples);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : (err as Error).message,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feature, rating, fromIso, toIso]);

  return (
    <Modal open={feature !== null} onClose={onClose} size="lg">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">
            Feedback samples
          </h2>
          <p className="mt-1 text-[12px] text-fg-muted">
            Feature: <span className="font-mono text-fg">{feature}</span>
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-panel/40 p-0.5">
          {(["down", "up", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRating(r)}
              className={`px-2 py-1 text-[12px] rounded-sm transition ${
                rating === r
                  ? "bg-accent text-white shadow-sm"
                  : "text-fg-muted hover:bg-panel-hover"
              }`}
            >
              {r === "down" ? "👎 Only" : r === "up" ? "👍 Only" : "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
        {loading ? (
          <Skeleton className="h-32 w-full" rounded="md" />
        ) : error ? (
          <p className="text-danger text-[13px] py-6 text-center">{error}</p>
        ) : !samples || samples.length === 0 ? (
          <p className="text-fg-muted text-[13px] py-6 text-center">
            No feedback rows in this window.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {samples.map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex items-center gap-2 text-[12px]">
                  <Badge
                    tone={s.rating === 1 ? "success" : "danger"}
                    variant="soft"
                  >
                    {s.rating === 1 ? "👍 thumbs up" : "👎 thumbs down"}
                  </Badge>
                  <span className="text-fg-muted">
                    {formatWhen(s.createdAt)}
                  </span>
                  <span className="ml-auto font-mono text-fg-muted">
                    user {s.userId.slice(-6)} · ref {s.refId.slice(0, 14)}
                  </span>
                </div>
                {s.note ? (
                  <p className="mt-1.5 text-[13px] text-fg whitespace-pre-wrap leading-relaxed">
                    {s.note}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12px] italic text-fg-subtle">
                    (no note left)
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
