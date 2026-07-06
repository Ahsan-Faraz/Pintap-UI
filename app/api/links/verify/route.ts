import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyLinkUrlForUser } from "@/lib/server/links";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json()) as { url?: string };
  if (!body.url?.trim()) {
    return NextResponse.json({ error: "URL is required." }, { status: 400 });
  }

  const result = await verifyLinkUrlForUser(user.id, body.url);
  return NextResponse.json(result);
}
