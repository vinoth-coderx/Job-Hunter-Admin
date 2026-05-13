"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { aiApi, FEATURES, PROVIDER_META } from "@/lib/ai";
import type { AiKey, AiProvider } from "@/lib/types";

interface AiKeyFormProps {
  initial?: AiKey;
  onSaved: (saved: AiKey) => void;
  onCancel: () => void;
}

const PROVIDER_OPTIONS: { value: AiProvider; label: string }[] = [
  { value: "gemini", label: "Google Gemini" },
  { value: "claude", label: "Anthropic Claude" },
];

const TIER_OPTIONS = [
  { value: "free", label: "Free tier" },
  { value: "paid", label: "Paid tier" },
];

export function AiKeyForm({ initial, onSaved, onCancel }: AiKeyFormProps) {
  const isEdit = Boolean(initial);
  const [provider, setProvider] = useState<AiProvider>(
    initial?.provider ?? "gemini",
  );
  const [label, setLabel] = useState(initial?.label ?? "");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(
    initial?.model ?? PROVIDER_META.gemini.defaultModel,
  );
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? 10);
  const [weight, setWeight] = useState(initial?.weight ?? 1);
  const [tier, setTier] = useState<"free" | "paid">(initial?.tier ?? "free");
  const [dailyLimit, setDailyLimit] = useState(initial?.dailyLimit ?? 400);
  const [rpmLimit, setRpmLimit] = useState(initial?.rpmLimit ?? 60);
  const [maxTokens, setMaxTokens] = useState(initial?.maxTokens?.toString() ?? "");
  const [temperature, setTemperature] = useState(
    initial?.temperature?.toString() ?? "",
  );
  const [features, setFeatures] = useState<string[]>(
    initial?.allowedFeatures ?? [...FEATURES],
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const [saving, setSaving] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) {
      // Snap model to provider's default when switching providers on a new key.
      setModel(PROVIDER_META[provider].defaultModel);
    }
  }, [provider, isEdit]);

  const toggleFeature = (f: string) => {
    setFeatures((cur) =>
      cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f],
    );
  };

  const submit = async () => {
    setTopError(null);
    if (!label.trim()) {
      setTopError("Label is required.");
      return;
    }
    if (!isEdit && !apiKey.trim()) {
      setTopError("API key is required for new entries.");
      return;
    }
    setSaving(true);
    try {
      const base = {
        provider,
        label: label.trim(),
        model: model.trim(),
        baseUrl: baseUrl.trim() || undefined,
        priority: Number(priority) || 0,
        weight: Math.max(0, Number(weight) || 0),
        tier,
        dailyLimit: Math.max(0, Number(dailyLimit) || 0),
        rpmLimit: Math.max(0, Number(rpmLimit) || 0),
        maxTokens: maxTokens.trim() ? Number(maxTokens) : undefined,
        temperature: temperature.trim() ? Number(temperature) : undefined,
        allowedFeatures: features,
        notes: notes.trim() || undefined,
        isActive,
      };
      const saved = isEdit
        ? await aiApi.update(initial!._id, {
            ...base,
            ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          })
        : await aiApi.create({ ...base, apiKey: apiKey.trim() });
      onSaved(saved);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status} — ${err.message}`
          : (err as Error).message;
      setTopError(msg);
    } finally {
      setSaving(false);
    }
  };

  const modelOptions = PROVIDER_META[provider].allModels.map((m) => ({
    value: m,
    label: m,
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      {topError ? (
        <div className="surface border-[color-mix(in_oklab,var(--danger)_30%,var(--border))] p-3 flex items-start gap-2.5 reveal">
          <Icon.warning width={14} height={14} className="text-danger mt-0.5" />
          <div className="text-[12.5px] text-fg-muted">
            <span className="font-medium text-fg">Save failed.</span>{" "}
            <span className="font-mono text-danger">{topError}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Provider"
          options={PROVIDER_OPTIONS}
          value={provider}
          onChange={(e) => setProvider(e.target.value as AiProvider)}
        />
        <Input
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Gemini primary"
          hint="Human name shown in routing logs."
        />
      </div>

      <Input
        type="password"
        label="API key"
        mono
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={isEdit ? "•••• leave blank to keep" : "Paste the API key"}
        autoComplete="off"
        spellCheck={false}
        hint="Encrypted with AES-256-GCM. Never round-trips to the admin UI."
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Model"
          options={modelOptions}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <Input
          label="Base URL (optional)"
          mono
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://"
          hint="Only for self-hosted proxies."
        />
      </div>

      <div className="surface p-4 space-y-4">
        <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
          Routing
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input
            type="number"
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            hint="Lower = first"
            min={0}
          />
          <Input
            type="number"
            label="Weight"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            hint="Round-robin"
            min={0}
            step={1}
          />
          <Select
            label="Tier"
            options={TIER_OPTIONS}
            value={tier}
            onChange={(e) => setTier(e.target.value as "free" | "paid")}
          />
          <Input
            type="number"
            label="Daily limit"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            hint="0 = unlimited"
            min={0}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input
            type="number"
            label="RPM limit"
            value={rpmLimit}
            onChange={(e) => setRpmLimit(Number(e.target.value))}
            hint="Per minute"
            min={0}
          />
          <Input
            type="number"
            label="Max tokens"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="default"
            min={0}
          />
          <Input
            type="number"
            label="Temperature"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="default"
            step={0.1}
            min={0}
            max={2}
          />
          <div className="flex items-end pb-1">
            <Toggle
              checked={isActive}
              onChange={setIsActive}
              label="Active"
              description="Toggle off to remove from routing without deleting."
            />
          </div>
        </div>
      </div>

      <div>
        <div className="text-[12.5px] font-medium text-fg mb-2">
          Allowed features
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FEATURES.map((f) => {
            const on = features.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFeature(f)}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-mono transition-all duration-150 ${
                  on
                    ? "bg-accent text-accent-fg"
                    : "bg-panel border border-border text-fg-muted hover:bg-panel-hover hover:border-border-strong hover:text-fg"
                }`}
              >
                {on ? <Icon.check width={11} height={11} /> : null}
                {f}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 text-[11.5px] text-fg-subtle">
          Routing only considers keys whose allowed-features list contains the
          current feature.
        </div>
      </div>

      <Textarea
        label="Notes"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional — context for the next admin (billing, rate-limit history)."
        maxLength={500}
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={saving}
          leading={!saving ? <Icon.check width={14} height={14} /> : undefined}
        >
          {isEdit ? "Save changes" : "Add key"}
        </Button>
      </div>
    </form>
  );
}
