"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import { Section } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import {
  ActivityIcon,
  CompassIcon,
  EuroIcon,
  LinkIcon,
  ReceiptIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { useAsync } from "@/lib/hooks";
import {
  activityService,
  analyticsService,
  ordersService,
} from "@/services";
import {
  formatCurrencyMinor,
  formatNumber,
  formatRelative,
} from "@/lib/format";
import { useT } from "@/context/I18nProvider";

export default function AdminDashboardPage() {
  const t = useT();
  const { data, loading } = useAsync(async () => {
    const [kpis, activity, orders] = await Promise.all([
      analyticsService.getAdminKpis(),
      activityService.listActivity(),
      ordersService.listAllOrders(),
    ]);
    return { kpis, activity: activity.slice(0, 8), orders: orders.slice(0, 6) };
  }, []);

  const kpis = data?.kpis;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("dashboard.admin.title")}
        description={t("dashboard.admin.subtitle")}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label={t("dashboard.admin.users")}
          value={kpis ? formatNumber(kpis.users) : "—"}
          icon={<UsersIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.admin.connectedStores")}
          value={kpis ? formatNumber(kpis.connectedStores) : "—"}
          icon={<StoreIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.admin.activeCampaigns")}
          value={kpis ? formatNumber(kpis.activeCampaigns) : "—"}
          icon={<TagIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.admin.links")}
          value={kpis ? formatNumber(kpis.links) : "—"}
          icon={<LinkIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.admin.clicks")}
          value={kpis ? formatNumber(kpis.clicks) : "—"}
          icon={<CompassIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.admin.orders")}
          value={kpis ? formatNumber(kpis.orders) : "—"}
          icon={<ReceiptIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.admin.commissionOwed")}
          value={kpis ? formatCurrencyMinor(kpis.commissionOwedMinor, kpis.currency) : "—"}
          icon={<EuroIcon />}
          loading={loading}
          accent="orange"
        />
        <KpiCard
          label={t("dashboard.admin.payoutPending")}
          value={kpis ? formatCurrencyMinor(kpis.payoutPendingMinor, kpis.currency) : "—"}
          icon={<EuroIcon />}
          loading={loading}
          accent="blue"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Section
          title={t("dashboard.admin.recentActivity")}
          icon={<ActivityIcon />}
          action={
            <Link href="/admin/activity" className="text-sm font-semibold text-orange hover:underline">
              {t("common.viewAll")}
            </Link>
          }
        >
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="divide-y divide-stroke">
              {(data?.activity ?? []).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm text-navy">
                    {e.eventType.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-navy/45">
                    {formatRelative(e.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title={t("dashboard.admin.recentOrders")}
          icon={<ReceiptIcon />}
          action={
            <Link href="/admin/orders" className="text-sm font-semibold text-orange hover:underline">
              {t("common.viewAll")}
            </Link>
          }
        >
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (data?.orders ?? []).length === 0 ? (
            <EmptyState title={t("dashboard.admin.noOrders")} />
          ) : (
            <div className="divide-y divide-stroke">
              {(data?.orders ?? []).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{o.orderNumber}</p>
                    <p className="truncate text-xs text-navy/50">{o.store?.name}</p>
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
