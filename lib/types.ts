// Shared API types — kept aligned with job_hunter_backend models and the
// OPERATIONS.md admin spec. Backend endpoints are not yet built (section 18 of
// OPERATIONS.md), so these types are forward-looking but match the contract
// the Flutter admin UI was already targeting.

export type Role = "seeker" | "hirer" | "admin";

export type SubscriptionTier = "free" | "weekly" | "monthly" | "yearly";

export type AppConfigCategory =
  | "job-board"
  | "payment"
  | "cloudinary"
  | "email"
  | "firebase"
  | "cron"
  | "misc";

export interface AppConfigEntry {
  key: string;
  category: AppConfigCategory;
  isSecret: boolean;
  value?: string; // present iff isSecret === false
  hasValue: boolean; // present iff isSecret === true (don't return ciphertext)
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AdminUser {
  _id: string;
  email: string;
  activeRole: Role;
  isEmailVerified: boolean;
  isBanned?: boolean;
  profile: {
    fullName: string;
    avatarUrl?: string;
    phone?: string;
  };
  subscription: {
    tier: SubscriptionTier;
    status: "active" | "expired" | "cancelled";
    endDate?: string;
  };
  createdAt: string;
  lastSeenAt?: string;
}

export interface UserStats {
  totalUsers: number;
  totalSeekers: number;
  totalHirers: number;
  totalAdmins: number;
  totalVerified: number;
  totalBanned: number;
  newToday: number;
  newThisWeek: number;
  activeToday: number;
}

export type AiProvider = "gemini" | "claude";

export interface AiKey {
  _id: string;
  provider: AiProvider;
  label: string;
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
  usageToday: number;
  lastUsedAt?: string;
  createdAt: string;
}

export interface CronJob {
  name: string;
  schedule: string;
  /** Code-side default; empty for manual jobs. Lets the UI offer a "reset". */
  defaultSchedule?: string;
  /** False for jobs with no node-cron expression (jobScraper is manual). */
  editable?: boolean;
  enabled: boolean;
  lastRunAt?: string;
  lastDurationMs?: number;
  lastError?: string;
  nextRunAt?: string;
}

export interface CronOverview {
  masterEnabled: boolean;
  jobs: CronJob[];
}

export type JobSourceType = "builtin" | "generic";
export type JobSourcePricing = "Free" | "Freemium" | "Paid";

export interface GenericJobSourceFieldMap {
  title: string;
  company: string;
  location?: string;
  description?: string;
  url: string;
  externalId: string;
  salary?: string;
  type?: string;
  postedAt?: string;
}

export interface GenericJobSourceConfig {
  endpointUrl: string;
  httpMethod: "GET" | "POST";
  authHeader?: string;
  authValueConfigKey?: string;
  authValuePrefix?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseRootPath: string;
  fieldMap: GenericJobSourceFieldMap;
  pageParam?: string;
  pageCount: number;
  rateLimitMs: number;
}

export interface JobSourceCreateInput {
  source: string;
  label: string;
  category: string;
  pricing: JobSourcePricing;
  enabled?: boolean;
  queries?: string[];
  locations?: string[];
  notes?: string;
  generic: GenericJobSourceConfig;
}

export interface JobSourceStat {
  name: string;
  label?: string;
  category?: string;
  pricing?: JobSourcePricing;
  type?: JobSourceType;
  enabled: boolean;
  /** True when every required AppConfig key is populated. */
  configured?: boolean;
  keyConfigKeys?: string[];
  queries?: string[];
  locations?: string[];
  notes?: string;
  /** Generic-source REST config (only set when type === "generic"). */
  generic?: GenericJobSourceConfig;
  lastRunAt?: string;
  lastJobCount?: number;
  lastError?: string;
  totalJobsAllTime?: number;
}

export interface SubscriptionOverview {
  total: number;
  byTier: Record<SubscriptionTier, number>;
  revenueInr: {
    today: number;
    thisMonth: number;
    allTime: number;
  };
  activeSubscriptions: number;
  expiringIn7Days: number;
}

export type HealthState = "ok" | "warn" | "down" | "unknown";

export interface HealthProbe {
  name: string;
  state: HealthState;
  latencyMs?: number;
  detail?: string;
}

export interface AdminHealth {
  overall: HealthState;
  probes: HealthProbe[];
  generatedAt: string;
}

// Shape returned by GET /api/v1/health/deep — matches
// job_hunter_backend/src/routes/health.routes.ts. This endpoint is public
// (no admin auth) and is the only live wired surface today.
export interface DeepHealthCheck {
  status: "up" | "down" | "degraded";
  latencyMs?: number;
  error?: string;
}

export interface DeepHealthJobStats {
  total?: number;
  freshLast10Days?: number;
  lastFetchedAt?: string | null;
  error?: string;
}

export interface DeepHealthMemory {
  rss: string;
  heapTotal: string;
  heapUsed: string;
  external: string;
}

export interface DeepHealth {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptimeSeconds: number;
  checkLatencyMs: number;
  environment: string;
  nodeVersion: string;
  pid: number;
  checks: { mongo: DeepHealthCheck; redis: DeepHealthCheck };
  jobStats: DeepHealthJobStats;
  memory: DeepHealthMemory;
}

// Shape returned by GET /admin/health — admin-only, includes runtime
// configuration (NODE_ENV, PORT, CLIENT_URL) which is too sensitive to
// expose on the public /health/deep endpoint.
export interface AdminHealthProbe {
  name: string;
  state: "ok" | "warn" | "down" | "unknown";
  latencyMs?: number;
  detail?: string;
}

export interface AdminHealthRuntime {
  nodeEnv: string;
  port: number;
  clientUrl: string;
}

export interface AdminHealthBootstrap {
  mongo: {
    set: boolean;
    hostMasked: string | null;
    prodSet: boolean;
  };
  redis: {
    host: string;
    port: number;
    usernameSet: boolean;
    passwordSet: boolean;
  };
  jwt: {
    secretSet: boolean;
    secretLength: number;
    refreshSet: boolean;
    refreshLength: number;
  };
  cryptoMasterKey: {
    set: boolean;
    length: number;
  };
}

export interface AdminHealth {
  overall: "ok" | "warn" | "down" | "unknown";
  probes: AdminHealthProbe[];
  runtime: AdminHealthRuntime;
  bootstrap: AdminHealthBootstrap;
  generatedAt: string;
}
