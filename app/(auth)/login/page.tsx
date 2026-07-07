"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthBrandMark, { EyeIcon, GoogleIcon } from "@/components/auth/AuthBrandMark";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import { authService } from "@/services";

const HERO_EARN_GREEN = "#1E6B52";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refresh } = useAppContext();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-split-screen flex h-screen min-h-0 overflow-hidden">
      {/* Left hero — desktop */}
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between bg-navy px-10 py-10 text-white lg:flex xl:px-14">
        <div>
          <AuthBrandMark inverted showBeta />
          <h2 className="mt-12 max-w-md text-[2.65rem] font-extrabold leading-[1.1] tracking-tight xl:mt-14 xl:text-[2.75rem]">
            {t("auth.login.heroHeadline")}
          </h2>
          <div className="mt-10 rounded-card border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-bold text-white"
                style={{ backgroundColor: HERO_EARN_GREEN }}
              >
                €
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">
                  {t("auth.login.heroEarned")}
                </p>
                <p className="mt-0.5 text-xs text-white/55">
                  {t("auth.login.heroEarnedSub")}
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-white/40">{t("auth.login.copyright")}</p>
      </aside>

      {/* Right form */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-[#f7f8fa] px-5 py-8 sm:px-8 lg:overflow-hidden lg:py-6">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 flex justify-center lg:hidden">
            <AuthBrandMark showBeta />
          </div>

          <h1 className="text-center text-[1.75rem] font-extrabold tracking-tight text-navy">
            {t("auth.login.title")}
          </h1>
          <p className="mt-1.5 text-center text-sm text-navy/55">
            {t("auth.login.subtitle")}
          </p>

          <button
            type="button"
            disabled
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-input border border-navy/12 bg-white text-sm font-semibold text-navy shadow-sm"
          >
            <GoogleIcon />
            {t("auth.login.continueGoogle")}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-navy/40">
            <span className="h-px flex-1 bg-navy/12" />
            {t("auth.login.orWithEmail")}
            <span className="h-px flex-1 bg-navy/12" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3.5">
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

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-navy"
                >
                  {t("auth.login.password")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-orange hover:underline focus-ring"
                >
                  {t("auth.login.forgotShort")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t("auth.signup.togglePassword")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/35 transition hover:text-navy/60 focus-ring"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
              {error ? (
                <p className="text-xs font-medium text-red-600" aria-live="polite">
                  {error}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange text-base font-bold text-white shadow-[0_14px_32px_rgba(250,80,4,0.38)] transition hover:bg-orange-hover active:scale-[0.98] focus-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : null}
              {t("auth.login.logIn")}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-navy/55">
            {t("auth.login.newToPintap")}{" "}
            <Link
              href="/signup"
              className="font-semibold text-orange hover:underline focus-ring"
            >
              {t("auth.login.createAccount")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
