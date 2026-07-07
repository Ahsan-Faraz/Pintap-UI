import type {
  Link,
  LinkClick,
  LinkOrderAttribution,
  MerchantDashboard,
  MerchantDashboardRange,
} from "@/lib/types";

const DAY_MS = 86_400_000;

function merchantRangeBounds(range: MerchantDashboardRange) {
  const end = Date.now();
  const days = range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const start = end - days * DAY_MS;
  return { start, end, prevStart: start - days * DAY_MS, prevEnd: start };
}

function isCounted(a: LinkOrderAttribution): boolean {
  return a.status === "confirmed" || a.status === "pending";
}

function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function inRange(iso: string, start: number, end: number): boolean {
  const t = +new Date(iso);
  return t >= start && t <= end;
}

export interface MerchantDashboardInputs {
  range: MerchantDashboardRange;
  currency: string;
  campaignIds: Set<string>;
  storeLinks: Link[];
  /** All links referenced by store attributions (for recommender names). */
  attributionLinks: Link[];
  clicks: LinkClick[];
  attributions: LinkOrderAttribution[];
  profiles: Array<{ id: string; firstName: string; lastName: string }>;
}

export function buildMerchantDashboard(
  input: MerchantDashboardInputs,
): MerchantDashboard {
  const {
    range,
    currency,
    campaignIds,
    storeLinks,
    attributionLinks,
    clicks,
    attributions,
    profiles,
  } = input;
  const storeLinkIds = new Set(storeLinks.map((l) => l.id));
  const linkById = new Map(attributionLinks.map((l) => [l.id, l]));
  const { start, end, prevStart, prevEnd } = merchantRangeBounds(range);

  const storeAttrs = attributions.filter((a) => campaignIds.has(a.campaignId));
  const storeClicks = clicks.filter((c) => storeLinkIds.has(c.linkId));

  const currentAttrs = storeAttrs.filter((a) =>
    inRange(a.createdAt, start, end),
  );
  const prevAttrs = storeAttrs.filter((a) =>
    inRange(a.createdAt, prevStart, prevEnd),
  );

  const currentCounted = currentAttrs.filter(isCounted);
  const prevCounted = prevAttrs.filter(isCounted);

  const revenueMinor = currentCounted.reduce(
    (s, a) => s + a.orderAmountMinor,
    0,
  );
  const prevRevenue = prevCounted.reduce((s, a) => s + a.orderAmountMinor, 0);
  const orders = currentAttrs.length;
  const prevOrders = prevAttrs.length;

  const currentClickCount = storeClicks.filter((c) =>
    inRange(c.clickedAt, start, end),
  ).length;
  const prevClickCount = storeClicks.filter((c) =>
    inRange(c.clickedAt, prevStart, prevEnd),
  ).length;

  const activeUserIds = new Set<string>();
  const newUserIds = new Set<string>();

  for (const link of attributionLinks) {
    const hadClick = storeClicks.some(
      (c) => c.linkId === link.id && inRange(c.clickedAt, start, end),
    );
    const hadOrder = currentAttrs.some((a) => a.linkId === link.id);
    if (!hadClick && !hadOrder) continue;

    activeUserIds.add(link.userId);

    const activityTimes = [
      ...storeClicks
        .filter((c) => c.linkId === link.id)
        .map((c) => +new Date(c.clickedAt)),
      ...storeAttrs
        .filter((a) => a.linkId === link.id)
        .map((a) => +new Date(a.createdAt)),
    ];
    if (activityTimes.length === 0) continue;
    const firstActivity = Math.min(...activityTimes);
    if (firstActivity >= start) {
      newUserIds.add(link.userId);
    }
  }

  const byRecommender = new Map<
    string,
    { orders: number; revenueMinor: number }
  >();
  for (const a of currentCounted) {
    const link = linkById.get(a.linkId);
    if (!link) continue;
    const cur = byRecommender.get(link.userId) ?? {
      orders: 0,
      revenueMinor: 0,
    };
    cur.orders += 1;
    cur.revenueMinor += a.orderAmountMinor;
    byRecommender.set(link.userId, cur);
  }

  let topRecommender: MerchantDashboard["topRecommender"] = null;
  let topId: string | null = null;
  let topRev = 0;
  for (const [uid, stats] of byRecommender) {
    if (stats.revenueMinor > topRev) {
      topRev = stats.revenueMinor;
      topId = uid;
    }
  }
  if (topId) {
    const p = profiles.find((pr) => pr.id === topId);
    const stats = byRecommender.get(topId)!;
    if (p) {
      topRecommender = {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        orders: stats.orders,
        revenueMinor: stats.revenueMinor,
      };
    }
  }

  return {
    range,
    revenueMinor,
    revenueGrowthPercent: growthPercent(revenueMinor, prevRevenue),
    orders,
    ordersGrowthPercent: growthPercent(orders, prevOrders),
    clicks: currentClickCount,
    clicksGrowthPercent: growthPercent(currentClickCount, prevClickCount),
    activeRecommenders: activeUserIds.size,
    newRecommenders: newUserIds.size,
    currency,
    topRecommender,
  };
}
