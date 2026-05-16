"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { BackendBanner } from "@/components/backend-banner";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { usersApi } from "@/lib/users";
import { subscriptionsApi, formatInr } from "@/lib/subscriptions";
import { aiApi } from "@/lib/ai";
import { isMissingBackend } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { SubscriptionOverview, UserStats } from "@/lib/types";

export default function OverviewPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [subs, setSubs] = useState<SubscriptionOverview | null>(null);
  const [aiUsedToday, setAiUsedToday] = useState<number | null>(null);
  const [aiQuotaTotal, setAiQuotaTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingBackend, setMissingBackend] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let anySuccess = false;
    const settled = await Promise.allSettled([
      usersApi.stats(),
      subscriptionsApi.overview(),
      aiApi.list(),
    ]);

    if (settled[0].status === "fulfilled") {
      setStats(settled[0].value);
      anySuccess = true;
    } else if (!isMissingBackend(settled[0].reason)) {
      anySuccess = true; // backend reachable, just errored
    }

    if (settled[1].status === "fulfilled") {
      setSubs(settled[1].value);
      anySuccess = true;
    } else if (!isMissingBackend(settled[1].reason)) {
      anySuccess = true;
    }

    if (settled[2].status === "fulfilled") {
      const keys = settled[2].value.keys;
      setAiUsedToday(keys.reduce((acc, k) => acc + k.usageToday, 0));
      setAiQuotaTotal(keys.reduce((acc, k) => acc + (k.dailyLimit || 0), 0));
      anySuccess = true;
    } else if (!isMissingBackend(settled[2].reason)) {
      anySuccess = true;
    }

    setMissingBackend(!anySuccess);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="Real-time pulse of users, AI usage, subscriptions and background jobs across the Job Hunter platform."
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
            <Link href="/health">
              <Button
                variant="primary"
                trailing={<Icon.arrowRight width={14} height={14} />}
              >
                Open Health
              </Button>
            </Link>
          </>
        }
      />

      {missingBackend ? <BackendBanner /> : null}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 reveal-stagger">
        <StatCard
          label="Total users"
          loading={loading && !stats}
          value={stats ? stats.totalUsers.toLocaleString() : "—"}
          hint={
            stats
              ? `${stats.newToday.toLocaleString()} new today`
              : "awaiting /admin/users/stats"
          }
          icon={<Icon.users width={15} height={15} />}
        />
        <StatCard
          label="Active today"
          loading={loading && !stats}
          value={stats ? stats.activeToday.toLocaleString() : "—"}
          hint="last 24h"
          icon={<Icon.pulse width={15} height={15} />}
        />
        <StatCard
          label="Paid subscriptions"
          loading={loading && !subs}
          value={subs ? subs.activeSubscriptions.toLocaleString() : "—"}
          hint={
            subs
              ? `${formatInr(subs.revenueInr.thisMonth)} MRR`
              : "weekly + monthly + yearly"
          }
          icon={<Icon.creditCard width={15} height={15} />}
        />
        <StatCard
          label="AI calls today"
          loading={loading && aiUsedToday === null}
          value={
            aiUsedToday !== null ? formatNumber(aiUsedToday) : "—"
          }
          hint={
            aiQuotaTotal && aiQuotaTotal > 0
              ? `of ${aiQuotaTotal.toLocaleString()} daily quota`
              : "of 400/day global cap"
          }
          icon={<Icon.spark width={15} height={15} />}
        />
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-fg">
              Control surfaces
            </h2>
            <p className="text-[13px] text-fg-muted mt-0.5">
              Every operational lever — users, subscriptions, AI keys, config, crons.
            </p>
          </div>
          <Badge tone="muted" variant="soft">
            8 surfaces
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 reveal-stagger">
          <SectionCard
            icon="pulse"
            title="System Health"
            description="Mongo, Redis, jobs index, runtime — polled every 10 seconds against /health/deep."
            href="/health"
            accent="success"
            meta={<Badge tone="success" variant="dot">wired</Badge>}
          />
          <SectionCard
            icon="users"
            title="Users"
            description="Search, edit, ban, promote to admin. Verification + subscription status inline."
            href="/users"
            meta={<><span className="font-mono">/admin/users</span></>}
          />
          <SectionCard
            icon="creditCard"
            title="Subscriptions"
            description="Tier breakdown, MRR, expiring trials. Powered by Razorpay live + test."
            href="/subscriptions"
            accent="accent"
            meta={<><span className="font-mono">/admin/subscriptions/overview</span></>}
          />
          <SectionCard
            icon="briefcase"
            title="Jobs & Sources"
            description="Adzuna, SerpAPI, JSearch, Real-Time Web Search, Arbeitnow — last run + counts + manual fetch."
            href="/jobs"
            meta={<><span className="font-mono">/admin/jobs/sources</span></>}
          />
          <SectionCard
            icon="clock"
            title="Crons"
            description="Master kill-switch + per-cron schedule, last run, manual trigger."
            href="/crons"
            accent="warn"
            meta={<><span className="font-mono">/admin/crons</span></>}
          />
          <SectionCard
            icon="sliders"
            title="App Config"
            description="Rotate Cloudinary, Razorpay, Firebase, SMTP & job-board keys. Encrypted at rest."
            href="/config"
            accent="accent"
            meta={<><span className="font-mono">/admin/config</span></>}
          />
          <SectionCard
            icon="spark"
            title="AI Providers"
            description="Gemini + Claude routing, per-key quotas, priority + weighted rotation."
            href="/ai"
            accent="accent"
            meta={<><span className="font-mono">/admin/ai/keys</span></>}
          />
          <SectionCard
            icon="home"
            title="Overview"
            description="You are here. The 30-second pulse of everything that matters."
            href="/overview"
            meta={<Badge tone="success" variant="dot">live</Badge>}
          />
        </div>
      </section>

      <section className="mt-12">
        <Card>
          <CardHeader
            title="Activity"
            description="A live feed of admin actions, cron runs and webhook deliveries — once /admin/audit is shipped."
            action={
              <Badge tone="muted" variant="soft">
                empty
              </Badge>
            }
          />
          <EmptyState
            icon={<Icon.pulse width={18} height={18} />}
            title="No activity to show yet"
            description="Audit events stream in once the backend admin endpoints are deployed."
            tone="neutral"
          />
        </Card>
      </section>
    </>
  );
}
