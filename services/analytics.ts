import { DEFAULT_CURRENCY } from "@/lib/currency";
import {
  buildRecommenderDashboard,
  buildRecommenderDashboardFromRows,
} from "@/lib/analytics-dashboard";
import { buildMerchantDashboard } from "@/lib/merchant-dashboard";
import { db } from "@/lib/mock/store";
import type {
  AdminKpis,
  CampaignMetrics,
  Link,
  LinkOrderAttribution,
  LinkType,
  MerchantKpis,
  MerchantDashboard,
  MerchantDashboardRange,
  RecommenderDashboard,
  RecommenderDashboardRange,
  RecommenderKpis,
} from "@/lib/types";
import { delay } from "@/lib/utils";
import {
  commissionOwedMinor,
  fundedBalanceMinor,
} from "@/lib/mock/queries";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { pick } from "./_runtime";
import { mapAttribution } from "@/lib/supabase/mappers";

export interface AnalyticsService {
  getRecommenderKpis(userId: string): Promise<RecommenderKpis>;
  getRecommenderDashboard(
    userId: string,
    range: RecommenderDashboardRange,
  ): Promise<RecommenderDashboard>;
  getMerchantKpis(storeId: string): Promise<MerchantKpis>;
  getMerchantDashboard(
    storeId: string,
    range: MerchantDashboardRange,
  ): Promise<MerchantDashboard>;
  getCampaignMetricsForStore(storeId: string): Promise<CampaignMetrics[]>;
  getAdminKpis(): Promise<AdminKpis>;
}

function campaignMetricsFromDb(
  d: ReturnType<typeof db>,
  storeId: string,
): CampaignMetrics[] {
  return d.campaigns
    .filter((c) => c.storeId === storeId)
    .map((c) => {
      const links = d.links.filter(
        (l) => l.campaignId === c.id && l.status !== "deleted",
      );
      const linkIds = new Set(links.map((l) => l.id));
      const clicks = d.clicks.filter((cl) => linkIds.has(cl.linkId)).length;
      const attrs = d.attributions.filter((a) => a.campaignId === c.id);
      const counted = attrs.filter(
        (a) => a.status === "confirmed" || a.status === "pending",
      );
      return {
        campaignId: c.id,
        recommenders: new Set(links.map((l) => l.userId)).size,
        clicks,
        orders: counted.length,
        revenueMinor: counted.reduce((s, a) => s + a.orderAmountMinor, 0),
      };
    });
}

const mock: AnalyticsService = {
  async getRecommenderKpis(userId) {
    await delay();
    const d = db();
    const myLinks = d.links.filter(
      (l) => l.userId === userId && l.status !== "deleted",
    );
    const linkIds = new Set(myLinks.map((l) => l.id));
    const clicks = d.clicks.filter((c) => linkIds.has(c.linkId)).length;
    const attrs = d.attributions.filter((a) => linkIds.has(a.linkId));
    const orders = attrs.length;
    const commissionMinor = attrs
      .filter((a) => a.status === "confirmed" || a.status === "pending")
      .reduce((s, a) => s + a.commissionAmountMinor, 0);
    const currency =
      d.ledger.find((l) => l.userId === userId)?.currency ?? DEFAULT_CURRENCY;
    return {
      clicks,
      orders,
      conversionRate: clicks ? (orders / clicks) * 100 : 0,
      commissionMinor,
      currency,
    };
  },

  async getRecommenderDashboard(userId, range) {
    await delay();
    const d = db();
    const myLinks = d.links.filter(
      (l) => l.userId === userId && l.status !== "deleted",
    );
    const storeNameById = new Map(d.stores.map((s) => [s.id, s.name]));
    const campaignNameById = new Map(d.campaigns.map((c) => [c.id, c.name]));
    const currency =
      d.ledger.find((l) => l.userId === userId)?.currency ?? DEFAULT_CURRENCY;

    return buildRecommenderDashboard(range, {
      links: myLinks,
      clicks: d.clicks,
      attributions: d.attributions,
      storeNameById,
      campaignNameById,
      currency,
    });
  },

  async getMerchantKpis(storeId) {
    await delay();
    const d = db();
    const store = d.stores.find((s) => s.id === storeId);
    const currency = store?.currency ?? DEFAULT_CURRENCY;
    const campaignIds = new Set(
      d.campaigns.filter((c) => c.storeId === storeId).map((c) => c.id),
    );
    const activeCampaigns = d.campaigns.filter(
      (c) => c.storeId === storeId && c.status === "active",
    ).length;
    const storeLinks = d.links.filter((l) => l.storeId === storeId);
    const linkIds = new Set(storeLinks.map((l) => l.id));
    const clicks = d.clicks.filter((c) => linkIds.has(c.linkId)).length;
    const orders = d.attributions.filter((a) =>
      campaignIds.has(a.campaignId),
    ).length;
    return {
      activeCampaigns,
      issuedLinks: storeLinks.length,
      clicks,
      orders,
      commissionOwedMinor: commissionOwedMinor(d, storeId),
      fundedBalanceMinor: fundedBalanceMinor(d, storeId),
      currency,
    };
  },

  async getMerchantDashboard(storeId, range) {
    await delay();
    const d = db();
    const store = d.stores.find((s) => s.id === storeId);
    const campaignIds = new Set(
      d.campaigns.filter((c) => c.storeId === storeId).map((c) => c.id),
    );
    const storeLinks = d.links.filter(
      (l) => l.storeId === storeId && l.status !== "deleted",
    );
    const attributions = d.attributions.filter((a) =>
      campaignIds.has(a.campaignId),
    );
    const attrLinkIds = new Set(attributions.map((a) => a.linkId));
    const attributionLinks = d.links.filter((l) => attrLinkIds.has(l.id));
    return buildMerchantDashboard({
      range,
      currency: store?.currency ?? DEFAULT_CURRENCY,
      campaignIds,
      storeLinks,
      attributionLinks,
      clicks: d.clicks,
      attributions,
      profiles: d.profiles,
    });
  },

  async getCampaignMetricsForStore(storeId) {
    await delay();
    return campaignMetricsFromDb(db(), storeId);
  },

  async getAdminKpis() {
    await delay();
    const d = db();
    return {
      users: d.profiles.length,
      connectedStores: d.stores.filter((s) => s.connected).length,
      activeCampaigns: d.campaigns.filter((c) => c.status === "active").length,
      links: d.links.filter((l) => l.status !== "deleted").length,
      clicks: d.clicks.length,
      orders: d.attributions.length,
      commissionOwedMinor: d.ledger
        .filter((l) => l.status === "pending" || l.status === "available")
        .reduce((s, l) => s + Math.max(0, l.amountMinor), 0),
      payoutPendingMinor: d.payoutBatches
        .filter((b) => b.status === "queued" || b.status === "draft")
        .reduce((s, b) => s + b.amountMinor, 0),
      currency: DEFAULT_CURRENCY,
    };
  },
};

const real: AnalyticsService = {
  async getRecommenderKpis(userId) {
    const supabase = createSupabaseBrowserClient();
    const { data: links } = await supabase
      .from("links")
      .select("id")
      .eq("user_id", userId)
      .neq("status", "deleted");
    const linkIds = (links ?? []).map((l) => l.id);
    if (linkIds.length === 0) {
      return {
        clicks: 0,
        orders: 0,
        conversionRate: 0,
        commissionMinor: 0,
        currency: DEFAULT_CURRENCY,
      };
    }

    const [clicksRes, attrsRes, ledgerRes] = await Promise.all([
      supabase.rpc("link_click_counts", { p_link_ids: linkIds }),
      supabase
        .from("link_order_attributions")
        .select("id, status, commission_amount_minor, currency")
        .in("link_id", linkIds),
      supabase
        .from("commission_ledger_entries")
        .select("currency")
        .eq("user_id", userId),
    ]);

    const clicks = (clicksRes.data ?? []).reduce(
      (sum, row) => sum + Number(row.clicks),
      0,
    );
    const attrs = attrsRes.data ?? [];
    const orders = attrs.length;
    const commissionMinor = attrs
      .filter((a) => a.status === "confirmed" || a.status === "pending")
      .reduce((s, a) => s + a.commission_amount_minor, 0);
    const currency =
      ledgerRes.data?.[0]?.currency ??
      attrs[0]?.currency ??
      DEFAULT_CURRENCY;

    return {
      clicks,
      orders,
      conversionRate: clicks ? (orders / clicks) * 100 : 0,
      commissionMinor,
      currency,
    };
  },

  async getRecommenderDashboard(userId, range) {
    const supabase = createSupabaseBrowserClient();
    const locale =
      typeof document !== "undefined" &&
      document.cookie.includes("NEXT_LOCALE=de")
        ? "de-DE"
        : "en-US";

    const { data: linkRows } = await supabase
      .from("links")
      .select(
        "id, name, image_url, brand, store_id, campaign_id, status, type, destination_url, source_host, short_code, short_url, user_id, discount_code_id, is_verified, created_at, updated_at, deleted_at",
      )
      .eq("user_id", userId)
      .neq("status", "deleted");

    const links: Link[] = (linkRows ?? []).map((l) => ({
      id: l.id,
      userId: l.user_id,
      storeId: l.store_id,
      campaignId: l.campaign_id,
      discountCodeId: l.discount_code_id,
      type: l.type as LinkType,
      destinationUrl: l.destination_url,
      sourceHost: l.source_host,
      name: l.name,
      brand: l.brand,
      imageUrl: l.image_url,
      isVerified: l.is_verified,
      shortCode: l.short_code,
      shortUrl: l.short_url,
      status: l.status as Link["status"],
      createdAt: l.created_at,
      updatedAt: l.updated_at,
      deletedAt: l.deleted_at,
    }));

    const linkIds = links.map((l) => l.id);
    if (linkIds.length === 0) {
      return buildRecommenderDashboard(range, {
        links: [],
        clicks: [],
        attributions: [],
        storeNameById: new Map(),
        campaignNameById: new Map(),
        locale,
      });
    }

    const storeIds = [
      ...new Set(links.map((l) => l.storeId).filter(Boolean)),
    ] as string[];
    const campaignIds = [
      ...new Set(links.map((l) => l.campaignId).filter(Boolean)),
    ] as string[];

    const [storesRes, campaignsRes, clicksRes, attrsRes] = await Promise.all([
      storeIds.length
        ? supabase.from("stores").select("id, name").in("id", storeIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      campaignIds.length
        ? supabase.from("campaigns").select("id, name").in("id", campaignIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase
        .from("link_clicks")
        .select("link_id, clicked_at")
        .in("link_id", linkIds),
      supabase
        .from("link_order_attributions")
        .select(
          "link_id, status, commission_amount_minor, currency, created_at",
        )
        .in("link_id", linkIds),
    ]);

    const storeNameById = new Map(
      (storesRes.data ?? []).map((s) => [s.id, s.name]),
    );
    const campaignNameById = new Map(
      (campaignsRes.data ?? []).map((c) => [c.id, c.name]),
    );

    return buildRecommenderDashboardFromRows(
      range,
      links,
      clicksRes.data ?? [],
      attrsRes.data ?? [],
      storeNameById,
      campaignNameById,
      locale,
    );
  },

  async getMerchantKpis(storeId) {
    const supabase = createSupabaseBrowserClient();
    const { data: store } = await supabase
      .from("stores")
      .select("currency")
      .eq("id", storeId)
      .maybeSingle();
    const currency = store?.currency ?? DEFAULT_CURRENCY;

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("store_id", storeId);
    const campaignIds = (campaigns ?? []).map((c) => c.id);
    const activeCampaigns = (campaigns ?? []).filter(
      (c) => c.status === "active",
    ).length;

    const { data: storeLinks } = await supabase
      .from("links")
      .select("id")
      .eq("store_id", storeId);
    const linkIds = (storeLinks ?? []).map((l) => l.id);

    const [clicksRes, attrsRes, fundingRes, ledgerRes] = await Promise.all([
      linkIds.length
        ? supabase.rpc("link_click_counts", { p_link_ids: linkIds })
        : Promise.resolve({ data: [] as { link_id: string; clicks: number }[] }),
      campaignIds.length
        ? supabase
            .from("link_order_attributions")
            .select("id", { count: "exact", head: true })
            .in("campaign_id", campaignIds)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("merchant_funding_transactions")
        .select("amount_minor, status")
        .eq("store_id", storeId),
      supabase
        .from("commission_ledger_entries")
        .select("amount_minor, status")
        .eq("store_id", storeId),
    ]);

    const fundedBalanceMinor = (fundingRes.data ?? [])
      .filter((f) => f.status === "paid")
      .reduce((s, f) => s + f.amount_minor, 0);
    const commissionOwedMinor = (ledgerRes.data ?? [])
      .filter((l) => l.status === "pending" || l.status === "available")
      .reduce((s, l) => s + Math.max(0, l.amount_minor), 0);

    return {
      activeCampaigns,
      issuedLinks: linkIds.length,
      clicks: (clicksRes.data ?? []).reduce(
        (sum, row) => sum + Number(row.clicks),
        0,
      ),
      orders: attrsRes.count ?? 0,
      commissionOwedMinor,
      fundedBalanceMinor,
      currency,
    };
  },

  async getMerchantDashboard(storeId, range) {
    const supabase = createSupabaseBrowserClient();
    const { data: store } = await supabase
      .from("stores")
      .select("currency")
      .eq("id", storeId)
      .maybeSingle();
    const currency = store?.currency ?? DEFAULT_CURRENCY;

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("store_id", storeId);
    const campaignIds = new Set((campaigns ?? []).map((c) => c.id));
    if (campaignIds.size === 0) {
      return buildMerchantDashboard({
        range,
        currency,
        campaignIds,
        storeLinks: [],
        attributionLinks: [],
        clicks: [],
        attributions: [],
        profiles: [],
      });
    }

    const { data: linkRows } = await supabase
      .from("links")
      .select(
        "id, user_id, store_id, campaign_id, discount_code_id, type, destination_url, source_host, name, brand, image_url, is_verified, short_code, short_url, status, created_at, updated_at, deleted_at",
      )
      .eq("store_id", storeId)
      .neq("status", "deleted");

    const storeLinks: Link[] = (linkRows ?? []).map((l) => ({
      id: l.id,
      userId: l.user_id,
      storeId: l.store_id,
      campaignId: l.campaign_id,
      discountCodeId: l.discount_code_id,
      type: l.type as LinkType,
      destinationUrl: l.destination_url,
      sourceHost: l.source_host,
      name: l.name,
      brand: l.brand,
      imageUrl: l.image_url,
      isVerified: l.is_verified,
      shortCode: l.short_code,
      shortUrl: l.short_url,
      status: l.status as Link["status"],
      createdAt: l.created_at,
      updatedAt: l.updated_at,
      deletedAt: l.deleted_at,
    }));

    const storeLinkIds = storeLinks.map((l) => l.id);

    const { data: attrRows } = await supabase
      .from("link_order_attributions")
      .select("*")
      .in("campaign_id", [...campaignIds]);

    const attributions = (attrRows ?? []).map(mapAttribution);
    const attrLinkIds = [...new Set(attributions.map((a) => a.linkId))];

    const [clicksRes, attrLinksRes] = await Promise.all([
      storeLinkIds.length
        ? supabase
            .from("link_clicks")
            .select("link_id, clicked_at")
            .in("link_id", storeLinkIds)
        : Promise.resolve({ data: [] as { link_id: string; clicked_at: string }[] }),
      attrLinkIds.length
        ? supabase
            .from("links")
            .select(
              "id, user_id, store_id, campaign_id, discount_code_id, type, destination_url, source_host, name, brand, image_url, is_verified, short_code, short_url, status, created_at, updated_at, deleted_at",
            )
            .in("id", attrLinkIds)
        : Promise.resolve({ data: [] }),
    ]);

    const attributionLinks: Link[] = (attrLinksRes.data ?? []).map((l) => ({
      id: l.id,
      userId: l.user_id,
      storeId: l.store_id,
      campaignId: l.campaign_id,
      discountCodeId: l.discount_code_id,
      type: l.type as LinkType,
      destinationUrl: l.destination_url,
      sourceHost: l.source_host,
      name: l.name,
      brand: l.brand,
      imageUrl: l.image_url,
      isVerified: l.is_verified,
      shortCode: l.short_code,
      shortUrl: l.short_url,
      status: l.status as Link["status"],
      createdAt: l.created_at,
      updatedAt: l.updated_at,
      deletedAt: l.deleted_at,
    }));
    const userIds = [...new Set(attributionLinks.map((l) => l.userId))];

    const { data: profileRows } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds)
      : { data: [] };

    const clicks = (clicksRes.data ?? []).map((c) => ({
      id: `${c.link_id}-${c.clicked_at}`,
      linkId: c.link_id,
      visitorHash: "",
      userAgent: null,
      countryCode: null,
      source: null,
      clickedAt: c.clicked_at,
    }));

    const profiles = (profileRows ?? []).map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
    }));

    return buildMerchantDashboard({
      range,
      currency,
      campaignIds,
      storeLinks,
      attributionLinks,
      clicks,
      attributions,
      profiles,
    });
  },

  async getCampaignMetricsForStore(storeId) {
    const supabase = createSupabaseBrowserClient();
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("store_id", storeId);
    if (!campaigns?.length) return [];

    const campaignIds = campaigns.map((c) => c.id);

    const { data: storeLinks } = await supabase
      .from("links")
      .select("id, campaign_id, user_id")
      .eq("store_id", storeId)
      .neq("status", "deleted")
      .in("campaign_id", campaignIds);

    const links = storeLinks ?? [];
    const linkIds = links.map((l) => l.id);

    const [clicksRes, attrsRes] = await Promise.all([
      linkIds.length
        ? supabase.rpc("link_click_counts", { p_link_ids: linkIds })
        : Promise.resolve({
            data: [] as { link_id: string; clicks: number }[],
          }),
      supabase
        .from("link_order_attributions")
        .select("campaign_id, order_amount_minor, status")
        .in("campaign_id", campaignIds),
    ]);

    const clicksByLink = new Map(
      (clicksRes.data ?? []).map((r) => [r.link_id, Number(r.clicks)]),
    );

    const byCampaign = new Map<
      string,
      {
        recommenders: Set<string>;
        clicks: number;
        orders: number;
        revenueMinor: number;
      }
    >();

    for (const id of campaignIds) {
      byCampaign.set(id, {
        recommenders: new Set(),
        clicks: 0,
        orders: 0,
        revenueMinor: 0,
      });
    }

    for (const link of links) {
      if (!link.campaign_id) continue;
      const entry = byCampaign.get(link.campaign_id);
      if (!entry) continue;
      entry.recommenders.add(link.user_id);
      entry.clicks += clicksByLink.get(link.id) ?? 0;
    }

    for (const attr of attrsRes.data ?? []) {
      const entry = byCampaign.get(attr.campaign_id);
      if (!entry) continue;
      if (attr.status === "confirmed" || attr.status === "pending") {
        entry.orders += 1;
        entry.revenueMinor += attr.order_amount_minor;
      }
    }

    return campaignIds.map((id) => {
      const entry = byCampaign.get(id)!;
      return {
        campaignId: id,
        recommenders: entry.recommenders.size,
        clicks: entry.clicks,
        orders: entry.orders,
        revenueMinor: entry.revenueMinor,
      };
    });
  },

  async getAdminKpis() {
    const supabase = createSupabaseBrowserClient();
    const { data: kpiRows, error: kpiError } = await supabase.rpc("admin_kpis");
    if (!kpiError && kpiRows?.[0]) {
      const row = kpiRows[0];
      return {
        users: row.users,
        connectedStores: row.connected_stores,
        activeCampaigns: row.active_campaigns,
        links: row.links,
        clicks: row.clicks,
        orders: row.orders,
        commissionOwedMinor: row.commission_owed_minor,
        payoutPendingMinor: row.payout_pending_minor,
        currency: row.currency,
      };
    }

    const [profiles, stores, campaigns, links, clicks, orders, ledger, payouts] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("stores")
          .select("id", { count: "exact", head: true })
          .eq("connected", true),
        supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("links")
          .select("id", { count: "exact", head: true })
          .neq("status", "deleted"),
        supabase.from("link_clicks").select("id", { count: "exact", head: true }),
        supabase
          .from("link_order_attributions")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("commission_ledger_entries")
          .select("amount_minor, status")
          .in("status", ["pending", "available"]),
        supabase
          .from("payout_batches")
          .select("amount_minor, status")
          .in("status", ["queued", "draft"]),
      ]);

    return {
      users: profiles.count ?? 0,
      connectedStores: stores.count ?? 0,
      activeCampaigns: campaigns.count ?? 0,
      links: links.count ?? 0,
      clicks: clicks.count ?? 0,
      orders: orders.count ?? 0,
      commissionOwedMinor: (ledger.data ?? []).reduce(
        (s, l) => s + Math.max(0, l.amount_minor),
        0,
      ),
      payoutPendingMinor: (payouts.data ?? []).reduce(
        (s, b) => s + b.amount_minor,
        0,
      ),
      currency: DEFAULT_CURRENCY,
    };
  },
};

export const analyticsService = pick("analytics", mock, real);
