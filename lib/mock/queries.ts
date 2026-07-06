/**
 * Pure selectors that join the mock tables into the view models the UI consumes.
 * Kept separate from the services so the join logic is shared and testable.
 */
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { MockDb } from "./seed";
import type {
  Campaign,
  CampaignSummary,
  FundingState,
  Link,
  LinkDetail,
  LinkMetrics,
  LinkOrderAttribution,
  LinkSummary,
  OrderSummary,
  Store,
  StoreSummary,
} from "@/lib/types";
import { brandedStoreLogo } from "@/lib/store-branding";

export function linkMetrics(db: MockDb, linkId: string): LinkMetrics {
  const store = db.links.find((l) => l.id === linkId)?.storeId;
  const currency =
    db.stores.find((s) => s.id === store)?.currency ?? DEFAULT_CURRENCY;
  const clicks = db.clicks.filter((c) => c.linkId === linkId).length;
  const attrs = db.attributions.filter((a) => a.linkId === linkId);
  const orders = attrs.length;
  const commissionMinor = attrs
    .filter((a) => a.status === "confirmed" || a.status === "pending")
    .reduce((sum, a) => sum + a.commissionAmountMinor, 0);
  return { clicks, orders, commissionMinor, currency };
}

export function toLinkSummary(db: MockDb, link: Link): LinkSummary {
  const store = db.stores.find((s) => s.id === link.storeId) ?? null;
  const campaign = db.campaigns.find((c) => c.id === link.campaignId) ?? null;
  const code =
    db.discountCodes.find((c) => c.id === link.discountCodeId)?.code ?? null;
  return {
    ...link,
    store: store
      ? { id: store.id, name: store.name, logoUrl: brandedStoreLogo(store) }
      : null,
    campaign: campaign
      ? {
          id: campaign.id,
          name: campaign.name,
          discountPercent: campaign.discountPercent,
          commissionPercent: campaign.commissionPercent,
        }
      : null,
    discountCode: code,
    metrics: linkMetrics(db, link.id),
  };
}

export function toLinkDetail(db: MockDb, link: Link): LinkDetail {
  const summary = toLinkSummary(db, link);
  const campaign = db.campaigns.find((c) => c.id === link.campaignId) ?? null;
  return {
    ...summary,
    terms: campaign?.terms ?? null,
    resolverUrl: link.shortUrl,
  };
}

export function codeCounts(db: MockDb, campaignId: string) {
  const codes = db.discountCodes.filter((c) => c.campaignId === campaignId);
  return {
    codesTotal: codes.length,
    codesAvailable: codes.filter((c) => c.status === "available").length,
    codesClaimed: codes.filter((c) => c.status === "claimed").length,
  };
}

export function fundedBalanceMinor(db: MockDb, storeId: string): number {
  return db.funding
    .filter((f) => f.storeId === storeId && f.status === "paid")
    .reduce((sum, f) => sum + f.amountMinor, 0);
}

export function commissionOwedMinor(db: MockDb, storeId: string): number {
  return db.ledger
    .filter(
      (l) =>
        l.storeId === storeId &&
        (l.status === "pending" || l.status === "available"),
    )
    .reduce((sum, l) => sum + Math.max(0, l.amountMinor), 0);
}

export function fundingStateForStore(db: MockDb, storeId: string): FundingState {
  const store = db.stores.find((s) => s.id === storeId);
  if (store?.status === "disconnected") return "manual_review";
  const funded = fundedBalanceMinor(db, storeId);
  const owed = commissionOwedMinor(db, storeId);
  if (funded <= 0) return "not_funded";
  if (funded >= owed) return "funded";
  return "partially_funded";
}

export function toCampaignSummary(db: MockDb, campaign: Campaign): CampaignSummary {
  const store = db.stores.find((s) => s.id === campaign.storeId) ?? null;
  return {
    ...campaign,
    store: store
      ? { id: store.id, name: store.name, logoUrl: brandedStoreLogo(store) }
      : null,
    ...codeCounts(db, campaign.id),
    fundingState: fundingStateForStore(db, campaign.storeId),
  };
}

export function toStoreSummary(db: MockDb, store: Store): StoreSummary {
  const campaigns = db.campaigns.filter((c) => c.storeId === store.id);
  const active = campaigns.filter((c) => c.status === "active");
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
    logoUrl: brandedStoreLogo(store),
    activeCampaignCount: active.length,
    bestDiscountPercent: bestDiscount,
    bestCommissionPercent: bestCommission,
  };
}

export function toOrderSummary(
  db: MockDb,
  attr: LinkOrderAttribution,
): OrderSummary {
  const link = db.links.find((l) => l.id === attr.linkId) ?? null;
  const store =
    db.stores.find((s) => s.id === link?.storeId) ?? null;
  const recommender =
    db.profiles.find((p) => p.id === link?.userId) ?? null;
  const order = db.storeOrders.find((o) => o.id === attr.externalOrderId);
  const code =
    db.discountCodes.find((c) => c.id === attr.discountCodeId)?.code ?? null;
  return {
    ...attr,
    link: link ? { id: link.id, name: link.name, shortCode: link.shortCode } : null,
    store: store ? { id: store.id, name: store.name } : null,
    recommender: recommender
      ? {
          id: recommender.id,
          firstName: recommender.firstName,
          lastName: recommender.lastName,
        }
      : null,
    orderNumber: order?.externalOrderNumber ?? null,
    code,
  };
}
