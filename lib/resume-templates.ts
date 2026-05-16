import { api } from "./api";
import type {
  ResumeTemplateAdmin,
  ResumeTemplateAdminDetail,
  ResumeTemplateEnhanceResponse,
} from "./types";

export type ResumeTemplateStatus =
  | "draft"
  | "enhanced"
  | "published"
  | "archived";

export interface ResumeTemplateCreatePayload {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  htmlOriginal: string;
  isPremium?: boolean;
  sortOrder?: number;
  previewImageUrl?: string | null;
}

export interface ResumeTemplateUpdatePayload {
  name?: string;
  description?: string;
  category?: string;
  htmlOriginal?: string;
  isPremium?: boolean;
  sortOrder?: number;
  previewImageUrl?: string | null;
  liveSource?: "original" | "enhanced";
}

export const resumeTemplatesApi = {
  list: (status?: ResumeTemplateStatus) =>
    api.get<{ templates: ResumeTemplateAdmin[]; minPublishScore: number }>(
      `/admin/resume-templates${status ? `?status=${status}` : ""}`,
    ),
  get: (slug: string) =>
    api.get<ResumeTemplateAdminDetail>(
      `/admin/resume-templates/${encodeURIComponent(slug)}`,
    ),
  create: (body: ResumeTemplateCreatePayload) =>
    api.post<{ template: ResumeTemplateAdmin; minPublishScore: number }>(
      "/admin/resume-templates",
      body,
    ),
  update: (slug: string, body: ResumeTemplateUpdatePayload) =>
    api.patch<{ template: ResumeTemplateAdmin }>(
      `/admin/resume-templates/${encodeURIComponent(slug)}`,
      body,
    ),
  enhance: (slug: string) =>
    api.post<ResumeTemplateEnhanceResponse>(
      `/admin/resume-templates/${encodeURIComponent(slug)}/enhance`,
    ),
  publish: (slug: string) =>
    api.post<{ template: ResumeTemplateAdmin }>(
      `/admin/resume-templates/${encodeURIComponent(slug)}/publish`,
    ),
  archive: (slug: string) =>
    api.post<{ template: ResumeTemplateAdmin }>(
      `/admin/resume-templates/${encodeURIComponent(slug)}/archive`,
    ),
  delete: (slug: string) =>
    api.delete<{ slug: string }>(
      `/admin/resume-templates/${encodeURIComponent(slug)}`,
    ),
};

export const statusToneMap: Record<
  ResumeTemplateStatus,
  "muted" | "accent" | "success" | "warn"
> = {
  draft: "muted",
  enhanced: "accent",
  published: "success",
  archived: "warn",
};
