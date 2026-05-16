import { api } from "./api";
import type { AdminUser, Role, UserStats } from "./types";

export interface UserListParams {
  q?: string;
  role?: Role | "all";
  status?: "all" | "banned" | "verified" | "unverified";
  page?: number;
  perPage?: number;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  perPage: number;
}

export interface UserUpdatePayload {
  activeRole?: Role;
  isEmailVerified?: boolean;
  fullName?: string;
}

function toQuery(params: UserListParams): string {
  const u = new URLSearchParams();
  if (params.q) u.set("q", params.q);
  if (params.role && params.role !== "all") u.set("role", params.role);
  if (params.status && params.status !== "all") u.set("status", params.status);
  if (params.page) u.set("page", String(params.page));
  if (params.perPage) u.set("perPage", String(params.perPage));
  const q = u.toString();
  return q ? `?${q}` : "";
}

export interface UserTrustPayload {
  sessions: Array<{
    _id: string;
    platform?: string;
    ip?: string;
    userAgent?: string;
    geo?: { country?: string; region?: string; city?: string };
    lastActivityAt?: string;
    trusted?: boolean;
  }>;
  sessionCount: number;
  recentEvents: Array<{
    _id: string;
    type: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    ip?: string;
    createdAt: string;
    acknowledged?: boolean;
  }>;
}

export const usersApi = {
  list: (params: UserListParams = {}) =>
    api.get<UserListResponse>(`/admin/users${toQuery(params)}`),
  stats: () => api.get<UserStats>("/admin/users/stats"),
  get: (id: string) =>
    api.get<AdminUser>(`/admin/users/${encodeURIComponent(id)}`),
  trust: (id: string) =>
    api.get<UserTrustPayload>(`/admin/users/${encodeURIComponent(id)}/trust`),
  update: (id: string, body: UserUpdatePayload) =>
    api.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, body),
  ban: (id: string, reason?: string) =>
    api.post<AdminUser>(`/admin/users/${encodeURIComponent(id)}/ban`, {
      reason,
    }),
  unban: (id: string) =>
    api.post<AdminUser>(`/admin/users/${encodeURIComponent(id)}/unban`),
};
