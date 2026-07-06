import type { Store, StoreSummary } from "@/lib/types";

/** Permanent brand asset for Fahrrad XXL (served from /public). */
export const FAHRRAD_XXL_LOGO = "/XXL1.png";

type StoreLike = Pick<
  Store,
  "name" | "logoUrl" | "primaryDomain" | "merchantDomain" | "slug"
>;

/** True when the store is Fahrrad XXL (any known domain/name variant). */
export function isFahrradXxlStore(store: StoreLike): boolean {
  const blob = [store.name, store.slug, store.primaryDomain, store.merchantDomain]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return blob.includes("fahrradxxl") || blob.includes("fahrradxxlde");
}

/** Resolve the logo URL, applying permanent overrides for branded partners. */
export function brandedStoreLogo(store: StoreLike): string | null {
  if (isFahrradXxlStore(store)) return FAHRRAD_XXL_LOGO;
  return store.logoUrl;
}

export function withStoreBranding<T extends StoreSummary>(store: T): T {
  const logoUrl = brandedStoreLogo(store);
  return logoUrl === store.logoUrl ? store : { ...store, logoUrl };
}

export function withStoreBrandingList(stores: StoreSummary[]): StoreSummary[] {
  return stores.map(withStoreBranding);
}

function createFahrradXxlFallback(): StoreSummary {
  return {
    id: "fahrrad-xxl-pinned",
    name: "Fahrradxxl",
    slug: "fahrrad-xxl",
    merchantDomain: "fahrrad-xxl.de",
    primaryDomain: "fahrrad-xxl.de",
    externalId: null,
    logoUrl: FAHRRAD_XXL_LOGO,
    countryCode: "DE",
    currency: "EUR",
    category: null,
    connected: true,
    connectedAt: null,
    disconnectedAt: null,
    status: "active",
    createdAt: "",
    updatedAt: "",
    activeCampaignCount: 1,
    bestDiscountPercent: null,
    bestCommissionPercent: null,
  };
}

/**
 * Home dashboard: always include Fahrrad XXL in the shops rail (first),
 * using the real connected store when available.
 */
export function ensureFahrradXxlOnHomeShops(
  myShops: StoreSummary[],
  connectedShops: StoreSummary[],
): StoreSummary[] {
  const brandedMy = withStoreBrandingList(myShops);
  const brandedConnected = withStoreBrandingList(connectedShops);

  const fahrrad =
    brandedConnected.find(isFahrradXxlStore) ??
    brandedMy.find(isFahrradXxlStore) ??
    createFahrradXxlFallback();

  const rest = brandedMy.filter((s) => s.id !== fahrrad.id);
  return [fahrrad, ...rest];
}
