"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import { EuroIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Skeleton from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/Badge";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { ordersService } from "@/services";
import type { OrderSummary } from "@/lib/types";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrencyMinor, formatDate, formatNumber } from "@/lib/format";

export default function RecommenderOrdersPage() {
  const { user } = useAppContext();
  const t = useT();
  const userId = user?.id;

  const { data: orders, loading } = useAsync(
    () =>
      userId ? ordersService.listOrdersForUser(userId) : Promise.resolve([]),
    [userId],
  );

  const rows = orders ?? [];
  const totalCommission = rows
    .filter((o) => o.status === "confirmed" || o.status === "pending")
    .reduce((s, o) => s + o.commissionAmountMinor, 0);
  const currency = rows[0]?.currency ?? DEFAULT_CURRENCY;
  const summaries = [
    {
      key: "pending",
      statuses: ["pending"],
      accent: "orange",
      badgeStatus: "pending",
    },
    {
      key: "confirmed",
      statuses: ["confirmed"],
      accent: "green",
      badgeStatus: "confirmed",
    },
    {
      key: "cancelled",
      statuses: ["canceled", "returned"],
      accent: "navy",
      badgeStatus: "canceled",
    },
  ] as const;
  const grouped = summaries.map((s) => {
    const matching = rows.filter((o) =>
      (s.statuses as readonly string[]).includes(o.status),
    );
    return {
      ...s,
      count: matching.length,
      salesMinor: matching.reduce((sum, o) => sum + o.orderAmountMinor, 0),
      commissionMinor: matching.reduce(
        (sum, o) => sum + o.commissionAmountMinor,
        0,
      ),
    };
  });

  const columns: Column<OrderSummary>[] = [
    {
      key: "order",
      header: t("orders.order"),
      sortAccessor: (o) => o.orderNumber ?? "",
      render: (o) => (
        <span className="font-semibold text-navy">{o.orderNumber ?? "—"}</span>
      ),
    },
    {
      key: "store",
      header: t("orders.store"),
      render: (o) => o.store?.name ?? "—",
    },
    {
      key: "link",
      header: t("nav.links"),
      render: (o) =>
        o.link ? (
          <Link
            href={`/app/links/${o.link.id}`}
            className="text-orange hover:underline"
          >
            {o.link.name}
          </Link>
        ) : (
          "—"
        ),
    },
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
        <span className="font-bold text-[#0c7a45]">
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("appPages.orders.title")}
        description={t("appPages.orders.description")}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <KpiCard label={t("appPages.orders.title")} value={formatNumber(rows.length)} />
        <KpiCard
          label={t("dashboard.user.commission")}
          value={formatCurrencyMinor(totalCommission, currency)}
          icon={<EuroIcon />}
          accent="green"
        />
      </div>

      <Section
        title={t("appPages.orders.statusSummary")}
        description={t("appPages.orders.statusSummaryDescription")}
        className="mb-5"
      >
        {loading ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {grouped.map((s) => (
              <div
                key={s.key}
                className="rounded-card border border-stroke bg-beige/35 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge
                    status={s.badgeStatus}
                    label={t(`appPages.orders.${s.key}`)}
                  />
                  <span className="text-xs font-semibold text-navy/45">
                    {t("appPages.orders.count", { count: s.count })}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <SummaryRow
                    label={t("appPages.orders.sales")}
                    value={formatCurrencyMinor(s.salesMinor, currency)}
                  />
                  <SummaryRow
                    label={t("appPages.orders.commission")}
                    value={formatCurrencyMinor(s.commissionMinor, currency)}
                    accent={s.accent}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(o) => o.id}
          searchAccessor={(o) =>
            `${o.orderNumber} ${o.store?.name} ${o.link?.name} ${o.code}`
          }
          searchPlaceholder={t("appPages.orders.search")}
          emptyTitle={t("appPages.orders.emptyTitle")}
          emptyDescription={t("appPages.orders.emptyDescription")}
        />
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent = "navy",
}: {
  label: string;
  value: string;
  accent?: "navy" | "green" | "orange";
}) {
  const accentClass =
    accent === "green"
      ? "text-[#0c7a45]"
      : accent === "orange"
        ? "text-orange"
        : "text-navy";
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-navy/55">{label}</span>
      <span className={`font-bold ${accentClass}`}>{value}</span>
    </div>
  );
}
