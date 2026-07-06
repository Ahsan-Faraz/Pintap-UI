/** Shared write helpers used by several services (code reservation, attribution). */
import type { MockDb } from "./seed";
import type { ActivityEvent, AttributionStatus } from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";

export function pushActivity(
  db: MockDb,
  e: {
    scopeType: string;
    scopeId: string | null;
    actorType: "user" | "system";
    actorId: string | null;
    eventType: string;
    eventData?: Record<string, unknown>;
  },
): ActivityEvent {
  const event: ActivityEvent = {
    id: uid("act"),
    scopeType: e.scopeType,
    scopeId: e.scopeId,
    actorType: e.actorType,
    actorId: e.actorId,
    eventType: e.eventType,
    eventData: e.eventData ?? {},
    createdAt: nowIso(),
  };
  db.activity.unshift(event);
  return event;
}

/** Release a link's campaign code only when no other active link still uses it. */
export function releaseCodeForLink(db: MockDb, linkId: string): void {
  const link = db.links.find((l) => l.id === linkId);
  if (!link?.discountCodeId) return;

  const othersUsing = db.links.some(
    (l) =>
      l.id !== linkId &&
      l.status !== "deleted" &&
      l.discountCodeId === link.discountCodeId,
  );
  if (othersUsing) return;

  const held = db.discountCodes.find((c) => c.id === link.discountCodeId);
  if (held) {
    held.status = "available";
    held.claimedByLinkId = null;
  }
}

/** Reserve a campaign code for a link — reuses the user's existing code when they already have one for that campaign. */
export function reserveCodeForLink(
  db: MockDb,
  campaignId: string,
  linkId: string,
): string {
  const link = db.links.find((l) => l.id === linkId);
  if (!link) throw new Error("Link not found");

  releaseCodeForLink(db, linkId);

  const existing = db.links.find(
    (l) =>
      l.userId === link.userId &&
      l.campaignId === campaignId &&
      l.discountCodeId &&
      l.id !== linkId &&
      l.status !== "deleted",
  );
  if (existing?.discountCodeId) {
    link.campaignId = campaignId;
    link.discountCodeId = existing.discountCodeId;
    return existing.discountCodeId;
  }

  const code = db.discountCodes.find(
    (c) => c.campaignId === campaignId && c.status === "available",
  );
  if (!code) throw new Error("No discount codes available for this campaign.");
  code.status = "claimed";
  code.claimedByLinkId = linkId;
  link.campaignId = campaignId;
  link.discountCodeId = code.id;
  return code.id;
}

/**
 * Core store order attribution. Upserts the order, matches the
 * discount code to a reserved link, writes the attribution + commission ledger
 * entry, and logs matched/unmatched activity.
 */
export function attributeOrder(
  db: MockDb,
  p: {
    storeId: string;
    code: string;
    amountMinor: number;
    currency: string;
    orderNumber: string;
    externalOrderId?: string;
    source?: string;
  },
): { matched: boolean; orderId: string } {
  const externalOrderId = p.externalOrderId ?? `sim-${uid()}`;
  let order = db.storeOrders.find(
    (o) => o.externalOrderId === externalOrderId && o.storeId === p.storeId,
  );
  if (!order) {
    order = {
      id: uid("ord"),
      storeId: p.storeId,
      externalOrderId,
      externalOrderNumber: p.orderNumber,
      currency: p.currency,
      totalAmountMinor: p.amountMinor,
      processedAt: nowIso(),
      rawPayload: { discount_codes: [{ code: p.code }] },
      createdAt: nowIso(),
    };
    db.storeOrders.push(order);
  }
  pushActivity(db, {
    scopeType: "store",
    scopeId: p.storeId,
    actorType: "system",
    actorId: null,
    eventType: "store_order_received",
    eventData: { order: p.orderNumber },
  });

  const codeRow = db.discountCodes.find((c) => c.code === p.code);
  const link = codeRow?.claimedByLinkId
    ? db.links.find((l) => l.id === codeRow.claimedByLinkId)
    : null;

  if (!codeRow || !link || !link.campaignId) {
    pushActivity(db, {
      scopeType: "store",
      scopeId: p.storeId,
      actorType: "system",
      actorId: null,
      eventType: "store_order_unmatched",
      eventData: { order: p.orderNumber, code: p.code },
    });
    return { matched: false, orderId: order.id };
  }

  const campaign = db.campaigns.find((c) => c.id === link.campaignId);
  const commissionMinor = Math.round(
    p.amountMinor * ((campaign?.commissionPercent ?? 0) / 100),
  );
  const status: AttributionStatus = "confirmed";
  const attr = {
    id: uid("attr"),
    linkId: link.id,
    campaignId: campaign!.id,
    discountCodeId: codeRow.id,
    externalOrderId: order.id,
    status,
    orderAmountMinor: p.amountMinor,
    commissionAmountMinor: commissionMinor,
    currency: p.currency,
    source: p.source ?? "store_import",
    createdAt: nowIso(),
  };
  db.attributions.push(attr);
  db.ledger.push({
    id: uid("led"),
    userId: link.userId,
    storeId: p.storeId,
    linkId: link.id,
    attributionId: attr.id,
    type: "earned",
    amountMinor: commissionMinor,
    currency: p.currency,
    status: "pending",
    availableAt: null,
    createdAt: nowIso(),
  });
  pushActivity(db, {
    scopeType: "link",
    scopeId: link.id,
    actorType: "system",
    actorId: null,
    eventType: "store_order_matched",
    eventData: { order: p.orderNumber, code: p.code },
  });
  return { matched: true, orderId: order.id };
}
