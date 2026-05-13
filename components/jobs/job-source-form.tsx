"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { jobsApi } from "@/lib/jobs";
import type {
  GenericJobSourceConfig,
  JobSourceCreateInput,
  JobSourcePricing,
  JobSourceStat,
} from "@/lib/types";

interface JobSourceFormProps {
  initial?: JobSourceStat & { generic?: GenericJobSourceConfig };
  onSaved: () => void;
  onCancel: () => void;
}

const PRICING_OPTIONS: { value: JobSourcePricing; label: string }[] = [
  { value: "Free", label: "Free" },
  { value: "Freemium", label: "Freemium" },
  { value: "Paid", label: "Paid" },
];

const METHOD_OPTIONS = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
];

const defaultGeneric: GenericJobSourceConfig = {
  endpointUrl: "",
  httpMethod: "GET",
  responseRootPath: "",
  fieldMap: {
    title: "",
    company: "",
    url: "",
    externalId: "",
  },
  pageCount: 1,
  rateLimitMs: 0,
};

export function JobSourceForm({ initial, onSaved, onCancel }: JobSourceFormProps) {
  const isEdit = Boolean(initial);
  const seed = initial?.generic ?? defaultGeneric;

  const [source, setSource] = useState(initial?.name ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Job Board API");
  const [pricing, setPricing] = useState<JobSourcePricing>(
    initial?.pricing ?? "Free",
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [queriesCsv, setQueriesCsv] = useState("");
  const [locationsCsv, setLocationsCsv] = useState("");

  const [endpointUrl, setEndpointUrl] = useState(seed.endpointUrl);
  const [httpMethod, setHttpMethod] = useState<"GET" | "POST">(seed.httpMethod);
  const [authHeader, setAuthHeader] = useState(seed.authHeader ?? "");
  const [authValueConfigKey, setAuthValueConfigKey] = useState(
    seed.authValueConfigKey ?? "",
  );
  const [authValuePrefix, setAuthValuePrefix] = useState(
    seed.authValuePrefix ?? "",
  );
  const [requestBody, setRequestBody] = useState(seed.requestBody ?? "");
  const [responseRootPath, setResponseRootPath] = useState(seed.responseRootPath);

  const [fmTitle, setFmTitle] = useState(seed.fieldMap.title);
  const [fmCompany, setFmCompany] = useState(seed.fieldMap.company);
  const [fmLocation, setFmLocation] = useState(seed.fieldMap.location ?? "");
  const [fmDescription, setFmDescription] = useState(
    seed.fieldMap.description ?? "",
  );
  const [fmUrl, setFmUrl] = useState(seed.fieldMap.url);
  const [fmExternalId, setFmExternalId] = useState(seed.fieldMap.externalId);
  const [fmType, setFmType] = useState(seed.fieldMap.type ?? "");
  const [fmPostedAt, setFmPostedAt] = useState(seed.fieldMap.postedAt ?? "");

  const [pageParam, setPageParam] = useState(seed.pageParam ?? "");
  const [pageCount, setPageCount] = useState(seed.pageCount);
  const [rateLimitMs, setRateLimitMs] = useState(seed.rateLimitMs);

  const [saving, setSaving] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const csvToList = (v: string): string[] =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const submit = async () => {
    setTopError(null);
    if (!isEdit && !/^[a-z0-9_-]{2,40}$/.test(source)) {
      setTopError("Source slug: 2-40 chars, lowercase letters/digits/dash/underscore only.");
      return;
    }
    if (!label.trim()) return setTopError("Label is required.");
    if (!endpointUrl.trim()) return setTopError("Endpoint URL is required.");
    if (!responseRootPath.trim() && responseRootPath !== "")
      return setTopError("Response root path can't be only whitespace.");
    if (!fmTitle || !fmCompany || !fmUrl || !fmExternalId) {
      return setTopError(
        "Field map: title, company, url and externalId are required.",
      );
    }

    setSaving(true);
    try {
      const generic: GenericJobSourceConfig = {
        endpointUrl: endpointUrl.trim(),
        httpMethod,
        authHeader: authHeader.trim() || undefined,
        authValueConfigKey: authValueConfigKey.trim() || undefined,
        authValuePrefix: authValuePrefix || undefined,
        requestBody: requestBody.trim() || undefined,
        responseRootPath: responseRootPath.trim(),
        fieldMap: {
          title: fmTitle.trim(),
          company: fmCompany.trim(),
          location: fmLocation.trim() || undefined,
          description: fmDescription.trim() || undefined,
          url: fmUrl.trim(),
          externalId: fmExternalId.trim(),
          type: fmType.trim() || undefined,
          postedAt: fmPostedAt.trim() || undefined,
        },
        pageParam: pageParam.trim() || undefined,
        pageCount: Math.max(1, Math.min(10, Number(pageCount) || 1)),
        rateLimitMs: Math.max(0, Math.min(60000, Number(rateLimitMs) || 0)),
      };

      if (isEdit) {
        await jobsApi.update(initial!.name, {
          label: label.trim(),
          category: category.trim(),
          pricing,
          enabled,
          queries: queriesCsv ? csvToList(queriesCsv) : undefined,
          locations: locationsCsv ? csvToList(locationsCsv) : undefined,
          notes: notes.trim() || undefined,
          generic,
        });
      } else {
        const input: JobSourceCreateInput = {
          source: source.trim(),
          label: label.trim(),
          category: category.trim(),
          pricing,
          enabled,
          queries: queriesCsv ? csvToList(queriesCsv) : undefined,
          locations: locationsCsv ? csvToList(locationsCsv) : undefined,
          notes: notes.trim() || undefined,
          generic,
        };
        await jobsApi.create(input);
      }
      onSaved();
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

      <div className="surface p-4 space-y-4">
        <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
          Identity
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Source slug"
            mono
            value={source}
            onChange={(e) => setSource(e.target.value.toLowerCase())}
            placeholder="myboard"
            hint="Stable id used in URLs and DB. lower-case, no spaces."
            disabled={isEdit}
          />
          <Input
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="MyBoard"
            hint="Display name in the dashboard."
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Job Board API"
          />
          <Select
            label="Pricing"
            options={PRICING_OPTIONS}
            value={pricing}
            onChange={(e) => setPricing(e.target.value as JobSourcePricing)}
          />
          <div className="flex items-end pb-1">
            <Toggle
              checked={enabled}
              onChange={setEnabled}
              label={enabled ? "Enabled" : "Disabled"}
              description="Off pannina cron skip pannidum."
            />
          </div>
        </div>
      </div>

      <div className="surface p-4 space-y-4">
        <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
          Endpoint
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Input
            label="Endpoint URL"
            mono
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            placeholder="https://api.example.com/jobs?q={query}&loc={location}"
            hint="{query}, {location}, {page} get URL-encoded and interpolated."
          />
          <Select
            label="Method"
            options={METHOD_OPTIONS}
            value={httpMethod}
            onChange={(e) => setHttpMethod(e.target.value as "GET" | "POST")}
          />
        </div>
        {httpMethod === "POST" ? (
          <Textarea
            label="Request body (JSON, optional)"
            mono
            rows={4}
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            placeholder={'{"query": "{query}", "location": "{location}", "page": "{page}"}'}
            hint="Same {query}/{location}/{page} interpolation as the URL."
          />
        ) : null}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Auth header"
            mono
            value={authHeader}
            onChange={(e) => setAuthHeader(e.target.value)}
            placeholder="Authorization"
          />
          <Input
            label="AppConfig key for value"
            mono
            value={authValueConfigKey}
            onChange={(e) => setAuthValueConfigKey(e.target.value.toUpperCase())}
            placeholder="MYBOARD_API_KEY"
            hint="Secret pulled from the encrypted AppConfig store."
          />
          <Input
            label="Value prefix"
            mono
            value={authValuePrefix}
            onChange={(e) => setAuthValuePrefix(e.target.value)}
            placeholder="Bearer "
            hint='Prepended to the value, e.g. "Bearer ".'
          />
        </div>
      </div>

      <div className="surface p-4 space-y-4">
        <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
          Response shape
        </div>
        <Input
          label="Root path to jobs array"
          mono
          value={responseRootPath}
          onChange={(e) => setResponseRootPath(e.target.value)}
          placeholder="data.results"
          hint='Dotted path; empty if the response itself is the array.'
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="title *"
            mono
            value={fmTitle}
            onChange={(e) => setFmTitle(e.target.value)}
            placeholder="title"
          />
          <Input
            label="company *"
            mono
            value={fmCompany}
            onChange={(e) => setFmCompany(e.target.value)}
            placeholder="company.name"
          />
          <Input
            label="url *"
            mono
            value={fmUrl}
            onChange={(e) => setFmUrl(e.target.value)}
            placeholder="redirect_url"
          />
          <Input
            label="externalId *"
            mono
            value={fmExternalId}
            onChange={(e) => setFmExternalId(e.target.value)}
            placeholder="id"
          />
          <Input
            label="location"
            mono
            value={fmLocation}
            onChange={(e) => setFmLocation(e.target.value)}
            placeholder="location.display_name"
          />
          <Input
            label="description"
            mono
            value={fmDescription}
            onChange={(e) => setFmDescription(e.target.value)}
            placeholder="description"
          />
          <Input
            label="type"
            mono
            value={fmType}
            onChange={(e) => setFmType(e.target.value)}
            placeholder="contract_type"
          />
          <Input
            label="postedAt"
            mono
            value={fmPostedAt}
            onChange={(e) => setFmPostedAt(e.target.value)}
            placeholder="created"
          />
        </div>
      </div>

      <div className="surface p-4 space-y-4">
        <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
          Pagination & throttle
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Page query param"
            mono
            value={pageParam}
            onChange={(e) => setPageParam(e.target.value)}
            placeholder="page"
            hint="Blank = no pagination."
          />
          <Input
            type="number"
            label="Page count"
            value={pageCount}
            onChange={(e) => setPageCount(Number(e.target.value))}
            min={1}
            max={10}
          />
          <Input
            type="number"
            label="Rate limit (ms)"
            value={rateLimitMs}
            onChange={(e) => setRateLimitMs(Number(e.target.value))}
            min={0}
            max={60000}
            step={100}
            hint="Sleep between pages."
          />
        </div>
      </div>

      <div className="surface p-4 space-y-4">
        <div className="text-[10.5px] uppercase tracking-widest text-fg-subtle font-medium">
          Optional overrides
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Queries (comma-separated)"
            value={queriesCsv}
            onChange={(e) => setQueriesCsv(e.target.value)}
            placeholder="flutter developer, react developer"
            hint="Empty = use the pipeline defaults."
          />
          <Input
            label="Locations (comma-separated)"
            value={locationsCsv}
            onChange={(e) => setLocationsCsv(e.target.value)}
            placeholder="Bangalore, Chennai, Remote"
            hint="Empty = use the pipeline defaults."
          />
        </div>
        <Textarea
          label="Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything an admin should know about this source."
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {isEdit ? "Save changes" : "Create source"}
        </Button>
      </div>
    </form>
  );
}
