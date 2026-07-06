"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import { Section } from "@/components/ui/Card";
import Banner from "@/components/ui/Banner";
import { StatusBadge } from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import {
  ActivityIcon,
  LinkIcon,
  EuroIcon,
  ReceiptIcon,
  TagIcon,
} from "@/components/ui/icons";
import { useAsync } from "@/lib/hooks";
import {
  analyticsService,
  campaignsService,
  ordersService,
} from "@/services";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import {
  formatCurrencyMinor,
  formatDate,
  formatNumber,
} from "@/lib/format";
import { useT } from "@/context/I18nProvider";

export default function MerchantDashboardPage() {
  const t = useT();
  const { store, loading: storeLoading } = useMerchantStore();
  const storeId = store?.id;

  const { data, loading } = useAsync(async () => {
    if (!storeId) return null;
    const [kpis, campaigns, orders] = await Promise.all([
      analyticsService.getMerchantKpis(storeId),
      campaignsService.listCampaignsForStore(storeId),
      ordersService.listOrdersForStore(storeId),
    ]);
    return { kpis, campaigns, orders };
  }, [storeId]);

  if (storeLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!store) {
    return (
      <div>
        <PageHeader title={t("section.merchant")} />
        <NoStore />
      </div>
    );
  }

  const kpis = data?.kpis;
  const activeCampaigns = (data?.campaigns ?? []).filter(
    (c) => c.status === "active",
  );
  const lowStock = (data?.campaigns ?? []).filter(
    (c) => c.status === "active" && c.codesAvailable <= 2,
  );
  const recentOrders = (data?.orders ?? []).slice(0, 5);
  const currency = store.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={store.name}
        description={t("dashboard.merchant.subtitle")}
        actions={
          <Link href="/merchant/campaigns/new" className={buttonClasses({})}>
            {t("dashboard.merchant.newCampaign")}
          </Link>
        }
      />

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard
          label={t("dashboard.merchant.activeCampaigns")}
          value={kpis ? formatNumber(kpis.activeCampaigns) : "—"}
          icon={<TagIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.merchant.issuedLinks")}
          value={kpis ? formatNumber(kpis.issuedLinks) : "—"}
          icon={<LinkIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.merchant.clicks")}
          value={kpis ? formatNumber(kpis.clicks) : "—"}
          icon={<ActivityIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.merchant.orders")}
          value={kpis ? formatNumber(kpis.orders) : "—"}
          icon={<ReceiptIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.merchant.commissionOwed")}
          value={kpis ? formatCurrencyMinor(kpis.commissionOwedMinor, currency) : "—"}
          icon={<EuroIcon />}
          loading={loading}
          accent="orange"
        />
        <KpiCard
          label={t("dashboard.merchant.fundedBalance")}
          value={kpis ? formatCurrencyMinor(kpis.fundedBalanceMinor, currency) : "—"}
          icon={<EuroIcon />}
          loading={loading}
          accent="green"
        />
      </div>

      {lowStock.length > 0 && (
        <Banner
          tone="warning"
          title={t("dashboard.merchant.lowDiscountInventory")}
          className="mt-5"
        >
          {t("dashboard.merchant.lowDiscountInventoryBody", {
            campaigns: lowStock.map((c) => c.name).join(", "),
          })}
        </Banner>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Section
          title={t("dashboard.merchant.activeCampaigns")}
          icon={<TagIcon />}
          action={
            <Link
              href="/merchant/campaigns"
              className="text-sm font-semibold text-orange hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          }
        >
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : activeCampaigns.length === 0 ? (
            <EmptyState
              title={t("dashboard.merchant.noActiveCampaigns")}
              action={
                <Link
                  href="/merchant/campaigns/new"
                  className={buttonClasses({ size: "sm" })}
                >
                  {t("dashboard.merchant.createOne")}
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-stroke">
              {activeCampaigns.map((c) => (
                <Link
                  key={c.id}
                  href={`/merchant/campaigns/${c.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                >
                  <div>
                    <p className="font-semibold text-navy">{c.name}</p>
                    <p className="text-xs text-navy/55">
                      {t("dashboard.merchant.codesAvailable", {
                        available: c.codesAvailable,
                        total: c.codesTotal,
                      })}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section
          title={t("dashboard.merchant.recentOrders")}
          icon={<ReceiptIcon />}
          action={
            <Link
              href="/merchant/orders"
              className="text-sm font-semibold text-orange hover:underline"
            >
              {t("common.viewAll")}
            </Link>
          }
        >
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : recentOrders.length === 0 ? (
            <EmptyState title={t("dashboard.merchant.noOrders")} />
          ) : (
            <div className="divide-y divide-stroke">
              {recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{o.orderNumber}</p>
                    <p className="truncate text-xs text-navy/55">
                      {o.link?.name} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={o.status} />
                    <span className="text-sm font-bold text-navy">
                      {formatCurrencyMinor(o.orderAmountMinor, o.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
