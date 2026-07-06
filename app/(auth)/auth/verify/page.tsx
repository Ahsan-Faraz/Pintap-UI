import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { getServerT } from "@/lib/i18n/server";

/**
 * Double opt-in pending screen: shown right after signup while the user's
 * confirmation email (required in Germany) is on its way.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const t = await getServerT();
  const { email } = await searchParams;
  return (
    <div className="w-full max-w-md text-center">
      <div className="mb-6 flex justify-center">
        <Logo className="scale-110" />
      </div>
      <div className="rounded-[2rem] border border-navy/10 bg-surface p-6 shadow-[0_24px_60px_rgba(0,46,81,0.14)] sm:p-8">
        <h1 className="text-xl font-extrabold text-navy">
          {t("auth.verify.title")}
        </h1>
        <p className="mt-2 text-sm text-navy/60">
          {email
            ? t("auth.verify.bodyWithEmail", { email })
            : t("auth.verify.body")}
        </p>
        <p className="mt-2 text-xs text-navy/50">{t("auth.verify.spamHint")}</p>
        <Link href="/login" className={buttonClasses({ className: "mt-5" })}>
          {t("auth.verify.backToLogin")}
        </Link>
      </div>
    </div>
  );
}
