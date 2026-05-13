"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { ProbeRow } from "@/components/health/probe-row";
import { Icon } from "@/components/icons";
import { fetchAdminHealth, fetchDeepHealth } from "@/lib/health";
import { API_BASE_URL, ApiError } from "@/lib/api";
import {
  formatNumber,
  formatRelative,
  formatUptime,
  parseBytesMb,
} from "@/lib/format";
import type { AdminHealth, DeepHealth } from "@/lib/types";

const POLL_MS = 10_000;

export default function HealthPage() {
  const [data, setData] = useState<DeepHealth | null>(null);
  const [adminData, setAdminData] = useState<AdminHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  // re-render every second so "x seconds ago" stays fresh
  const [, tick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (showSpinner: boolean) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (showSpinner) setLoading(true);
    try {
      const [body, admin] = await Promise.all([
        fetchDeepHealth(ctrl.signal),
        fetchAdminHealth(ctrl.signal).catch(() => null),
      ]);
      setData(body);
      setAdminData(admin);
      setError(null);
      setFetchedAt(Date.now());
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), POLL_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const healthy = data?.status === "healthy";
  const tone = healthy ? "success" : data ? "danger" : "muted";

  const heapMb = data ? parseBytesMb(data.memory.heapUsed) : 0;
  const heapTotalMb = data ? parseBytesMb(data.memory.heapTotal) : 1;
  const heapPct = Math.min(
    100,
    Math.round((heapMb / Math.max(1, heapTotalMb)) * 100),
  );

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="System Health"
        description="Live probe across Mongo, Redis, jobs cache and the Node runtime — polled every 10 seconds."
        actions={
          <>
            <Badge tone="muted" variant="soft" className="font-mono">
              poll · {POLL_MS / 1000}s
            </Badge>
            <Button
              variant="secondary"
              leading={<Icon.refresh width={14} height={14} />}
              onClick={() => load(true)}
              loading={loading}
            >
              Refresh
            </Button>
          </>
        }
      />

      {error && !data ? (
        <EmptyState
          icon={<Icon.warning width={18} height={18} />}
          tone="danger"
          title="Couldn't reach the backend"
          description={
            <>
              <div className="font-mono text-[12px] text-fg-muted break-all">
                {API_BASE_URL}/health/deep
              </div>
              <div className="mt-2 font-mono text-[12px] text-danger">
                {error}
              </div>
            </>
          }
          action={
            <Button
              variant="primary"
              onClick={() => load(true)}
              leading={<Icon.refresh width={14} height={14} />}
            >
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 reveal-stagger">
            <StatCard
              label="Overall"
              loading={loading && !data}
              value={
                data ? (
                  <span className="inline-flex items-center gap-2">
                    <StatusDot tone={tone} pulse={healthy} size="md" />
                    <span>{data.status}</span>
                  </span>
                ) : (
                  "—"
                )
              }
              hint={
                fetchedAt ? `updated ${formatRelative(new Date(fetchedAt).toISOString())}` : undefined
              }
              icon={<Icon.pulse width={15} height={15} />}
            />
            <StatCard
              label="Environment"
              loading={loading && !data}
              value={
                data ? (
                  <span className="capitalize">{data.environment}</span>
                ) : undefined
              }
              hint={data ? `node ${data.nodeVersion}` : undefined}
              icon={<Icon.monitor width={15} height={15} />}
            />
            <StatCard
              label="Uptime"
              loading={loading && !data}
              value={data ? formatUptime(data.uptimeSeconds) : undefined}
              hint={data ? `pid ${data.pid}` : undefined}
              icon={<Icon.clock width={15} height={15} />}
            />
            <StatCard
              label="Probe latency"
              loading={loading && !data}
              value={
                data ? (
                  <span className="tabular-nums">{data.checkLatencyMs}ms</span>
                ) : undefined
              }
              hint="server-side check round-trip"
              icon={<Icon.spark width={15} height={15} />}
            />
          </section>

          <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Dependency probes"
                description="Backend pings each dependency on every /health/deep call."
                action={
                  <Badge tone={healthy ? "success" : "danger"} variant="dot">
                    {healthy ? "all systems normal" : "investigate"}
                  </Badge>
                }
              />
              <div className="divide-y divide-border">
                <ProbeRow
                  label="MongoDB"
                  check={data?.checks.mongo ?? { status: "down" }}
                  icon={<Icon.briefcase width={14} height={14} />}
                />
                <ProbeRow
                  label="Redis"
                  check={data?.checks.redis ?? { status: "down" }}
                  icon={<Icon.spark width={14} height={14} />}
                />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Memory"
                description="Node heap, RSS and external buffers."
              />
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                    <span className="text-fg-muted">Heap used</span>
                    <span className="font-mono text-fg tabular-nums">
                      {data?.memory.heapUsed ?? "—"} / {data?.memory.heapTotal ?? "—"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-panel-hover overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${heapPct}%`,
                        transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="surface p-2.5">
                    <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
                      RSS
                    </div>
                    <div className="font-mono text-[13px] tabular-nums text-fg mt-1">
                      {data?.memory.rss ?? "—"}
                    </div>
                  </div>
                  <div className="surface p-2.5">
                    <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
                      External
                    </div>
                    <div className="font-mono text-[13px] tabular-nums text-fg mt-1">
                      {data?.memory.external ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Runtime configuration"
                description="Bootstrap values loaded from .env at process start — read-only by design (require a restart to change)."
                action={
                  <Badge tone="muted" variant="soft" className="font-mono">
                    .env
                  </Badge>
                }
              />
              {adminData ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      NODE_ENV
                    </div>
                    <div className="mt-1 font-mono text-[15px] text-fg capitalize">
                      {adminData.runtime.nodeEnv}
                    </div>
                  </div>
                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      PORT
                    </div>
                    <div className="mt-1 font-mono text-[15px] text-fg tabular-nums">
                      {adminData.runtime.port}
                    </div>
                  </div>
                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      CLIENT_URL
                    </div>
                    <div className="mt-1 font-mono text-[12.5px] text-fg break-all">
                      {adminData.runtime.clientUrl}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[12.5px] font-mono text-fg-muted">
                  Runtime info unavailable — /admin/health did not respond.
                </div>
              )}
            </Card>
          </section>

          <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Bootstrap secrets"
                description="Values that must live in .env because they gate the boot sequence (Mongo connect, JWT mint, AES decrypt). Read-only, masked — confirm 'set' without leaking the value."
                action={
                  <Badge tone="muted" variant="soft" className="font-mono">
                    .env · masked
                  </Badge>
                }
              />
              {adminData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      MongoDB
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-fg break-all">
                      {adminData.bootstrap.mongo.hostMasked ?? "—"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                      <StatusDot
                        tone={adminData.bootstrap.mongo.set ? "success" : "danger"}
                        size="sm"
                      />
                      <span className="text-fg-muted">
                        {adminData.bootstrap.mongo.set ? "set" : "missing"}
                        {adminData.bootstrap.mongo.prodSet
                          ? " · prod uri set"
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      Redis
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-fg break-all">
                      {adminData.bootstrap.redis.host}:
                      {adminData.bootstrap.redis.port}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                      <StatusDot
                        tone={
                          adminData.bootstrap.redis.passwordSet
                            ? "success"
                            : "warn"
                        }
                        size="sm"
                      />
                      <span className="text-fg-muted">
                        user{" "}
                        {adminData.bootstrap.redis.usernameSet ? "✓" : "—"} · pass{" "}
                        {adminData.bootstrap.redis.passwordSet ? "✓" : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      JWT secrets
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-fg tabular-nums">
                      access {adminData.bootstrap.jwt.secretLength}ch · refresh{" "}
                      {adminData.bootstrap.jwt.refreshLength}ch
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                      <StatusDot
                        tone={
                          adminData.bootstrap.jwt.secretSet &&
                          adminData.bootstrap.jwt.refreshSet
                            ? "success"
                            : "danger"
                        }
                        size="sm"
                      />
                      <span className="text-fg-muted">
                        {adminData.bootstrap.jwt.secretSet &&
                        adminData.bootstrap.jwt.refreshSet
                          ? "both set"
                          : "incomplete"}
                      </span>
                    </div>
                  </div>

                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      Crypto master key
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-fg tabular-nums">
                      {adminData.bootstrap.cryptoMasterKey.set
                        ? `${adminData.bootstrap.cryptoMasterKey.length} hex chars`
                        : "—"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                      <StatusDot
                        tone={
                          adminData.bootstrap.cryptoMasterKey.set
                            ? "success"
                            : "warn"
                        }
                        size="sm"
                      />
                      <span className="text-fg-muted">
                        {adminData.bootstrap.cryptoMasterKey.set
                          ? "set · AES-256-GCM"
                          : "missing (env-fallback only)"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[12.5px] font-mono text-fg-muted">
                  Bootstrap info unavailable — /admin/health did not respond.
                </div>
              )}
            </Card>
          </section>

          <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Jobs index"
                description="Counts surfaced from the Job collection for quick freshness sanity."
              />
              {data?.jobStats.error ? (
                <div className="text-[12.5px] font-mono text-danger">
                  {data.jobStats.error}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      Total jobs
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                      {formatNumber(data?.jobStats.total)}
                    </div>
                  </div>
                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      Fresh (10d window)
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                      {formatNumber(data?.jobStats.freshLast10Days)}
                    </div>
                  </div>
                  <div className="surface p-4">
                    <div className="text-[11px] uppercase tracking-widest text-fg-subtle font-medium">
                      Last fetched
                    </div>
                    <div className="mt-1 text-[15px] font-medium text-fg">
                      {formatRelative(data?.jobStats.lastFetchedAt)}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </section>

          {error && data ? (
            <div className="mt-6 surface p-3 border-[color-mix(in_oklab,var(--warn)_30%,var(--border))] flex items-start gap-2.5 reveal">
              <Icon.warning
                width={14}
                height={14}
                className="text-warn mt-0.5"
              />
              <div className="text-[12.5px] text-fg-muted">
                Last refresh failed —{" "}
                <span className="font-mono text-warn">{error}</span>.
                Showing the previous successful response.
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
