"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { Icon } from "@/components/icons";
import { ApiError, isMissingBackend } from "@/lib/api";
import {
  resumeTemplatesApi,
  statusToneMap,
  type ResumeTemplateStatus,
} from "@/lib/resume-templates";
import type { ResumeTemplateAdmin } from "@/lib/types";
import { TemplateUploadModal } from "@/components/resume-templates/template-upload-modal";

type Filter = "all" | ResumeTemplateStatus;

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "enhanced", label: "Enhanced" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function ResumeTemplatesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [templates, setTemplates] = useState<ResumeTemplateAdmin[] | null>(null);
  const [minScore, setMinScore] = useState(60);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingBackend, setMissingBackend] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resumeTemplatesApi.list(
        filter === "all" ? undefined : filter,
      );
      setTemplates(res.templates);
      setMinScore(res.minPublishScore);
      setMissingBackend(false);
    } catch (err) {
      if (isMissingBackend(err)) {
        setMissingBackend(true);
      } else {
        const msg =
          err instanceof ApiError
            ? `${err.status} — ${err.message}`
            : (err as Error).message;
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const scoreColor = (score: number, status: string): string => {
    if (status === "draft" || status === "archived") return "text-fg-subtle";
    if (score >= minScore) return "text-success";
    if (score >= minScore - 20) return "text-warn";
    return "text-danger";
  };

  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Resume Templates"
        description={`AI-enhanced HTML templates with an ATS gate (min ${minScore}). Users pick a published template and the system fills it with their profile data.`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leading={<Icon.refresh width={14} height={14} />}
              onClick={load}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              leading={<Icon.plus width={14} height={14} />}
              onClick={() => setUploadOpen(true)}
              disabled={missingBackend}
            >
              Upload template
            </Button>
          </div>
        }
      />

      {missingBackend ? (
        <div className="mb-6 surface p-4 reveal border-[color-mix(in_oklab,var(--warn)_30%,var(--border))] flex items-start gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_oklab,var(--warn)_18%,transparent)] text-warn shrink-0 mt-0.5">
            <Icon.warning width={14} height={14} />
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-fg">
              Backend admin routes not deployed
            </div>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              <code className="font-mono text-fg bg-panel-hover px-1.5 py-0.5 rounded">
                /admin/resume-templates/*
              </code>{" "}
              returned 404.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <FilterPills
          value={filter}
          options={FILTER_OPTIONS}
          onChange={(v) => setFilter(v as Filter)}
        />
      </div>

      {error && !missingBackend && !templates ? (
        <EmptyState
          tone="danger"
          icon={<Icon.warning width={18} height={18} />}
          title="Couldn't load templates"
          description={
            <span className="font-mono text-[12px] text-danger">{error}</span>
          }
          action={
            <Button
              variant="primary"
              onClick={load}
              leading={<Icon.refresh width={14} height={14} />}
            >
              Try again
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader
            title="Template catalog"
            description="Click a template to enhance, preview and publish."
            action={
              <Badge tone="muted" variant="soft" className="font-mono">
                {templates?.length ?? 0} items
              </Badge>
            }
          />
          {!templates && loading ? (
            <div className="text-[12.5px] text-fg-subtle">Loading…</div>
          ) : templates && templates.length === 0 ? (
            <EmptyState
              tone="neutral"
              icon={<Icon.document width={18} height={18} />}
              title="No templates yet"
              description="Click Upload template to add your first HTML resume template."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates?.map((t) => (
                <Link
                  key={t.slug}
                  href={`/resume-templates/${encodeURIComponent(t.slug)}`}
                  className="surface p-4 surface-hover reveal flex flex-col gap-2.5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-fg truncate">
                        {t.name}
                      </div>
                      <div className="mt-0.5 text-[11px] font-mono text-fg-subtle truncate">
                        {t.slug} · {t.category}
                      </div>
                    </div>
                    <Badge tone={statusToneMap[t.status]} variant="soft">
                      {t.status}
                    </Badge>
                  </div>

                  {t.description ? (
                    <p className="text-[12px] text-fg-muted leading-snug line-clamp-2">
                      {t.description}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between mt-1 border-t border-border pt-2">
                    <div className="text-[11px] text-fg-subtle">
                      ATS score
                      {t.atsScoreSource !== "unscored" ? (
                        <span className="ml-1 font-mono text-[10px] uppercase">
                          {t.atsScoreSource}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={`text-[18px] font-semibold tabular-nums ${scoreColor(t.atsScore, t.status)}`}
                    >
                      {t.atsScore}
                      <span className="text-[10.5px] text-fg-subtle ml-0.5">
                        /100
                      </span>
                    </div>
                  </div>
                  {t.isPremium ? (
                    <Badge tone="warn" variant="soft">
                      Premium
                    </Badge>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      <TemplateUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCreated={() => load()}
      />
    </>
  );
}
