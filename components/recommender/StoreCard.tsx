"use client";

import Link from "next/link";
import Thumb from "@/components/ui/Thumb";
import Badge from "@/components/ui/Badge";
import { useT } from "@/context/I18nProvider";
import type { StoreSummary } from "@/lib/types";
import { formatPercent } from "@/lib/format";

export default function StoreCard({
  store,
  onSelect,
}: {
  store: StoreSummary;
  onSelect?: () => void;
}) {
  const t = useT();
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <Thumb
          src={store.logoUrl}
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
      {/* mt-auto pins the badge row to the card bottom when cards in a rail/grid
          are stretched to equal heights. */}
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

  const className =
    "flex h-full w-full flex-col rounded-card border border-navy/10 bg-surface p-4 text-left shadow-card transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-orange/30 hover:shadow-float focus-ring";

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
