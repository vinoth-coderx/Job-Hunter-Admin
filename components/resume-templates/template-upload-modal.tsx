"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ApiError } from "@/lib/api";
import {
  resumeTemplatesApi,
  type ResumeTemplateCreatePayload,
} from "@/lib/resume-templates";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

const initial = {
  slug: "",
  name: "",
  description: "",
  category: "general",
  htmlOriginal: "",
  isPremium: false,
};

export function TemplateUploadModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof initial, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial);
      setErrors({});
      setSubmitError(null);
    }
  }, [open]);

  const set = <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleFile = async (file: File) => {
    if (file.size > 200_000) {
      setErrors((e) => ({ ...e, htmlOriginal: "File too large (max 200KB)" }));
      return;
    }
    const text = await file.text();
    set("htmlOriginal", text);
    setErrors((e) => ({ ...e, htmlOriginal: undefined }));
  };

  const handleSubmit = async () => {
    const errs: typeof errors = {};
    if (!/^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(form.slug.trim().toLowerCase())) {
      errs.slug = "lowercase a-z, 0-9, - only · 3-40 chars";
    }
    if (!form.name.trim()) errs.name = "required";
    if (form.htmlOriginal.trim().length < 100) {
      errs.htmlOriginal = "HTML looks too short (min 100 chars)";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setSubmitError(null);
    try {
      const payload: ResumeTemplateCreatePayload = {
        slug: form.slug.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim().toLowerCase() || "general",
        htmlOriginal: form.htmlOriginal,
        isPremium: form.isPremium,
      };
      const res = await resumeTemplatesApi.create(payload);
      onCreated(res.template.slug);
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setSubmitError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="lg"
      title="Upload resume template"
      description="Paste HTML or pick a .html file. Use Mustache placeholders ({{fullName}}, {{email}}, {{skills}}, …) for user data."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={busy}>
            Upload & score
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Display name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          placeholder="Clean Sans Serif"
        />
        <Input
          label="Slug"
          value={form.slug}
          onChange={(e) => set("slug", e.target.value)}
          error={errors.slug}
          mono
          hint="Permanent. URL identifier."
          placeholder="clean-sans"
        />
        <Input
          label="Category"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          hint="e.g. general · creative · executive"
          className="sm:col-span-1"
        />
        <Toggle
          checked={form.isPremium}
          onChange={(v) => set("isPremium", v)}
          label="Premium-only"
          description="Hidden behind subscription gate at render time."
        />
      </div>

      <div className="mt-4">
        <Textarea
          label="Description"
          rows={2}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          hint="Shown under the template name in the user picker."
          placeholder="A modern single-column template that ATS systems parse cleanly."
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12.5px] font-medium text-fg">Template HTML</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            Pick .html file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".html,.htm,text/html"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
        <Textarea
          rows={12}
          mono
          value={form.htmlOriginal}
          onChange={(e) => set("htmlOriginal", e.target.value)}
          error={errors.htmlOriginal}
          placeholder={'<!DOCTYPE html>\n<html>...\n  <h1>{{fullName}}</h1>\n  <p>{{summary}}</p>\n...</html>'}
        />
      </div>

      {submitError ? (
        <div className="mt-4 text-[12.5px] text-danger font-mono break-all">
          {submitError}
        </div>
      ) : null}
    </Modal>
  );
}
