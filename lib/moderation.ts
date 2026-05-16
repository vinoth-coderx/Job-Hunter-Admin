import { api } from "./api";

export interface ModerationJob {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  postedAt: string;
  createdAt: string;
  moderation: {
    status: "pending" | "auto_approved" | "queued" | "approved" | "rejected";
    riskScore?: number;
    flags: string[];
    duplicateOf?: string;
    reviewNote?: string;
    reviewedAt?: string;
  };
  hirerProfile?: {
    _id: string;
    companyName: string;
    trustScore?: number;
    verification?: { isVerified: boolean };
  };
  postedBy?: { _id: string; email: string; profile?: { fullName?: string } };
}

export interface ListEnvelope<T> {
  items: T[];
  total: number;
}

export const moderationApi = {
  listQueue: (status: string = "queued", limit = 50, skip = 0) =>
    api.get<{ success: boolean; data: ListEnvelope<ModerationJob> }>(
      `/admin/moderation/jobs?status=${encodeURIComponent(status)}&limit=${limit}&skip=${skip}`,
    ),
  decide: (id: string, decision: "approve" | "reject", note?: string) =>
    api.post<{ success: boolean }>(`/admin/moderation/jobs/${id}/decide`, {
      decision,
      note,
    }),
};

export interface AppealItem {
  _id: string;
  riskScore: number;
  decision: "auto_rejected" | "queued" | "auto_approved";
  flags: string[];
  overrideDecision?: "approved" | "rejected";
  appeal: {
    submittedBy: string;
    reason: string;
    submittedAt: string;
    status: "pending" | "accepted" | "rejected";
    adminNote?: string;
    resolvedBy?: string;
    resolvedAt?: string;
  };
  job?: {
    _id: string;
    title: string;
    company?: string;
    status?: string;
  };
  hirer?: { _id: string; email?: string; profile?: { fullName?: string } };
  createdAt: string;
}

export const moderationAppealsApi = {
  list: (status: "pending" | "accepted" | "rejected" = "pending", limit = 50, skip = 0) =>
    api.get<{ success: boolean; data: ListEnvelope<AppealItem> }>(
      `/admin/moderation/appeals?status=${encodeURIComponent(status)}&limit=${limit}&skip=${skip}`,
    ),
  decide: (id: string, decision: "accept" | "reject", adminNote?: string) =>
    api.post<{ success: boolean; data?: { republishedJobId?: string } }>(
      `/admin/moderation/appeals/${id}/decide`,
      { decision, adminNote },
    ),
};

export interface ReportItem {
  _id: string;
  reporter?: { email?: string; profile?: { fullName?: string } };
  subjectType: "job" | "recruiter" | "message" | "company" | "review";
  subjectId: string;
  reason: string;
  description?: string;
  status: "open" | "under_review" | "actioned" | "dismissed";
  action?: string;
  evidenceUrls: string[];
  createdAt: string;
  resolvedAt?: string;
}

export const reportsApi = {
  list: (status = "open") =>
    api.get<{ success: boolean; data: ReportItem[] }>(
      `/admin/reports?status=${encodeURIComponent(status)}`,
    ),
  resolve: (
    id: string,
    action:
      | "job_unpublished"
      | "recruiter_warned"
      | "recruiter_suspended"
      | "recruiter_banned"
      | "company_flagged"
      | "no_action",
    note?: string,
  ) =>
    api.post<{ success: boolean }>(`/admin/reports/${id}/resolve`, {
      action,
      note,
    }),
};

export interface AuditEntry {
  _id: string;
  actorType: "user" | "hirer" | "admin" | "system";
  actorEmail?: string;
  category: string;
  action: string;
  target?: { type: string; id?: string; label?: string };
  ip?: string;
  outcome: "success" | "failure";
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export const auditApi = {
  list: (
    filters: {
      category?: string;
      actorType?: string;
      actionPrefix?: string;
    } = {},
    limit = 100,
    skip = 0,
  ) => {
    const qs = new URLSearchParams();
    if (filters.category) qs.set("category", filters.category);
    if (filters.actorType) qs.set("actorType", filters.actorType);
    if (filters.actionPrefix) qs.set("actionPrefix", filters.actionPrefix);
    qs.set("limit", String(limit));
    qs.set("skip", String(skip));
    return api.get<{ success: boolean; data: ListEnvelope<AuditEntry> }>(
      `/admin/audit-logs?${qs.toString()}`,
    );
  },
};

export interface SecurityEventItem {
  _id: string;
  user?: { _id: string; email: string; profile?: { fullName?: string } };
  type: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  acknowledged: boolean;
  resolved: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export const securityApi = {
  listEvents: (filters: { severity?: string; acknowledged?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (filters.severity) qs.set("severity", filters.severity);
    if (filters.acknowledged !== undefined)
      qs.set("acknowledged", String(filters.acknowledged));
    return api.get<{ success: boolean; data: SecurityEventItem[] }>(
      `/admin/security/events?${qs.toString()}`,
    );
  },
  ack: (id: string, resolve: boolean, note?: string) =>
    api.post<{ success: boolean }>(`/admin/security/events/${id}/ack`, {
      resolve,
      note,
    }),
  bulkAck: (maxSeverity: "info" | "low" | "medium" | "high") =>
    api.post<{ success: boolean; modified: number }>(
      `/admin/security/events/bulk-ack`,
      { maxSeverity },
    ),
};

export interface VerificationItem {
  _id: string;
  hirer?: { email?: string; profile?: { fullName?: string } };
  company?: {
    _id: string;
    companyName: string;
    website?: string;
    verification?: {
      isVerified: boolean;
      levels: Record<string, boolean>;
    };
  };
  channel: "gst" | "domain_email" | "website" | "linkedin" | "identity";
  status: "pending" | "auto_verified" | "approved" | "rejected" | "expired";
  payload: Record<string, unknown>;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export const verificationApi = {
  list: (status = "pending") =>
    api.get<{ success: boolean; data: VerificationItem[] }>(
      `/admin/verifications?status=${encodeURIComponent(status)}`,
    ),
  review: (id: string, decision: "approve" | "reject", note?: string) =>
    api.post<{ success: boolean }>(`/admin/verifications/${id}/review`, {
      decision,
      note,
    }),
};
