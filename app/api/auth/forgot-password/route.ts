import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { buildResetPasswordEmail, sendTransactionalEmail } from "@/lib/server/email";
import { getLocale } from "@/lib/i18n/server";

/**
 * Password reset via Brevo (same custom-mailer pattern as signup): generate a
 * recovery token with the admin API and email a link to /auth/confirm
 * (token_hash + verifyOtp → signed-in session) that lands on /reset-password.
 *
 * Always responds `{ ok: true }` — whether the account exists or the mail
 * failed — so the endpoint can't be used to enumerate registered addresses.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Missing email." }, { status: 400 });
  }

  const { origin } = new URL(request.url);
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  // Unknown address → pretend success (no enumeration).
  if (error || !data.properties?.hashed_token) {
    return NextResponse.json({ ok: true });
  }

  const actionLink = `${origin}/auth/confirm?token_hash=${encodeURIComponent(
    data.properties.hashed_token,
  )}&type=recovery&next=${encodeURIComponent("/reset-password")}`;

  try {
    const { subject, html } = buildResetPasswordEmail({
      locale: await getLocale(),
      firstName: data.user?.user_metadata?.first_name ?? "",
      actionLink,
    });
    await sendTransactionalEmail({ to: email, subject, html });
  } catch (mailError) {
    // Token stays valid but unsent; the user can simply request again.
    console.error("Password reset email failed:", mailError);
  }

  return NextResponse.json({ ok: true });
}
