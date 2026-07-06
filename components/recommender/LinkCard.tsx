"use client";

import Link from "next/link";
import Thumb from "@/components/ui/Thumb";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import { useT } from "@/context/I18nProvider";
import type { LinkSummary } from "@/lib/types";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";

export default function LinkCard({
  link,
  onSelect,
}: {
  link: LinkSummary;
  /** When provided, the card opens the preview popup instead of navigating (R-05/R-10). */
  onSelect?: (link: LinkSummary) => void;
}) {
  const t = useT();
  const className =
    "flex h-full w-full flex-col text-left rounded-card border border-navy/10 bg-surface p-3 shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-orange/30 hover:shadow-float focus-ring";
  const inner = (
    <>
      <div className="flex flex-1 gap-3 pb-3">
        {/* Bigger product image (client feedback: people want to see the product). */}
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
      {/* mt-auto pins the metrics row to the card bottom when cards in a
          rail/list are stretched to equal heights. */}
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
      <p className="text-[11px] text-navy/45">{label}</p>
    </div>
  );
}
