"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Set a new password. Reached from the reset email: /auth/confirm verifies the
 * recovery token and starts a session, so the user is signed in here — if not
 * (expired/invalid link), we point them back to /forgot-password.
 */
export default function ResetPasswordPage() {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: session, loading } = useAsync(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      toast({ title: t("auth.reset.success"), variant: "success" });
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.reset.unable"));
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
        {loading ? null : !session ? (
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-navy">
              {t("auth.reset.expiredTitle")}
            </h1>
            <p className="mt-2 text-sm text-navy/60">
              {t("auth.reset.expiredBody")}
            </p>
            <Link
              href="/forgot-password"
              className="mt-4 inline-block rounded-input font-semibold text-orange hover:underline focus-ring"
            >
              {t("auth.reset.requestNew")}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-center text-xl font-extrabold text-navy">
              {t("auth.reset.title")}
            </h1>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <Field label={t("auth.reset.newPassword")} htmlFor="new-password">
                <Input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field
                label={t("auth.reset.confirmPassword")}
                htmlFor="confirm-password"
                error={error ?? undefined}
              >
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </Field>
              <Button
                type="submit"
                fullWidth
                loading={submitting}
                disabled={!password || !confirm}
              >
                {t("auth.reset.save")}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
