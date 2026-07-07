"use client";

import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Thumb from "@/components/ui/Thumb";
import { CheckCircleIcon, EuroIcon, PencilIcon } from "@/components/ui/icons";
import { useT } from "@/context/I18nProvider";
import { formatPercent } from "@/lib/format";
import type { CampaignSummary, LinkVerificationResult } from "@/lib/types";
import { cn } from "@/lib/utils";

function displayUrl(normalized: string): string {
  try {
    const u = new URL(normalized);
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.host}${path}`.replace(/\/$/, "");
  } catch {
    return normalized;
  }
}

function pickBestCampaign(campaigns: CampaignSummary[]): CampaignSummary | null {
  const claimable = campaigns.filter((c) => c.codesAvailable > 0);
  if (claimable.length === 0) return null;
  return [...claimable].sort(
    (a, b) => (b.commissionPercent ?? 0) - (a.commissionPercent ?? 0),
  )[0]!;
}

export default function CreateLinkCampaignStep({
  verification,
  name,
  onNameChange,
  campaignId,
  onCampaignChange,
  creating,
  error,
  onConfirm,
}: {
  verification: LinkVerificationResult;
  name: string;
  onNameChange: (value: string) => void;
  campaignId: string | null;
  onCampaignChange: (id: string | null) => void;
  creating: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  const t = useT();
  const bestCampaign = pickBestCampaign(verification.campaignOptions);
  const selectedCampaign =
    verification.campaignOptions.find((c) => c.id === campaignId) ?? null;
  const storeLabel =
    verification.store?.name ?? verification.brand ?? null;
  const showCampaigns =
    verification.isStoreConnected && verification.campaignOptions.length > 0;

  return (
    <div className="space-y-5">
      <div className="app-flat-card p-4">
        <div className="flex gap-3">
          <Thumb
            src={verification.imageUrl}
            alt={name || verification.name || ""}
            fit="cover"
            className="h-[72px] w-[72px] shrink-0 rounded-2xl bg-[#EDF0F4]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <Input
                id="link-name"
                name="link-name"
                autoComplete="off"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="border-0 bg-transparent p-0 text-base font-extrabold text-navy shadow-none focus:border-0 focus:ring-0"
                aria-label={t("appPages.createLink.linkName")}
              />
              <PencilIcon className="mt-1 h-4 w-4 shrink-0 text-navy/30" />
            </div>
            <p className="mt-1 truncate text-sm text-navy/45">
              {displayUrl(verification.normalizedUrl)}
            </p>
            {verification.isStoreConnected && storeLabel ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green/15 px-2.5 py-1 text-xs font-semibold text-[#086838]">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                {t("appPages.createLink.verifiedStore", { store: storeLabel })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {verification.isStoreConnected ? (
        <>
          <div>
            <h2 className="text-xl font-extrabold text-navy">
              {t("appPages.createLink.pickCampaign")}
            </h2>
            <p className="mt-1 text-sm text-navy/50">
              {t("appPages.createLink.pickCampaignDescription")}
            </p>
          </div>

          {showCampaigns ? (
            <div className="space-y-3">
              {verification.campaignOptions.map((campaign) => (
                <CampaignPickCard
                  key={campaign.id}
                  campaign={campaign}
                  selected={campaignId === campaign.id}
                  disabled={campaign.codesAvailable === 0}
                  bestForYou={bestCampaign?.id === campaign.id}
                  onSelect={() => onCampaignChange(campaign.id)}
                />
              ))}
            </div>
          ) : (
            <div className="app-flat-card p-4 text-sm text-navy/60">
              {t("appPages.createLink.noActiveCampaign")}
            </div>
          )}

          <NoCampaignPickCard
            selected={campaignId === null}
            onSelect={() => onCampaignChange(null)}
          />

          {selectedCampaign && (selectedCampaign.commissionPercent ?? 0) > 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-green/10 px-4 py-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green/15 text-[#086838]">
                <EuroIcon className="h-5 w-5" />
              </span>
              <p className="text-sm text-navy/70">
                {t("appPages.createLink.earningsHint", {
                  percent: formatPercent(selectedCampaign.commissionPercent ?? 0),
                })}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="app-flat-card p-4 text-sm text-navy/70">
          <p className="font-semibold text-navy">
            {t("appPages.createLink.notConnectedTitle")}
          </p>
          <p className="mt-1">{t("appPages.createLink.notConnectedDescription")}</p>
        </div>
      )}

      {error ? (
        <p className="text-sm font-medium text-red-600" aria-live="polite">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 space-y-2 border-t border-navy/10 bg-beige/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:bg-surface/95 lg:bottom-0">
        <Button fullWidth size="lg" loading={creating} onClick={onConfirm}>
          {verification.isStoreConnected && campaignId
            ? t("appPages.createLink.createEarning")
            : t("appPages.createLink.createSaved")}
        </Button>
      </div>
    </div>
  );
}

function CampaignPickCard({
  campaign,
  selected,
  disabled,
  bestForYou,
  onSelect,
}: {
  campaign: CampaignSummary;
  selected: boolean;
  disabled?: boolean;
  bestForYou?: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const hasDiscount =
    campaign.discountPercent != null && campaign.discountPercent > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative flex w-full gap-3 rounded-2xl border p-4 text-left transition focus-ring",
        disabled && "cursor-not-allowed opacity-55",
        selected
          ? "border-orange bg-white shadow-[0_0_0_1px_rgba(250,80,4,0.15)]"
          : "border-[#E4E7EC] bg-white hover:border-navy/20",
      )}
    >
      {bestForYou && !disabled ? (
        <span className="absolute -top-2.5 right-3 rounded-full bg-orange px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white">
          {t("appPages.createLink.bestForYou")}
        </span>
      ) : null}

      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-orange bg-orange" : "border-[#CBD5E1] bg-white",
        )}
        aria-hidden
      >
        {selected ? (
          <span className="h-2 w-2 rounded-full bg-white" />
        ) : null}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-navy">{campaign.name}</p>
        <p className="mt-1 text-sm text-navy/55">
          {hasDiscount ? (
            <>
              {t("appPages.createLink.buyerSaves")}{" "}
              <span className="font-bold text-navy">
                {formatPercent(campaign.discountPercent)}
              </span>
              {" · "}
            </>
          ) : (
            <>{t("appPages.createLink.noBuyerDiscount")} · </>
          )}
          {t("appPages.createLink.youEarn")}{" "}
          <span className="font-bold text-navy">
            {formatPercent(campaign.commissionPercent)}
          </span>
        </p>
      </div>
    </button>
  );
}

function NoCampaignPickCard({
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
      className={cn(
        "flex w-full gap-3 rounded-2xl border p-4 text-left transition focus-ring",
        selected
          ? "border-orange bg-white shadow-[0_0_0_1px_rgba(250,80,4,0.15)]"
          : "border-[#E4E7EC] bg-white hover:border-navy/20",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-orange bg-orange" : "border-[#CBD5E1] bg-white",
        )}
        aria-hidden
      >
        {selected ? (
          <span className="h-2 w-2 rounded-full bg-white" />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-navy">
          {t("appPages.createLink.noCampaign")}
        </p>
        <p className="mt-1 text-sm text-navy/45">
          {t("appPages.createLink.noCampaignPlain")}
        </p>
      </div>
    </button>
  );
}
