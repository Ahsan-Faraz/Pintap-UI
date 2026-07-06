"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { campaignsService } from "@/services";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import type { DiscountCodeSourceInput } from "@/lib/types";

type CodeMode = "generate" | "upload";

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useT();
  const { stores, loading: storeLoading } = useMerchantStore();

  const [storeId, setStoreId] = useState("");
  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [terms, setTerms] = useState("");
  const [discount, setDiscount] = useState("15");
  const [commission, setCommission] = useState("10");
  const [startAt, setStartAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endAt, setEndAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [codeMode, setCodeMode] = useState<CodeMode>("generate");
  const [prefix, setPrefix] = useState("PINTAP");
  const [count, setCount] = useState("25");
  const [uploaded, setUploaded] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (storeLoading) return <Skeleton className="h-96 w-full" />;
  if (stores.length === 0) {
    return (
      <div>
        <PageHeader title={t("merchantPages.campaigns.new")} />
        <NoStore />
      </div>
    );
  }

  const effectiveStoreId = storeId || stores[0].id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const codeSource: DiscountCodeSourceInput =
        codeMode === "generate"
          ? { kind: "generate", prefix, count: parseInt(count || "0", 10) }
          : {
              kind: "upload",
              codes: uploaded.split(/\r?\n/).map((c) => c.trim()).filter(Boolean),
            };
      const campaign = await campaignsService.createCampaign({
        storeId: effectiveStoreId,
        name,
        destinationUrl: destinationUrl || null,
        terms,
        discountPercent: parseFloat(discount || "0"),
        commissionPercent: parseFloat(commission || "0"),
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        isActive,
        codeSource,
      });
      toast({ title: t("merchantPages.campaigns.created"), variant: "success" });
      router.push(`/merchant/campaigns/${campaign.id}`);
    } catch (err) {
      setError(translateError(t, err, "merchantPages.campaigns.createFailed"));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("merchantPages.campaigns.new")}
        breadcrumbs={
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-input hover:text-navy focus-ring"
          >
            ← {t("merchantPages.campaigns.back")}
          </button>
        }
      />

      <form onSubmit={submit} className="space-y-4">
        <Section title={t("merchantPages.campaignForm.details")}>
          <div className="grid gap-4">
            {stores.length > 1 && (
              <Field label={t("merchantPages.campaignForm.store")} htmlFor="store" required>
                <Select
                  id="store"
                  name="store"
                  autoComplete="off"
                  value={effectiveStoreId}
                  onChange={(e) => setStoreId(e.target.value)}
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label={t("merchantPages.campaignForm.name")} htmlFor="name" required>
              <Input
                id="name"
                name="campaign-name"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("merchantPages.campaignForm.namePlaceholder")}
                required
              />
            </Field>
            <Field
              label={t("merchantPages.campaignForm.destination")}
              htmlFor="dest"
              hint={t("merchantPages.campaignForm.destinationHint")}
            >
              <Input
                id="dest"
                name="destination-url"
                autoComplete="off"
                type="url"
                inputMode="url"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder={t("merchantPages.campaignForm.destinationPlaceholder")}
              />
            </Field>
            <Field label={t("merchantPages.campaignForm.terms")} htmlFor="terms" required>
              <Textarea
                id="terms"
                name="terms"
                autoComplete="off"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder={t("merchantPages.campaignForm.termsPlaceholder")}
                required
              />
            </Field>
          </div>
        </Section>

        <Section title={t("merchantPages.campaignForm.offer")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("merchantPages.campaignForm.discount")} htmlFor="discount" required>
              <Input
                id="discount"
                name="discount-percent"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </Field>
            <Field label={t("merchantPages.campaignForm.commission")} htmlFor="commission" required>
              <Input
                id="commission"
                name="commission-percent"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </Field>
            <Field label={t("merchantPages.campaignForm.startDate")} htmlFor="start" required>
              <Input
                id="start"
                name="start-date"
                type="date"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </Field>
            <Field label={t("merchantPages.campaignForm.endDateOptional")} htmlFor="end">
              <Input
                id="end"
                name="end-date"
                type="date"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-navy">
            <input
              type="checkbox"
              name="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-orange"
            />
            {t("merchantPages.campaignForm.activateNow")}
          </label>
        </Section>

        <Section
          title={t("merchantPages.campaignForm.codes")}
          description={t("merchantPages.campaignForm.codesDescription")}
        >
          <SegmentedControl
            options={[
              { value: "generate", label: t("merchantPages.campaignForm.generate") },
              { value: "upload", label: t("merchantPages.campaignForm.upload") },
            ]}
            value={codeMode}
            onChange={setCodeMode}
          />
          {codeMode === "generate" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t("merchantPages.campaignForm.prefix")} htmlFor="prefix">
                <Input
                  id="prefix"
                  name="code-prefix"
                  autoComplete="off"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </Field>
              <Field label={t("merchantPages.campaignForm.count")} htmlFor="count" hint="1–500">
                <Input
                  id="count"
                  name="code-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </Field>
            </div>
          ) : (
            <Field label={t("merchantPages.campaignForm.codesLabel")} htmlFor="codes" className="mt-4">
              <Textarea
                id="codes"
                name="codes"
                autoComplete="off"
                value={uploaded}
                onChange={(e) => setUploaded(e.target.value)}
                placeholder={"SAVE20-AAA\nSAVE20-BBB\nSAVE20-CCC"}
                className="min-h-32 font-mono text-xs"
              />
            </Field>
          )}
        </Section>

        {error && (
          <p className="rounded-input bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={submitting}>
            {t("merchantPages.campaignForm.create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
