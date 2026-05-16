import { api } from "./api";
import type {
  JobSourceCreateInput,
  JobSourceStat,
  GenericJobSourceConfig,
} from "./types";

export const jobsApi = {
  sources: () => api.get<{ sources: JobSourceStat[] }>("/admin/jobs/sources"),
  run: (sources?: string[]) =>
    api.post<{ startedAt: string; pipeline: string }>(
      "/admin/jobs/sources/run",
      sources ? { sources } : undefined,
    ),
  toggle: (source: string, enabled: boolean) =>
    api.patch<{ source: string; enabled: boolean }>(
      `/admin/jobs/sources/${encodeURIComponent(source)}/toggle`,
      { enabled },
    ),
  create: (input: JobSourceCreateInput) =>
    api.post<{ source: JobSourceStat }>("/admin/jobs/sources", input),
  update: (
    source: string,
    patch: Partial<{
      label: string;
      category: string;
      pricing: "Free" | "Freemium" | "Paid";
      enabled: boolean;
      queries: string[];
      locations: string[];
      notes: string;
      generic: Partial<GenericJobSourceConfig>;
    }>,
  ) =>
    api.patch<{ source: JobSourceStat }>(
      `/admin/jobs/sources/${encodeURIComponent(source)}`,
      patch,
    ),
  remove: (source: string) =>
    api.delete<{ deleted: string }>(
      `/admin/jobs/sources/${encodeURIComponent(source)}`,
    ),
};

// Friendly metadata for every scraper the backend supports today, sourced
// from OPERATIONS.md §11. Used to annotate the bare API response with
// pricing/free-tier context.
export const SOURCE_META: Record<
  string,
  { label: string; free: string; notes: string }
> = {
  adzuna: {
    label: "Adzuna",
    free: "250 / month",
    notes: "Country: in (India). 2 keys (app_id + app_key).",
  },
  serpapi: {
    label: "SerpAPI · Google Jobs",
    free: "100 / month",
    notes: "Weekly window by default.",
  },
  rapidapi: {
    label: "RapidAPI · JSearch",
    free: "200 / month",
    notes: "Subscribe to JSearch on RapidAPI.",
  },
  arbeitnow: {
    label: "Arbeitnow",
    free: "Unlimited",
    notes: "No key required. Global feed.",
  },
  puppeteer: {
    label: "Puppeteer fallback",
    free: "Local",
    notes: "Off by default. Indeed/LinkedIn scrape.",
  },
};
