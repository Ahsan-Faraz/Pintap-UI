import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listStoreOrdersForMember } from "@/lib/server/orders";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const storeId = new URL(request.url).searchParams.get("storeId")?.trim();
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required." }, { status: 400 });
  }

  try {
    const orders = await listStoreOrdersForMember(user.id, storeId);
    if (orders === null) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    return NextResponse.json(orders);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load orders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
