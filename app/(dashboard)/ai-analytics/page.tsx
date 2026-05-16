"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterPills } from "@/components/ui/filter-pills";
import { Icon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import {
  aiAnalyticsApi,
  aiCreditWeightsApi,
  type AiAnalyticsResponse,
  type AiUsageProvider,
} from "@/lib/ai";
import { ApiError, isMissingBackend } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { FeedbackDrilldown } from "@/components/ai/feedback-drilldown";

type WindowChoice = "1d" | "7d" | "14d" | "30d";

const WINDOW_PILLS: { value: WindowChoice; label: string }[] = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
];

const windowToRange = (
  win: WindowChoice,
): { from: string; days: number } => {
  const days = win === "1d" ? 1 : win === "7d" ? 7 : win === "14d" ? 14 : 30;
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  return { from, days };
};

const formatUsd = (cents: number): string => {
  if (cents === 0) return "$0.00";
  if (cents < 0.01) return `< $0.01`;
  return `$${cents.toFixed(2)}`;
};

const PROVIDER_TONE: Record<AiUsageProvider, string> = {
  gemini: "var(--accent)",
  claude: "var(--warn)",
  groq: "var(--success)",
};

export default function AiAnalyticsPage() {
  const [data, setData] = useState<AiAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);
  const [windowChoice, setWindowChoice] = useState<WindowChoice>("7d");
  const [feedbackDrillFeature, setFeedbackDrillFeature] = useState<
    string | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, days } = windowToRange(windowChoice);
    try {
      const r = await aiAnalyticsApi.overview({ from, days });
      setData(r);
      setMissingBackend(false);
    } catch (err) {
      if (isMissingBackend(err)) {
        setMissingBackend(true);
        setData(null);
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
  }, [windowChoice]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals;
  const cacheHitRate = useMemo(() => {
    if (!totals || totals.totalCalls === 0) return 0;
    return Math.round((totals.cacheHits / totals.totalCalls) * 100);
  }, [totals]);

  const successRate = useMemo(() => {
    if (!totals || totals.totalCalls === 0) return 100;
    return Math.round((totals.successCalls / totals.totalCalls) * 100);
  }, [totals]);

  const seriesMax = useMemo(() => {
    if (!data?.series || data.series.length === 0) return 1;
    return Math.max(1, ...data.series.map((p) => p.calls));
  }, [data]);

  return (
    <>
      <PageHeader
        eyebrow="Configure"
        title="AI Analytics"
        description="Per-feature, per-provider AI usage and cost across the platform. Cache hits don't burn tokens — that ratio is your savings."
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

      <div className="mt-4">
        <FilterPills
          value={windowChoice}
          onChange={(v) => setWindowChoice(v as WindowChoice)}
          options={WINDOW_PILLS}
        />
      </div>

      {missingBackend ? (
        <EmptyState
          title="Backend unreachable"
          description="The analytics endpoint requires the Job Hunter backend at /admin/ai/analytics."
        />
      ) : error ? (
        <EmptyState title="Couldn't load analytics" description={error} />
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total AI calls"
              value={loading ? undefined : formatNumber(totals?.totalCalls ?? 0)}
              loading={loading}
              hint={`${successRate}% success`}
              icon={<Icon.spark width={14} height={14} />}
            />
            <StatCard
              label="Tokens used"
              value={loading ? undefined : formatNumber(totals?.totalTokens ?? 0)}
              loading={loading}
              hint={`${formatNumber(totals?.inputTokens ?? 0)} in / ${formatNumber(totals?.outputTokens ?? 0)} out`}
            />
            <StatCard
              label="Estimated cost"
              value={loading ? undefined : formatUsd(totals?.estimatedCostUsd ?? 0)}
              loading={loading}
              hint="USD, list price"
              icon={<Icon.creditCard width={14} height={14} />}
            />
            <StatCard
              label="Cache savings"
              value={loading ? undefined : `${cacheHitRate}%`}
              loading={loading}
              hint={`${formatNumber(totals?.cacheHits ?? 0)} cache hits`}
              icon={<Icon.pulse width={14} height={14} />}
            />
          </section>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader
                title="Daily calls"
                description="Total provider calls per day in the selected window."
              />
              <div className="px-5 pb-5">
                {loading ? (
                  <Skeleton className="h-32 w-full" rounded="md" />
                ) : !data?.series || data.series.length === 0 ? (
                  <p className="text-fg-muted text-sm py-6 text-center">
                    No AI activity yet in this window.
                  </p>
                ) : (
                  <SeriesChart points={data.series} max={seriesMax} />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="By provider"
                description="Live calls and cost per provider (excludes cache hits)."
              />
              <div className="px-5 pb-5">
                {loading ? (
                  <Skeleton className="h-32 w-full" rounded="md" />
                ) : !data?.providers || data.providers.length === 0 ? (
                  <p className="text-fg-muted text-sm py-6 text-center">
                    No provider activity in this window.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {data.providers.map((p) => (
                      <li
                        key={p.provider}
                        className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: PROVIDER_TONE[p.provider] }}
                          />
                          <span className="font-medium text-fg capitalize">
                            {p.provider}
                          </span>
                        </div>
                        <div className="text-right tabular-nums">
                          <div className="text-fg text-sm">
                            {formatNumber(p.calls)} calls
                          </div>
                          <div className="text-fg-muted text-xs">
                            {formatNumber(p.totalTokens)} tokens · {formatUsd(p.estimatedCostUsd)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader
              title="By feature"
              description="Token use and cost per AI feature. Sorted by spend."
            />
            <div className="px-5 pb-5">
              {loading ? (
                <Skeleton className="h-40 w-full" rounded="md" />
              ) : !data?.features || data.features.length === 0 ? (
                <p className="text-fg-muted text-sm py-6 text-center">
                  No feature activity in this window.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-fg-subtle text-[11px] uppercase tracking-wide">
                        <th className="text-left py-2 pr-3 font-medium">Feature</th>
                        <th className="text-right px-3 font-medium">Calls</th>
                        <th className="text-right px-3 font-medium">Cache hits</th>
                        <th className="text-right px-3 font-medium">Tokens</th>
                        <th className="text-right px-3 font-medium">Avg latency</th>
                        <th className="text-right pl-3 font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.features.map((f) => (
                        <tr
                          key={f.feature}
                          className="border-t border-border hover:bg-panel-hover/40"
                        >
                          <td className="py-2 pr-3 text-fg">
                            <Badge tone="neutral" variant="soft">
                              {f.feature}
                            </Badge>
                          </td>
                          <td className="text-right px-3 text-fg">
                            {formatNumber(f.calls)}
                          </td>
                          <td className="text-right px-3 text-fg-muted">
                            {formatNumber(f.cacheHits)}
                          </td>
                          <td className="text-right px-3 text-fg-muted">
                            {formatNumber(f.totalTokens)}
                          </td>
                          <td className="text-right px-3 text-fg-muted">
                            {Math.round(f.avgLatencyMs)} ms
                          </td>
                          <td className="text-right pl-3 text-fg">
                            {formatUsd(f.estimatedCostUsd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader
              title="User satisfaction"
              description="Per-feature thumbs split. Sort by netScore ascending to spot regressions worth tuning."
            />
            <div className="px-5 pb-5">
              {loading ? (
                <Skeleton className="h-32 w-full" rounded="md" />
              ) : !data?.feedback || data.feedback.length === 0 ? (
                <p className="text-fg-muted text-sm py-6 text-center">
                  No thumbs yet in this window.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-fg-subtle text-[11px] uppercase tracking-wide">
                        <th className="text-left py-2 pr-3 font-medium">Feature</th>
                        <th className="text-right px-3 font-medium">👍</th>
                        <th className="text-right px-3 font-medium">👎</th>
                        <th className="text-right px-3 font-medium">Net</th>
                        <th className="text-right pl-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.feedback]
                        .sort((a, b) => a.netScore - b.netScore)
                        .map((f) => {
                          const pct = Math.round(f.netScore * 100);
                          const tone =
                            pct >= 50
                              ? "var(--success)"
                              : pct >= 0
                                ? "var(--accent)"
                                : "var(--danger)";
                          return (
                            <tr
                              key={f.feature}
                              className="border-t border-border hover:bg-panel-hover/40 cursor-pointer"
                              onClick={() =>
                                setFeedbackDrillFeature(f.feature)
                              }
                              title="Click to read user notes"
                            >
                              <td className="py-2 pr-3 text-fg">
                                <Badge tone="neutral" variant="soft">
                                  {f.feature}
                                </Badge>
                              </td>
                              <td className="text-right px-3 text-fg">
                                {formatNumber(f.thumbsUp)}
                              </td>
                              <td className="text-right px-3 text-fg">
                                {formatNumber(f.thumbsDown)}
                              </td>
                              <td
                                className="text-right px-3 font-semibold"
                                style={{ color: tone }}
                              >
                                {pct >= 0 ? `+${pct}%` : `${pct}%`}
                              </td>
                              <td className="text-right pl-3 text-fg-muted">
                                {formatNumber(f.total)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader
              title="Top users"
              description="Heaviest AI consumers in the selected window. Useful for spotting abuse."
            />
            <div className="px-5 pb-5">
              {loading ? (
                <Skeleton className="h-32 w-full" rounded="md" />
              ) : !data?.topUsers || data.topUsers.length === 0 ? (
                <p className="text-fg-muted text-sm py-6 text-center">
                  No user-attributed activity in this window.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.topUsers.map((u) => (
                    <li
                      key={u.userId}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="text-fg-muted text-xs font-mono">
                        {u.userId}
                      </span>
                      <div className="text-right tabular-nums text-sm">
                        <span className="text-fg">{formatNumber(u.calls)} calls</span>
                        <span className="text-fg-muted ml-3">
                          {formatNumber(u.totalTokens)} tokens · {formatUsd(u.estimatedCostUsd)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <CreditWeightsEditor
            defaults={data?.creditWeights?.defaults ?? {}}
            initialOverrides={data?.creditWeights?.overrides ?? {}}
            onSaved={load}
          />
        </>
      )}
      <FeedbackDrilldown
        feature={feedbackDrillFeature}
        fromIso={windowToRange(windowChoice).from}
        onClose={() => setFeedbackDrillFeature(null)}
      />
    </>
  );
}

/**
 * Per-feature credit-weight editor. Renders one row per known feature
 * with a numeric input and a "reset" button that drops the override
 * (effective weight reverts to the default).
 *
 * Saves are batched — the editor accumulates pending changes locally
 * and PUTs the full overrides map on click. We don't auto-save on every
 * keystroke because the admin almost always edits multiple rows in one
 * sitting and one network round-trip is cleaner than N.
 */
function CreditWeightsEditor({
  defaults,
  initialOverrides,
  onSaved,
}: {
  defaults: Record<string, number>;
  initialOverrides: Record<string, number>;
  onSaved: () => void;
}) {
  const [overrides, setOverrides] =
    useState<Record<string, number>>(initialOverrides);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the parent reloads (after a save the overview returns
  // the new overrides; the editor should mirror that, not stay stale).
  useEffect(() => {
    setOverrides(initialOverrides);
  }, [initialOverrides]);

  const features = useMemo(() => {
    const all = new Set<string>([
      ...Object.keys(defaults),
      ...Object.keys(overrides),
    ]);
    return [...all].sort();
  }, [defaults, overrides]);

  const dirty = useMemo(() => {
    const a = JSON.stringify(initialOverrides);
    const b = JSON.stringify(
      Object.fromEntries(
        Object.entries(overrides).filter(([, v]) => Number.isFinite(v)),
      ),
    );
    return a !== b;
  }, [initialOverrides, overrides]);

  const setRow = (feature: string, raw: string) => {
    if (raw.trim() === "") {
      // Empty input = revert to default
      const next = { ...overrides };
      delete next[feature];
      setOverrides(next);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 50) return;
    setOverrides({ ...overrides, [feature]: Math.round(n) });
  };

  const reset = (feature: string) => {
    const next = { ...overrides };
    delete next[feature];
    setOverrides(next);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await aiCreditWeightsApi.put(overrides);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader
        title="Credit weights"
        description="Per-feature quota cost. Overrides take effect immediately on the next AI call. Leave a row empty to revert to the default."
      />
      <div className="px-5 pb-5">
        {features.length === 0 ? (
          <p className="text-fg-muted text-sm py-6 text-center">
            No features registered yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-fg-subtle text-[11px] uppercase tracking-wide">
                  <th className="text-left py-2 pr-3 font-medium">Feature</th>
                  <th className="text-right px-3 font-medium">Default</th>
                  <th className="text-right px-3 font-medium">Override</th>
                  <th className="text-right pl-3 font-medium">Effective</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {features.map((f) => {
                  const def = defaults[f] ?? 1;
                  const ovr = overrides[f];
                  const effective = ovr !== undefined ? ovr : def;
                  return (
                    <tr
                      key={f}
                      className="border-t border-border hover:bg-panel-hover/40"
                    >
                      <td className="py-2 pr-3 text-fg">
                        <Badge tone="neutral" variant="soft">
                          {f}
                        </Badge>
                      </td>
                      <td className="text-right px-3 text-fg-muted">{def}</td>
                      <td className="text-right px-3">
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          step={1}
                          value={ovr === undefined ? "" : String(ovr)}
                          onChange={(e) => setRow(f, e.target.value)}
                          placeholder="—"
                          className="w-20 text-right"
                        />
                      </td>
                      <td
                        className="text-right pl-3 font-semibold"
                        style={{
                          color:
                            ovr !== undefined && ovr !== def
                              ? "var(--accent)"
                              : "var(--fg)",
                        }}
                      >
                        {effective}
                      </td>
                      <td className="text-right">
                        {ovr !== undefined ? (
                          <Button
                            variant="ghost"
                            onClick={() => reset(f)}
                          >
                            Reset
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {error ? (
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--danger)" }}
          >
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="primary"
            onClick={save}
            loading={saving}
            disabled={!dirty || saving}
          >
            Save weights
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SeriesChart({
  points,
  max,
}: {
  points: { date: string; calls: number; estimatedCostUsd: number }[];
  max: number;
}) {
  return (
    <div className="flex items-end gap-2 h-32">
      {points.map((p) => {
        const heightPct = Math.max(2, (p.calls / max) * 100);
        return (
          <div
            key={p.date}
            className="flex-1 flex flex-col items-center gap-1 group"
            title={`${p.date} · ${p.calls} calls · ${formatUsd(p.estimatedCostUsd)}`}
          >
            <div
              className="w-full rounded-sm transition-colors"
              style={{
                height: `${heightPct}%`,
                background:
                  "color-mix(in oklab, var(--accent) 70%, transparent)",
              }}
            />
            <span className="text-[10px] text-fg-subtle truncate w-full text-center">
              {p.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
