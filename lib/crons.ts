import { api } from "./api";
import type { CronOverview } from "./types";

// Matches OPERATIONS.md §13:
//   GET   /admin/crons
//   PATCH /admin/crons/enabled        { enabled: boolean }
//   POST  /admin/crons/:name/run

export const cronsApi = {
  list: () => api.get<CronOverview>("/admin/crons"),
  setMaster: (enabled: boolean) =>
    api.patch<{ enabled: boolean }>("/admin/crons/enabled", { enabled }),
  setSchedule: (name: string, schedule: string) =>
    api.patch<{ name: string; schedule: string; nextRunAt?: string }>(
      `/admin/crons/${encodeURIComponent(name)}/schedule`,
      { schedule },
    ),
  runNow: (name: string) =>
    api.post<{ ok: true; startedAt: string }>(
      `/admin/crons/${encodeURIComponent(name)}/run`,
    ),
};

// Friendly metadata for each cron the backend ships today, sourced from
// OPERATIONS.md §12. Used to enrich the bare API response with human copy
// without hardcoding values the backend already owns.
export const CRON_META: Record<
  string,
  { description: string; tone: "neutral" | "warn" | "accent" }
> = {
  jobScraper: {
    description:
      "Pulls jobs from Adzuna, SerpAPI, JSearch, TheirStack, Arbeitnow.",
    tone: "accent",
  },
  subscriptionChecker: {
    description: "Expires lapsed subscriptions at 00:00 IST and downgrades to free.",
    tone: "neutral",
  },
  appliedJobsCleanup: {
    description: "Deletes AppliedJob rows older than 90 days at 02:00 IST.",
    tone: "neutral",
  },
  alertChecker: {
    description:
      "Matches active Alerts → push + email + WhatsApp. Every 15 min.",
    tone: "accent",
  },
  autoApply: {
    description: "Runs AI auto-apply for eligible users. Every 15 min.",
    tone: "warn",
  },
};
