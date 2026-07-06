import "server-only";

import { createTranslator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";

/**
 * Transactional email via the Brevo API (BREVO_EMAIL_TOKEN in .env).
 * Used for the double opt-in confirmation mail instead of Supabase's built-in
 * mailer, so delivery works without dashboard SMTP configuration.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER = { name: "Pintap", email: "hello@pintap.com" };

/**
 * TEMP kill-switch. Brevo rejects our API key from unlisted IPs and the
 * allow-listing isn't done until we deploy to GCP, so transactional email
 * (signup confirmation + password reset) is turned off for the test
 * environment. While this is `true`, sends are skipped and the signup route
 * auto-confirms new accounts (see app/api/auth/signup/route.ts). Flip back to
 * `false` — or wire to an env var — once the deploy IP is allow-listed.
 */
export const EMAILS_DISABLED = true;

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (EMAILS_DISABLED) {
    console.warn(
      `[email] skipped (EMAILS_DISABLED): "${args.subject}" → ${args.to}`,
    );
    return;
  }

  const apiKey = process.env.BREVO_EMAIL_TOKEN;
  if (!apiKey) {
    throw new Error("BREVO_EMAIL_TOKEN is not configured.");
  }

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: args.to }],
      subject: args.subject,
      htmlContent: args.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

/** Localized double opt-in confirmation mail (subject + branded HTML body). */
export function buildConfirmSignupEmail(args: {
  locale: Locale;
  firstName: string;
  actionLink: string;
}): { subject: string; html: string } {
  return buildActionEmail({ ...args, keyPrefix: "email.confirm" });
}

/** Localized password-reset mail (subject + branded HTML body). */
export function buildResetPasswordEmail(args: {
  locale: Locale;
  firstName: string;
  actionLink: string;
}): { subject: string; html: string } {
  return buildActionEmail({ ...args, keyPrefix: "email.reset" });
}

/**
 * Shared branded action mail: greeting, one paragraph, orange button, plain
 * fallback link, ignore note. Texts come from `<keyPrefix>.subject|greeting|
 * body|button|fallback|ignore` in messages/{en,de}.json.
 */
function buildActionEmail(args: {
  locale: Locale;
  firstName: string;
  actionLink: string;
  keyPrefix: string;
}): { subject: string; html: string } {
  const t = createTranslator(args.locale);
  const k = (suffix: string) => `${args.keyPrefix}.${suffix}`;
  const subject = t(k("subject"));
  const html = `<!doctype html>
<html lang="${args.locale}">
  <body style="margin:0;padding:0;background-color:#ece7e4;font-family:'Inter','Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ece7e4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:20px;padding:36px 32px;">
            <tr>
              <td style="padding-bottom:20px;">
                <span style="font-size:22px;font-weight:800;color:#002e51;">pintap</span>
              </td>
            </tr>
            <tr>
              <td style="color:#002e51;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 8px;">${escapeHtml(
                  args.firstName
                    ? t(k("greeting"), { name: args.firstName })
                    : t(k("greetingNoName")),
                )}</p>
                <p style="margin:0 0 24px;">${escapeHtml(t(k("body")))}</p>
                <p style="margin:0 0 28px;">
                  <a href="${args.actionLink}" style="display:inline-block;background-color:#fa5004;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:9999px;padding:14px 32px;">
                    ${escapeHtml(t(k("button")))}
                  </a>
                </p>
                <p style="margin:0 0 6px;color:#5c728a;font-size:13px;">${escapeHtml(
                  t(k("fallback")),
                )}</p>
                <p style="margin:0 0 24px;word-break:break-all;font-size:12px;">
                  <a href="${args.actionLink}" style="color:#fa5004;">${args.actionLink}</a>
                </p>
                <p style="margin:0;color:#8296a9;font-size:12px;">${escapeHtml(
                  t(k("ignore")),
                )}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
