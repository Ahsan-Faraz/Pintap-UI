import "server-only";

import { NextResponse } from "next/server";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { faviconUrl, normalizeStoreDomain, storeNameFromHost } from "@/lib/url-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { mapCampaign, mapStore, toStoreSummary } from "@/lib/supabase/mappers";
import { slugForHost } from "@/lib/server/store-provision";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json()) as { storeDomain?: string };
  const domain = normalizeStoreDomain(body.storeDomain ?? "");
  if (!domain) {
    return NextResponse.json({
      ok: false,
      error: "Enter a valid store domain (e.g. your-store.com).",
    });
  }

  const admin = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("stores")
    .select("*")
    .eq("merchant_domain", domain)
    .maybeSingle();

  let storeId: string;
  if (existing) {
    storeId = existing.id;
    await admin
      .from("stores")
      .update({
        connected: true,
        primary_domain: domain,
        status: "active",
        connected_at: now,
        disconnected_at: null,
        updated_at: now,
      })
      .eq("id", storeId);
  } else {
    const { data: created, error } = await admin
      .from("stores")
      .insert({
        name: storeNameFromHost(domain),
        slug: slugForHost(domain),
        merchant_domain: domain,
        primary_domain: domain,
        // No platform connection → no external store id (unique, nullable).
        external_store_id: null,
        logo_url: faviconUrl(domain),
        country_code: "US",
        currency: DEFAULT_CURRENCY,
        connected: true,
        connected_at: now,
        status: "active",
      })
      .select("*")
      .single();
    if (error || !created) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Could not create store." },
        { status: 500 },
      );
    }
    storeId = created.id;
  }

  await admin.from("store_members").upsert(
    { store_id: storeId, user_id: user.id, role: "owner" },
    { onConflict: "store_id,user_id" },
  );

  await admin.from("user_roles").upsert(
    { user_id: user.id, role: "merchant" },
    { onConflict: "user_id,role", ignoreDuplicates: true },
  );

  await admin.from("activity_events").insert({
    scope_type: "store",
    scope_id: storeId,
    actor_type: "user",
    actor_id: user.id,
    event_type: "store_connected",
    event_data: { domain },
  });

  const { data: storeRow } = await admin
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();
  const { data: campaignRows } = await admin
    .from("campaigns")
    .select("*")
    .eq("store_id", storeId);

  if (!storeRow) {
    return NextResponse.json(
      { ok: false, error: "Store not found after connect." },
      { status: 500 },
    );
  }

  const store = mapStore(storeRow);
  const campaigns = (campaignRows ?? []).map(mapCampaign);
  return NextResponse.json({ ok: true, store: toStoreSummary(store, campaigns) });
}
