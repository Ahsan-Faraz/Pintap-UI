"use client";

import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Skeleton from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/Badge";
import { useAsync } from "@/lib/hooks";
import { ordersService } from "@/services";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { useT } from "@/context/I18nProvider";
import type { OrderSummary } from "@/lib/types";
import { formatCurrencyMinor, formatDate } from "@/lib/format";

export default function MerchantOrdersPage() {
  const t = useT();
  const { store, loading: storeLoading } = useMerchantStore();
  const storeId = store?.id;

  const { data, loading } = useAsync(
    () =>
      storeId ? ordersService.listOrdersForStore(storeId) : Promise.resolve([]),
    [storeId],
  );

  if (storeLoading) return <Skeleton className="h-64 w-full" />;
  if (!store) {
    return (
      <div>
        <PageHeader title={t("appPages.orders.title")} />
        <NoStore />
      </div>
    );
  }

  const columns: Column<OrderSummary>[] = [
    {
      key: "order",
      header: t("orders.order"),
      sortAccessor: (o) => o.orderNumber ?? "",
      render: (o) => (
        <span className="font-semibold text-navy">{o.orderNumber}</span>
      ),
    },
    {
      key: "recommender",
      header: t("orders.recommender"),
      render: (o) =>
        o.recommender
          ? `${o.recommender.firstName} ${o.recommender.lastName}`
          : "—",
    },
    { key: "code", header: t("orders.code"), render: (o) => o.code ?? "—" },
    {
      key: "status",
      header: t("orders.status"),
      sortAccessor: (o) => o.status,
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: "amount",
      header: t("orders.order"),
      align: "right",
      sortAccessor: (o) => o.orderAmountMinor,
      render: (o) => formatCurrencyMinor(o.orderAmountMinor, o.currency),
    },
    {
      key: "commission",
      header: t("dashboard.user.commission"),
      align: "right",
      sortAccessor: (o) => o.commissionAmountMinor,
      render: (o) => (
        <span className="font-bold text-orange">
          {formatCurrencyMinor(o.commissionAmountMinor, o.currency)}
        </span>
      ),
    },
    {
      key: "date",
      header: t("orders.date"),
      align: "right",
      sortAccessor: (o) => o.createdAt,
      render: (o) => formatDate(o.createdAt),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("merchantPages.orders.title")}
        description={t("merchantPages.orders.description")}
      />
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowKey={(o) => o.id}
          searchAccessor={(o) =>
            `${o.orderNumber} ${o.recommender?.firstName} ${o.code} ${o.link?.name}`
          }
          searchPlaceholder={t("merchantPages.orders.search")}
          emptyTitle={t("merchantPages.orders.emptyTitle")}
        />
      )}
    </div>
  );
}
