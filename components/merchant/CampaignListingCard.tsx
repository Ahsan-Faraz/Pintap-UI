"use client";

import Link from "next/link";
import { TagIcon, ClockIcon } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/Button";
import type { CampaignMetrics, CampaignSummary } from "@/lib/types";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const CARD_LINE = "#E4E7EC";
const MUTED = "#94A3B8";

const ICON_THEMES = [
  { bg: "bg-[#E8F8EF]", icon: "text-[#086838]" },
  { bg: "bg-orange/15", icon: "text-orange" },
  { bg: "bg-blue/15", icon: "text-[#076985]" },
  { bg: "bg-purple/15", icon: "text-purple" },
] as const;

const OUTLINE_BTN =
  "inline-flex h-9 shrink-0 items-center rounded-full border bg-white px-4 text-sm font-semibold text-navy transition hover:border-navy/25 focus-ring";

function themeForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % ICON_THEMES.length;
  return ICON_THEMES[h]!;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateRange(start: string, end: string | null): string {
  if (!end) return formatShortDate(start);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function isLowOnCodes(campaign: CampaignSummary): boolean {
  if (campaign.codesTotal <= 0) return false;
  if (campaign.codesAvailable <= 3) return true;
  return campaign.codesAvailable / campaign.codesTotal <= 0.25;
}

function codesProgressColor(low: boolean): string {
  return low ? "bg-orange" : "bg-[#22C55E]";
}

function codesTextColor(low: boolean): string {
  return low ? "text-orange" : "text-[#086838]";
}

function MetricCell({
  label,
  value,
  valueClassName,
  children,
}: {
  label: string;
  value?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p
        className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]"
        style={{ color: MUTED }}
      >
        {label}
      </p>
      {children ?? (
        <p className={cn("text-lg font-extrabold tabular-nums text-navy", valueClassName)}>
          {value}
        </p>
      )}
    </div>
  );
}

export function ActiveCampaignCard({
  campaign,
  metrics,
  currency,
  labels,
  onPause,
  pausing,
}: {
  campaign: CampaignSummary;
  metrics: CampaignMetrics;
  currency: string;
  labels: {
    live: string;
    lowCodes: string;
    paused: string;
    edit: string;
    pause: string;
    addCodes: string;
    recommenders: string;
    clicks: string;
    orders: string;
    revenue: string;
    discountCodes: string;
    codesLeft: (available: number, total: number) => string;
    subtitle: (discount: number, commission: number, dates: string) => string;
  };
  onPause?: () => void;
  pausing?: boolean;
}) {
  const theme = themeForId(campaign.id);
  const lowCodes = isLowOnCodes(campaign);
  const isPaused = campaign.status === "paused";
  const filled =
    campaign.codesTotal > 0
      ? (campaign.codesAvailable / campaign.codesTotal) * 100
      : 0;

  const statusLabel = isPaused
    ? labels.paused
    : lowCodes
      ? labels.lowCodes
      : labels.live;
  const statusColor = isPaused
    ? "text-navy/45"
    : lowCodes
      ? "text-orange"
      : "text-[#086838]";

  const discount = campaign.discountPercent ?? 0;
  const commission = campaign.commissionPercent ?? 0;
  const dates = formatDateRange(campaign.startAt, campaign.endAt);

  return (
    <article className="app-flat-card overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              theme.bg,
            )}
          >
            <TagIcon className={cn("h-5 w-5", theme.icon)} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-lg font-extrabold text-navy">{campaign.name}</h2>
              <span className={cn("text-sm font-semibold", statusColor)}>
                <span aria-hidden="true">• </span>
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-navy/45">
              {labels.subtitle(discount, commission, dates)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
          {lowCodes ? (
            <Link
              href={`/merchant/campaigns/${campaign.id}`}
              className={buttonClasses({
                variant: "primary",
                size: "sm",
                className: "rounded-full px-4",
              })}
            >
              {labels.addCodes}
            </Link>
          ) : (
            <button
              type="button"
              className={OUTLINE_BTN}
              style={{ borderColor: CARD_LINE }}
              onClick={onPause}
              disabled={pausing || isPaused}
            >
              {labels.pause}
            </button>
          )}
          <Link
            href={`/merchant/campaigns/${campaign.id}`}
            className={OUTLINE_BTN}
            style={{ borderColor: CARD_LINE }}
          >
            {labels.edit}
          </Link>
        </div>
      </div>

      <div
        className="mt-6 flex flex-col gap-5 border-t pt-5 sm:flex-row sm:items-end sm:gap-4"
        style={{ borderColor: "#EEF1F4" }}
      >
        <MetricCell
          label={labels.recommenders}
          value={formatNumber(metrics.recommenders)}
        />
        <MetricCell label={labels.clicks} value={formatNumber(metrics.clicks)} />
        <MetricCell label={labels.orders} value={formatNumber(metrics.orders)} />
        <MetricCell
          label={labels.revenue}
          value={formatCurrencyMinor(metrics.revenueMinor, currency)}
          valueClassName="text-[#086838]"
        />
        <MetricCell label={labels.discountCodes}>
          <p className={cn("text-sm font-bold tabular-nums", codesTextColor(lowCodes))}>
            {labels.codesLeft(campaign.codesAvailable, campaign.codesTotal)}
          </p>
          <div
            className="mt-2 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full"
            style={{ backgroundColor: "#EDF0F4" }}
          >
            <div
              className={cn("h-full rounded-full transition-all", codesProgressColor(lowCodes))}
              style={{ width: `${Math.min(100, Math.max(0, filled))}%` }}
            />
          </div>
        </MetricCell>
      </div>
    </article>
  );
}

export function ScheduledCampaignCard({
  campaign,
  labels,
}: {
  campaign: CampaignSummary;
  labels: {
    edit: string;
    starts: (date: string) => string;
    subtitle: (discount: number, commission: number, codes: number) => string;
  };
}) {
  const discount = campaign.discountPercent ?? 0;
  const commission = campaign.commissionPercent ?? 0;
  const startLabel = formatShortDate(campaign.startAt);

  return (
    <article
      className="overflow-hidden rounded-card border-2 border-dashed bg-white p-5 sm:p-6"
      style={{ borderColor: "rgba(0, 46, 81, 0.14)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue/15">
            <ClockIcon className="h-5 w-5 text-[#076985]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-navy">{campaign.name}</h2>
              <span className="inline-flex h-7 items-center rounded-full bg-blue/15 px-3 text-xs font-bold text-[#076985]">
                {labels.starts(startLabel)}
              </span>
            </div>
            <p className="mt-1 text-sm text-navy/45">
              {labels.subtitle(discount, commission, campaign.codesTotal)}
            </p>
          </div>
        </div>

        <Link
          href={`/merchant/campaigns/${campaign.id}`}
          className={cn(OUTLINE_BTN, "self-start")}
          style={{ borderColor: CARD_LINE }}
        >
          {labels.edit}
        </Link>
      </div>
    </article>
  );
}

export function EndedCampaignCard({
  campaign,
  metrics,
  currency,
  labels,
}: {
  campaign: CampaignSummary;
  metrics: CampaignMetrics;
  currency: string;
  labels: {
    ended: string;
    edit: string;
    recommenders: string;
    clicks: string;
    orders: string;
    revenue: string;
    subtitle: (discount: number, commission: number, dates: string) => string;
  };
}) {
  const theme = themeForId(campaign.id);
  const discount = campaign.discountPercent ?? 0;
  const commission = campaign.commissionPercent ?? 0;
  const dates = formatDateRange(campaign.startAt, campaign.endAt);

  return (
    <article className="app-flat-card overflow-hidden p-5 sm:p-6 opacity-90">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              theme.bg,
            )}
          >
            <TagIcon className={cn("h-5 w-5", theme.icon)} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-lg font-extrabold text-navy">{campaign.name}</h2>
              <span className="text-sm font-semibold text-navy/45">
                <span aria-hidden="true">• </span>
                {labels.ended}
              </span>
            </div>
            <p className="mt-1 text-sm text-navy/45">
              {labels.subtitle(discount, commission, dates)}
            </p>
          </div>
        </div>

        <Link
          href={`/merchant/campaigns/${campaign.id}`}
          className={cn(OUTLINE_BTN, "self-start")}
          style={{ borderColor: CARD_LINE }}
        >
          {labels.edit}
        </Link>
      </div>

      <div
        className="mt-6 flex flex-col gap-5 border-t pt-5 sm:flex-row sm:items-end sm:gap-4"
        style={{ borderColor: "#EEF1F4" }}
      >
        <MetricCell
          label={labels.recommenders}
          value={formatNumber(metrics.recommenders)}
        />
        <MetricCell label={labels.clicks} value={formatNumber(metrics.clicks)} />
        <MetricCell label={labels.orders} value={formatNumber(metrics.orders)} />
        <MetricCell
          label={labels.revenue}
          value={formatCurrencyMinor(metrics.revenueMinor, currency)}
        />
      </div>
    </article>
  );
}

export { DEFAULT_CURRENCY };
