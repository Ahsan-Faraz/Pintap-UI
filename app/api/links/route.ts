import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLinkForUser } from "@/lib/server/links";
import type { CreateLinkInput } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json()) as CreateLinkInput;
  if (!body.url?.trim()) {
    return NextResponse.json({ error: "URL is required." }, { status: 400 });
  }

  try {
    const link = await createLinkForUser(user.id, body);
    return NextResponse.json(link);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
