"use client";

import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { authService, linksService } from "@/services";
import type { LinkSummary } from "@/lib/types";
import { formatCurrencyMinor, formatDate, formatNumber } from "@/lib/format";

export default function AdminLinksPage() {
  const t = useT();
  const { data, loading } = useAsync(async () => {
    const [links, users] = await Promise.all([
      linksService.listAllLinks(),
      authService.listUsers(),
    ]);
    const names = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
    );
    return { links, names };
  }, []);

  const links = data?.links ?? [];
  const names = data?.names ?? new Map<string, string>();

  const columns: Column<LinkSummary>[] = [
    {
      key: "name",
      header: t("nav.links"),
      sortAccessor: (l) => l.name,
      render: (l) => (
        <div>
          <p className="font-semibold text-navy">{l.name}</p>
          <p className="text-xs text-navy/45">/l/{l.shortCode}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: t("orders.type"),
      render: (l) =>
        l.type === "product"
          ? t("appPages.linkDetail.typeProduct")
          : l.type === "shop"
            ? t("appPages.linkDetail.typeShop")
            : t("appPages.linkDetail.typeOther"),
    },
    {
      key: "store",
      header: t("orders.store"),
      render: (l) => l.store?.name ?? "—",
    },
    {
      key: "creator",
      header: t("orders.createdBy"),
      render: (l) => names.get(l.userId) ?? "—",
    },
    {
      key: "status",
      header: t("orders.status"),
      sortAccessor: (l) => l.status,
      render: (l) => <StatusBadge status={l.status} />,
    },
    {
      key: "clicks",
      header: t("links.clicks"),
      align: "right",
      sortAccessor: (l) => l.metrics.clicks,
      render: (l) => formatNumber(l.metrics.clicks),
    },
    {
      key: "orders",
      header: t("links.orders"),
      align: "right",
      sortAccessor: (l) => l.metrics.orders,
      render: (l) => formatNumber(l.metrics.orders),
    },
    {
      key: "commission",
      header: t("dashboard.user.commission"),
      align: "right",
      sortAccessor: (l) => l.metrics.commissionMinor,
      render: (l) => (
        <span className="font-semibold text-[#0c7a45]">
          {formatCurrencyMinor(l.metrics.commissionMinor, l.metrics.currency)}
        </span>
      ),
    },
    {
      key: "updated",
      header: t("orders.updated"),
      align: "right",
      sortAccessor: (l) => l.updatedAt,
      render: (l) => formatDate(l.updatedAt),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("nav.links")} description={t("adminPages.links.description")} />
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable
          columns={columns}
          rows={links}
          getRowKey={(l) => l.id}
          searchAccessor={(l) =>
            `${l.name} ${l.shortCode} ${l.store?.name} ${names.get(l.userId)}`
          }
          searchPlaceholder={t("adminPages.links.search")}
        />
      )}
    </div>
  );
}
