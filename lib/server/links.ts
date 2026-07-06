import "server-only";

import { APP_URL } from "@/lib/config";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { CreateLinkInput, LinkDetail, LinkType, LinkVerificationResult } from "@/lib/types";
import {
  extractHost,
  faviconUrl,
  inferLinkType,
  normalizeLinkUrl,
  storeNameFromHost,
} from "@/lib/url-utils";
import { generateShortCode } from "@/lib/shortcode";
import {
  campaignById,
  codeCountsForCampaign,
  linkMetrics,
  mapAttribution,
  mapCampaign,
  mapLink,
  mapStore,
  storeById,
  toCampaignSummary,
  toLinkDetail,
  toLinkSummary,
  toStoreSummary,
} from "@/lib/supabase/mappers";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { findStoreByDomain, resolveOrCreateStoreByDomain } from "@/lib/server/store-provision";
import { fetchOgMeta } from "@/lib/server/og-image";

function nameFromUrl(url: string, host: string): string {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean);
    const last = path[path.length - 1];
    if (last) {
      return decodeURIComponent(last)
        .replace(/[-_+]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch {
    /* ignore */
  }
  return storeNameFromHost(host);
}

export async function verifyLinkUrlForUser(
  userId: string,
  rawUrl: string,
): Promise<LinkVerificationResult> {
  const normalizedUrl = normalizeLinkUrl(rawUrl);
  if (!normalizedUrl) {
    return {
      ok: false,
      url: rawUrl.trim(),
      normalizedUrl: rawUrl.trim(),
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

  const host = extractHost(normalizedUrl) ?? "";
  const type = inferLinkType(normalizedUrl) as LinkType;
  const admin = createSupabaseServiceRoleClient();

  const store = host ? await findStoreByDomain(host) : null;
  let storeSummary = null;
  let campaignOptions: LinkVerificationResult["campaignOptions"] = [];

  if (store) {
    const { data: campaignRows } = await admin
      .from("campaigns")
      .select("*")
      .eq("store_id", store.id)
      .eq("status", "active");
    const campaigns = (campaignRows ?? []).map(mapCampaign);

    if (store.connected) {
      const { data: codeRows } = await admin
        .from("campaign_discount_codes")
        .select("*")
        .in(
          "campaign_id",
          campaigns.map((c) => c.id),
        );

      const { data: userCampaignLinks } = await admin
        .from("links")
        .select("campaign_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .not("campaign_id", "is", null)
        .not("discount_code_id", "is", null);

      const userCampaignIds = new Set(
        (userCampaignLinks ?? []).map((l) => l.campaign_id).filter(Boolean),
      );

      // List every active campaign. If this user already has a code for a
      // campaign, they can connect another link without taking a new coupon.
      campaignOptions = campaigns.map((c) => {
        const counts = codeCountsForCampaign(codeRows ?? [], c.id);
        return toCampaignSummary(c, store, {
          ...counts,
          codesAvailable: userCampaignIds.has(c.id)
            ? Math.max(counts.codesAvailable, 1)
            : counts.codesAvailable,
        });
      });
    }

    storeSummary = toStoreSummary(store, campaigns);
  }

  const { data: dup } = await admin
    .from("links")
    .select("id")
    .eq("user_id", userId)
    .eq("destination_url", normalizedUrl)
    .neq("status", "deleted")
    .maybeSingle();

  // Real product/page preview image + title (Open Graph). Fall back to the
  // site's favicon so cards never render an empty tile (bot-blocked storefronts),
  // and to a URL-derived name when the page has no scrapeable title (which yields
  // SKU-like slugs — the name stays user-editable in the create form).
  // Deliberately NOT store.logoUrl — auto-created stores carry a placeholder.
  const meta = await fetchOgMeta(normalizedUrl);
  const imageUrl = meta.imageUrl ?? (host ? faviconUrl(host) : null);

  return {
    ok: true,
    url: rawUrl.trim(),
    normalizedUrl,
    host,
    type,
    name: meta.title ?? nameFromUrl(normalizedUrl, host),
    brand: store?.name ?? storeNameFromHost(host),
    imageUrl,
    store: storeSummary,
    isStoreConnected: store?.connected ?? false,
    campaignOptions,
    message: dup ? "You already have a link for this exact URL." : undefined,
  };
}

async function linkDetailAdmin(linkId: string): Promise<LinkDetail> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from("links")
    .select("*")
    .eq("id", linkId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Link not found");

  const link = mapLink(data);
  const storeIds = link.storeId ? [link.storeId] : [];
  const campaignIds = link.campaignId ? [link.campaignId] : [];
  const codeIds = link.discountCodeId ? [link.discountCodeId] : [];

  const [storesRes, campaignsRes, codesRes, clicksRes, attrsRes] =
    await Promise.all([
      storeIds.length
        ? admin.from("stores").select("*").in("id", storeIds)
        : Promise.resolve({ data: [] as never[] }),
      campaignIds.length
        ? admin.from("campaigns").select("*").in("id", campaignIds)
        : Promise.resolve({ data: [] as never[] }),
      codeIds.length
        ? admin
            .from("campaign_discount_codes")
            .select("id, code")
            .in("id", codeIds)
        : Promise.resolve({ data: [] as never[] }),
      admin
        .from("link_clicks")
        .select("id", { count: "exact", head: true })
        .eq("link_id", linkId),
      admin.from("link_order_attributions").select("*").eq("link_id", linkId),
    ]);

  const stores = (storesRes.data ?? []).map(mapStore);
  const campaigns = (campaignsRes.data ?? []).map(mapCampaign);
  const codeMap = new Map((codesRes.data ?? []).map((c) => [c.id, c.code]));
  const clickCount = clicksRes.count ?? 0;
  const attributions = (attrsRes.data ?? []).map(mapAttribution);
  const store = storeById(stores, link.storeId);
  const currency = store?.currency ?? DEFAULT_CURRENCY;

  const summary = toLinkSummary(link, {
    store,
    campaign: campaignById(campaigns, link.campaignId),
    discountCode: link.discountCodeId
      ? (codeMap.get(link.discountCodeId) ?? null)
      : null,
    metrics: linkMetrics(link.id, clickCount, attributions, currency),
  });

  const terms = summary.campaign
    ? (
        await admin
          .from("campaigns")
          .select("terms")
          .eq("id", summary.campaign.id)
          .maybeSingle()
      ).data?.terms ?? null
    : null;

  return toLinkDetail(summary, terms);
}

export async function createLinkForUser(
  userId: string,
  input: CreateLinkInput,
): Promise<LinkDetail> {
  const verification = await verifyLinkUrlForUser(userId, input.url);
  if (!verification.ok) {
    throw new Error(verification.message ?? "Invalid URL");
  }
  if (verification.message === "You already have a link for this exact URL.") {
    throw new Error(verification.message);
  }

  const admin = createSupabaseServiceRoleClient();
  const store = await resolveOrCreateStoreByDomain(verification.host, {
    createdBy: "link_auto_create",
    userId,
  });

  // Insert with a fresh random code and retry on the (astronomically rare)
  // unique-violation instead of loading every existing short code first.
  let created: Tables<"links"> | null = null;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const shortCode = generateShortCode();
    const row: TablesInsert<"links"> = {
      user_id: userId,
      store_id: store.id,
      type: input.type ?? verification.type,
      destination_url: verification.normalizedUrl,
      source_host: verification.host,
      name: input.name?.trim() || verification.name || "Untitled link",
      brand: verification.brand,
      image_url: verification.imageUrl,
      is_verified: true,
      short_code: shortCode,
      short_url: `${APP_URL}/l/${shortCode}`,
      status: "active",
    };
    const { data, error } = await admin
      .from("links")
      .insert(row)
      .select("*")
      .single();
    if (data) {
      created = data;
    } else {
      lastError = error?.message ?? "Could not create link.";
      // 23505 = unique_violation (short_code collision) → retry; else abort.
      if (error?.code !== "23505") break;
    }
  }
  if (!created) {
    throw new Error(lastError ?? "Could not create link.");
  }

  await admin.from("activity_events").insert({
    scope_type: "link",
    scope_id: created.id,
    actor_type: "user",
    actor_id: userId,
    event_type: "link_created",
    event_data: {
      name: created.name,
      storeId: store.id,
      autoCreatedStore: !verification.store,
    },
  });

  if (input.campaignId) {
    // claim_discount_code_for_link reads auth.uid() to verify the caller owns the
    // link, so it must run on the request's user-scoped client. The service-role
    // `admin` client has no auth.uid() → the RPC raises "Not authenticated".
    const userClient = await createSupabaseServerClient();
    const { error: connectErr } = await userClient.rpc(
      "claim_discount_code_for_link",
      {
        p_campaign_id: input.campaignId,
        p_link_id: created.id,
      },
    );
    if (connectErr) {
      // Roll the link back — otherwise a retry hits the duplicate-URL guard
      // with a half-created, code-less link the user never saw.
      await admin.from("links").delete().eq("id", created.id);
      throw new Error(connectErr.message);
    }
  }

  return linkDetailAdmin(created.id);
}
