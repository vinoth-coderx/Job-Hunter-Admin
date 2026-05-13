"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DistributionBar } from "@/components/ui/distribution-bar";
import { Icon } from "@/components/icons";
import {
  subscriptionsApi,
  TIER_ORDER,
  TIER_META,
  formatInr,
} from "@/lib/subscriptions";
import { ApiError, isMissingBackend } from "@/lib/api";
import type { SubscriptionOverview } from "@/lib/types";

export default function SubscriptionsPage() {
  const [data, setData] = useState<SubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await subscriptionsApi.overview();
      setData(res);
      setMissingBackend(false);
    } catch (err) {
      if (isMissingBackend(err)) {
        setMissingBackend(true);
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

  const segments = TIER_ORDER.map((t) => ({
    key: t,
    label: TIER_META[t].label,
    value: data?.byTier[t] ?? 0,
    tone: TIER_META[t].tone,
    hint:
      t !== "free" ? (
        <span className="font-mono">{formatInr(TIER_META[t].priceInr)}</span>
      ) : null,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Subscriptions"
        description="Tier breakdown, revenue and expiring trials. Powered by Razorpay live + test."
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
              Backend admin route not deployed
            </div>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              <code className="font-mono text-fg bg-panel-hover px-1.5 py-0.5 rounded">
                GET /admin/subscriptions/overview
              </code>{" "}
              returned 404. Numbers below render zeroes until then — no mock
              data.
            </p>
          </div>
        </div>
      ) : null}

      {error && !missingBackend && !data ? (
        <EmptyState
          tone="danger"
          icon={<Icon.warning width={18} height={18} />}
          title="Couldn't load subscription overview"
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
              label="Total subscribers"
              loading={loading && !data}
              value={data?.total.toLocaleString() ?? "—"}
              hint="all tiers"
              icon={<Icon.users width={15} height={15} />}
            />
            <StatCard
              label="Active subscriptions"
              loading={loading && !data}
              value={data?.activeSubscriptions.toLocaleString() ?? "—"}
              hint="paid + within term"
              icon={<Icon.creditCard width={15} height={15} />}
            />
            <StatCard
              label="Revenue · this month"
              loading={loading && !data}
              value={data ? formatInr(data.revenueInr.thisMonth) : "—"}
              hint={data ? `today ${formatInr(data.revenueInr.today)}` : "—"}
              icon={<Icon.spark width={15} height={15} />}
            />
            <StatCard
              label="Expiring in 7 days"
              loading={loading && !data}
              value={data?.expiringIn7Days.toLocaleString() ?? "—"}
              hint="renewal window"
              delta={
                data && data.expiringIn7Days > 0
                  ? { value: `${data.expiringIn7Days} renewals`, tone: "neutral" }
                  : undefined
              }
              icon={<Icon.clock width={15} height={15} />}
            />
          </section>

          <section className="mt-8">
            <Card>
              <CardHeader
                title="Tier distribution"
                description="Stacked share across the four plans. Hover any segment for the exact split."
                action={
                  <Badge tone="muted" variant="soft" className="font-mono">
                    {data?.total.toLocaleString() ?? "—"} total
                  </Badge>
                }
              />
              <DistributionBar
                segments={segments}
                total={data?.total ?? 0}
                label="By tier"
              />
            </Card>
          </section>

          <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Plan catalog"
                description="Hardcoded in src/models/Subscription.ts — change there to alter pricing."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TIER_ORDER.map((t) => {
                  const meta = TIER_META[t];
                  const count = data?.byTier[t] ?? 0;
                  return (
                    <div key={t} className="surface p-4 surface-hover reveal">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[13px] font-semibold text-fg">
                            {meta.label}
                          </div>
                          <div className="mt-0.5 text-[11.5px] text-fg-subtle">
                            {meta.durationDays >= 36500
                              ? "forever"
                              : meta.durationDays >= 365
                                ? "365 days"
                                : meta.durationDays >= 30
                                  ? "30 days"
                                  : `${meta.durationDays} days`}
                          </div>
                        </div>
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: meta.tone }}
                          aria-hidden
                        />
                      </div>
                      <div className="mt-3 text-[20px] font-semibold tracking-tight tabular-nums">
                        {meta.priceInr === 0 ? "Free" : formatInr(meta.priceInr)}
                      </div>
                      <div className="mt-3 flex items-baseline justify-between text-[12px]">
                        <span className="text-fg-muted">subscribers</span>
                        <span className="font-mono text-fg tabular-nums">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Revenue rollup"
                description="All amounts in INR."
              />
              <div className="space-y-3">
                <div className="surface p-3.5">
                  <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
                    Today
                  </div>
                  <div className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums">
                    {data ? formatInr(data.revenueInr.today) : "—"}
                  </div>
                </div>
                <div className="surface p-3.5">
                  <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
                    This month
                  </div>
                  <div className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums">
                    {data ? formatInr(data.revenueInr.thisMonth) : "—"}
                  </div>
                </div>
                <div className="surface p-3.5">
                  <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
                    All time
                  </div>
                  <div className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums">
                    {data ? formatInr(data.revenueInr.allTime) : "—"}
                  </div>
                </div>
              </div>
            </Card>
          </section>
        </>
      )}
    </>
  );
}
