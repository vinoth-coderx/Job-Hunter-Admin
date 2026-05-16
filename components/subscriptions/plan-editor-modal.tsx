"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import type {
  SubscriptionPlan,
  SubscriptionPlanInput,
} from "@/lib/types";

interface Props {
  open: boolean;
  /** When non-null we're editing; when null we're creating. */
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSubmit: (
    payload: { tier?: string } & SubscriptionPlanInput,
  ) => Promise<void>;
}

interface FormState {
  tier: string;
  name: string;
  priceInr: string;
  durationDays: string;
  features: string;
  coinCost: string;
  jobMatchLimit: string;
  apiCallLimit: string;
  templateDownloadsPerMonth: string;
  prioritySupport: boolean;
  isActive: boolean;
  sortOrder: string;
  badge: string;
}

const emptyForm: FormState = {
  tier: "",
  name: "",
  priceInr: "0",
  durationDays: "30",
  features: "",
  coinCost: "",
  jobMatchLimit: "0",
  apiCallLimit: "0",
  templateDownloadsPerMonth: "0",
  prioritySupport: false,
  isActive: true,
  sortOrder: "100",
  badge: "",
};

const planToForm = (plan: SubscriptionPlan): FormState => ({
  tier: plan.tier,
  name: plan.name,
  priceInr: String(plan.priceInr),
  durationDays: String(plan.durationDays),
  features: plan.features.join("\n"),
  coinCost: plan.coinCost == null ? "" : String(plan.coinCost),
  jobMatchLimit: String(plan.jobMatchLimit),
  apiCallLimit: String(plan.apiCallLimit),
  templateDownloadsPerMonth: String(plan.templateDownloadsPerMonth ?? 0),
  prioritySupport: plan.prioritySupport,
  isActive: plan.isActive,
  sortOrder: String(plan.sortOrder),
  badge: plan.badge ?? "",
});

const numericOrError = (raw: string, min = 0): number | string => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) return `must be a number ≥ ${min}`;
  return n;
};

export function PlanEditorModal({ open, plan, onClose, onSubmit }: Props) {
  const isEditing = plan !== null;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(plan ? planToForm(plan) : emptyForm);
    setErrors({});
    setSubmitError(null);
  }, [open, plan]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async () => {
    const errs: Partial<Record<keyof FormState, string>> = {};

    const price = numericOrError(form.priceInr, 0);
    const duration = numericOrError(form.durationDays, 1);
    const jobLimit = numericOrError(form.jobMatchLimit, 0);
    const apiLimit = numericOrError(form.apiCallLimit, 0);
    const sortOrder = numericOrError(form.sortOrder, 0);
    const downloadLimit = numericOrError(form.templateDownloadsPerMonth, -1);

    if (typeof price === "string") errs.priceInr = price;
    if (typeof duration === "string") errs.durationDays = duration;
    if (typeof jobLimit === "string") errs.jobMatchLimit = jobLimit;
    if (typeof apiLimit === "string") errs.apiCallLimit = apiLimit;
    if (typeof sortOrder === "string") errs.sortOrder = sortOrder;
    if (typeof downloadLimit === "string") {
      errs.templateDownloadsPerMonth = downloadLimit;
    }

    if (!form.name.trim()) errs.name = "required";

    if (!isEditing) {
      if (!/^[a-z][a-z0-9_-]{1,38}[a-z0-9]$/.test(form.tier.trim().toLowerCase())) {
        errs.tier = "lowercase a-z, 0-9, _ or -, 3-40 chars";
      }
    }

    let coinCost: number | null = null;
    if (form.coinCost.trim() !== "") {
      const c = Number(form.coinCost);
      if (!Number.isFinite(c) || c < 0) errs.coinCost = "must be ≥ 0 or empty";
      else coinCost = c;
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setSubmitError(null);
    try {
      const features = form.features
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload: { tier?: string } & SubscriptionPlanInput = {
        ...(isEditing ? {} : { tier: form.tier.trim().toLowerCase() }),
        name: form.name.trim(),
        priceInr: price as number,
        durationDays: duration as number,
        features,
        jobMatchLimit: jobLimit as number,
        apiCallLimit: apiLimit as number,
        templateDownloadsPerMonth: downloadLimit as number,
        prioritySupport: form.prioritySupport,
        coinCost,
        isActive: form.isActive,
        sortOrder: sortOrder as number,
        badge: form.badge.trim() === "" ? null : form.badge.trim(),
      };

      await onSubmit(payload);
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
      title={isEditing ? `Edit plan · ${plan.name}` : "Create new plan"}
      description={
        isEditing
          ? "Changes go live for new checkouts on the next plan-cache TTL (≤60s)."
          : "New tiers can be assigned to users once active. Tier slug is permanent."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={busy}>
            {isEditing ? "Save changes" : "Create plan"}
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
          placeholder="Monthly"
        />
        <Input
          label="Tier slug"
          value={form.tier}
          onChange={(e) => set("tier", e.target.value)}
          error={errors.tier}
          disabled={isEditing}
          hint={
            isEditing
              ? "Immutable — existing subscriptions reference it."
              : "e.g. monthly, lifetime, team-10"
          }
          mono
          placeholder="lowercase-slug"
        />
        <Input
          label="Price (INR)"
          type="number"
          inputMode="numeric"
          value={form.priceInr}
          onChange={(e) => set("priceInr", e.target.value)}
          error={errors.priceInr}
          mono
        />
        <Input
          label="Duration (days)"
          type="number"
          inputMode="numeric"
          value={form.durationDays}
          onChange={(e) => set("durationDays", e.target.value)}
          error={errors.durationDays}
          hint="7 = weekly, 30 = monthly, 365 = yearly"
          mono
        />
        <Input
          label="Coin redemption cost"
          type="number"
          inputMode="numeric"
          value={form.coinCost}
          onChange={(e) => set("coinCost", e.target.value)}
          error={errors.coinCost}
          hint="Leave empty to disable coin payment for this tier."
          mono
          placeholder="—"
        />
        <Input
          label="Sort order"
          type="number"
          inputMode="numeric"
          value={form.sortOrder}
          onChange={(e) => set("sortOrder", e.target.value)}
          error={errors.sortOrder}
          hint="Lower = shown first."
          mono
        />
        <Input
          label="Job match limit"
          type="number"
          inputMode="numeric"
          value={form.jobMatchLimit}
          onChange={(e) => set("jobMatchLimit", e.target.value)}
          error={errors.jobMatchLimit}
          mono
        />
        <Input
          label="API call limit"
          type="number"
          inputMode="numeric"
          value={form.apiCallLimit}
          onChange={(e) => set("apiCallLimit", e.target.value)}
          error={errors.apiCallLimit}
          mono
        />
        <Input
          label="Template downloads / month"
          type="number"
          inputMode="numeric"
          value={form.templateDownloadsPerMonth}
          onChange={(e) => set("templateDownloadsPerMonth", e.target.value)}
          error={errors.templateDownloadsPerMonth}
          hint="0 blocks downloads · -1 = unlimited"
          mono
        />
        <Input
          label="Badge text"
          value={form.badge}
          onChange={(e) => set("badge", e.target.value)}
          hint="Shown over the card. Leave blank for none."
          placeholder="Best value · Save 30%"
          className="sm:col-span-2"
        />
      </div>

      <div className="mt-4">
        <Textarea
          label="Features (one per line)"
          rows={5}
          value={form.features}
          onChange={(e) => set("features", e.target.value)}
          hint="Rendered as the bullet list on the user's pricing card."
          placeholder={"Everything in Monthly\nSave 30%\nDedicated support"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Toggle
          checked={form.isActive}
          onChange={(v) => set("isActive", v)}
          label="Active"
          description="Inactive plans disappear from the user pricing page."
          disabled={isEditing && plan?.tier === "free"}
        />
        <Toggle
          checked={form.prioritySupport}
          onChange={(v) => set("prioritySupport", v)}
          label="Priority support"
          description="Tagged on customer support tickets routed by tier."
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
