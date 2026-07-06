"use client";

import Link from "next/link";
import Thumb from "@/components/ui/Thumb";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import { useT } from "@/context/I18nProvider";
import { cn } from "@/lib/utils";
import type { LinkSummary } from "@/lib/types";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";

export default function LinkCard({
  link,
  onSelect,
  variant = "default",
}: {
  link: LinkSummary;
  /** When provided, the card opens the preview popup instead of navigating (R-05/R-10). */
  onSelect?: (link: LinkSummary) => void;
  /** `rail` = vertical home-dashboard card matching the mobile mock. */
  variant?: "default" | "rail";
}) {
  const t = useT();

  const className = cn(
    "flex h-full w-full min-w-0 flex-col text-left transition-[transform,box-shadow] focus-ring active:scale-[0.98]",
    variant === "rail"
      ? "clay-surface-sm min-h-[248px] overflow-hidden p-4 hover:-translate-y-0.5"
      : "rounded-card border border-navy/10 bg-surface p-3 shadow-card hover:-translate-y-0.5 hover:border-orange/30 hover:shadow-float",
  );

  const inner =
    variant === "rail" ? (
      <>
        <div className="mb-2">
          {link.campaign ? (
            <Badge tone="success" className="text-[10px]">
              {t("links.campaign")}
            </Badge>
          ) : (
            <Badge tone="neutral" className="text-[10px]">
              {t("links.noCampaign")}
            </Badge>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center pb-2">
          <Thumb
            src={link.imageUrl}
            alt={link.name}
            fit="contain"
            width={160}
            height={160}
            className="h-28 w-full rounded-[14px] bg-white/80 p-2 sm:h-32"
          />
          <p className="mt-2.5 line-clamp-2 w-full min-w-0 text-center text-sm font-bold text-navy">
            {link.name}
          </p>
          <p className="mt-0.5 w-full min-w-0 truncate text-center text-xs text-navy/50">
            {link.store?.name ?? link.sourceHost}
          </p>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-1 border-t border-dotted border-navy/12 pt-3 text-center">
          <Metric label={t("links.clicks")} value={formatNumber(link.metrics.clicks)} />
          <Metric label={t("links.orders")} value={formatNumber(link.metrics.orders)} />
          <Metric
            label={t("links.earned")}
            value={formatCurrencyMinor(
              link.metrics.commissionMinor,
              link.metrics.currency,
              { compact: true },
            )}
            accent
          />
        </div>
      </>
    ) : (
      <>
        <div className="flex flex-1 gap-3 pb-3">
          <Thumb
            src={link.imageUrl}
            alt={link.name}
            fit="contain"
            width={128}
            height={128}
            className="h-28 w-28 shrink-0 rounded-input bg-white p-1 sm:h-32 sm:w-32"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-semibold text-navy">{link.name}</p>
              <StatusBadge status={link.status} />
            </div>
            <p className="truncate text-xs text-navy/55">
              {link.store?.name ?? link.sourceHost}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="truncate text-xs font-medium text-navy/45">
                /l/{link.shortCode}
              </span>
              {link.campaign ? (
                <Badge tone="info">{t("links.campaign")}</Badge>
              ) : (
                <Badge tone="neutral">{t("links.noCampaign")}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-navy/10 pt-3 text-center">
          <Metric label={t("links.clicks")} value={formatNumber(link.metrics.clicks)} />
          <Metric label={t("links.orders")} value={formatNumber(link.metrics.orders)} />
          <Metric
            label={t("links.earned")}
            value={formatCurrencyMinor(
              link.metrics.commissionMinor,
              link.metrics.currency,
              { compact: true },
            )}
            accent
          />
        </div>
      </>
    );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(link)} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={`/app/links/${link.id}`} className={className}>
      {inner}
    </Link>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-sm font-extrabold ${accent ? "text-[#0c7a45]" : "text-navy"}`}
      >
        {value}
      </p>
      <p className="text-[10px] text-navy/45">{label}</p>
    </div>
  );
}
