import { api } from "./api";
import type { AppConfigCategory, AppConfigEntry } from "./types";

// Matches the (planned) admin endpoints described in OPERATIONS.md §13/§18:
//   GET    /admin/config
//   PUT    /admin/config           — upsert
//   DELETE /admin/config/:key
//   GET    /admin/config/:key/probe

export interface ConfigListResponse {
  entries: AppConfigEntry[];
}

export interface ConfigUpsertPayload {
  key: string;
  category: AppConfigCategory;
  isSecret: boolean;
  /** Omit when editing a secret entry and keeping the existing value. */
  value?: string;
  notes?: string;
}

export interface ConfigProbeResponse {
  ok: boolean;
  latencyMs?: number;
  detail?: string;
}

export const configApi = {
  list: () => api.get<ConfigListResponse>("/admin/config"),
  upsert: (payload: ConfigUpsertPayload) =>
    api.put<AppConfigEntry>("/admin/config", payload),
  remove: (key: string) =>
    api.delete<{ ok: true }>(`/admin/config/${encodeURIComponent(key)}`),
  probe: (key: string) =>
    api.get<ConfigProbeResponse>(
      `/admin/config/${encodeURIComponent(key)}/probe`,
    ),
};

export const CATEGORY_META: Record<
  AppConfigCategory,
  { label: string; description: string }
> = {
  "job-board": {
    label: "Job boards",
    description: "Adzuna, SerpAPI, JSearch (RapidAPI), TheirStack",
  },
  payment: {
    label: "Payments",
    description: "Razorpay live + test, webhook secrets",
  },
  cloudinary: {
    label: "Cloudinary",
    description: "Avatars, resumes, logos, photos, chat attachments",
  },
  email: {
    label: "Email (SMTP)",
    description: "Gmail relay credentials; switch providers without redeploy",
  },
  firebase: {
    label: "Firebase",
    description: "Service account JSON for Auth + FCM verification",
  },
  cron: {
    label: "Crons",
    description: "Master kill-switch — pauses every background job",
  },
  misc: {
    label: "Misc",
    description: "AI provider keys + everything else",
  },
};

export const CATEGORIES: AppConfigCategory[] = [
  "job-board",
  "payment",
  "cloudinary",
  "email",
  "firebase",
  "cron",
  "misc",
];
