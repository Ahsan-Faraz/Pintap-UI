"use client";

import Link from "next/link";
import Banner from "@/components/ui/Banner";
import Skeleton from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import MerchantDashboardDesktop from "@/components/merchant/MerchantDashboardDesktop";
import { useT } from "@/context/I18nProvider";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export default function MerchantDashboardPage() {
  const t = useT();
  const { store, loading: storeLoading } = useMerchantStore();

  if (storeLoading) {
    return <Skeleton className="h-64 w-full rounded-card" />;
  }

  if (!store) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold text-navy">
          {t("nav.dashboard")}
        </h1>
        <NoStore />
      </div>
    );
  }

  return (
    <div>
      {!store.connected && (
        <Banner
          tone="danger"
          title={t("dashboard.merchant.storeDisconnected")}
          className="mb-5"
          action={
            <Link
              href="/merchant/onboarding"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              {t("dashboard.merchant.reconnect")}
            </Link>
          }
        >
          {t("dashboard.merchant.reconnectStore")}
        </Banner>
      )}

      <MerchantDashboardDesktop
        storeId={store.id}
        storeName={store.name}
        currency={store.currency ?? DEFAULT_CURRENCY}
      />
    </div>
  );
}
