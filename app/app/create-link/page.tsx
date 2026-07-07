"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card, { Section } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import PasteButton from "@/components/ui/PasteButton";
import Thumb from "@/components/ui/Thumb";
import Spinner from "@/components/ui/Spinner";
import CreateLinkShareView from "@/components/recommender/CreateLinkShareView";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { translateError, translateMessage } from "@/lib/i18n/errors";
import type { Translator } from "@/lib/i18n/translate";
import { AlertIcon, InfoIcon } from "@/components/ui/icons";
import { linksService } from "@/services";
import type {
  CampaignSummary,
  LinkDetail,
  LinkVerificationResult,
} from "@/lib/types";
import { formatPercent } from "@/lib/format";
import { normalizeLinkUrl } from "@/lib/url-utils";

function linkTypeLabel(t: Translator, type: string): string {
  if (type === "product") return t("appPages.linkDetail.typeProduct");
  if (type === "shop") return t("appPages.linkDetail.typeShop");
  if (type === "other") return t("appPages.linkDetail.typeOther");
  return type;
}

export default function CreateLinkPage() {
  const { toast } = useToast();
  const t = useT();
  const [url, setUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<LinkVerificationResult | null>(
    null,
  );
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<LinkDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify(target?: string) {
    const value = (target ?? url).trim();
    const normalized = normalizeLinkUrl(value);
    if (!normalized) {
      setError(t("appPages.createLink.invalidUrl"));
      return;
    }
    setError(null);
    setVerifying(true);
    setVerification(null);
    try {
      const result = await linksService.verifyUrl(normalized);
      setVerification(result);
      if (!result.ok) {
        setError(
          translateMessage(t, result.message, "appPages.createLink.verifyFailed"),
        );
        return;
      }
      setName(result.name ?? "");
      setCampaignId(
        result.campaignOptions.find((c) => c.codesAvailable > 0)?.id ?? null,
      );
    } finally {
      setVerifying(false);
    }
  }

  // Prefill + auto-verify when arriving from a quick-paste box (?url=).
  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get("url");
    if (prefill) {
      setUrl(prefill);
      void verify(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OK on the verification view: create the link, then open the preview popup (R-02 → R-03).
  async function confirm() {
    if (!verification) return;
    setCreating(true);
    setError(null);
    try {
      const link = await linksService.createLink({
        url: verification.normalizedUrl,
        name,
        type: verification.type,
        campaignId,
      });
      setCreated(link);
      toast({ title: t("appPages.createLink.createdToast"), variant: "success" });
    } catch (e) {
      setError(translateError(t, e, "appPages.createLink.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  function reset() {
    setUrl("");
    setVerification(null);
    setCreated(null);
    setName("");
    setCampaignId(null);
    setError(null);
  }

  const selectedCampaign =
    verification?.campaignOptions.find((c) => c.id === campaignId) ?? null;
  const hasClaimableCampaign = verification?.campaignOptions.some(
    (c) => c.codesAvailable > 0,
  );

  if (created) {
    return (
      <CreateLinkShareView link={created} onBack={reset} />
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={t("appPages.createLink.title")}
        description={t("appPages.createLink.description")}
      />

      <Card className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <Field label={t("appPages.createLink.urlLabel")} htmlFor="url" error={error}>
            <div className="flex gap-2">
              <Input
                id="url"
                name="destination-url"
                autoComplete="off"
                type="text"
                inputMode="url"
                placeholder={t("appPages.createLink.urlPlaceholder")}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <PasteButton onPaste={setUrl} />
            </div>
          </Field>
          {/* Button below the field (matches the homepage Create-Link section). */}
          <Button
            type="submit"
            fullWidth
            className="mt-3"
            loading={verifying}
            disabled={!url.trim()}
          >
            {t("appPages.createLink.verify")}
          </Button>
        </form>
      </Card>

      {verifying && (
        <Card className="mt-4 flex items-center gap-3 p-5 text-navy/60">
          <Spinner /> {t("appPages.createLink.verifying")}
        </Card>
      )}

      {verification?.ok && (
        <div className="mt-4 space-y-4">
          {/* Verification view: product image + name + campaign info (R-02). */}
          <Section title={t("appPages.createLink.previewSection")}>
            <div className="flex gap-4">
              <Thumb
                src={verification.imageUrl}
                alt={verification.name ?? ""}
                fit="contain"
                className="h-20 w-20 shrink-0 rounded-input bg-white p-1"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-navy/45">
                  {verification.brand}
                </p>
                <Field label={t("appPages.createLink.linkName")} htmlFor="name" className="mt-1">
                  <Input
                    id="name"
                    name="link-name"
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <p className="mt-2 truncate text-xs text-navy/50">
                  {verification.normalizedUrl}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="neutral">{linkTypeLabel(t, verification.type)}</Badge>
                  {verification.isStoreConnected ? (
                    <Badge tone="success">{t("appPages.createLink.storeConnected")}</Badge>
                  ) : (
                    <Badge tone="warning">{t("appPages.createLink.notOnPintap")}</Badge>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {verification.isStoreConnected ? (
            <Section
              title={t("appPages.createLink.chooseCampaign")}
              description={t("appPages.createLink.chooseCampaignDescription")}
            >
              {verification.campaignOptions.length === 0 ? (
                <div className="flex items-start gap-3 rounded-card border border-stroke bg-beige/40 p-4">
                  <span className="mt-0.5 text-orange">
                    <InfoIcon />
                  </span>
                  <p className="text-sm text-navy/70">
                    {t("appPages.createLink.noActiveCampaign")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {!hasClaimableCampaign ? (
                    <div className="flex items-start gap-3 rounded-card border border-stroke bg-beige/40 p-4">
                      <span className="mt-0.5 text-orange">
                        <InfoIcon />
                      </span>
                      <p className="text-sm text-navy/70">
                        {t("appPages.createLink.noCampaignCodes")}
                      </p>
                    </div>
                  ) : null}
                  {verification.campaignOptions.map((c) => (
                    <CampaignOption
                      key={c.id}
                      campaign={c}
                      selected={campaignId === c.id}
                      disabled={c.codesAvailable === 0}
                      onSelect={() => setCampaignId(c.id)}
                    />
                  ))}
                </div>
              )}
              <NoCampaignOption
                selected={campaignId === null}
                onSelect={() => setCampaignId(null)}
              />
            </Section>
          ) : (
            <Card className="flex items-start gap-3 p-4">
              <span className="mt-0.5 text-orange">
                <AlertIcon />
              </span>
              <div className="text-sm text-navy/70">
                <p className="font-semibold text-navy">
                  {t("appPages.createLink.notConnectedTitle")}
                </p>
                <p className="mt-0.5">
                  {t("appPages.createLink.notConnectedDescription")}
                </p>
              </div>
            </Card>
          )}

          {/* General notices + terms (R-02 / R-16 T&C). */}
          <Section title={t("appPages.createLink.noticesTitle")}>
            <ul className="space-y-2 text-sm text-navy/70">
              {selectedCampaign?.terms && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-navy/40">
                    <InfoIcon />
                  </span>
                  <span>
                    <span className="font-semibold text-navy">
                      {t("appPages.linkDetail.campaignTerms")}:
                    </span>{" "}
                    {selectedCampaign.terms}
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-navy/40">
                  <InfoIcon />
                </span>
                <span>{t("appPages.createLink.trackingNotice")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-navy/40">
                  <InfoIcon />
                </span>
                <span>{t("appPages.createLink.termsNotice")}</span>
              </li>
            </ul>
          </Section>

          {error && (
            <p className="text-sm font-medium text-red-600" aria-live="polite">
              {error}
            </p>
          )}

          {/* Sticky confirmation — OK creates the link, then opens the preview popup.
              Offset above the fixed mobile tab bar; flush to the viewport on desktop. */}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 space-y-2 border-t border-navy/10 bg-beige/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:bg-surface/95 lg:bottom-0">
            <Button fullWidth size="lg" loading={creating} onClick={confirm}>
              {t("common.ok")}
            </Button>
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-input text-center text-sm font-semibold text-navy/50 hover:text-navy focus-ring"
            >
              {t("appPages.createLink.startOver")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignOption({
  campaign,
  selected,
  disabled,
  onSelect,
}: {
  campaign: CampaignSummary;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-disabled={disabled}
      className={`flex w-full items-center justify-between gap-3 rounded-card border p-3 text-left transition-colors focus-ring ${
        disabled
          ? "cursor-not-allowed border-stroke bg-navy/[0.02] opacity-60"
          : selected
            ? "border-orange bg-orange/5"
            : "border-stroke hover:bg-navy/[0.02]"
      }`}
    >
      <div>
        <p className="font-semibold text-navy">{campaign.name}</p>
        <p className="mt-0.5 text-xs text-navy/55">
          {t("appPages.createLink.campaignOptionMeta", {
            discount: formatPercent(campaign.discountPercent),
            commission: formatPercent(campaign.commissionPercent),
          })}
        </p>
      </div>
      <Badge tone={campaign.codesAvailable > 0 ? "success" : "neutral"}>
        {t("stores.codes", { count: campaign.codesAvailable })}
      </Badge>
    </button>
  );
}

function NoCampaignOption({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`mt-2 flex w-full items-center justify-between gap-3 rounded-card border p-3 text-left transition-colors focus-ring ${
        selected ? "border-orange bg-orange/5" : "border-stroke hover:bg-navy/[0.02]"
      }`}
    >
      <div>
        <p className="font-semibold text-navy">
          {t("appPages.createLink.noCampaign")}
        </p>
        <p className="mt-0.5 text-xs text-navy/55">
          {t("appPages.createLink.noCampaignDescription")}
        </p>
      </div>
    </button>
  );
}
