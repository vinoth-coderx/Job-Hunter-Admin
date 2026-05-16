"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import {
  resumeTemplatesApi,
  statusToneMap,
} from "@/lib/resume-templates";
import type { ResumeTemplateAdminDetail } from "@/lib/types";

export default function ResumeTemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [detail, setDetail] = useState<ResumeTemplateAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewSide, setPreviewSide] = useState<"live" | "original" | "enhanced">("live");
  const [editingHtml, setEditingHtml] = useState(false);
  const [draftHtml, setDraftHtml] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const [enhancing, setEnhancing] = useState(false);
  const [enhanceChanges, setEnhanceChanges] = useState<string[] | null>(null);
  const [enhanceWarnings, setEnhanceWarnings] = useState<string[]>([]);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resumeTemplatesApi.get(slug);
      setDetail(res);
      setName(res.template.name);
      setDescription(res.template.description);
      setCategory(res.template.category);
      setDraftHtml(res.template.htmlOriginal);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (
    key: string,
    fn: () => Promise<unknown>,
    refresh = true,
  ) => {
    setActionBusy(key);
    setActionError(null);
    try {
      await fn();
      if (refresh) await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setActionError(msg);
    } finally {
      setActionBusy(null);
    }
  };

  const handleEnhance = async () => {
    setEnhancing(true);
    setActionError(null);
    setEnhanceChanges(null);
    setEnhanceWarnings([]);
    try {
      const res = await resumeTemplatesApi.enhance(slug);
      setEnhanceChanges(res.changes);
      setEnhanceWarnings(res.warnings);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setActionError(msg);
    } finally {
      setEnhancing(false);
    }
  };

  const handleSaveDetails = () =>
    runAction("save-details", () =>
      resumeTemplatesApi.update(slug, {
        name: name.trim(),
        description: description.trim(),
        category: category.trim().toLowerCase(),
      }),
    );

  const handleSaveHtml = () =>
    runAction("save-html", async () => {
      await resumeTemplatesApi.update(slug, { htmlOriginal: draftHtml });
      setEditingHtml(false);
    });

  const handleAcceptEnhanced = () =>
    runAction("accept-enhanced", () =>
      resumeTemplatesApi.update(slug, { liveSource: "enhanced" }),
    );

  const handleRevertOriginal = () =>
    runAction("revert-original", () =>
      resumeTemplatesApi.update(slug, { liveSource: "original" }),
    );

  const handlePublish = () =>
    runAction("publish", () => resumeTemplatesApi.publish(slug));

  const handleArchive = () =>
    runAction("archive", () => resumeTemplatesApi.archive(slug));

  const handleDelete = async () => {
    await resumeTemplatesApi.delete(slug);
    router.push("/resume-templates");
  };

  if (loading && !detail) {
    return (
      <>
        <PageHeader title="Loading…" eyebrow="Operate" />
        <div className="text-[12.5px] text-fg-subtle">Fetching template…</div>
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <PageHeader title="Template not found" eyebrow="Operate" />
        <EmptyState
          tone="danger"
          icon={<Icon.warning width={18} height={18} />}
          title="Couldn't load template"
          description={
            <span className="font-mono text-[12px] text-danger">
              {error ?? "Unknown error"}
            </span>
          }
          action={
            <Link href="/resume-templates">
              <Button variant="primary">Back to list</Button>
            </Link>
          }
        />
      </>
    );
  }

  const { template, liveHtml, minPublishScore } = detail;
  const previewHtml =
    previewSide === "live"
      ? liveHtml
      : previewSide === "enhanced"
        ? (template.htmlEnhanced ?? "")
        : template.htmlOriginal;
  const enhancedAvailable = template.htmlEnhanced !== null;
  const passesGate = template.atsScore >= minPublishScore;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/resume-templates" className="hover:text-fg transition-colors">
            ← Resume Templates
          </Link>
        }
        title={template.name}
        description={`${template.slug} · ${template.category}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              leading={<Icon.refresh width={14} height={14} />}
              onClick={load}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={handleEnhance}
              loading={enhancing}
              leading={<Icon.spark width={14} height={14} />}
            >
              {enhancedAvailable ? "Re-run AI enhance" : "Run AI enhance"}
            </Button>
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={!passesGate || actionBusy !== null}
              loading={actionBusy === "publish"}
            >
              Publish
            </Button>
          </div>
        }
      />

      {actionError ? (
        <div className="mb-4 text-[12.5px] text-danger font-mono break-all">
          {actionError}
        </div>
      ) : null}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Preview"
            description={
              previewSide === "live"
                ? `Showing the ${template.liveSource} copy (live to users when published).`
                : `Showing the ${previewSide} copy.`
            }
            action={
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={previewSide === "original" ? "primary" : "ghost"}
                  onClick={() => setPreviewSide("original")}
                >
                  Original
                </Button>
                <Button
                  size="sm"
                  variant={previewSide === "enhanced" ? "primary" : "ghost"}
                  onClick={() => setPreviewSide("enhanced")}
                  disabled={!enhancedAvailable}
                >
                  Enhanced
                </Button>
                <Button
                  size="sm"
                  variant={previewSide === "live" ? "primary" : "ghost"}
                  onClick={() => setPreviewSide("live")}
                >
                  Live
                </Button>
              </div>
            }
          />
          <div className="rounded-md border border-border overflow-hidden bg-white">
            <iframe
              title="Template preview"
              srcDoc={previewHtml}
              sandbox=""
              className="w-full h-[560px] bg-white"
            />
          </div>
          {enhanceChanges && enhanceChanges.length > 0 ? (
            <div className="mt-3 text-[12.5px] text-fg-muted">
              <div className="font-medium text-fg mb-1">
                AI proposed {enhanceChanges.length} change
                {enhanceChanges.length === 1 ? "" : "s"}:
              </div>
              <ul className="space-y-1 list-disc pl-5">
                {enhanceChanges.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {enhanceWarnings.length > 0 ? (
            <div className="mt-3 text-[12px] text-warn">
              {enhanceWarnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Status & ATS"
            description="ATS gate must clear before publishing."
          />
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-fg-muted">Status</span>
              <Badge tone={statusToneMap[template.status]} variant="soft">
                {template.status}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-fg-muted">
                ATS score
                <span className="ml-1 font-mono text-[10px] uppercase">
                  {template.atsScoreSource}
                </span>
              </span>
              <span
                className={`text-[22px] font-semibold tabular-nums ${
                  passesGate ? "text-success" : "text-warn"
                }`}
              >
                {template.atsScore}
                <span className="text-[10.5px] text-fg-subtle ml-0.5">
                  / {minPublishScore} min
                </span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-fg-muted">Live copy</span>
              <span className="font-mono text-[12px]">{template.liveSource}</span>
            </div>

            {enhancedAvailable ? (
              <div className="pt-2 border-t border-border flex gap-2 flex-wrap">
                {template.liveSource === "original" ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleAcceptEnhanced}
                    loading={actionBusy === "accept-enhanced"}
                  >
                    Accept AI copy
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleRevertOriginal}
                    loading={actionBusy === "revert-original"}
                  >
                    Revert to original
                  </Button>
                )}
              </div>
            ) : null}

            {template.atsNotes.length > 0 ? (
              <div className="pt-2 border-t border-border">
                <div className="text-[11.5px] uppercase tracking-widest text-fg-subtle font-medium mb-1.5">
                  Notes
                </div>
                <ul className="space-y-1 text-[12px] text-fg-muted">
                  {template.atsNotes.map((n, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-warn mt-0.5">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader
            title="Metadata"
            description="Display name, description, category."
            action={
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveDetails}
                loading={actionBusy === "save-details"}
              >
                Save
              </Button>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Toggle
              checked={template.isPremium}
              onChange={(v) =>
                runAction("toggle-premium", () =>
                  resumeTemplatesApi.update(slug, { isPremium: v }),
                )
              }
              label="Premium-only"
              description="Hide behind subscription gate."
            />
          </div>
          <div className="mt-3">
            <Textarea
              label="Description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader
            title="Source HTML"
            description="Edits rescore the template. Keep all {{placeholders}} intact."
            action={
              editingHtml ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingHtml(false);
                      setDraftHtml(template.htmlOriginal);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveHtml}
                    loading={actionBusy === "save-html"}
                  >
                    Save HTML
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  leading={<Icon.pencil width={12} height={12} />}
                  onClick={() => setEditingHtml(true)}
                >
                  Edit
                </Button>
              )
            }
          />
          <Textarea
            rows={16}
            mono
            value={editingHtml ? draftHtml : template.htmlOriginal}
            onChange={(e) => setDraftHtml(e.target.value)}
            disabled={!editingHtml}
          />
        </Card>
      </section>

      <section className="mt-4 flex justify-end gap-2">
        {template.status !== "archived" ? (
          <Button
            variant="secondary"
            onClick={handleArchive}
            loading={actionBusy === "archive"}
          >
            Archive
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
          <Icon.trash width={14} height={14} />
          <span className="ml-1">Delete</span>
        </Button>
      </section>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Delete "${template.name}"?`}
        description="This permanently removes the template. Subscriptions and resumes already generated from it are unaffected."
        confirmLabel="Delete"
      />
    </>
  );
}
