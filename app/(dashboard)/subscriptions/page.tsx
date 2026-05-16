"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DistributionBar } from "@/components/ui/distribution-bar";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/icons";
import {
  subscriptionsApi,
  TIER_ORDER,
  TIER_META,
  formatInr,
} from "@/lib/subscriptions";
import { ApiError, isMissingBackend } from "@/lib/api";
import type {
  SubscriptionOverview,
  SubscriptionPlan,
  SubscriptionPlanInput,
  SubscriptionTier,
} from "@/lib/types";
import { PlanEditorModal } from "@/components/subscriptions/plan-editor-modal";

const KNOWN_TIER_META = TIER_META as Record<
  string,
  { label: string; priceInr: number; durationDays: number; tone: string }
>;

const fallbackTone = "var(--accent)";

const toneFor = (tier: string): string =>
  KNOWN_TIER_META[tier]?.tone ?? fallbackTone;

const durationLabel = (days: number): string => {
  if (days >= 36500) return "forever";
  if (days >= 365) return `${Math.round(days / 365)} year${days >= 730 ? "s" : ""}`;
  if (days >= 30) return `${days} days`;
  return `${days} day${days === 1 ? "" : "s"}`;
};

export default function SubscriptionsPage() {
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [toDelete, setToDelete] = useState<SubscriptionPlan | null>(null);
  const [togglingTier, setTogglingTier] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, pl] = await Promise.all([
        subscriptionsApi.overview(),
        subscriptionsApi.listPlans(),
      ]);
      setOverview(ov);
      setPlans(pl.plans);
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
    value: overview?.byTier[t] ?? 0,
    tone: TIER_META[t].tone,
    hint:
      t !== "free" ? (
        <span className="font-mono">{formatInr(TIER_META[t].priceInr)}</span>
      ) : null,
  }));

  const handleCreate = () => {
    setEditingPlan(null);
    setEditorOpen(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditorOpen(true);
  };

  const handleSubmitEditor = async (
    payload: { tier?: string } & SubscriptionPlanInput,
  ) => {
    if (editingPlan) {
      const { tier: _ignored, ...patch } = payload;
      void _ignored;
      await subscriptionsApi.updatePlan(editingPlan.tier, patch);
    } else if (payload.tier) {
      await subscriptionsApi.createPlan(
        payload as { tier: string } & SubscriptionPlanInput,
      );
    }
    await load();
  };

  const handleToggle = async (plan: SubscriptionPlan) => {
    setTogglingTier(plan.tier);
    try {
      await subscriptionsApi.togglePlan(plan.tier, !plan.isActive);
      setPlans(
        (curr) =>
          curr?.map((p) =>
            p.tier === plan.tier ? { ...p, isActive: !plan.isActive } : p,
          ) ?? curr,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setTogglingTier(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await subscriptionsApi.deletePlan(toDelete.tier);
    setToDelete(null);
    await load();
  };

  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Subscriptions"
        description="Manage the plan catalog, view tier breakdown, revenue and expiring trials."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leading={<Icon.refresh width={14} height={14} />}
              onClick={load}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              leading={<Icon.plus width={14} height={14} />}
              onClick={handleCreate}
              disabled={missingBackend}
            >
              Add plan
            </Button>
          </div>
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
                /admin/subscriptions/*
              </code>{" "}
              returned 404. Deploy the backend with the SubscriptionPlan
              routes to enable the catalog editor.
            </p>
          </div>
        </div>
      ) : null}

      {error && !missingBackend && !overview ? (
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
              loading={loading && !overview}
              value={overview?.total.toLocaleString() ?? "—"}
              hint="all tiers"
              icon={<Icon.users width={15} height={15} />}
            />
            <StatCard
              label="Active subscriptions"
              loading={loading && !overview}
              value={overview?.activeSubscriptions.toLocaleString() ?? "—"}
              hint="paid + within term"
              icon={<Icon.creditCard width={15} height={15} />}
            />
            <StatCard
              label="Revenue · this month"
              loading={loading && !overview}
              value={overview ? formatInr(overview.revenueInr.thisMonth) : "—"}
              hint={
                overview ? `today ${formatInr(overview.revenueInr.today)}` : "—"
              }
              icon={<Icon.spark width={15} height={15} />}
            />
            <StatCard
              label="Expiring in 7 days"
              loading={loading && !overview}
              value={overview?.expiringIn7Days.toLocaleString() ?? "—"}
              hint="renewal window"
              icon={<Icon.clock width={15} height={15} />}
            />
          </section>

          <section className="mt-8">
            <Card>
              <CardHeader
                title="Tier distribution"
                description="Stacked share across the four canonical plans."
                action={
                  <Badge tone="muted" variant="soft" className="font-mono">
                    {overview?.total.toLocaleString() ?? "—"} total
                  </Badge>
                }
              />
              <DistributionBar
                segments={segments}
                total={overview?.total ?? 0}
                label="By tier"
              />
            </Card>
          </section>

          <section className="mt-4">
            <Card>
              <CardHeader
                title="Plan catalog"
                description="Editable. Toggle active, edit price/features, or add new tiers."
                action={
                  <Badge tone="muted" variant="soft" className="font-mono">
                    {plans?.length ?? 0} plans
                  </Badge>
                }
              />

              {!plans && loading ? (
                <div className="text-[12.5px] text-fg-subtle">Loading…</div>
              ) : plans && plans.length === 0 ? (
                <EmptyState
                  tone="neutral"
                  icon={<Icon.creditCard width={18} height={18} />}
                  title="No plans yet"
                  description="Click Add plan to create your first one."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {plans?.map((plan) => {
                    const subscriberCount =
                      overview?.byTier[plan.tier as SubscriptionTier] ?? null;
                    const isFree = plan.tier === "free";
                    const toggling = togglingTier === plan.tier;
                    return (
                      <div
                        key={plan.tier}
                        className="surface p-4 reveal flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ background: toneFor(plan.tier) }}
                                aria-hidden
                              />
                              <div className="text-[13.5px] font-semibold text-fg truncate">
                                {plan.name}
                              </div>
                            </div>
                            <div className="mt-0.5 text-[11px] font-mono text-fg-subtle truncate">
                              {plan.tier} · {durationLabel(plan.durationDays)}
                            </div>
                          </div>
                          <Badge
                            tone={plan.isActive ? "success" : "muted"}
                            variant="soft"
                          >
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        {plan.badge ? (
                          <div className="text-[11px] font-medium text-warn">
                            {plan.badge}
                          </div>
                        ) : null}

                        <div className="text-[22px] font-semibold tracking-tight tabular-nums">
                          {plan.priceInr === 0 ? "Free" : formatInr(plan.priceInr)}
                        </div>

                        {plan.features.length > 0 ? (
                          <ul className="space-y-1 text-[12px] text-fg-muted">
                            {plan.features.slice(0, 4).map((f, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 leading-snug"
                              >
                                <span className="text-success mt-0.5 shrink-0">
                                  <Icon.check width={11} height={11} />
                                </span>
                                <span className="truncate">{f}</span>
                              </li>
                            ))}
                            {plan.features.length > 4 ? (
                              <li className="text-[11px] text-fg-subtle pl-4">
                                +{plan.features.length - 4} more
                              </li>
                            ) : null}
                          </ul>
                        ) : null}

                        <div className="flex items-baseline justify-between text-[11.5px] text-fg-muted border-t border-border pt-2">
                          <span>subscribers</span>
                          <span className="font-mono text-fg tabular-nums">
                            {subscriberCount?.toLocaleString() ?? "—"}
                          </span>
                        </div>
                        {plan.coinCost != null ? (
                          <div className="flex items-baseline justify-between text-[11.5px] text-fg-muted -mt-2">
                            <span>coin cost</span>
                            <span className="font-mono text-fg tabular-nums">
                              {plan.coinCost.toLocaleString()}
                            </span>
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Toggle
                            checked={plan.isActive}
                            disabled={isFree || toggling}
                            onChange={() => handleToggle(plan)}
                            label={
                              <span className="text-[12px]">
                                {plan.isActive ? "Live" : "Hidden"}
                              </span>
                            }
                          />
                          <div className="flex gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              leading={<Icon.pencil width={12} height={12} />}
                              onClick={() => handleEdit(plan)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isFree}
                              onClick={() => setToDelete(plan)}
                              aria-label={`Delete ${plan.name}`}
                            >
                              <Icon.trash width={12} height={12} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>
        </>
      )}

      <PlanEditorModal
        open={editorOpen}
        plan={editingPlan}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSubmitEditor}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title={`Delete "${toDelete?.name ?? ""}" plan?`}
        description="If any active subscription references this tier the server will reject the delete and you can deactivate instead."
        confirmLabel="Delete"
      />
    </>
  );
}
