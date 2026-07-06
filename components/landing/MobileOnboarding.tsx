"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { useT } from "@/context/I18nProvider";

/**
 * App-style onboarding for the mobile landing page (client feedback 2026-07):
 *   screen 1 — pintap logo + name only (splash; auto-advances, tap to skip)
 *   screen 2 — logo + name with "Get started" as the footnote
 *   screen 3 — the signup page itself (/signup)
 * Desktop keeps the regular landing (see app/page.tsx).
 */
export default function MobileOnboarding() {
  const t = useT();
  const [step, setStep] = useState<0 | 1>(0);

  // Splash auto-advances to the "Get started" screen.
  useEffect(() => {
    const id = setTimeout(() => setStep(1), 1800);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      className="flex min-h-dvh flex-col items-center px-6 pb-[max(5rem,calc(2.5rem+env(safe-area-inset-bottom)))] pt-[max(2.5rem,env(safe-area-inset-top))]"
      onClick={() => setStep(1)}
    >
      <div className="flex flex-1 items-center justify-center">
        {/* No entrance animation: stalled animation timelines (hidden tab,
            device emulation) would leave the splash blank. */}
        <Logo className="[&_img]:h-12" />
      </div>

      {/* Footnote area — empty on the splash so the logo doesn't jump. */}
      <div className="flex min-h-28 w-full max-w-sm flex-col items-center justify-end gap-3">
        {step === 1 && (
          <>
            <Link
              href="/signup"
              className={buttonClasses({ size: "lg", className: "w-full animate-fade-up" })}
            >
              {t("landing.getStarted")}
            </Link>
            <Link
              href="/login"
              className="animate-fade-up rounded-input px-2 py-1 text-sm font-semibold text-navy/60 transition hover:text-navy focus-ring"
            >
              {t("landing.logIn")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
