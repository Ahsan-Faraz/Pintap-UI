import { DEFAULT_CURRENCY } from "@/lib/currency";
import { db } from "@/lib/mock/store";
import type { AdminKpis, MerchantKpis, RecommenderKpis } from "@/lib/types";
import { delay } from "@/lib/utils";
import {
  commissionOwedMinor,
  fundedBalanceMinor,
} from "@/lib/mock/queries";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { pick } from "./_runtime";

export interface AnalyticsService {
  getRecommenderKpis(userId: string): Promise<RecommenderKpis>;
  getMerchantKpis(storeId: string): Promise<MerchantKpis>;
  getAdminKpis(): Promise<AdminKpis>;
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
