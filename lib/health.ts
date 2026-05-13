import { api, API_BASE_URL, ApiError } from "./api";
import type { AdminHealth, DeepHealth } from "./types";

// /health/deep returns 200 when healthy and 503 when down — both responses
// carry the same JSON shape. The default `api.get` throws on non-2xx, so we
// fetch raw here and let the caller inspect `body.status`.
export async function fetchDeepHealth(
  signal?: AbortSignal,
): Promise<DeepHealth> {
  const res = await fetch(`${API_BASE_URL}/health/deep`, {
    cache: "no-store",
    signal,
  });
  const body = (await res.json().catch(() => null)) as DeepHealth | null;
  if (!body || typeof body !== "object" || !("status" in body)) {
    throw new ApiError(
      `Unexpected /health/deep response (${res.status})`,
      res.status,
      body,
    );
  }
  return body;
}

// /admin/health requires admin auth and exposes runtime configuration
// (NODE_ENV, PORT, CLIENT_URL) that the public /health/deep deliberately
// withholds.
export async function fetchAdminHealth(
  signal?: AbortSignal,
): Promise<AdminHealth> {
  return api.get<AdminHealth>("/admin/health", { signal });
}
