"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import {
  CATEGORIES,
  CATEGORY_META,
  configApi,
  type ConfigRegistryEntry,
} from "@/lib/config";
import type { AppConfigCategory, AppConfigEntry } from "@/lib/types";
import { ApiError } from "@/lib/api";

interface ConfigFormProps {
  initial?: AppConfigEntry;
  onSaved: (saved: AppConfigEntry) => void;
  onCancel: () => void;
}

const KEY_REGEX = /^[A-Z][A-Z0-9_]{0,79}$/;

/**
 * Build the upsert payload for a single slot:
 *   - `undefined` → don't touch the slot on the server
 *   - `''`        → clear the slot
 *   - non-empty   → write the slot
 *
 * For secrets on an existing entry, leaving the input empty means "keep
 * what's stored" → maps to `undefined`. For non-secrets, an empty input
 * is a deliberate clear → maps to `''`.
 */
const buildSlotPayload = (
  raw: string,
  touched: boolean,
  isEdit: boolean,
  isSecret: boolean,
): string | undefined => {
  if (!touched) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length > 0) return trimmed;
  // Empty input
  if (isEdit && isSecret) return undefined; // keep existing ciphertext
  return ""; // clear the slot
};

export function ConfigForm({ initial, onSaved, onCancel }: ConfigFormProps) {
  const isEdit = Boolean(initial);
  const [key, setKey] = useState(initial?.key ?? "");
  const [category, setCategory] = useState<AppConfigCategory>(
    initial?.category ?? "misc",
  );
  const [isSecret, setIsSecret] = useState(initial?.isSecret ?? false);

  // Three slot inputs — Test, Live, and a "mode-agnostic" Shared slot
  // (rendered behind an "Advanced" disclosure for mode-agnostic keys).
  const [testValue, setTestValue] = useState(
    initial && !initial.isSecret ? initial.testValue ?? "" : "",
  );
  const [liveValue, setLiveValue] = useState(
    initial && !initial.isSecret ? initial.liveValue ?? "" : "",
  );
  const [legacyValue, setLegacyValue] = useState(
    initial && !initial.isSecret ? initial.legacyValue ?? "" : "",
  );
  // "touched" flags so we can tell user-intent ('' = clear) from inertia
  // ('' = haven't typed yet). Without these every save would clobber a
  // slot the operator never opened.
  const [testTouched, setTestTouched] = useState(false);
  const [liveTouched, setLiveTouched] = useState(false);
  const [legacyTouched, setLegacyTouched] = useState(false);

  const [showLegacy, setShowLegacy] = useState(
    Boolean(initial?.hasLegacyValue && !initial?.hasTestValue && !initial?.hasLiveValue),
  );

  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    key?: string;
    test?: string;
    live?: string;
    legacy?: string;
    slot?: string;
  }>({});

  // Registry of suggested keys — only loaded for new entries.
  const [registry, setRegistry] = useState<ConfigRegistryEntry[] | null>(null);
  const [suggestPick, setSuggestPick] = useState<string>("");

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    configApi
      .registry()
      .then((r) => {
        if (!cancelled) setRegistry(r.entries);
      })
      .catch(() => {
        if (!cancelled) setRegistry([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  // Toggling secret mode wipes any user-typed inputs so the masked
  // placeholders re-apply cleanly.
  useEffect(() => {
    if (isEdit && isSecret) {
      setTestValue("");
      setLiveValue("");
      setLegacyValue("");
      setTestTouched(false);
      setLiveTouched(false);
      setLegacyTouched(false);
    }
  }, [isEdit, isSecret]);

  const applySuggestion = (suggestKey: string) => {
    setSuggestPick(suggestKey);
    if (!suggestKey) return;
    const entry = registry?.find((e) => e.key === suggestKey);
    if (!entry) return;
    setKey(entry.key);
    setCategory(entry.category);
    setIsSecret(entry.isSecret);
    if (entry.defaultValue && !entry.isSecret) {
      // Default values are env defaults — drop them into the Live slot so
      // a fresh install starts in a working live state.
      setLiveValue(entry.defaultValue);
      setLiveTouched(true);
    }
    setNotes(
      entry.usedBy
        ? `${entry.description} (used by ${entry.usedBy})`
        : entry.description,
    );
  };

  const availableSuggestions = (registry ?? []).filter(
    (e) => !e.alreadyConfigured,
  );
  const currentRegistryHint = registry?.find((e) => e.key === key.trim());

  const submit = async () => {
    setFieldErrors({});
    setTopError(null);

    const errs: typeof fieldErrors = {};
    if (!KEY_REGEX.test(key.trim())) {
      errs.key = "Use UPPER_SNAKE_CASE, must start with a letter, max 80 chars.";
    }

    const testPayload = buildSlotPayload(testValue, testTouched, isEdit, isSecret);
    const livePayload = buildSlotPayload(liveValue, liveTouched, isEdit, isSecret);
    const legacyPayload = buildSlotPayload(
      legacyValue,
      legacyTouched,
      isEdit,
      isSecret,
    );

    // New entry must have at least one slot filled (non-empty).
    if (!isEdit) {
      const anyFilled = [testPayload, livePayload, legacyPayload].some(
        (v) => typeof v === "string" && v.length > 0,
      );
      if (!anyFilled) {
        errs.slot =
          "Provide a value for at least one slot (Test, Live, or Shared).";
      }
    }

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const saved = await configApi.upsert({
        key: key.trim(),
        category,
        isSecret,
        testValue: testPayload,
        liveValue: livePayload,
        legacyValue: legacyPayload,
        notes: notes.trim() || undefined,
      });
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

  const inputType = isSecret ? "password" : "text";

  const secretPlaceholder = useMemo(
    () => (isEdit ? "•••• (leave empty to keep existing)" : "Paste the secret"),
    [isEdit],
  );
  const plainPlaceholder = isEdit
    ? "(leave empty to clear)"
    : "Plaintext value";

  const SlotInput = ({
    label,
    value,
    onChange,
    has,
    hint,
    error,
    tone,
  }: {
    label: string;
    value: string;
    onChange: (raw: string) => void;
    has: boolean;
    hint?: string;
    error?: string;
    tone: "test" | "live" | "shared";
  }) => {
    const toneClass =
      tone === "test"
        ? "border-[color-mix(in_oklab,var(--warn)_30%,var(--border))]"
        : tone === "live"
          ? "border-[color-mix(in_oklab,var(--success)_30%,var(--border))]"
          : "border-border";
    const toneBadge =
      tone === "test" ? (
        <span className="text-warn text-[10.5px] uppercase tracking-widest font-semibold">
          🧪 Test
        </span>
      ) : tone === "live" ? (
        <span className="text-success text-[10.5px] uppercase tracking-widest font-semibold">
          🚀 Live
        </span>
      ) : (
        <span className="text-fg-muted text-[10.5px] uppercase tracking-widest font-semibold">
          Shared (mode-agnostic)
        </span>
      );

    return (
      <div className={`surface p-3 space-y-1.5 ${toneClass}`}>
        <div className="flex items-center justify-between gap-2">
          {toneBadge}
          {has ? (
            <span className="text-[11px] text-success">stored</span>
          ) : (
            <span className="text-[11px] text-fg-subtle">empty</span>
          )}
        </div>
        <Input
          label={label}
          type={inputType}
          mono
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSecret ? secretPlaceholder : plainPlaceholder}
          autoComplete="off"
          spellCheck={false}
          error={error}
          hint={hint}
        />
      </div>
    );
  };

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

      {!isEdit && availableSuggestions.length > 0 ? (
        <Select
          label="Suggested keys"
          options={[
            { value: "", label: "Pick from known backend keys…" },
            ...availableSuggestions.map((e) => ({
              value: e.key,
              label: `${e.key}  ·  ${CATEGORY_META[e.category].label}`,
            })),
          ]}
          value={suggestPick}
          onChange={(e) => applySuggestion(e.target.value)}
          hint="Backend-registered keys the admin hasn't configured yet — pick one to auto-fill key, category and secret flag."
        />
      ) : null}

      <Input
        label="Key"
        mono
        autoFocus={!isEdit}
        disabled={isEdit}
        value={key}
        onChange={(e) => setKey(e.target.value.toUpperCase())}
        placeholder="EG. CLOUDINARY_API_SECRET"
        hint={
          isEdit
            ? "Key is immutable. Delete the entry to rename."
            : currentRegistryHint
              ? currentRegistryHint.description
              : "UPPER_SNAKE_CASE. Matches the historical env-var name."
        }
        error={fieldErrors.key}
        leading={<Icon.sliders width={13} height={13} />}
      />

      <Select
        label="Category"
        options={CATEGORIES.map((c) => ({
          value: c,
          label: `${CATEGORY_META[c].label} — ${c}`,
        }))}
        value={category}
        onChange={(e) => setCategory(e.target.value as AppConfigCategory)}
        hint={CATEGORY_META[category].description}
      />

      <div className="surface p-3">
        <Toggle
          checked={isSecret}
          onChange={setIsSecret}
          label="Treat as secret"
          description="Encrypts the value at rest with AES-256-GCM. The value will never round-trip to the admin UI again."
        />
      </div>

      {fieldErrors.slot ? (
        <div className="text-[12px] text-danger">{fieldErrors.slot}</div>
      ) : null}

      <SlotInput
        label="Test value"
        value={testValue}
        onChange={(v) => {
          setTestValue(v);
          setTestTouched(true);
        }}
        has={Boolean(initial?.hasTestValue)}
        tone="test"
        error={fieldErrors.test}
        hint="Used when runtime mode = Test. Leave empty to keep existing (secrets) or clear (non-secrets)."
      />

      <SlotInput
        label="Live value"
        value={liveValue}
        onChange={(v) => {
          setLiveValue(v);
          setLiveTouched(true);
        }}
        has={Boolean(initial?.hasLiveValue)}
        tone="live"
        error={fieldErrors.live}
        hint="Used when runtime mode = Live."
      />

      <button
        type="button"
        onClick={() => setShowLegacy((v) => !v)}
        className="text-[11.5px] text-fg-muted hover:text-fg transition-colors inline-flex items-center gap-1"
      >
        <Icon.sliders width={11} height={11} />
        {showLegacy ? "Hide" : "Show"} Shared (mode-agnostic) slot
      </button>

      {showLegacy ? (
        <SlotInput
          label="Shared value"
          value={legacyValue}
          onChange={(v) => {
            setLegacyValue(v);
            setLegacyTouched(true);
          }}
          has={Boolean(initial?.hasLegacyValue)}
          tone="shared"
          error={fieldErrors.legacy}
          hint="Returned when the active-mode slot is empty. Best for keys that don't differ between Test and Live (e.g. CRON_ENABLED, AI keys, RATE_LIMIT_*)."
        />
      ) : null}

      <Textarea
        label="Notes"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional — context for the next admin who rotates this key."
        hint="Max 500 characters."
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
          {isEdit ? "Save changes" : "Create entry"}
        </Button>
      </div>
    </form>
  );
}
