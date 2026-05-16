"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { auditApi, AuditEntry } from "@/lib/moderation";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "auth", label: "Auth" },
  { value: "admin", label: "Admin" },
  { value: "hirer", label: "Hirer" },
  { value: "job_moderation", label: "Moderation" },
  { value: "verification", label: "Verification" },
  { value: "security", label: "Security" },
  { value: "data_export", label: "Data export" },
];

export default function AuditPage() {
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.list({ category: category || undefined }, 100, 0);
      setItems(res.data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Append-only ledger of consequential actions across the platform."
      />
      <FilterPills options={CATEGORIES} value={category} onChange={setCategory} />

      {error && (
        <Card>
          <div className="p-4 text-sm text-red-500">{error}</div>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <Card>
          <ul className="divide-y divide-zinc-800">
            {items.map((e) => (
              <li key={e._id} className="flex items-start gap-3 p-3 text-sm">
                <Badge tone={e.outcome === "failure" ? "danger" : "muted"}>
                  {e.actorType}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.action}</span>
                    <Badge tone="neutral">{e.category}</Badge>
                    {e.target?.type && (
                      <span className="text-xs text-zinc-500">
                        → {e.target.type}
                        {e.target.label ? ` (${e.target.label})` : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {e.actorEmail ?? "system"} · {e.ip ?? "—"} ·{" "}
                    {formatRelative(e.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={<Icon.document className="h-8 w-8 text-zinc-500" />}
          title="No audit entries"
          description="Audit entries appear as admins, hirers, and the system take consequential actions."
        />
      )}
    </div>
  );
}
