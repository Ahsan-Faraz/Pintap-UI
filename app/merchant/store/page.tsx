"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Thumb from "@/components/ui/Thumb";
import Skeleton from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { useT } from "@/context/I18nProvider";
import { formatDate, formatPercent } from "@/lib/format";

export default function MerchantStorePage() {
  const t = useT();
  const { store, loading } = useMerchantStore();

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!store) {
    return (
      <div>
        <PageHeader title={t("merchantPages.store.shortTitle")} />
        <NoStore />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("merchantPages.store.title")}
        actions={
          <Link
            href="/merchant/settings"
            className={buttonClasses({ variant: "secondary" })}
          >
            {t("merchantPages.settings.shortTitle")}
          </Link>
        }
      />

      <div className="space-y-4">
        <Section title={t("merchantPages.store.information")}>
          <div className="flex items-center gap-4">
            <Thumb
              src={store.logoUrl}
              alt={store.name}
              className="h-16 w-16 rounded-input"
            />
            <div>
              <p className="text-lg font-bold text-navy">{store.name}</p>
              <p className="text-sm text-navy/55">
                {store.category} · {store.countryCode} · {store.currency}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="info">
              {t(
                store.activeCampaignCount === 1
                  ? "stores.activeCampaignOne"
                  : "stores.activeCampaignOther",
                { count: store.activeCampaignCount },
              )}
            </Badge>
            {store.bestDiscountPercent != null && (
              <Badge tone="success">
                {t("merchantPages.store.bestDiscount", {
                  percent: formatPercent(store.bestDiscountPercent),
                })}
              </Badge>
            )}
          </div>
        </Section>

        <Section title={t("merchantPages.store.connection")}>
          <div className="mb-3">
            <Badge tone={store.connected ? "success" : "danger"}>
              {store.connected ? t("status.connected") : t("status.disconnected")}
            </Badge>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Detail label={t("merchantPages.store.domain")} value={store.merchantDomain} />
            <Detail label={t("merchantPages.store.storefrontDomain")} value={store.primaryDomain} />
            <Detail label={t("merchantPages.store.externalId")} value={store.externalId} />
            <Detail label={t("orders.status")} value={store.status} />
            <Detail
              label={t("merchantPages.store.installed")}
              value={
                store.connectedAt
                  ? formatDate(store.connectedAt)
                  : "—"
              }
            />
            <Detail
              label={t("merchantPages.store.uninstalled")}
              value={
                store.disconnectedAt
                  ? formatDate(store.disconnectedAt)
                  : "—"
              }
            />
          </dl>
          {!store.connected && (
            <Link
              href="/merchant/onboarding"
              className={buttonClasses({ className: "mt-4" })}
            >
              {t("merchantPages.store.reconnect")}
            </Link>
          )}
        </Section>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-input bg-beige/50 px-3 py-2">
      <dt className="text-xs text-navy/50">{label}</dt>
      <dd className="font-semibold capitalize text-navy">{value ?? "—"}</dd>
    </div>
  );
}
