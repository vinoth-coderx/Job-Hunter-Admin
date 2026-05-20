import { getAccessToken } from "./auth";
import { getRuntimeMode } from "./runtime-mode";

// The backend lives in the parallel `job_hunter_backend` project. Configure
// the base URL via NEXT_PUBLIC_API_BASE_URL (e.g. http://localhost:4000/api/v1
// or the Render production URL). All admin endpoints sit under /admin/*.
//
// Why 4000 by default? job_hunter_backend/.env sets PORT=4000 because macOS
// 12+ hijacks :5000 for AirPlay Receiver — the historical default from
// OPERATIONS.md collides.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Override base URL if calling a non-/api/v1 endpoint. */
  baseUrl?: string;
  /** Pass false to skip the Authorization header. */
  auth?: boolean;
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body,
    headers,
    baseUrl = API_BASE_URL,
    auth = true,
    ...rest
  } = options;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Content-Type") && body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }
  // Inject the active runtime mode so the backend scopes the request
  // to the matching Mongo. Operators pick the mode on the login screen
  // (`components/auth/login-form.tsx`); localStorage persists across
  // refreshes and the dashboard topbar surfaces a read-only badge.
  if (!finalHeaders.has("X-Runtime-Mode")) {
    finalHeaders.set("X-Runtime-Mode", getRuntimeMode());
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    // Browser-level fetch failures (ERR_CONNECTION_REFUSED, CORS preflight
    // rejection, DNS failure, offline) all surface as TypeError. Wrap them as
    // ApiError(status=0) so the UI's isMissingBackend path catches them
    // alongside 404s — same calm "backend not reachable" banner instead of
    // a red "Failed to fetch" panic.
    if ((err as { name?: string }).name === "AbortError") throw err;
    const message = (err as Error).message || "Network error";
    throw new ApiError(`Can't reach backend: ${message}`, 0, undefined);
  }

  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : null) ?? `${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, opts?: ApiRequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: ApiRequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: ApiRequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

// Convenience checker: backend admin routes don't exist yet (OPERATIONS.md
// section 18). UI code uses this to render a "Not wired" banner gracefully
// instead of crashing on every 404.
export function isMissingBackend(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 0);
}
