"use client";

import { useEffect, useState } from "react";
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

export function ConfigForm({ initial, onSaved, onCancel }: ConfigFormProps) {
  const isEdit = Boolean(initial);
  const [key, setKey] = useState(initial?.key ?? "");
  const [category, setCategory] = useState<AppConfigCategory>(
    initial?.category ?? "misc",
  );
  const [isSecret, setIsSecret] = useState(initial?.isSecret ?? false);
  const [value, setValue] = useState(initial?.value ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    key?: string;
    value?: string;
  }>({});

  // Registry of suggested keys — only loaded for new entries so the
  // operator can pick a known key (auto-fills category + secret flag +
  // hint) instead of remembering the exact name.
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
        // Registry endpoint may not be deployed on older backends —
        // silently fall back to free-form entry.
        if (!cancelled) setRegistry([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  // When switching to "secret" mode on an existing entry, blank the value
  // field so the placeholder communicates "leave empty to keep existing".
  useEffect(() => {
    if (isEdit && isSecret) setValue("");
  }, [isEdit, isSecret]);

  const applySuggestion = (suggestKey: string) => {
    setSuggestPick(suggestKey);
    if (!suggestKey) return;
    const entry = registry?.find((e) => e.key === suggestKey);
    if (!entry) return;
    setKey(entry.key);
    setCategory(entry.category);
    setIsSecret(entry.isSecret);
    if (entry.defaultValue && !entry.isSecret) setValue(entry.defaultValue);
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
      errs.key =
        "Use UPPER_SNAKE_CASE, must start with a letter, max 80 chars.";
    }
    const trimmedValue = value.trim();
    const valueOptional = isEdit && isSecret && trimmedValue.length === 0;
    if (!valueOptional && trimmedValue.length === 0 && !isSecret) {
      errs.value = "Required for non-secret entries.";
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
        ...(valueOptional ? {} : { value: trimmedValue }),
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

      {isSecret ? (
        <Input
          type="password"
          label="Secret value"
          mono
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            isEdit
              ? "•••• (leave empty to keep existing)"
              : "Paste the secret"
          }
          autoComplete="off"
          spellCheck={false}
          error={fieldErrors.value}
          hint="Encrypted with AES-256-GCM before persisting."
        />
      ) : (
        <Textarea
          label="Value"
          mono
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Plaintext value visible to admins."
          error={fieldErrors.value}
        />
      )}

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
