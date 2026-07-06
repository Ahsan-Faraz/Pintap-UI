"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import { authService } from "@/services";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAppContext();
  const t = useT();
  const [accountType, setAccountType] = useState<"user" | "merchant">("user");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      setError(t("auth.signup.acceptTerms"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await authService.signUp({
        email,
        password,
        firstName,
        lastName,
        acceptedTerms,
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

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-center">
        <Logo className="scale-110" />
      </div>

      <div className="rounded-[2rem] border border-navy/10 bg-surface p-6 shadow-[0_24px_60px_rgba(0,46,81,0.14)] sm:p-8">
        <h1 className="text-center text-xl font-extrabold text-navy">
          {t("auth.signup.title")}
        </h1>
        <p className="mt-1 text-center text-sm text-navy/55">
          {t("auth.signup.subtitle")}
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {/* Account type: recommender (default) or merchant (A2). */}
          <div
            role="radiogroup"
            aria-label={t("auth.signup.accountType")}
            className="grid grid-cols-2 gap-2 rounded-input border border-navy/15 bg-beige/40 p-1"
          >
            {(["user", "merchant"] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={accountType === type}
                onClick={() => setAccountType(type)}
                className={`rounded-[10px] px-3 py-2 text-sm font-semibold transition focus-ring ${
                  accountType === type
                    ? "bg-surface text-navy shadow-card"
                    : "text-navy/55 hover:text-navy"
                }`}
              >
                {t(
                  type === "user"
                    ? "auth.signup.typeRecommender"
                    : "auth.signup.typeMerchant",
                )}
              </button>
            ))}
          </div>
          <p className="-mt-2 text-xs text-navy/55">
            {t(
              accountType === "user"
                ? "auth.signup.typeRecommenderHint"
                : "auth.signup.typeMerchantHint",
            )}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("auth.signup.firstName")} htmlFor="firstName">
              <Input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </Field>
            <Field label={t("auth.signup.lastName")} htmlFor="lastName">
              <Input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </Field>
          </div>
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
          <Field label={t("auth.signup.password")} htmlFor="password" error={error ?? undefined}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <label className="flex items-start gap-2 text-sm text-navy/70">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 rounded border-navy/20 accent-orange"
            />
            <span>
              {t("auth.signup.terms")}
            </span>
          </label>

          <Button
            type="submit"
            fullWidth
            loading={submitting}
            disabled={
              !email || !password || !firstName || !lastName || !acceptedTerms
            }
          >
            {t("auth.signup.createAccount")}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-navy/55">
        {t("auth.signup.alreadyHaveAccount")}{" "}
        <Link
          href="/login"
          className="rounded-input font-semibold text-orange hover:underline focus-ring"
        >
          {t("auth.signup.signIn")}
        </Link>
      </p>
    </div>
  );
}
