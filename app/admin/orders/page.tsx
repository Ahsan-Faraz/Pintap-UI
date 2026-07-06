"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { AlertIcon, ReceiptIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { ordersService } from "@/services";
import type { AttributionStatus, OrderSummary } from "@/lib/types";
import { formatCurrencyMinor, formatDate } from "@/lib/format";

const STATUS_OPTIONS: AttributionStatus[] = [
  "pending",
  "confirmed",
  "canceled",
  "returned",
];

export default function AdminOrdersPage() {
  const t = useT();
  const { toast } = useToast();
  const { data, loading, reload } = useAsync(async () => {
    const [orders, unmatched] = await Promise.all([
      ordersService.listAllOrders(),
      ordersService.listUnmatchedOrders(),
    ]);
    return { orders, unmatched };
  }, []);

  const [year, setYear] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function setStatus(order: OrderSummary, status: AttributionStatus) {
    if (status === order.status) return;
    setUpdatingId(order.id);
    try {
      await ordersService.updateAttributionStatus(order.id, status);
      toast({ title: t("adminPages.orders.statusUpdated"), variant: "success" });
      reload();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Could not update status.",
        variant: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const allOrders = data?.orders ?? [];
  const years = Array.from(
    new Set(allOrders.map((o) => new Date(o.createdAt).getFullYear())),
  ).sort((a, b) => b - a);
  const visibleOrders =
    year === "all"
      ? allOrders
      : allOrders.filter(
          (o) => String(new Date(o.createdAt).getFullYear()) === year,
        );

  const columns: Column<OrderSummary>[] = [
    {
      key: "order",
      header: t("orders.order"),
      sortAccessor: (o) => o.orderNumber ?? "",
      render: (o) => <span className="font-semibold text-navy">{o.orderNumber}</span>,
    },
    { key: "store", header: t("orders.store"), render: (o) => o.store?.name ?? "—" },
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
        <span className="font-semibold text-[#0c7a45]">
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
    {
      key: "manage",
      header: t("adminPages.orders.setStatus"),
      align: "right",
      render: (o) => (
        <Select
          value={o.status}
          disabled={updatingId === o.id}
          onChange={(e) => setStatus(o, e.target.value as AttributionStatus)}
          onClick={(e) => e.stopPropagation()}
          className="h-9 w-auto"
          aria-label={t("adminPages.orders.setStatus")}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("appPages.orders.title")}
        description={t("adminPages.orders.description")}
      />

      <div className="space-y-5">
        <Section title={t("adminPages.orders.attributed")} icon={<ReceiptIcon />}>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <DataTable
              columns={columns}
              rows={visibleOrders}
              getRowKey={(o) => o.id}
              searchAccessor={(o) => `${o.orderNumber} ${o.store?.name} ${o.code}`}
              searchPlaceholder={t("adminPages.orders.search")}
              headerFilter={
                <Select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="h-9 w-auto"
                  aria-label={t("adminPages.orders.filterYear")}
                >
                  <option value="all">{t("adminPages.orders.allYears")}</option>
                  {years.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </Select>
              }
            />
          )}
        </Section>

        <Section
          title={t("adminPages.orders.unmatchedTitle")}
          icon={<AlertIcon />}
          description={t("adminPages.orders.unmatchedDescription")}
        >
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (data?.unmatched ?? []).length === 0 ? (
            <EmptyState title={t("adminPages.orders.noUnmatched")} />
          ) : (
            <div className="divide-y divide-stroke">
              {(data?.unmatched ?? []).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      {o.externalOrderNumber}{" "}
                      <span className="font-normal text-navy/50">
                        · {o.storeName}
                      </span>
                    </p>
                    <p className="text-xs text-navy/50">
                      {t("adminPages.orders.codeLine", {
                        code: o.code ?? t("adminPages.orders.none"),
                        date: formatDate(o.createdAt),
                      })}
                    </p>
                  </div>
                  <Badge tone="warning">{t("adminPages.orders.unmatched")}</Badge>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
