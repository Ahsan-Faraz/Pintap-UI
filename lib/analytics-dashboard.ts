import { DEFAULT_CURRENCY } from "@/lib/currency";
import type {
  Link,
  LinkClick,
  LinkOrderAttribution,
  RecommenderDashboard,
  RecommenderDashboardDay,
  RecommenderDashboardRange,
  RecommenderTopLinkRow,
} from "@/lib/types";

const DAY_MS = 86_400_000;

function parseTs(iso: string): number {
  return +new Date(iso);
}

function isCountedAttribution(a: LinkOrderAttribution): boolean {
  return a.status === "confirmed" || a.status === "pending";
}

function rangeBounds(range: RecommenderDashboardRange) {
  const end = Date.now();
  if (range === "all") {
    return { start: 0, end, prevStart: 0, prevEnd: 0 };
  }
  const days = range === "7d" ? 7 : 30;
  const start = end - days * DAY_MS;
  return {
    start,
    end,
    prevStart: start - days * DAY_MS,
    prevEnd: start,
  };
}

function inWindow(ts: number, start: number, end: number): boolean {
  return ts >= start && ts <= end;
}

function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDailyBuckets(
  range: RecommenderDashboardRange,
  attrs: LinkOrderAttribution[],
  locale: string,
): RecommenderDashboardDay[] {
  const counted = attrs.filter(isCountedAttribution);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (range === "all") {
    const byMonth = new Map<string, number>();
    for (const a of counted) {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + a.commissionAmountMinor);
    }
    const keys = [...byMonth.keys()].sort();
    const recent = keys.slice(-7);
    return recent.map((key) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString(locale, {
        month: "short",
      });
      return {
        key,
        label,
        commissionMinor: byMonth.get(key) ?? 0,
      };
    });
  }

  const days = range === "7d" ? 7 : 30;
  const buckets: RecommenderDashboardDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = dayKey(d);
    const label =
      range === "7d"
        ? d.toLocaleDateString(locale, { weekday: "short" })
        : d.toLocaleDateString(locale, { day: "numeric", month: "short" });
    buckets.push({ key, label, commissionMinor: 0 });
  }

  const bucketKeys = new Set(buckets.map((b) => b.key));
  for (const a of counted) {
    const key = dayKey(new Date(a.createdAt));
    if (!bucketKeys.has(key)) continue;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.commissionMinor += a.commissionAmountMinor;
  }

  return buckets;
}

function buildTopLinks(
  links: Link[],
  clicks: LinkClick[],
  attrs: LinkOrderAttribution[],
  start: number,
  end: number,
  storeNameById: Map<string, string>,
  campaignNameById: Map<string, string>,
): RecommenderTopLinkRow[] {
  const rows: RecommenderTopLinkRow[] = [];

  for (const link of links) {
    const linkClicks = clicks.filter(
      (c) =>
        c.linkId === link.id && inWindow(parseTs(c.clickedAt), start, end),
    );
    const linkAttrs = attrs.filter(
      (a) =>
        a.linkId === link.id &&
        inWindow(parseTs(a.createdAt), start, end),
    );
    const earnedMinor = linkAttrs
      .filter(isCountedAttribution)
      .reduce((s, a) => s + a.commissionAmountMinor, 0);

    if (linkClicks.length === 0 && linkAttrs.length === 0 && earnedMinor === 0) {
      continue;
    }

    rows.push({
      linkId: link.id,
      name: link.name,
      imageUrl: link.imageUrl,
      storeName: link.storeId ? storeNameById.get(link.storeId) ?? null : link.brand,
      campaignName: link.campaignId
        ? campaignNameById.get(link.campaignId) ?? null
        : null,
      clicks: linkClicks.length,
      orders: linkAttrs.length,
      earnedMinor,
    });
  }

  return rows
    .sort((a, b) => b.earnedMinor - a.earnedMinor || b.clicks - a.clicks)
    .slice(0, 5);
}

export interface DashboardSourceData {
  links: Link[];
  clicks: LinkClick[];
  attributions: LinkOrderAttribution[];
  storeNameById: Map<string, string>;
  campaignNameById: Map<string, string>;
  currency?: string;
  locale?: string;
}

export function buildRecommenderDashboard(
  range: RecommenderDashboardRange,
  data: DashboardSourceData,
): RecommenderDashboard {
  const { start, end, prevStart, prevEnd } = rangeBounds(range);
  const locale = data.locale ?? "en-US";
  const linkIds = new Set(data.links.map((l) => l.id));
  const scopedClicks = data.clicks.filter((c) => linkIds.has(c.linkId));
  const scopedAttrs = data.attributions.filter((a) => linkIds.has(a.linkId));

  const clicksInRange =
    range === "all"
      ? scopedClicks.length
      : scopedClicks.filter((c) =>
          inWindow(parseTs(c.clickedAt), start, end),
        ).length;

  const attrsInRange =
    range === "all"
      ? scopedAttrs
      : scopedAttrs.filter((a) => inWindow(parseTs(a.createdAt), start, end));

  const orders = attrsInRange.length;
  const commissionMinor = attrsInRange
    .filter(isCountedAttribution)
    .reduce((s, a) => s + a.commissionAmountMinor, 0);

  let commissionGrowthPercent: number | null = null;
  if (range !== "all") {
    const prevAttrs = scopedAttrs.filter((a) =>
      inWindow(parseTs(a.createdAt), prevStart, prevEnd),
    );
    const prevCommission = prevAttrs
      .filter(isCountedAttribution)
      .reduce((s, a) => s + a.commissionAmountMinor, 0);
    commissionGrowthPercent = growthPercent(commissionMinor, prevCommission);
  }

  const chartStart = range === "all" ? 0 : start;
  const dailyCommission = buildDailyBuckets(range, scopedAttrs, locale);

  const topLinks = buildTopLinks(
    data.links,
    scopedClicks,
    scopedAttrs,
    chartStart,
    end,
    data.storeNameById,
    data.campaignNameById,
  );

  const currency =
    data.currency ??
    attrsInRange[0]?.currency ??
    data.links[0]?.storeId
      ? DEFAULT_CURRENCY
      : DEFAULT_CURRENCY;

  return {
    range,
    commissionMinor,
    commissionGrowthPercent,
    clicks: clicksInRange,
    orders,
    conversionRate: clicksInRange ? (orders / clicksInRange) * 100 : 0,
    currency,
    dailyCommission,
    topLinks,
  };
}

/** Real-mode row shape after fetching from Supabase. */
export interface DashboardAttributionRow {
  link_id: string;
  status: string;
  commission_amount_minor: number;
  currency: string;
  created_at: string;
}

export interface DashboardClickRow {
  link_id: string;
  clicked_at: string;
}

export function buildRecommenderDashboardFromRows(
  range: RecommenderDashboardRange,
  links: Link[],
  clickRows: DashboardClickRow[],
  attrRows: DashboardAttributionRow[],
  storeNameById: Map<string, string>,
  campaignNameById: Map<string, string>,
  locale?: string,
): RecommenderDashboard {
  const clicks: LinkClick[] = clickRows.map((r, i) => ({
    id: `click-${i}`,
    linkId: r.link_id,
    visitorHash: "",
    userAgent: null,
    countryCode: null,
    source: null,
    clickedAt: r.clicked_at,
  }));
  const attributions: LinkOrderAttribution[] = attrRows.map((r, i) => ({
    id: `attr-${i}`,
    linkId: r.link_id,
    campaignId: links.find((l) => l.id === r.link_id)?.campaignId ?? "",
    discountCodeId: "",
    externalOrderId: "",
    status: r.status as LinkOrderAttribution["status"],
    orderAmountMinor: 0,
    commissionAmountMinor: r.commission_amount_minor,
    currency: r.currency,
    source: "store_import",
    createdAt: r.created_at,
  }));

  return buildRecommenderDashboard(range, {
    links,
    clicks,
    attributions,
    storeNameById,
    campaignNameById,
    currency: attrRows[0]?.currency ?? DEFAULT_CURRENCY,
    locale,
  });
}
