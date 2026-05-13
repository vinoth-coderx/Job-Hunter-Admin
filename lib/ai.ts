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
};

export const FEATURES = [
  "profileMatch",
  "summary",
  "autoApplyCoverLetter",
  "skillExtract",
  "mockInterview",
  "embeddings",
];
