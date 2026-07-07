"use client";

import Thumb from "@/components/ui/Thumb";
import { CheckCircleIcon } from "@/components/ui/icons";
import { useT } from "@/context/I18nProvider";
import { cn } from "@/lib/utils";
import type { StoreSummary } from "@/lib/types";
import { formatPercent } from "@/lib/format";
import { brandedStoreLogo } from "@/lib/store-branding";

export default function DiscoverShopCard({
  store,
  joined,
  onSelect,
  onJoin,
}: {
  store: StoreSummary;
  joined: boolean;
  onSelect: () => void;
  onJoin: () => void;
}) {
  const t = useT();
  const logoSrc = brandedStoreLogo(store);

  const campaignLine = t(
    store.activeCampaignCount === 1
      ? "appPages.discover.campaignOne"
      : "appPages.discover.campaignOther",
    { count: store.activeCampaignCount },
  );

  const categoryLine = [store.category, campaignLine].filter(Boolean).join(" · ");

  const discountLabel =
    store.bestDiscountPercent != null
      ? store.activeCampaignCount > 1
        ? t("stores.upToDiscount", {
            percent: formatPercent(store.bestDiscountPercent),
          })
        : t("stores.discount", {
            percent: formatPercent(store.bestDiscountPercent),
          })
      : null;

  const earnLabel =
    store.bestCommissionPercent != null
      ? t("appPages.discover.earnPercent", {
          percent: formatPercent(store.bestCommissionPercent),
        })
      : null;

  return (
    <article className="app-flat-card p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex flex-1 items-start gap-3 text-left focus-ring rounded-input"
        >
          <Thumb
            src={logoSrc}
            alt={store.name}
            className="h-12 w-12 shrink-0 rounded-full bg-[#EDF0F4] object-cover"
          />
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-base font-extrabold text-navy">
              {store.name}
            </p>
            <p className="mt-0.5 truncate text-sm text-navy/45">{categoryLine}</p>
          </div>
        </button>

        {joined ? (
          <span
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4",
              "bg-green/15 text-sm font-semibold text-[#086838]",
            )}
          >
            <CheckCircleIcon className="h-4 w-4" />
            {t("appPages.discover.joined")}
          </span>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-orange bg-white px-5 text-sm font-semibold text-orange transition hover:bg-orange/5 focus-ring"
          >
            {t("appPages.discover.join")}
          </button>
        )}
      </div>

      {(discountLabel || earnLabel) && (
        <div className="mt-3 flex flex-wrap gap-2 pl-[3.75rem]">
          {discountLabel ? (
            <span className="inline-flex items-center rounded-md bg-[#EDF0F4] px-2.5 py-1 text-xs font-semibold text-navy/65">
              {discountLabel}
            </span>
          ) : null}
          {earnLabel ? (
            <span className="inline-flex items-center rounded-md bg-green/15 px-2.5 py-1 text-xs font-semibold text-[#086838]">
              {earnLabel}
            </span>
          ) : null}
        </div>
      )}
    </article>
  );
}
