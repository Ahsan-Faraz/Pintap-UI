import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  buildConfirmSignupEmail,
  EMAILS_DISABLED,
  sendTransactionalEmail,
} from "@/lib/server/email";
import { getLocale } from "@/lib/i18n/server";

/**
 * Double opt-in signup (required in Germany). The user is created UNCONFIRMED
 * via the admin `generateLink` API and we send the confirmation link ourselves
 * through Brevo (BREVO_EMAIL_TOKEN) — no dependency on Supabase's built-in
 * mailer or the dashboard "Confirm email" toggle. The user is NOT signed in
 * here; GoTrue refuses password logins until `email_confirmed_at` is set,
 * which happens when they click the link (handled by /auth/callback).
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms?: boolean;
    accountType?: "user" | "merchant";
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const accountType = body.accountType === "merchant" ? "merchant" : "user";

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 },
    );
  }

  const { origin } = new URL(request.url);
  // Merchants land in store onboarding after confirming their email.
  const next = accountType === "merchant" ? "/merchant/onboarding" : "/app";

  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error || !data.user) {
    const message =
      error &&
      (error.message.toLowerCase().includes("already") ||
        error.message.toLowerCase().includes("registered"))
        ? "An account with this email already exists."
        : (error?.message ?? "Unable to create account.");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Confirmation goes through our own /auth/confirm route (token_hash +
  // verifyOtp): Supabase's hosted action_link redirects with a URL *fragment*,
  // which server routes can't read — token_hash is the documented pattern for
  // custom mailers and signs the user in via SSR cookies on confirm.
  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    return NextResponse.json(
      { error: "Unable to create the confirmation link. Please try again." },
      { status: 500 },
    );
  }
  const actionLink = `${origin}/auth/confirm?token_hash=${encodeURIComponent(
    hashedToken,
  )}&type=signup&next=${encodeURIComponent(next)}`;

  // Profile + base 'user' role come from the handle_new_user trigger.
  if (body.acceptedTerms) {
    await admin
      .from("profiles")
      .update({ accepted_terms: true })
      .eq("id", data.user.id);
  }
  if (accountType === "merchant") {
    await admin
      .from("user_roles")
      .upsert(
        { user_id: data.user.id, role: "merchant" },
        { onConflict: "user_id,role" },
      );
  }

  // TEMP: with transactional email disabled for the test environment (Brevo IP
  // allow-list pending — see EMAILS_DISABLED), no confirmation mail can reach
  // the user, so activate the account immediately instead of leaving it
  // unconfirmed and unusable. This whole branch disappears once EMAILS_DISABLED
  // is flipped back off and the double opt-in flow below takes over again.
  if (EMAILS_DISABLED) {
    await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true });
    return NextResponse.json({ ok: true, requiresConfirmation: false });
  }

  try {
    const { subject, html } = buildConfirmSignupEmail({
      locale: await getLocale(),
      firstName,
      actionLink,
    });
    await sendTransactionalEmail({ to: email, subject, html });
  } catch (mailError) {
    // Without the mail the account can never be confirmed — roll back so the
    // user can simply retry (otherwise they'd hit "already exists").
    console.error("Signup confirmation email failed:", mailError);
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    return NextResponse.json(
      { error: "We couldn't send the confirmation email. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, requiresConfirmation: true });
}
