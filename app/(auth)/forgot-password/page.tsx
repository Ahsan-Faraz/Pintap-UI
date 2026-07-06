"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useT } from "@/context/I18nProvider";

/** Request a password-reset link (sent via Brevo by /api/auth/forgot-password). */
export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError(t("auth.forgot.unable"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <Logo className="scale-110" />
      </div>

      <div className="rounded-[2rem] border border-navy/10 bg-surface p-6 shadow-[0_24px_60px_rgba(0,46,81,0.14)] sm:p-8">
        {sent ? (
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-navy">
              {t("auth.forgot.sentTitle")}
            </h1>
            <p className="mt-2 text-sm text-navy/60">
              {t("auth.forgot.sentBody", { email })}
            </p>
            <p className="mt-2 text-xs text-navy/50">
              {t("auth.verify.spamHint")}
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-xl font-extrabold text-navy">
              {t("auth.forgot.title")}
            </h1>
            <p className="mt-1 text-center text-sm text-navy/55">
              {t("auth.forgot.subtitle")}
            </p>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <Field
                label={t("auth.login.email")}
                htmlFor="email"
                error={error ?? undefined}
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("auth.login.emailPlaceholder")}
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" fullWidth loading={submitting} disabled={!email}>
                {t("auth.forgot.send")}
              </Button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-navy/55">
        <Link
          href="/login"
          className="rounded-input font-semibold text-orange hover:underline focus-ring"
        >
          {t("auth.verify.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
