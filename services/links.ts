import { DEFAULT_CURRENCY } from "@/lib/currency";
import { db, saveDb } from "@/lib/mock/store";
import type {
  CampaignSummary,
  CreateLinkInput,
  LinkDetail,
  LinkListFilters,
  LinkStatus,
  LinkSummary,
  LinkType,
  LinkVerificationResult,
  ResolverView,
} from "@/lib/types";
import { APP_URL } from "@/lib/config";
import { delay, nowIso, uid } from "@/lib/utils";
import {
  buildDiscountRedirectUrl,
  extractHost,
  faviconUrl,
  inferLinkType,
  normalizeHost,
  normalizeLinkUrl,
  storeNameFromHost,
} from "@/lib/url-utils";
import { generateUniqueShortCode, isValidShortCode } from "@/lib/shortcode";
import {
  toCampaignSummary as mockCampaignSummary,
  toLinkDetail as mockLinkDetail,
  toLinkSummary as mockLinkSummary,
  toStoreSummary as mockStoreSummary,
} from "@/lib/mock/queries";
import {
  pushActivity,
  releaseCodeForLink,
  reserveCodeForLink,
} from "@/lib/mock/mutations";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  campaignById,
  linkMetrics,
  mapAttribution,
  mapCampaign,
  mapLink,
  mapStore,
  storeById,
  toCampaignSummary,
  toLinkDetail,
  toLinkSummary,
} from "@/lib/supabase/mappers";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { pick } from "./_runtime";
import { storesService } from "./stores";

export interface LinksService {
  listMyLinks(filters?: LinkListFilters): Promise<LinkSummary[]>;
  listAllLinks(): Promise<LinkSummary[]>;
  getLink(id: string): Promise<LinkDetail | null>;
  verifyUrl(url: string): Promise<LinkVerificationResult>;
  createLink(input: CreateLinkInput): Promise<LinkDetail>;
  updateLink(
    id: string,
    patch: { name?: string; type?: LinkType },
  ): Promise<LinkDetail>;
  setStatus(id: string, status: LinkStatus): Promise<LinkDetail>;
  deleteLink(id: string): Promise<void>;
  getCampaignOptions(linkId: string): Promise<CampaignSummary[]>;
  connectCampaign(linkId: string, campaignId: string): Promise<LinkDetail>;
  removeCampaign(linkId: string): Promise<LinkDetail>;
  getResolverView(shortCode: string): Promise<ResolverView>;
  recordClick(
    shortCode: string,
    info?: { visitorHash?: string; source?: string; userAgent?: string },
  ): Promise<void>;
}

function detail(id: string): LinkDetail {
  const d = db();
  const link = d.links.find((l) => l.id === id);
  if (!link) throw new Error("Link not found");
  return mockLinkDetail(d, link);
}

function nameFromUrl(url: string, host: string): string {
  try {
    const segs = new URL(url).pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1];
    if (last) {
      return last
        .replace(/[-_]+/g, " ")
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch {
    /* ignore */
  }
  return storeNameFromHost(host);
}

const mock: LinksService = {
  async listMyLinks(filters = {}) {
    await delay();
    const d = db();
    let rows = d.links.filter((l) => l.userId === d.currentUserId);

    const status = filters.status ?? "active-or-inactive";
    if (status === "all") {
      // include everything
    } else if (status === "active" || status === "inactive") {
      rows = rows.filter((l) => l.status === status);
    } else if (status === "deleted") {
      rows = rows.filter((l) => l.status === "deleted");
    } else {
      // default: hide deleted (§8.5)
      rows = rows.filter((l) => l.status !== "deleted");
    }

    if (filters.campaign === "connected") {
      rows = rows.filter((l) => l.campaignId);
    } else if (filters.campaign === "unconnected") {
      rows = rows.filter((l) => !l.campaignId);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.shortCode.toLowerCase().includes(q) ||
          (l.brand ?? "").toLowerCase().includes(q),
      );
    }

    const sort = filters.sort ?? "newest";
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const da = +new Date(a.createdAt);
      const dbt = +new Date(b.createdAt);
      return sort === "oldest" ? da - dbt : dbt - da;
    });

    return rows.map((l) => mockLinkSummary(d, l));
  },

  async listAllLinks() {
    await delay();
    const d = db();
    return d.links
      .filter((l) => l.status !== "deleted")
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((l) => mockLinkSummary(d, l));
  },

  async getLink(id) {
    await delay(150);
    const d = db();
    const link = d.links.find((l) => l.id === id);
    return link ? mockLinkDetail(d, link) : null;
  },

  async verifyUrl(url) {
    await delay(500);
    const normalizedUrl = normalizeLinkUrl(url);
    if (!normalizedUrl) {
      return {
        ok: false,
        url: url.trim(),
        normalizedUrl: url.trim(),
        host: "",
        type: "other",
        name: null,
        brand: null,
        imageUrl: null,
        store: null,
        isStoreConnected: false,
        campaignOptions: [],
        message: "Enter a valid http(s) URL.",
      };
    }
    const d = db();
    const host = extractHost(normalizedUrl) ?? "";
    const store =
      d.stores.find(
        (s) =>
          normalizeHost(s.primaryDomain ?? "") === host ||
          s.merchantDomain === host,
      ) ?? null;
    const type = inferLinkType(normalizedUrl) as LinkType;
    const storeSummary = store ? mockStoreSummary(d, store) : null;
    const userCampaignIds = new Set(
      d.links
        .filter(
          (l) =>
            l.userId === d.currentUserId &&
            l.status !== "deleted" &&
            l.campaignId &&
            l.discountCodeId,
        )
        .map((l) => l.campaignId!),
    );
    const campaignOptions =
      store && store.connected
        ? d.campaigns
            .filter((c) => c.storeId === store.id && c.status === "active")
            .map((c) => {
              const summary = mockCampaignSummary(d, c);
              if (userCampaignIds.has(c.id)) {
                return {
                  ...summary,
                  codesAvailable: Math.max(summary.codesAvailable, 1),
                };
              }
              return summary;
            })
        : [];
    const duplicate = d.links.some(
      (l) =>
        l.userId === d.currentUserId &&
        l.status !== "deleted" &&
        l.destinationUrl === normalizedUrl,
    );
    return {
      ok: true,
      url: url.trim(),
      normalizedUrl,
      host,
      type,
      name: nameFromUrl(normalizedUrl, host),
      brand: store?.name ?? storeNameFromHost(host),
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(host + type)}/600/600`,
      store: storeSummary,
      isStoreConnected: store?.connected ?? false,
      campaignOptions,
      message: duplicate
        ? "You already have a link for this exact URL."
        : undefined,
    };
  },

  async createLink(input) {
    const d = db();
    const verification = await mock.verifyUrl(input.url);
    if (!verification.ok) throw new Error(verification.message ?? "Invalid URL");

    const duplicate = d.links.find(
      (l) =>
        l.userId === d.currentUserId &&
        l.status !== "deleted" &&
        l.destinationUrl === verification.normalizedUrl,
    );
    if (duplicate) {
      throw new Error("You already have a link for this exact URL.");
    }

    let storeEntity =
      d.stores.find(
        (s) =>
          normalizeHost(s.primaryDomain ?? "") === verification.host ||
          s.merchantDomain === verification.host,
      ) ?? null;

    if (!storeEntity) {
      const domain = verification.host;
      const slug = domain.split(".")[0] ?? domain;
      storeEntity = {
        id: uid("store"),
        name: storeNameFromHost(domain),
        slug,
        merchantDomain: domain,
        primaryDomain: domain,
        externalId: String(60000000000 + d.stores.length),
        logoUrl: faviconUrl(domain),
        countryCode: "US",
        currency: DEFAULT_CURRENCY,
        category: null,
        connected: false,
        connectedAt: null,
        disconnectedAt: null,
        status: "pending",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      d.stores.push(storeEntity);
      pushActivity(d, {
        scopeType: "store",
        scopeId: storeEntity.id,
        actorType: "user",
        actorId: d.currentUserId,
        eventType: "store_auto_created",
        eventData: {
          domain,
          createdBy: "link_auto_create",
          channelType: "online",
          verified: false,
        },
      });
    }

    const id = uid("link");
    const shortCode = generateUniqueShortCode(
      d.links.map((l) => l.shortCode),
    );
    const link = {
      id,
      userId: d.currentUserId,
      storeId: storeEntity.id,
      campaignId: null as string | null,
      discountCodeId: null as string | null,
      type: input.type ?? verification.type,
      destinationUrl: verification.normalizedUrl,
      sourceHost: verification.host,
      name: input.name?.trim() || verification.name || "Untitled link",
      brand: verification.brand,
      imageUrl: verification.imageUrl,
      isVerified: true,
      shortCode,
      shortUrl: `${APP_URL}/l/${shortCode}`,
      status: "active" as LinkStatus,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null as string | null,
    };
    d.links.push(link);
    pushActivity(d, {
      scopeType: "link",
      scopeId: id,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "link_created",
      eventData: { name: link.name },
    });

    if (input.campaignId) {
      return mock.connectCampaign(id, input.campaignId);
    }
    saveDb(d);
    return mockLinkDetail(d, link);
  },

  async updateLink(id, patch) {
    await delay();
    const d = db();
    const link = d.links.find((l) => l.id === id);
    if (!link) throw new Error("Link not found");
    if (patch.name != null) link.name = patch.name.trim() || link.name;
    if (patch.type) link.type = patch.type;
    link.updatedAt = nowIso();
    saveDb(d);
    return detail(id);
  },

  async setStatus(id, status) {
    await delay();
    const d = db();
    const link = d.links.find((l) => l.id === id);
    if (!link) throw new Error("Link not found");
    link.status = status;
    link.updatedAt = nowIso();
    if (status === "deleted") {
      link.deletedAt = nowIso();
      releaseCodeForLink(d, id);
      link.campaignId = null;
      link.discountCodeId = null;
    }
    pushActivity(d, {
      scopeType: "link",
      scopeId: id,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: `link_${status}`,
    });
    saveDb(d);
    return detail(id);
  },

  async deleteLink(id) {
    // Links with commissions in any status must stay for accounting (client req).
    const hasCommission = db().attributions.some((a) => a.linkId === id);
    if (hasCommission) {
      throw new Error(
        "This link has sales or commissions and can't be deleted. Deactivate it instead.",
      );
    }
    await mock.setStatus(id, "deleted");
  },

  async getCampaignOptions(linkId) {
    await delay();
    const d = db();
    const link = d.links.find((l) => l.id === linkId);
    if (!link || !link.storeId) return [];
    const userCampaignIds = new Set(
      d.links
        .filter(
          (l) =>
            l.userId === link.userId &&
            l.status !== "deleted" &&
            l.campaignId &&
            l.discountCodeId,
        )
        .map((l) => l.campaignId!),
    );
    return d.campaigns
      .filter((c) => c.storeId === link.storeId && c.status === "active")
      .map((c) => {
        const summary = mockCampaignSummary(d, c);
        if (userCampaignIds.has(c.id)) {
          return {
            ...summary,
            codesAvailable: Math.max(summary.codesAvailable, 1),
          };
        }
        return summary;
      })
      .filter((c) => c.codesAvailable > 0 || c.id === link.campaignId);
  },

  async connectCampaign(linkId, campaignId) {
    await delay();
    const d = db();
    const link = d.links.find((l) => l.id === linkId);
    if (!link) throw new Error("Link not found");
    const campaign = d.campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "active") {
      throw new Error("Only active campaigns can be connected.");
    }
    if (link.storeId && link.storeId !== campaign.storeId) {
      throw new Error("Campaign must belong to the same store as the link.");
    }
    const codeId = reserveCodeForLink(d, campaignId, linkId);
    link.storeId = campaign.storeId;
    link.campaignId = campaignId;
    link.discountCodeId = codeId;
    link.updatedAt = nowIso();
    pushActivity(d, {
      scopeType: "campaign",
      scopeId: campaignId,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "campaign_connected",
      eventData: { link: link.name, campaign: campaign.name },
    });
    saveDb(d);
    return detail(linkId);
  },

  async removeCampaign(linkId) {
    await delay();
    const d = db();
    const link = d.links.find((l) => l.id === linkId);
    if (!link) throw new Error("Link not found");
    releaseCodeForLink(d, linkId);
    link.campaignId = null;
    link.discountCodeId = null;
    link.updatedAt = nowIso();
    pushActivity(d, {
      scopeType: "link",
      scopeId: linkId,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "campaign_removed",
    });
    saveDb(d);
    return detail(linkId);
  },

  async getResolverView(shortCode) {
    await delay(200);
    if (!isValidShortCode(shortCode)) {
      return { shortCode, found: false, status: "not_found" };
    }
    const d = db();
    const link = d.links.find(
      (l) => l.shortCode === shortCode && l.status === "active",
    );
    if (!link) return { shortCode, found: false, status: "not_found" };

    const store = d.stores.find((s) => s.id === link.storeId) ?? null;
    const campaign = d.campaigns.find((c) => c.id === link.campaignId) ?? null;
    const code =
      d.discountCodes.find((c) => c.id === link.discountCodeId)?.code ?? null;
    const recommender = d.profiles.find((p) => p.id === link.userId) ?? null;
    const redirectUrl = buildDiscountRedirectUrl({
      primaryDomain: store?.primaryDomain ?? null,
      code,
      destinationUrl: link.destinationUrl,
      storeConnected: store?.connected ?? false,
    });

    return {
      shortCode,
      found: true,
      status: "ok",
      link: {
        name: link.name,
        brand: link.brand,
        imageUrl: link.imageUrl,
        type: link.type,
        destinationUrl: link.destinationUrl,
        sourceHost: link.sourceHost,
        redirectUrl,
      },
      store: store
        ? {
            name: store.name,
            logoUrl: store.logoUrl,
            connected: store.connected,
            primaryDomain: store.primaryDomain,
          }
        : null,
      recommenderFirstName: recommender?.firstName ?? null,
      recommenderAvatarUrl: recommender?.avatarUrl ?? null,
      discountPercent: campaign?.discountPercent ?? null,
      discountCode: code,
      terms: campaign?.terms ?? null,
    };
  },

  async recordClick(shortCode, info = {}) {
    // Fire-and-forget: must never block the redirect (§8.6).
    const d = db();
    const link = d.links.find((l) => l.shortCode === shortCode);
    if (!link) return;
    d.clicks.push({
      id: uid("click"),
      linkId: link.id,
      visitorHash: info.visitorHash ?? null,
      userAgent: info.userAgent ?? null,
      countryCode: null,
      source: info.source ?? "resolver",
      clickedAt: nowIso(),
    });
    saveDb(d);
  },
};

async function realGetCurrentUserId(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return user.id;
}

async function loadLinkSummaries(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  linkRows: ReturnType<typeof mapLink> extends infer T ? T[] : never,
) {
  const links = linkRows as import("@/lib/types").Link[];
  if (links.length === 0) return [];

  const storeIds = [...new Set(links.map((l) => l.storeId).filter(Boolean))] as string[];
  const campaignIds = [
    ...new Set(links.map((l) => l.campaignId).filter(Boolean)),
  ] as string[];
  const codeIds = [
    ...new Set(links.map((l) => l.discountCodeId).filter(Boolean)),
  ] as string[];
  const linkIds = links.map((l) => l.id);

  const [storesRes, campaignsRes, codesRes, clicksRes, attrsRes] =
    await Promise.all([
      storeIds.length
        ? supabase.from("stores").select("*").in("id", storeIds)
        : Promise.resolve({ data: [] as never[] }),
      campaignIds.length
        ? supabase.from("campaigns").select("*").in("id", campaignIds)
        : Promise.resolve({ data: [] as never[] }),
      codeIds.length
        ? supabase
            .from("campaign_discount_codes")
            .select("id, code")
            .in("id", codeIds)
        : Promise.resolve({ data: [] as never[] }),
      supabase.rpc("link_click_counts", { p_link_ids: linkIds }),
      supabase
        .from("link_order_attributions")
        .select("*")
        .in("link_id", linkIds),
    ]);

  const stores = (storesRes.data ?? []).map(mapStore);
  const campaigns = (campaignsRes.data ?? []).map(mapCampaign);
  const codeMap = new Map((codesRes.data ?? []).map((c) => [c.id, c.code]));
  const clickCounts = new Map(
    (clicksRes.data ?? []).map((c) => [c.link_id, Number(c.clicks)]),
  );
  const attributions = (attrsRes.data ?? []).map(mapAttribution);

  return links.map((link) => {
    const store = storeById(stores, link.storeId);
    const currency = store?.currency ?? DEFAULT_CURRENCY;
    return toLinkSummary(link, {
      store,
      campaign: campaignById(campaigns, link.campaignId),
      discountCode: link.discountCodeId
        ? (codeMap.get(link.discountCodeId) ?? null)
        : null,
      metrics: linkMetrics(
        link.id,
        clickCounts.get(link.id) ?? 0,
        attributions,
        currency,
      ),
    });
  });
}

async function realDetail(id: string): Promise<LinkDetail> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Link not found");
  const [summary] = await loadLinkSummaries(supabase, [mapLink(data)]);
  const campaign = summary.campaign
    ? await supabase
        .from("campaigns")
        .select("terms")
        .eq("id", summary.campaign.id)
        .maybeSingle()
    : { data: null };
  return toLinkDetail(summary, campaign.data?.terms ?? null);
}

const real: LinksService = {
  async listMyLinks(filters = {}) {
    const supabase = createSupabaseBrowserClient();
    const userId = await realGetCurrentUserId();
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    let rows = (data ?? []).map(mapLink);
    const status = filters.status ?? "active-or-inactive";
    if (status === "all") {
      /* keep all */
    } else if (status === "active" || status === "inactive") {
      rows = rows.filter((l) => l.status === status);
    } else if (status === "deleted") {
      rows = rows.filter((l) => l.status === "deleted");
    } else {
      rows = rows.filter((l) => l.status !== "deleted");
    }
    if (filters.campaign === "connected") rows = rows.filter((l) => l.campaignId);
    else if (filters.campaign === "unconnected")
      rows = rows.filter((l) => !l.campaignId);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.shortCode.toLowerCase().includes(q) ||
          (l.brand ?? "").toLowerCase().includes(q),
      );
    }
    const sort = filters.sort ?? "newest";
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const da = +new Date(a.createdAt);
      const dbt = +new Date(b.createdAt);
      return sort === "oldest" ? da - dbt : dbt - da;
    });

    return loadLinkSummaries(supabase, rows);
  },

  async listAllLinks() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return loadLinkSummaries(supabase, (data ?? []).map(mapLink));
  },

  async getLink(id) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    try {
      return await realDetail(id);
    } catch {
      return null;
    }
  },

  async verifyUrl(url) {
    const res = await fetch("/api/links/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      return mock.verifyUrl(url);
    }
    return (await res.json()) as LinkVerificationResult;
  },

  async createLink(input) {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as LinkDetail | { error?: string };
    if (!res.ok) {
      throw new Error(
        "error" in json && json.error ? json.error : "Could not create link.",
      );
    }
    return json as LinkDetail;
  },

  async updateLink(id, patch) {
    const supabase = createSupabaseBrowserClient();
    const updates: TablesUpdate<"links"> = { updated_at: nowIso() };
    if (patch.name != null) updates.name = patch.name.trim() || undefined;
    if (patch.type) updates.type = patch.type;
    const { error } = await supabase.from("links").update(updates).eq("id", id);
    if (error) throw new Error(error.message);
    return realDetail(id);
  },

  async setStatus(id, status) {
    const supabase = createSupabaseBrowserClient();
    const updates: TablesUpdate<"links"> = {
      status,
      updated_at: nowIso(),
    };
    if (status === "deleted") {
      updates.deleted_at = nowIso();
      await supabase.rpc("release_discount_code_for_link", { p_link_id: id });
      updates.campaign_id = null;
      updates.discount_code_id = null;
    }
    const { error } = await supabase.from("links").update(updates).eq("id", id);
    if (error) throw new Error(error.message);
    return realDetail(id);
  },

  async deleteLink(id) {
    // Links with commissions in any status must stay for accounting (client req).
    const supabase = createSupabaseBrowserClient();
    const { count, error } = await supabase
      .from("link_order_attributions")
      .select("id", { count: "exact", head: true })
      .eq("link_id", id);
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        "This link has sales or commissions and can't be deleted. Deactivate it instead.",
      );
    }
    await real.setStatus(id, "deleted");
  },

  async getCampaignOptions(linkId) {
    const supabase = createSupabaseBrowserClient();
    const { data: link } = await supabase
      .from("links")
      .select("store_id, campaign_id, user_id")
      .eq("id", linkId)
      .maybeSingle();
    if (!link?.store_id) return [];

    const { data: campaignRows } = await supabase
      .from("campaigns")
      .select("*")
      .eq("store_id", link.store_id)
      .eq("status", "active");
    const campaigns = (campaignRows ?? []).map(mapCampaign);
    if (campaigns.length === 0) return [];

    const { data: userCampaignLinks } = await supabase
      .from("links")
      .select("campaign_id")
      .eq("user_id", link.user_id)
      .eq("status", "active")
      .not("campaign_id", "is", null)
      .not("discount_code_id", "is", null);

    const userCampaignIds = new Set(
      (userCampaignLinks ?? []).map((l) => l.campaign_id).filter(Boolean),
    );

    // Aggregate-only counts function — RLS hides code rows from recommenders,
    // which otherwise makes every campaign look exhausted (0 available).
    const { data: countRows } = await supabase.rpc("campaign_code_counts", {
      p_campaign_ids: campaigns.map((c) => c.id),
    });
    const countsByCampaign = new Map(
      (countRows ?? []).map((r) => [
        r.campaign_id,
        {
          codesTotal: r.codes_total,
          codesAvailable: r.codes_available,
          codesClaimed: r.codes_claimed,
        },
      ]),
    );

    const store = await storesService.getStore(link.store_id);
    return campaigns
      .map((c) => {
        const counts = countsByCampaign.get(c.id) ?? {
          codesTotal: 0,
          codesAvailable: 0,
          codesClaimed: 0,
        };
        return toCampaignSummary(c, store, {
          ...counts,
          codesAvailable: userCampaignIds.has(c.id)
            ? Math.max(counts.codesAvailable, 1)
            : counts.codesAvailable,
        });
      })
      .filter(
        (c) => c.codesAvailable > 0 || c.id === link.campaign_id,
      );
  },

  async connectCampaign(linkId, campaignId) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("claim_discount_code_for_link", {
      p_campaign_id: campaignId,
      p_link_id: linkId,
    });
    if (error) throw new Error(error.message);
    return realDetail(linkId);
  },

  async removeCampaign(linkId) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("release_discount_code_for_link", {
      p_link_id: linkId,
    });
    if (error) throw new Error(error.message);
    return realDetail(linkId);
  },

  async getResolverView(shortCode) {
    const res = await fetch(`/api/resolver/${encodeURIComponent(shortCode)}`);
    if (!res.ok) {
      return { shortCode, found: false, status: "error" as const };
    }
    return res.json() as Promise<ResolverView>;
  },

  async recordClick(shortCode, info = {}) {
    const url = `/api/resolver/${encodeURIComponent(shortCode)}`;
    const payload = JSON.stringify(info);
    // The resolver redirects immediately after this call — a plain fetch gets
    // canceled by the navigation and the click is lost. sendBeacon (or a
    // keepalive fetch) survives page unload (§8.6: tracking must not block).
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const sent = navigator.sendBeacon(
        url,
        new Blob([payload], { type: "application/json" }),
      );
      if (sent) return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* fire-and-forget */
    });
  },
};

export const linksService = pick("links", mock, real);
