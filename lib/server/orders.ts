import "server-only";

import type { OrderSummary, Role } from "@/lib/types";
import {
  mapAttribution,
  mapLink,
  mapProfile,
  mapStore,
  toOrderSummary,
} from "@/lib/supabase/mappers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * Attributed orders for a store, enriched with the recommender + link names.
 * Uses the service-role client (bypasses RLS) so a merchant can see who drove
 * each order even though RLS hides other users' links and profiles — but only
 * after confirming the caller is a member of the store (or an admin).
 * Returns `null` when the caller isn't allowed to see the store's orders.
 */
export async function listStoreOrdersForMember(
  userId: string,
  storeId: string,
): Promise<OrderSummary[] | null> {
  const admin = createSupabaseServiceRoleClient();

  const [{ data: membership }, { data: adminRole }] = await Promise.all([
    admin
      .from("store_members")
      .select("user_id")
      .eq("store_id", storeId)
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

  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id")
    .eq("store_id", storeId);
  const campaignIds = (campaigns ?? []).map((c) => c.id);
  if (campaignIds.length === 0) return [];

  const { data: attrRows, error } = await admin
    .from("link_order_attributions")
    .select("*")
    .in("campaign_id", campaignIds)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const attrs = (attrRows ?? []).map(mapAttribution);
  if (attrs.length === 0) return [];

  const linkIds = [...new Set(attrs.map((a) => a.linkId))];
  const codeIds = [...new Set(attrs.map((a) => a.discountCodeId))];
  const orderIds = [...new Set(attrs.map((a) => a.externalOrderId))];

  const [linksRes, codesRes, ordersRes, storeRes] = await Promise.all([
    admin.from("links").select("*").in("id", linkIds),
    admin.from("campaign_discount_codes").select("id, code").in("id", codeIds),
    admin.from("store_orders").select("*").in("id", orderIds),
    admin.from("stores").select("*").eq("id", storeId).maybeSingle(),
  ]);

  const links = (linksRes.data ?? []).map(mapLink);
  const linkMap = new Map(links.map((l) => [l.id, l]));
  const codeMap = new Map((codesRes.data ?? []).map((c) => [c.id, c.code]));
  const orderMap = new Map((ordersRes.data ?? []).map((o) => [o.id, o]));
  const store = storeRes.data ? mapStore(storeRes.data) : null;

  const userIds = [...new Set(links.map((l) => l.userId))];
  const [profilesRes, rolesRes] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("*").in("id", userIds)
      : Promise.resolve({ data: [] as never[] }),
    userIds.length
      ? admin.from("user_roles").select("user_id, role").in("user_id", userIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const rolesByUser = new Map<string, Role[]>();
  for (const r of rolesRes.data ?? []) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role as Role);
    rolesByUser.set(r.user_id, list);
  }
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id,
      mapProfile(p, rolesByUser.get(p.id) ?? []),
    ]),
  );

  return attrs.map((a) => {
    const link = linkMap.get(a.linkId) ?? null;
    const recommender = link ? (profileMap.get(link.userId) ?? null) : null;
    const shopOrder = orderMap.get(a.externalOrderId);
    return toOrderSummary(a, {
      link: link
        ? { id: link.id, name: link.name, shortCode: link.shortCode }
        : null,
      store: store ? { id: store.id, name: store.name } : null,
      recommender: recommender
        ? {
            id: recommender.id,
            firstName: recommender.firstName,
            lastName: recommender.lastName,
          }
        : null,
      orderNumber: shopOrder?.external_order_number ?? null,
      code: codeMap.get(a.discountCodeId) ?? null,
    });
  });
}
