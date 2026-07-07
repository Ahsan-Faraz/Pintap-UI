"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CheckCircleIcon } from "@/components/ui/icons";
import { campaignsService } from "@/services";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import { formatCurrencyMinor, formatDate } from "@/lib/format";
import type { DiscountCodeSourceInput } from "@/lib/types";
import { cn } from "@/lib/utils";

const PREVIEW_GREEN = "#086838";

function formatDateFieldValue(value: string): string {
  if (!value) return "";
  return formatDate(`${value}T12:00:00`);
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function parseCodes(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function PercentField({
  id,
  label,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <Field label={label} htmlFor={id} required={required}>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          required={required}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-navy/40">
          %
        </span>
      </div>
    </Field>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    pickerRef.current?.showPicker?.();
  }

  return (
    <Field label={label} htmlFor={id} required={required}>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type="text"
          readOnly
          value={formatDateFieldValue(value)}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          className="cursor-pointer pr-10"
          required={required}
        />
        <input
          ref={pickerRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={openPicker}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/35 transition hover:text-navy/55 focus-ring"
          aria-label={label}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>
    </Field>
  );
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useT();
  const { stores, loading: storeLoading } = useMerchantStore();

  const [storeId, setStoreId] = useState("");
  const [name, setName] = useState("Autumn Collection");
  const [terms, setTerms] = useState(
    "25% off the Autumn Collection. One use per customer.",
  );
  const [discount, setDiscount] = useState("25");
  const [commission, setCommission] = useState("14");
  const [startAt, setStartAt] = useState("2026-09-01");
  const [endAt, setEndAt] = useState("2026-11-30");
  const [uploaded, setUploaded] = useState(
    "AUTUMN-A1K9, AUTUMN-B2L8, AUTUMN-C3M7, AUTUMN-D4N6, AUTUMN-E5P5",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeList = useMemo(() => parseCodes(uploaded), [uploaded]);
  const codeCount = codeList.length;

  const previewCommission = useMemo(() => {
    const pct = parseFloat(commission || "0");
    return Math.round(10000 * (pct / 100));
  }, [commission]);

  const previewMerchantKeeps = useMemo(() => {
    const d = parseFloat(discount || "0");
    const c = parseFloat(commission || "0");
    return Math.round(10000 * (1 - d / 100 - c / 100));
  }, [discount, commission]);

  if (storeLoading) return <Skeleton className="h-96 w-full" />;
  if (stores.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-navy">
          {t("merchantPages.campaigns.new")}
        </h1>
        <NoStore />
      </div>
    );
  }

  const effectiveStoreId = storeId || stores[0]!.id;

  async function saveCampaign(active: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      const codes = parseCodes(uploaded);
      if (codes.length === 0) {
        throw new Error(t("merchantPages.campaignForm.codesRequired"));
      }
      const codeSource: DiscountCodeSourceInput = {
        kind: "upload",
        codes,
      };
      const campaign = await campaignsService.createCampaign({
        storeId: effectiveStoreId,
        name,
        destinationUrl: null,
        terms,
        discountPercent: parseFloat(discount || "0"),
        commissionPercent: parseFloat(commission || "0"),
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        isActive: active,
        codeSource,
      });
      toast({
        title: active
          ? t("merchantPages.campaignForm.scheduledToast")
          : t("merchantPages.campaignForm.draftSavedToast"),
        variant: "success",
      });
      router.push(`/merchant/campaigns/${campaign.id}`);
    } catch (err) {
      setError(translateError(t, err, "merchantPages.campaigns.createFailed"));
      setSubmitting(false);
    }
  }

  function submitSchedule(e: React.FormEvent) {
    e.preventDefault();
    void saveCampaign(true);
  }

  return (
    <div>
      {/* Breadcrumb header */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/merchant/campaigns"
          className="font-semibold text-navy/45 transition hover:text-navy focus-ring"
        >
          {t("merchantPages.campaigns.title")}
        </Link>
        <span className="text-navy/30">›</span>
        <span className="font-bold text-navy">
          {t("merchantPages.campaigns.new")}
        </span>
      </div>

      <form onSubmit={submitSchedule}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main form card */}
          <div className="app-flat-card space-y-5 p-5 sm:p-6">
            {stores.length > 1 && (
              <Field
                label={t("merchantPages.campaignForm.store")}
                htmlFor="store"
                required
              >
                <select
                  id="store"
                  name="store"
                  value={effectiveStoreId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="h-11 w-full rounded-input border border-navy/15 bg-white px-3 text-sm font-medium text-navy focus-ring"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field
              label={t("merchantPages.campaignForm.name")}
              htmlFor="name"
              required
            >
              <Input
                id="name"
                name="campaign-name"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                id="start"
                label={t("merchantPages.campaignForm.starts")}
                value={startAt}
                onChange={setStartAt}
                required
              />
              <DateField
                id="end"
                label={t("merchantPages.campaignForm.ends")}
                value={endAt}
                onChange={setEndAt}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PercentField
                id="discount"
                label={t("merchantPages.campaignForm.buyerDiscount")}
                value={discount}
                onChange={setDiscount}
                required
              />
              <PercentField
                id="commission"
                label={t("merchantPages.campaignForm.recommenderCommission")}
                value={commission}
                onChange={setCommission}
                required
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="codes"
                  className="text-sm font-semibold text-navy"
                >
                  {t("merchantPages.campaignForm.codes")}
                </label>
                {codeCount > 0 && (
                  <span
                    className="text-xs font-bold"
                    style={{ color: PREVIEW_GREEN }}
                  >
                    {t("merchantPages.campaignForm.codesDetected", {
                      count: codeCount,
                    })}
                  </span>
                )}
              </div>
              <Textarea
                id="codes"
                name="codes"
                autoComplete="off"
                value={uploaded}
                onChange={(e) => setUploaded(e.target.value)}
                placeholder={t("merchantPages.campaignForm.codesPastePlaceholder")}
                className="min-h-[140px] border-dashed border-navy/20 bg-navy/[0.02] font-mono text-xs leading-relaxed"
                required
              />
              <p className="mt-2 text-xs text-navy/45">
                {t("merchantPages.campaignForm.codesPasteHint")}
              </p>
            </div>

            <input type="hidden" name="terms" value={terms} />
          </div>

          {/* Preview sidebar */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-card bg-navy p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                {t("merchantPages.campaignForm.previewTitle")}
              </p>
              <div className="mt-4 rounded-card bg-[#001a33] p-4">
                <div className="mb-3 h-16 w-16 rounded-input bg-white/10" />
                <p className="text-lg font-bold">{name || "—"}</p>
                <p className="mt-1 text-sm text-white/70">
                  {t("merchantPages.campaignForm.previewSavings", {
                    discount: discount || "0",
                    commission: commission || "0",
                  })}{" "}
                  <span style={{ color: "#45db89" }}>
                    {t("merchantPages.campaignForm.previewForYou", {
                      commission: commission || "0",
                    })}
                  </span>
                </p>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-white/55">
                {t("merchantPages.campaignForm.previewCalc", {
                  commission: formatCurrencyMinor(previewCommission, "EUR"),
                  keeps: formatCurrencyMinor(previewMerchantKeeps, "EUR"),
                })}
              </p>
            </div>

            <div className="app-flat-card space-y-3 p-5">
              {[
                t("merchantPages.campaignForm.featureAutoDeactivate"),
                t("merchantPages.campaignForm.featureLowCodes"),
                t("merchantPages.campaignForm.featureConfirmedOnly"),
              ].map((line) => (
                <div key={line} className="flex items-start gap-2.5">
                  <CheckCircleIcon
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: PREVIEW_GREEN }}
                  />
                  <p className="text-sm leading-snug text-navy/70">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-input bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void saveCampaign(false)}
            className="inline-flex h-12 items-center justify-center rounded-full border border-navy/15 bg-white px-8 text-sm font-semibold text-navy transition hover:border-navy/30 focus-ring disabled:opacity-50"
          >
            {t("merchantPages.campaignForm.saveDraft")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange px-10 text-sm font-bold text-white shadow-[0_14px_32px_rgba(250,80,4,0.38)] transition hover:bg-orange-hover active:scale-[0.98] focus-ring disabled:opacity-50",
            )}
          >
            {submitting && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {t("merchantPages.campaignForm.scheduleCampaign")}
          </button>
        </div>
      </form>
    </div>
  );
}
