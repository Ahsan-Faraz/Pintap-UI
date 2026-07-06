import "server-only";

import { unstable_cache } from "next/cache";
import { APP_URL } from "@/lib/config";
import type { LinkType, ResolverView } from "@/lib/types";
import { buildDiscountRedirectUrl, faviconUrl } from "@/lib/url-utils";
import { isValidShortCode } from "@/lib/shortcode";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

async function loadResolverViewServer(
  shortCode: string,
): Promise<ResolverView> {
  if (!isValidShortCode(shortCode)) {
    return { shortCode, found: false, status: "not_found" };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: linkRow, error } = await supabase
    .from("links")
    .select(`
      name,
      brand,
      image_url,
      type,
      destination_url,
      source_host,
      user_id,
      store:stores!links_store_id_fkey(name, logo_url, connected, primary_domain),
      campaign:campaigns!links_campaign_id_fkey(discount_percent, terms),
      discount_code:campaign_discount_codes!links_discount_code_id_fkey(code),
      profile:profiles!links_user_id_fkey(first_name, avatar_url)
    `)
    .eq("short_code", shortCode)
    .eq("status", "active")
    .maybeSingle();

  if (error || !linkRow) {
    return { shortCode, found: false, status: "not_found" };
  }

  const row = linkRow as unknown as {
    name: string;
    brand: string | null;
    image_url: string | null;
    type: LinkType;
    destination_url: string;
    source_host: string;
    store: {
      name: string;
      logo_url: string | null;
      connected: boolean;
      primary_domain: string | null;
    } | null;
    campaign: {
      discount_percent: number | null;
      terms: string | null;
    } | null;
    discount_code: { code: string | null } | null;
    profile: { first_name: string | null; avatar_url: string | null } | null;
  };

  const code = row.discount_code?.code ?? null;

  const redirectUrl = buildDiscountRedirectUrl({
    primaryDomain: row.store?.primary_domain ?? null,
    code,
    destinationUrl: row.destination_url,
    storeConnected: row.store?.connected ?? false,
  });

  return {
    shortCode,
    found: true,
    status: "ok",
    link: {
      name: row.name,
      brand: row.brand,
      imageUrl: row.image_url ?? faviconUrl(row.source_host),
      type: row.type,
      destinationUrl: row.destination_url,
      sourceHost: row.source_host,
      redirectUrl,
    },
    store: row.store
      ? {
          name: row.store.name,
          logoUrl: row.store.logo_url,
          connected: row.store.connected,
          primaryDomain: row.store.primary_domain,
        }
      : null,
    recommenderFirstName: row.profile?.first_name ?? null,
    recommenderAvatarUrl: row.profile?.avatar_url ?? null,
    discountPercent: row.campaign?.discount_percent ?? null,
    discountCode: code,
    terms: row.campaign?.terms ?? null,
  };
}

export const getResolverViewServer = unstable_cache(
  loadResolverViewServer,
  ["resolver-view-v1"],
  { revalidate: 60 },
);

export async function recordLinkClickServer(
  shortCode: string,
  info: {
    visitorHash?: string;
    source?: string;
    userAgent?: string;
  } = {},
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { data: linkRow } = await supabase
    .from("links")
    .select("id")
    .eq("short_code", shortCode)
    .eq("status", "active")
    .maybeSingle();
  if (!linkRow) return;

  await supabase.from("link_clicks").insert({
    link_id: linkRow.id,
    visitor_hash: info.visitorHash ?? null,
    source: info.source ?? "resolver",
    user_agent: info.userAgent ?? null,
  });
}

export { APP_URL };
