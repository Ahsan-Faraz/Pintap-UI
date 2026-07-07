"use client";

import Link from "next/link";
import Thumb from "@/components/ui/Thumb";
import Badge from "@/components/ui/Badge";
import { useT } from "@/context/I18nProvider";
import { cn } from "@/lib/utils";
import type { StoreSummary } from "@/lib/types";
import { formatPercent } from "@/lib/format";
import { brandedStoreLogo } from "@/lib/store-branding";

export default function StoreCard({
  store,
  onSelect,
  variant = "default",
}: {
  store: StoreSummary;
  onSelect?: () => void;
  /** `compact` = logo-focused tile for the home-dashboard rail. */
  variant?: "default" | "compact";
}) {
  const t = useT();
  const logoSrc = brandedStoreLogo(store);

  const inner =
    variant === "compact" ? (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-2">
        <Thumb
          src={logoSrc}
          alt={store.name}
          className="h-[4.25rem] w-[4.25rem] shrink-0 rounded-[14px] bg-white/90 p-1 sm:h-[4.75rem] sm:w-[4.75rem] lg:h-20 lg:w-20"
        />
        <p className="line-clamp-2 text-center text-xs text-navy/55">
          {store.name}
        </p>
      </div>
    ) : (
      <>
        <div className="flex items-center gap-3">
          <Thumb
            src={logoSrc}
            alt={store.name}
            className="h-12 w-12 shrink-0 rounded-input"
          />
          <div className="min-w-0">
            <p className="truncate font-bold text-navy">{store.name}</p>
            <p className="truncate text-xs text-navy/55">
              {store.category ?? store.primaryDomain}
            </p>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Badge tone="info">
            {t(
              store.activeCampaignCount === 1
                ? "stores.activeCampaignOne"
                : "stores.activeCampaignOther",
              { count: store.activeCampaignCount },
            )}
          </Badge>
          {store.bestDiscountPercent != null && (
            <Badge tone="success">
              {t("stores.upToDiscount", {
                percent: formatPercent(store.bestDiscountPercent),
              })}
            </Badge>
          )}
          {store.bestCommissionPercent != null && (
            <Badge tone="orange">
              {t("stores.commission", {
                percent: formatPercent(store.bestCommissionPercent),
              })}
            </Badge>
          )}
        </div>
      </>
    );

  const className = cn(
    "flex h-full w-full flex-col text-left transition-[transform,box-shadow] focus-ring active:scale-[0.98]",
    variant === "compact"
      ? "app-flat-card min-h-[128px] p-3 sm:min-h-[136px] sm:p-4"
      : "rounded-card border border-navy/10 bg-surface p-4 shadow-card hover:-translate-y-0.5 hover:border-orange/30 hover:shadow-float",
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href="/app/discover" className={className}>
      {inner}
    </Link>
  );
}
