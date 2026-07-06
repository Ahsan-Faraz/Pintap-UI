import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { getServerT } from "@/lib/i18n/server";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; home?: string }>;
}) {
  const params = await searchParams;
  const home = params.home || "/app";
  const from = params.from;
  const t = await getServerT();

  return (
    <div className="w-full max-w-md text-center">
      <div className="mb-6 flex justify-center">
        <Logo className="scale-110" />
      </div>
      <div className="rounded-[2rem] border border-navy/10 bg-surface p-6 shadow-[0_24px_60px_rgba(0,46,81,0.14)] sm:p-8">
        <h1 className="text-xl font-extrabold text-navy">
          {t("auth.accessDenied.title")}
        </h1>
        <p className="mt-2 text-sm text-navy/60">
          {t("auth.accessDenied.body", {
            area: from ?? t("auth.accessDenied.thatArea"),
          })}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={home} className={buttonClasses({ fullWidth: true })}>
            {t("auth.accessDenied.goToDashboard")}
          </Link>
          <Link
            href="/login"
            className={buttonClasses({ variant: "secondary", fullWidth: true })}
          >
            {t("auth.accessDenied.switchAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
