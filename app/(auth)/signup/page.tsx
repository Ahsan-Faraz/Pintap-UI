"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthBrandMark, { EyeIcon, GoogleIcon } from "@/components/auth/AuthBrandMark";
import { Field, Input } from "@/components/ui/Input";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import { authService } from "@/services";
import { cn } from "@/lib/utils";

const HERO_STEP_GREEN = "#1E6B52";

const ACCOUNT_TYPE_OPTIONS = [
  { id: "user" as const },
  { id: "merchant" as const },
];

function AccountTypeToggle({
  value,
  onChange,
  t,
}: {
  value: "user" | "merchant";
  onChange: (value: "user" | "merchant") => void;
  t: ReturnType<typeof useT>;
}) {
  const hint =
    value === "user"
      ? t("auth.signup.typeRecommenderHint")
      : t("auth.signup.typeMerchantHint");

  return (
    <div className="mt-5 sm:mt-6">
      <div
        className="flex rounded-input bg-[#EEF1F4] p-1"
        role="tablist"
        aria-label={t("auth.signup.accountType")}
      >
        {ACCOUNT_TYPE_OPTIONS.map((option) => {
          const selected = value === option.id;
          const label =
            option.id === "user"
              ? t("auth.signup.typeRecommender")
              : t("auth.signup.typeMerchant");
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                "flex-1 rounded-[10px] py-2.5 text-sm font-semibold transition focus-ring",
                selected
                  ? "bg-white text-navy shadow-[0_1px_4px_rgba(0,46,81,0.1)]"
                  : "text-navy/45 hover:text-navy/65",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-center text-xs leading-relaxed text-navy/50">
        {hint}
      </p>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAppContext();
  const t = useT();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"user" | "merchant">("user");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function splitName(value: string) {
    const trimmed = value.trim();
    const space = trimmed.indexOf(" ");
    if (space === -1) return { firstName: trimmed, lastName: "" };
    return {
      firstName: trimmed.slice(0, space),
      lastName: trimmed.slice(space + 1).trim(),
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { firstName, lastName } = splitName(fullName);
    if (!firstName || !email || !password) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await authService.signUp({
        email,
        password,
        firstName,
        lastName,
        acceptedTerms: true,
        accountType,
      });
      await refresh();
      router.push(result.defaultPath);
    } catch (err) {
      setError(translateError(t, err, "auth.signup.unable"));
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    t("auth.signup.heroStep1"),
    t("auth.signup.heroStep2"),
    t("auth.signup.heroStep3"),
  ];

  return (
    <div className="auth-split-screen flex h-screen min-h-0 overflow-hidden">
      {/* Left hero — desktop */}
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between bg-navy px-10 py-8 text-white lg:flex xl:px-14 xl:py-10">
        <div>
          <AuthBrandMark inverted showBeta />
          <h2 className="mt-10 max-w-sm text-[2.5rem] font-extrabold leading-[1.08] tracking-tight xl:mt-12 xl:text-[2.65rem]">
            {t("auth.signup.heroHeadlineLine1")}
            <br />
            {t("auth.signup.heroHeadlineLine2")}
          </h2>
          <ol className="mt-8 space-y-4 xl:mt-9">
            {steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: HERO_STEP_GREEN }}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5 text-[15px] leading-snug text-white/90">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-sm text-white/40">{t("auth.signup.copyright")}</p>
      </aside>

      {/* Right form */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-[#f7f8fa] px-5 py-6 sm:px-8 lg:overflow-hidden lg:py-5">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 flex justify-center lg:hidden">
            <AuthBrandMark showBeta />
          </div>

          <h1 className="text-center text-[1.65rem] font-extrabold tracking-tight text-navy lg:text-[1.75rem]">
            {t("auth.signup.title")}
          </h1>
          <p className="mt-1.5 text-center text-sm text-navy/55">
            {t("auth.signup.subtitle")}
          </p>

          <AccountTypeToggle
            value={accountType}
            onChange={setAccountType}
            t={t}
          />

          <button
            type="button"
            disabled
            className="mt-5 flex h-11 w-full items-center justify-center gap-3 rounded-input border border-navy/12 bg-white text-sm font-semibold text-navy shadow-sm sm:mt-6"
          >
            <GoogleIcon />
            {t("auth.login.continueGoogle")}
          </button>

          <div className="my-4 flex items-center gap-3 text-xs text-navy/40">
            <span className="h-px flex-1 bg-navy/12" />
            {t("auth.signup.orWithEmail")}
            <span className="h-px flex-1 bg-navy/12" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <Field label={t("auth.signup.fullName")} htmlFor="fullName">
              <Input
                id="fullName"
                name="name"
                autoComplete="name"
                placeholder={t("auth.signup.fullNamePlaceholder")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </Field>
            <Field label={t("auth.signup.email")} htmlFor="email">
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
            <Field
              label={t("auth.signup.password")}
              htmlFor="password"
              error={error ?? undefined}
            >
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={t("auth.signup.passwordPlaceholder")}
                  minLength={8}
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
            </Field>

            <button
              type="submit"
              disabled={submitting || !email || !password || !fullName.trim()}
              className="mt-0.5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange text-base font-bold text-white shadow-[0_14px_32px_rgba(250,80,4,0.38)] transition hover:bg-orange-hover active:scale-[0.98] focus-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : null}
              {t("auth.signup.createAccount")}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-navy/45">
            {t("auth.signup.termsFooter")}{" "}
            <Link href="/terms" className="font-semibold text-navy/70 hover:underline">
              {t("auth.signup.termsLink")}
            </Link>{" "}
            {t("auth.signup.and")}{" "}
            <Link href="/privacy" className="font-semibold text-navy/70 hover:underline">
              {t("auth.signup.privacyLink")}
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-navy/55">
            {t("auth.signup.alreadyHaveAccount")}{" "}
            <Link
              href="/login"
              className="font-semibold text-orange hover:underline focus-ring"
            >
              {t("auth.signup.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
