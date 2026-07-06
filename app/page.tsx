import Link from "next/link";
import Logo from "@/components/ui/Logo";
import MobileOnboarding from "@/components/landing/MobileOnboarding";
import { buttonClasses } from "@/components/ui/Button";
import { APP_SLOGAN } from "@/lib/config";
import { getServerT } from "@/lib/i18n/server";

export default async function LandingPage() {
  const t = await getServerT();
  return (
    <main id="main-content" className="bg-app-mesh min-h-dvh">
      {/* Mobile: app-style onboarding (splash → get started → signup). */}
      <div className="sm:hidden">
        <MobileOnboarding />
      </div>

      {/* Desktop / tablet: regular landing. */}
      <div className="hidden min-h-screen flex-col items-center justify-center px-4 py-12 sm:flex">
        <div className="w-full max-w-xl text-center">
          <div className="flex justify-center">
            <Logo className="scale-110" />
          </div>
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-navy sm:text-5xl">
            {APP_SLOGAN}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-navy/60">
            {t("landing.subtitle")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={buttonClasses({ size: "lg" })}>
              {t("landing.getStarted")}
            </Link>
            <Link
              href="/login"
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              {t("landing.logIn")}
            </Link>
          </div>

          <p className="mx-auto mt-10 max-w-sm text-sm text-navy/50">
            {t("landing.footer")}
          </p>
        </div>
      </div>
    </main>
  );
}
