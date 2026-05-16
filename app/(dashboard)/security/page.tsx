/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { securityApi, SecurityEventItem } from "@/lib/moderation";

const SEVERITIES = [
  { value: "", label: "All" },
  { value: "info", label: "Info" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const sevTone = (
  s: SecurityEventItem["severity"],
): "muted" | "neutral" | "warn" | "danger" => {
  switch (s) {
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warn";
    case "low":
      return "neutral";
    default:
      return "muted";
  }
};

export default function SecurityPage() {
  const [severity, setSeverity] = useState("");
  const [items, setItems] = useState<SecurityEventItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acking, setAcking] = useState<string | null>(null);
  const [bulkAcking, setBulkAcking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await securityApi.listEvents({
        severity: severity || undefined,
      });
      setItems(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [severity]);

  useEffect(() => {
    load();
  }, [load]);

  const ack = async (id: string, resolve: boolean) => {
    setAcking(id);
    try {
      await securityApi.ack(id, resolve);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setAcking(null);
    }
  };

  const bulkAck = async (max: "info" | "low" | "medium" | "high") => {
    const label =
      max === "low"
        ? "all info + low"
        : max === "medium"
          ? "all info + low + medium"
          : max === "high"
            ? "all except critical"
            : "info only";
    if (!confirm(`Acknowledge ${label} unacknowledged events?`)) return;
    setBulkAcking(true);
    try {
      const res = await securityApi.bulkAck(max);
      alert(`Acknowledged ${res.modified} events.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBulkAcking(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security events"
        description="System-flagged anomalies. New devices, impossible travel, blocked uploads, brute force."
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => bulkAck("low")}
              disabled={bulkAcking}
            >
              Ack info + low
            </Button>
            <Button
              variant="ghost"
              onClick={() => bulkAck("medium")}
              disabled={bulkAcking}
            >
              Ack ≤ medium
            </Button>
          </>
        }
      />
      <FilterPills
        options={SEVERITIES}
        value={severity}
        onChange={setSeverity}
      />

      {error && (
        <Card>
          <div className="p-4 text-sm text-red-500">{error}</div>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <Card>
          <ul className="divide-y divide-zinc-800">
            {items.map((e) => (
              <li key={e._id} className="flex items-start gap-3 p-3 text-sm">
                <Badge tone={sevTone(e.severity)}>{e.severity}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {e.type.replaceAll("_", " ")}
                    </span>
                    {e.acknowledged && <Badge tone="muted">acknowledged</Badge>}
                    {e.resolved && <Badge tone="success">resolved</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {e.user?.email ?? "anon"} · {e.ip ?? "—"} ·{" "}
                    {formatRelative(e.createdAt)}
                  </p>
                </div>
                {!e.acknowledged && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => ack(e._id, false)}
                      disabled={acking === e._id}
                    >
                      Ack
                    </Button>
                    <Button
                      onClick={() => ack(e._id, true)}
                      disabled={acking === e._id}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={<Icon.warning className="h-8 w-8 text-zinc-500" />}
          title="No security events"
          description="All clear. The system surfaces anomalies as they happen."
        />
      )}
    </div>
  );
}
