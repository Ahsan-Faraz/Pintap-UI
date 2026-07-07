"use client";

import { useMemo, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { InfoIcon } from "@/components/ui/icons";
import { useAppContext } from "@/context/AppProvider";
import { useT, useLocale } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { ordersService } from "@/services";
import type { AttributionStatus, OrderSummary } from "@/lib/types";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled";

function formatOrderDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function monthGroupKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function monthGroupLabel(iso: string, locale: string): string {
  return new Date(iso)
    .toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
      month: "long",
    })
    .toUpperCase();
}

function matchesFilter(status: AttributionStatus, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending";
  if (filter === "confirmed") return status === "confirmed";
  return status === "canceled" || status === "returned";
}

export default function RecommenderOrdersPage() {
  const { user } = useAppContext();
  const t = useT();
  const { locale } = useLocale();
  const userId = user?.id;
  const [filter, setFilter] = useState<StatusFilter>("all");

  const { data: orders, loading } = useAsync(
    () =>
      userId ? ordersService.listOrdersForUser(userId) : Promise.resolve([]),
    [userId],
  );

  const rows = orders ?? [];
  const currency = rows[0]?.currency ?? DEFAULT_CURRENCY;

  const pendingCount = rows.filter((o) => o.status === "pending").length;
  const confirmedCount = rows.filter((o) => o.status === "confirmed").length;
  const cancelledCount = rows.filter(
    (o) => o.status === "canceled" || o.status === "returned",
  ).length;

  const totalCommission = rows
    .filter((o) => o.status === "confirmed" || o.status === "pending")
    .reduce((s, o) => s + o.commissionAmountMinor, 0);

  const filtered = useMemo(
    () => rows.filter((o) => matchesFilter(o.status, filter)),
    [rows, filter],
  );

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const map = new Map<string, OrderSummary[]>();
    for (const order of sorted) {
      const key = monthGroupKey(order.createdAt);
      const list = map.get(key) ?? [];
      list.push(order);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: monthGroupLabel(items[0]!.createdAt, locale),
      items,
    }));
  }, [filtered, locale]);

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("appPages.orders.filterAll") },
    { id: "pending", label: t("appPages.orders.pending") },
    { id: "confirmed", label: t("appPages.orders.confirmed") },
    { id: "cancelled", label: t("appPages.orders.cancelled") },
  ];

  return (
    <div className="mx-auto max-w-lg sm:max-w-2xl">
      {/* Title row */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">
          {t("appPages.orders.title")}
        </h1>
        {!loading && rows.length > 0 && (
          <p className="pt-1 text-right text-sm text-navy/45">
            {t("appPages.orders.headerSummary", {
              count: formatNumber(rows.length),
              commission: formatCurrencyMinor(totalCommission, currency),
            })}
          </p>
        )}
      </div>

      {/* Status summary */}
      {loading ? (
        <Skeleton className="mb-5 h-[88px] rounded-card" />
      ) : (
        <div className="app-flat-card mb-5 grid grid-cols-3 divide-x divide-navy/10 py-5">
          <StatCell
            value={formatNumber(pendingCount)}
            label={t("appPages.orders.pending")}
            valueClass="text-[#076985]"
          />
          <StatCell
            value={formatNumber(confirmedCount)}
            label={t("appPages.orders.confirmed")}
            valueClass="text-[#086838]"
          />
          <StatCell
            value={formatNumber(cancelledCount)}
            label={t("appPages.orders.cancelled")}
            valueClass="text-navy/40"
          />
        </div>
      )}

      {/* Filter chips — single row on mobile */}
      <div className="mb-5 grid grid-cols-4 gap-1.5 sm:gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-2 py-2 text-center text-xs font-semibold transition-colors focus-ring sm:px-4 sm:text-sm",
              filter === f.id
                ? "bg-navy text-white"
                : "border border-navy/15 bg-white text-navy hover:border-navy/30",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped order list */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          title={t("appPages.orders.emptyTitle")}
          description={t("appPages.orders.emptyDescription")}
        />
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.key}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/40">
                {group.label}
              </p>
              <div className="app-flat-card divide-y divide-navy/10 overflow-hidden">
                {group.items.map((order) => (
                  <OrderRow key={order.id} order={order} t={t} locale={locale} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="mt-6 flex items-start gap-3 rounded-card bg-blue/10 px-4 py-3.5">
        <span className="mt-0.5 shrink-0 text-blue">
          <InfoIcon className="h-4 w-4" />
        </span>
        <p className="text-sm leading-snug text-navy/75">
          {t("appPages.orders.pendingNotice")}
        </p>
      </div>
    </div>
  );
}

function StatCell({
  value,
  label,
  valueClass,
}: {
  value: string;
  label: string;
  valueClass: string;
}) {
  return (
    <div className="text-center">
      <p className={cn("text-3xl font-bold leading-none tracking-tight", valueClass)}>
        {value}
      </p>
      <p className="mt-1.5 text-xs font-medium text-navy/45">{label}</p>
    </div>
  );
}

function OrderRow({
  order,
  t,
  locale,
}: {
  order: OrderSummary;
  t: ReturnType<typeof useT>;
  locale: string;
}) {
  const statusLabel =
    order.status === "returned"
      ? t("status.returned")
      : order.status === "canceled"
        ? t("appPages.orders.cancelled")
        : order.status === "pending"
          ? t("appPages.orders.pending")
          : t("appPages.orders.confirmed");

  const badgeClass =
    order.status === "confirmed"
      ? "bg-green/15 text-[#086838]"
      : order.status === "pending"
        ? "bg-blue/15 text-[#076985]"
        : "bg-navy/8 text-navy/50";

  const commissionClass =
    order.status === "confirmed"
      ? "text-[#086838]"
      : order.status === "pending"
        ? "text-[#076985]"
        : "text-navy/45";

  const storeName = order.store?.name ?? "—";
  const productName = order.link?.name ?? "—";
  const dateLabel = formatOrderDay(order.createdAt, locale);
  const commission = formatCurrencyMinor(
    order.commissionAmountMinor,
    order.currency,
  );
  const orderTotal = formatCurrencyMinor(
    order.orderAmountMinor,
    order.currency,
  );

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-navy">
            {order.orderNumber ?? "—"}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              badgeClass,
            )}
          >
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-navy/50">
          {storeName} · {productName} · {dateLabel}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-bold", commissionClass)}>
          +{commission}
        </p>
        <p className="mt-0.5 text-[11px] text-navy/40">
          {t("appPages.orders.onAmount", { amount: orderTotal })}
        </p>
      </div>
    </div>
  );
}
