import "server-only";

import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

/**
 * Soft-delete the signed-in user's account (client req 2026-07-02):
 * the profile row is kept (deleted_at set) so admin retains it for payment
 * history, links are deactivated and their discount codes released, and the
 * auth user is banned so they can't sign in again.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createSupabaseServiceRoleClient();

  // Release reserved discount codes back to their campaigns. The release RPC
  // checks auth.uid() → run it on the user's own client, before the ban.
  const { data: linksWithCodes } = await admin
    .from("links")
    .select("id")
    .eq("user_id", user.id)
    .not("discount_code_id", "is", null);
  for (const link of linksWithCodes ?? []) {
    await supabase.rpc("release_discount_code_for_link", { p_link_id: link.id });
  }

  // Deactivate (not delete) all links: attribution history must survive.
  const now = new Date().toISOString();
  await admin
    .from("links")
    .update({ status: "inactive", updated_at: now })
    .eq("user_id", user.id)
    .neq("status", "deleted");

  const { error: profileError } = await admin
    .from("profiles")
    .update({ deleted_at: now })
    .eq("id", user.id);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Ban the auth user (effectively forever) instead of deleting them, so the
  // account can't be reused but stays queryable for payouts/audits.
  const { error: banError } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: "876000h",
  });
  if (banError) {
    return NextResponse.json({ error: banError.message }, { status: 500 });
  }

  await admin.from("activity_events").insert({
    scope_type: "user",
    scope_id: user.id,
    actor_type: "user",
    actor_id: user.id,
    event_type: "account_deleted",
    event_data: { softDelete: true },
  });

  return NextResponse.json({ ok: true });
}
