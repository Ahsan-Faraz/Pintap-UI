import "server-only";

import { NextResponse } from "next/server";
import { importSalesCsv } from "@/lib/server/sales-import";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in.", status: 401 as const, userId: null };
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!role) {
    return { error: "Not allowed.", status: 403 as const, userId: null };
  }

  return { error: null, status: 200 as const, userId: user.id };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { csv?: string; storeId?: string | null; dryRun?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await importSalesCsv({
      csv: body.csv ?? "",
      storeId: body.storeId ?? null,
      dryRun: Boolean(body.dryRun),
      actorId: auth.userId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not import CSV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
