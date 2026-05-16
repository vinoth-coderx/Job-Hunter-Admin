import { api } from "./api";
import type {
  SubscriptionOverview,
  SubscriptionPlan,
  SubscriptionPlanInput,
  SubscriptionTier,
} from "./types";

export const subscriptionsApi = {
  overview: () =>
    api.get<SubscriptionOverview>("/admin/subscriptions/overview"),
  listPlans: () =>
    api.get<{ plans: SubscriptionPlan[] }>("/admin/subscriptions/plans"),
  createPlan: (body: SubscriptionPlanInput & { tier: string }) =>
    api.post<{ plan: SubscriptionPlan }>("/admin/subscriptions/plans", body),
  updatePlan: (tier: string, body: Partial<SubscriptionPlanInput>) =>
    api.patch<{ plan: SubscriptionPlan }>(
      `/admin/subscriptions/plans/${encodeURIComponent(tier)}`,
      body,
    ),
  togglePlan: (tier: string, isActive: boolean) =>
    api.patch<{ tier: string; isActive: boolean }>(
      `/admin/subscriptions/plans/${encodeURIComponent(tier)}/toggle`,
      { isActive },
    ),
  deletePlan: (tier: string) =>
    api.delete<{ tier: string }>(
      `/admin/subscriptions/plans/${encodeURIComponent(tier)}`,
    ),
};

// Display order + colour for tier breakdown. Source for both the stacked bar
// and the legend underneath.
export const TIER_ORDER: SubscriptionTier[] = [
  "yearly",
  "monthly",
  "weekly",
  "free",
];

export const TIER_META: Record<
  SubscriptionTier,
  { label: string; priceInr: number; durationDays: number; tone: string }
> = {
  free: {
    label: "Free",
    priceInr: 0,
    durationDays: 36500,
    tone: "var(--fg-subtle)",
  },
  weekly: {
    label: "Weekly",
    priceInr: 99,
    durationDays: 7,
    tone: "var(--accent)",
  },
  monthly: {
    label: "Monthly",
    priceInr: 299,
    durationDays: 30,
    tone: "var(--success)",
  },
  yearly: {
    label: "Yearly",
    priceInr: 2499,
    durationDays: 365,
    tone: "var(--warn)",
  },
};

export function formatInr(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
