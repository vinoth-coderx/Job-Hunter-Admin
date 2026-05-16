import { api } from "./api";
import type { AiKey, AiProvider } from "./types";

export interface AiKeyCreatePayload {
  provider: AiProvider;
  label: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  priority: number;
  weight: number;
  tier: "free" | "paid";
  dailyLimit: number;
  rpmLimit: number;
  maxTokens?: number;
  temperature?: number;
  allowedFeatures: string[];
  notes?: string;
  isActive: boolean;
}

export type AiKeyUpdatePayload = Partial<AiKeyCreatePayload> & {
  /** Leave undefined to keep the existing encrypted key. */
  apiKey?: string;
};

export const aiApi = {
  list: () => api.get<{ keys: AiKey[] }>("/admin/ai/keys"),
  create: (p: AiKeyCreatePayload) => api.post<AiKey>("/admin/ai/keys", p),
  update: (id: string, p: AiKeyUpdatePayload) =>
    api.patch<AiKey>(`/admin/ai/keys/${encodeURIComponent(id)}`, p),
  toggle: (id: string, isActive: boolean) =>
    api.patch<AiKey>(`/admin/ai/keys/${encodeURIComponent(id)}/toggle`, {
      isActive,
    }),
  remove: (id: string) =>
    api.delete<{ ok: true }>(`/admin/ai/keys/${encodeURIComponent(id)}`),
  test: (id: string) =>
    api.post<{ ok: boolean; latencyMs?: number; detail?: string }>(
      `/admin/ai/keys/${encodeURIComponent(id)}/test`,
    ),
};

export const PROVIDER_META: Record<
  AiProvider,
  { label: string; defaultModel: string; allModels: string[]; tone: string }
> = {
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    allModels: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
    tone: "var(--accent)",
  },
  claude: {
    label: "Anthropic Claude",
    defaultModel: "claude-sonnet-4-6",
    allModels: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"],
    tone: "var(--warn)",
  },
  groq: {
    label: "Groq · Llama",
    defaultModel: "llama-3.1-8b-instant",
    allModels: [
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
    ],
    tone: "var(--success)",
  },
};

// ─── AI usage analytics (admin dashboard) ────────────────────────────

export type AiUsageProvider = "gemini" | "claude" | "groq";

export interface AiAnalyticsTotals {
  totalCalls: number;
  successCalls: number;
  cacheHits: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
}

export interface AiFeatureRow {
  feature: string;
  calls: number;
  cacheHits: number;
  totalTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
}

export interface AiProviderRow {
  provider: AiUsageProvider;
  calls: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiSeriesPoint {
  date: string;
  calls: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiTopUserRow {
  userId: string;
  calls: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiFeedbackRow {
  feature: string;
  thumbsUp: number;
  thumbsDown: number;
  total: number;
  /** Net satisfaction in [-1, 1]; sort ascending to surface worst features first. */
  netScore: number;
}

export interface AiAnalyticsResponse {
  range: { from: string | null; to: string | null };
  totals: AiAnalyticsTotals;
  features: AiFeatureRow[];
  providers: AiProviderRow[];
  series: AiSeriesPoint[];
  topUsers: AiTopUserRow[];
  feedback: AiFeedbackRow[];
  creditWeights?: {
    defaults: Record<string, number>;
    overrides?: Record<string, number>;
  };
}

export const aiCreditWeightsApi = {
  /** Replace the entire overrides map. Pass {} to revert all to defaults. */
  put: (overrides: Record<string, number>) =>
    api.put<{
      success: boolean;
      data: { defaults: Record<string, number>; overrides: Record<string, number> };
    }>(`/admin/ai/credit-weights`, { overrides }),
};

export const aiAnalyticsApi = {
  overview: (params: { from?: string; to?: string; days?: number; topUsers?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    if (params.days) search.set("days", String(params.days));
    if (params.topUsers) search.set("topUsers", String(params.topUsers));
    const qs = search.toString();
    return api.get<AiAnalyticsResponse>(
      `/admin/ai/analytics${qs ? `?${qs}` : ""}`,
    );
  },
  costForecast: (windowDays = 14) =>
    api.get<{ data: AiCostForecast }>(
      `/admin/ai/cost-forecast?windowDays=${windowDays}`,
    ),
  feedbackSamples: (params: {
    feature: string;
    rating?: "down" | "up" | "all";
    limit?: number;
    from?: string;
    to?: string;
  }) => {
    const search = new URLSearchParams({ feature: params.feature });
    if (params.rating) search.set("rating", params.rating);
    if (params.limit) search.set("limit", String(params.limit));
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
    return api.get<{
      data: {
        feature: string;
        rating: "down" | "up" | "all";
        samples: AiFeedbackSample[];
      };
    }>(`/admin/ai/feedback/samples?${search.toString()}`);
  },
};

export interface AiCostForecast {
  windowDays: number;
  recent: { date: string; costUsd: number; calls: number; tokens: number }[];
  trailingDailyAvgUsd: number;
  projection7dUsd: number;
  projection30dUsd: number;
  highestDay: { date: string; costUsd: number; calls: number; tokens: number } | null;
  todayUsd: number;
}

export interface AiFeedbackSample {
  id: string;
  rating: -1 | 0 | 1;
  note: string;
  refId: string;
  userId: string;
  createdAt: string;
}

export const FEATURES = [
  "profileMatch",
  "summary",
  "autoApplyCoverLetter",
  "skillExtract",
  "mockInterview",
  "embeddings",
];
