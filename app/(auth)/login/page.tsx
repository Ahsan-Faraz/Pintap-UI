"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import { authService } from "@/services";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refresh } = useAppContext();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await authService.loginWithPassword(email, password);
      await refresh();
      toast({ title: t("auth.login.signedIn"), variant: "success" });
      router.push(result.defaultPath);
    } catch (err) {
      setError(translateError(t, err, "auth.login.unable"));
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
        <h1 className="text-center text-xl font-extrabold text-navy">
          {t("auth.login.title")}
        </h1>
        <p className="mt-1 text-center text-sm text-navy/55">
          {t("auth.login.subtitle")}
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <Field label={t("auth.login.email")} htmlFor="email">
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
          <Field label={t("auth.login.password")} htmlFor="password" error={error ?? undefined}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <div className="-mt-2 text-right">
            <Link
              href="/forgot-password"
              className="rounded-input text-sm font-semibold text-navy/55 transition hover:text-navy focus-ring"
            >
              {t("auth.login.forgotPassword")}
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            loading={submitting}
            disabled={!email || !password}
          >
            {t("auth.login.logIn")}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-navy/40">
          <span className="h-px flex-1 bg-navy/15" />
          {t("auth.login.or")}
          <span className="h-px flex-1 bg-navy/15" />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            fullWidth
            disabled
          >
            {t("auth.login.continueGoogle")}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            disabled
          >
            {t("auth.login.magicLink")}
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-navy/55">
        {t("auth.login.newToPintap")}{" "}
        <Link
          href="/signup"
          className="rounded-input font-semibold text-orange hover:underline focus-ring"
        >
          {t("auth.login.createAccount")}
        </Link>
      </p>
    </div>
  );
}
