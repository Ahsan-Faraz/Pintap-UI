import type { StoreSummary } from "@/lib/types";

/**
 * Shop "insight" metrics shown in the shop-details sheet (R-07).
 *
 * NOTE: Target/Trust are **derived demo metrics** computed deterministically from
 * the store id so the value is stable per shop. There is no backing data column
 * yet — when real shop-quality data exists, swap this helper for a service read.
 * (See RECOMMENDER_MVP_BACKLOG.md → R-07 / Data model changes.)
 */
export interface ShopInsights {
  /** Audience-match score 0–100 (emphasized red/orange in the UI). */
  target: number;
  /** Trust score 0–100 (emphasized green in the UI). */
  trust: number;
  /** Number of active offers/campaigns. */
  offers: number;
  /** Region/country the shop ships to. */
  availableIn: string | null;
  /** Public storefront domain. */
  website: string | null;
}

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function deriveShopInsights(store: StoreSummary): ShopInsights {
  const h = hash(store.id);
  return {
    target: 55 + (h % 41), // 55–95
    trust: 70 + ((h >>> 3) % 30), // 70–99
    offers: store.activeCampaignCount,
    availableIn: store.countryCode,
    website: store.primaryDomain ?? store.merchantDomain,
  };
}
