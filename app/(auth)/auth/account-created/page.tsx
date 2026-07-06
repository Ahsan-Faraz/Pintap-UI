"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { defaultPathForRoles } from "@/lib/auth/routes";

export default function AccountCreatedPage() {
  const t = useT();
  const { user } = useAppContext();
  const continuePath = user ? defaultPathForRoles(user.roles) : "/login";

  return (
    <div className="w-full max-w-md text-center">
      <div className="mb-6 flex justify-center">
        <Logo className="scale-110" />
      </div>
      <div className="rounded-[2rem] border border-navy/10 bg-surface p-6 shadow-[0_24px_60px_rgba(0,46,81,0.14)] sm:p-8">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-green/20 text-[#0c7a45]">
          <span className="text-2xl" aria-hidden>
            ✓
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-navy">
          {t("auth.accountCreated.title")}
        </h1>
        <p className="mt-2 text-sm text-navy/60">
          {t("auth.accountCreated.body")}
        </p>
        <p className="mt-3 text-sm text-navy/50">
          {t("auth.accountCreated.note")}
        </p>
        <Link href={continuePath} className={buttonClasses({ className: "mt-6" })}>
          {user
            ? t("auth.accountCreated.continue")
            : t("auth.accountCreated.signIn")}
        </Link>
      </div>
    </div>
  );
}
