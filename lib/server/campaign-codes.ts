import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { CampaignCodeRow, CampaignDiscountCode } from "@/lib/types";

/**
 * Discount codes for a campaign, each enriched with the recommender who claimed
 * it. Uses the service-role client (bypasses RLS) so a merchant can see the
 * recommender's name even though RLS hides other users' links and profiles — but
 * only after confirming the caller is a member of the campaign's store (or an
 * admin). Returns `null` when the caller isn't allowed to see the campaign.
 */
export async function listCampaignCodesForMember(
  userId: string,
  campaignId: string,
): Promise<CampaignCodeRow[] | null> {
  const admin = createSupabaseServiceRoleClient();

  const { data: campaign } = await admin
    .from("campaigns")
    .select("store_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return null;

  const [{ data: membership }, { data: adminRole }] = await Promise.all([
    admin
      .from("store_members")
      .select("user_id")
      .eq("store_id", campaign.store_id)
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
  ]);
  if (!membership && !adminRole) return null;

  const { data: codeRows } = await admin
    .from("campaign_discount_codes")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at");
  const codes = codeRows ?? [];

  const linkIds = [
    ...new Set(
      codes.map((c) => c.claimed_by_link_id).filter(Boolean) as string[],
    ),
  ];

  const linkById = new Map<string, { name: string; userId: string }>();
  const nameByUser = new Map<string, string>();
  if (linkIds.length) {
    const { data: links } = await admin
      .from("links")
      .select("id, name, user_id")
      .in("id", linkIds);
    for (const l of links ?? []) {
      linkById.set(l.id, { name: l.name, userId: l.user_id });
    }
    const userIds = [...new Set((links ?? []).map((l) => l.user_id))];
    if (userIds.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);
      for (const p of profiles ?? []) nameByUser.set(p.id, recommenderName(p));
    }
  }

  return codes.map((c) => {
    const link = c.claimed_by_link_id
      ? linkById.get(c.claimed_by_link_id)
      : undefined;
    return {
      id: c.id,
      campaignId: c.campaign_id,
      code: c.code,
      status: c.status as CampaignDiscountCode["status"],
      claimedByLinkId: c.claimed_by_link_id,
      createdAt: c.created_at,
      claimedLinkName: link?.name ?? null,
      claimedByName: link ? (nameByUser.get(link.userId) ?? null) : null,
    };
  });
}

function recommenderName(p: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}): string {
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || p.email || "Unknown";
}
