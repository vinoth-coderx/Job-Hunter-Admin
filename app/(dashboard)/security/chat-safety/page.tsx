"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { auditApi, AuditEntry, ListEnvelope } from "@/lib/moderation";

/**
 * Admin view of chat messages the safety scanner blocked. Reads
 * straight from AuditLog (`category=security, action=chat:blocked:*`)
 * — no separate model. Useful for spotting recurring scam patterns
 * and tuning the regex matchers in `chatSafety.service.ts` over time.
 */

const severityTone = (
  action: string,
): "danger" | "warn" | "neutral" => {
  if (action.endsWith(":high")) return "danger";
  if (action.endsWith(":medium")) return "warn";
  return "neutral";
};

const severityLabel = (action: string): string => {
  const parts = action.split(":");
  return parts[parts.length - 1] || "low";
};

export default function ChatSafetyPage() {
  const [data, setData] = useState<ListEnvelope<AuditEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.list(
        { category: "security", actionPrefix: "chat:blocked" },
        100,
        0,
      );
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat safety blocks"
        description="Outgoing chat messages our scam-pattern scanner refused to send. Used to spot recurring abuse patterns and tune the matcher rules."
        actions={
          <Button
            variant="secondary"
            leading={<Icon.refresh width={14} height={14} />}
            onClick={load}
            loading={loading}
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card className="p-4 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </Card>
      ) : null}

      {loading && !data ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" rounded="md" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No chat blocks recorded"
          description="When the scanner refuses a high/medium severity message, it lands here. Empty is the desired state."
        />
      ) : (
        <ul className="space-y-3">
          {data.items.map((row) => {
            const flags =
              (row.metadata?.flags as string[] | undefined) ?? [];
            const matched =
              (row.metadata?.matchedTerms as string[] | undefined) ?? [];
            return (
              <li key={row._id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={severityTone(row.action)} variant="soft">
                          {severityLabel(row.action)}
                        </Badge>
                        {flags.slice(0, 4).map((f) => (
                          <Badge
                            key={f}
                            tone="warn"
                            variant="soft"
                            className="text-[11px]"
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-1 text-[12px] text-fg-muted">
                        <span className="font-mono">
                          {row.actorEmail ?? "(unknown)"}
                        </span>{" "}
                        · in conversation{" "}
                        <span className="font-mono">
                          {row.target?.id ?? "—"}
                        </span>{" "}
                        · {formatRelative(row.createdAt)}
                      </div>
                      {matched.length > 0 ? (
                        <div
                          className="mt-3 rounded-md p-2 text-[12px] font-mono leading-relaxed"
                          style={{
                            background: "var(--panel-hover)",
                            color: "var(--fg-muted)",
                          }}
                        >
                          {matched.slice(0, 6).join("  ·  ")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
