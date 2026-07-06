import type {
  Campaign,
  CampaignStatus,
  CampaignSummary,
  FundingState,
  Link,
  LinkDetail,
  LinkMetrics,
  LinkOrderAttribution,
  LinkStatus,
  LinkSummary,
  LinkType,
  OrderSummary,
  Profile,
  Role,
  SocialProfile,
  Store,
  StoreStatus,
  StoreSummary,
} from "@/lib/types";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { faviconUrl } from "@/lib/url-utils";
import { brandedStoreLogo } from "@/lib/store-branding";
import type { Tables } from "./database.types";

type StoreRow = Tables<"stores">;
type CampaignRow = Tables<"campaigns">;
type LinkRow = Tables<"links">;
type CodeRow = Tables<"campaign_discount_codes">;
type AttributionRow = Tables<"link_order_attributions">;
type ProfileRow = Tables<"profiles">;

function mapSocialProfiles(value: unknown): SocialProfile[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => ({
      platform: typeof item.platform === "string" ? item.platform : "",
      accountName:
        typeof item.accountName === "string" ? item.accountName : "",
    }))
    .filter((item) => item.platform && item.accountName);
}

export function mapStore(row: StoreRow): Store {
  const store: Store = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    merchantDomain: row.merchant_domain,
    primaryDomain: row.primary_domain,
    externalId: row.external_store_id,
    logoUrl: row.logo_url,
    countryCode: row.country_code,
    currency: row.currency,
    category: row.category,
    connected: row.connected,
    connectedAt: row.connected_at,
    disconnectedAt: row.disconnected_at,
    status: row.status as StoreStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return { ...store, logoUrl: brandedStoreLogo(store) };
}

export function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    destinationUrl: row.destination_url,
    productHandle: row.product_handle,
    productId: row.product_id,
    terms: row.terms,
    discountPercent: row.discount_percent,
    commissionPercent: row.commission_percent,
    startAt: row.start_at,
    endAt: row.end_at,
    isActive: row.is_active,
    status: row.status as CampaignStatus,
    maxBudgetMinor: null,
    maxClaims: null,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLink(row: LinkRow): Link {
  return {
    id: row.id,
    userId: row.user_id,
    storeId: row.store_id,
    campaignId: row.campaign_id,
    discountCodeId: row.discount_code_id,
    type: row.type as LinkType,
    destinationUrl: row.destination_url,
    sourceHost: row.source_host,
    name: row.name,
    brand: row.brand,
    // Never render an empty tile: fall back to the site favicon for links whose
    // product image couldn't be scraped (bot-blocked storefronts, legacy rows).
    imageUrl: row.image_url ?? (row.source_host ? faviconUrl(row.source_host) : null),
    isVerified: row.is_verified,
    shortCode: row.short_code,
    shortUrl: row.short_url,
    status: row.status as LinkStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapProfile(row: ProfileRow, roles: Role[]): Profile {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    country: row.country,
    gender: row.gender,
    socialProfiles: mapSocialProfiles(row.social_profiles),
    acceptedTerms: row.accepted_terms,
    roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  };
}

export function mapAttribution(row: AttributionRow): LinkOrderAttribution {
  return {
    id: row.id,
    linkId: row.link_id,
    campaignId: row.campaign_id,
    discountCodeId: row.discount_code_id,
    externalOrderId: row.store_order_id,
    status: row.status as LinkOrderAttribution["status"],
    orderAmountMinor: row.order_amount_minor,
    commissionAmountMinor: row.commission_amount_minor,
    currency: row.currency,
    source: row.source,
    createdAt: row.created_at,
  };
}

export type CodeCounts = {
  codesTotal: number;
  codesAvailable: number;
  codesClaimed: number;
};

export function codeCountsForCampaign(
  codes: CodeRow[],
  campaignId: string,
): CodeCounts {
  const rows = codes.filter((c) => c.campaign_id === campaignId);
  return {
    codesTotal: rows.length,
    // "released" codes are reusable, so they count toward the available pool.
    codesAvailable: rows.filter(
      (c) => c.status === "available" || c.status === "released",
    ).length,
    codesClaimed: rows.filter((c) => c.status === "claimed").length,
  };
}

export function toStoreSummary(
  store: Store,
  campaigns: Campaign[],
): StoreSummary {
  const active = campaigns.filter(
    (c) => c.storeId === store.id && c.status === "active",
  );
  const bestDiscount = active.reduce<number | null>(
    (best, c) =>
      c.discountPercent != null && (best == null || c.discountPercent > best)
        ? c.discountPercent
        : best,
    null,
  );
  const bestCommission = active.reduce<number | null>(
    (best, c) =>
      c.commissionPercent != null &&
      (best == null || c.commissionPercent > best)
        ? c.commissionPercent
        : best,
    null,
  );
  return {
    ...store,
    activeCampaignCount: active.length,
    bestDiscountPercent: bestDiscount,
    bestCommissionPercent: bestCommission,
  };
}

export function toCampaignSummary(
  campaign: Campaign,
  store: Store | null,
  counts: CodeCounts,
  fundingState: FundingState = "not_funded",
): CampaignSummary {
  return {
    ...campaign,
    store: store
      ? { id: store.id, name: store.name, logoUrl: store.logoUrl }
      : null,
    ...counts,
    fundingState,
  };
}

export function linkMetrics(
  linkId: string,
  clickCount: number,
  attributions: LinkOrderAttribution[],
  currency = DEFAULT_CURRENCY,
): LinkMetrics {
  const attrs = attributions.filter((a) => a.linkId === linkId);
  const orders = attrs.length;
  const commissionMinor = attrs
    .filter((a) => a.status === "confirmed" || a.status === "pending")
    .reduce((sum, a) => sum + a.commissionAmountMinor, 0);
  return { clicks: clickCount, orders, commissionMinor, currency };
}

export function toLinkSummary(
  link: Link,
  ctx: {
    store: Store | null;
    campaign: Campaign | null;
    discountCode: string | null;
    metrics: LinkMetrics;
  },
): LinkSummary {
  return {
    ...link,
    store: ctx.store
      ? { id: ctx.store.id, name: ctx.store.name, logoUrl: ctx.store.logoUrl }
      : null,
    campaign: ctx.campaign
      ? {
          id: ctx.campaign.id,
          name: ctx.campaign.name,
          discountPercent: ctx.campaign.discountPercent,
          commissionPercent: ctx.campaign.commissionPercent,
        }
      : null,
    discountCode: ctx.discountCode,
    metrics: ctx.metrics,
  };
}

export function toLinkDetail(
  summary: LinkSummary,
  terms: string | null,
): LinkDetail {
  return { ...summary, terms, resolverUrl: summary.shortUrl };
}

export function toOrderSummary(
  attr: LinkOrderAttribution,
  ctx: {
    link: Pick<Link, "id" | "name" | "shortCode"> | null;
    store: Pick<Store, "id" | "name"> | null;
    recommender: Pick<Profile, "id" | "firstName" | "lastName"> | null;
    orderNumber: string | null;
    code: string | null;
  },
): OrderSummary {
  return {
    ...attr,
    ...ctx,
  };
}

export function storeById(stores: Store[], id: string | null): Store | null {
  if (!id) return null;
  return stores.find((s) => s.id === id) ?? null;
}

export function campaignById(
  campaigns: Campaign[],
  id: string | null,
): Campaign | null {
  if (!id) return null;
  return campaigns.find((c) => c.id === id) ?? null;
}
