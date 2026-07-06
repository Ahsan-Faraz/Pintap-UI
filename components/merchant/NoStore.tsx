"use client";

import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { useT } from "@/context/I18nProvider";

/** Shown on merchant pages before a store is connected. */
export default function NoStore() {
  const t = useT();
  return (
    <EmptyState
      title={t("merchant.noStore.title")}
      description={t("merchant.noStore.description")}
      action={
        <Link href="/merchant/onboarding" className={buttonClasses({})}>
          {t("merchant.noStore.startOnboarding")}
        </Link>
      }
    />
  );
}
