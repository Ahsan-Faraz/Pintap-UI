"use client";

import { useMemo, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { SearchIcon, UploadIcon, ChevronDownIcon } from "@/components/ui/icons";
import { useAsync } from "@/lib/hooks";
import { campaignsService, ordersService } from "@/services";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { useT } from "@/context/I18nProvider";
import type { AttributionStatus, OrderSummary } from "@/lib/types";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "confirmed" | "refunded";

const PAGE_SIZE = 5;

/** Mock-aligned merchant orders palette */
const ORDERS_MUTED = "#94A3B8";
const ORDERS_LINE = "#E4E7EC";
const ORDERS_ROW_LINE = "#EEF1F4";
const ORDERS_SEARCH_BG = "#EDF0F4";
const ORDERS_FILTER_TEXT = "#64748B";

const FILTER_PILL_ACTIVE =
  "inline-flex h-9 shrink-0 items-center rounded-full bg-navy px-4 text-sm font-semibold text-white transition focus-ring";
const FILTER_PILL_OUTLINE =
  "inline-flex h-9 shrink-0 items-center rounded-full border bg-white px-4 text-sm font-semibold transition focus-ring hover:opacity-90";

function formatOrderTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  if (isToday) return `Today, ${time}`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

function matchesFilter(status: AttributionStatus, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending";
  if (filter === "confirmed") return status === "confirmed";
  return status === "returned" || status === "canceled";
}

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue/15 text-[#076985]",
  "bg-orange/15 text-orange",
  "bg-green/15 text-[#086838]",
  "bg-purple/15 text-purple",
] as const;

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h]!;
}

export default function MerchantOrdersPage() {
  const t = useT();
  const { store, loading: storeLoading } = useMerchantStore();
  const storeId = store?.id;

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const { data: orders, loading: ordersLoading } = useAsync(
    () =>
      storeId ? ordersService.listOrdersForStore(storeId) : Promise.resolve([]),
    [storeId],
  );

  const { data: campaigns } = useAsync(
    () =>
      storeId
        ? campaignsService.listCampaignsForStore(storeId)
        : Promise.resolve([]),
    [storeId],
  );

  const campaignById = useMemo(
    () => new Map((campaigns ?? []).map((c) => [c.id, c.name])),
    [campaigns],
  );

  const rows = orders ?? [];
  const currency = rows[0]?.currency ?? DEFAULT_CURRENCY;

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const monthRows = rows.filter((o) => new Date(o.createdAt) >= monthStart);
  const monthCommission = monthRows
    .filter((o) => o.status === "confirmed" || o.status === "pending")
    .reduce((s, o) => s + o.commissionAmountMinor, 0);

  const filtered = useMemo(() => {
    let out = rows.filter((o) => matchesFilter(o.status, filter));
    if (campaignFilter !== "all") {
      out = out.filter((o) => o.campaignId === campaignFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((o) => {
        const recommender = o.recommender
          ? `${o.recommender.firstName} ${o.recommender.lastName}`
          : "";
        return `${o.orderNumber} ${o.link?.name} ${recommender} ${o.code}`
          .toLowerCase()
          .includes(q);
      });
    }
    return out;
  }, [rows, filter, campaignFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const from = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min(filtered.length, (safePage + 1) * PAGE_SIZE);

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: t("merchantPages.orders.filterAll") },
    { id: "pending", label: t("merchantPages.orders.filterPending") },
    { id: "confirmed", label: t("merchantPages.orders.filterConfirmed") },
    { id: "refunded", label: t("merchantPages.orders.filterRefunded") },
  ];

  function exportCsv() {
    const header = [
      "Order",
      "Product",
      "Recommender",
      "Campaign",
      "Status",
      "Value",
      "Commission",
    ];
    const lines = filtered.map((o) => [
      o.orderNumber ?? "",
      o.link?.name ?? "",
      o.recommender
        ? `${o.recommender.firstName} ${o.recommender.lastName}`
        : "",
      campaignById.get(o.campaignId) ?? "",
      o.status,
      formatCurrencyMinor(o.orderAmountMinor, o.currency),
      formatCurrencyMinor(o.commissionAmountMinor, o.currency),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (storeLoading) return <Skeleton className="h-64 w-full" />;
  if (!store) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold text-navy">
          {t("merchantPages.orders.title")}
        </h1>
        <NoStore />
      </div>
    );
  }

  const loading = ordersLoading;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-navy">
              {t("merchantPages.orders.title")}
            </h1>
            {!loading && (
              <p className="text-sm text-navy/45">
                {t("merchantPages.orders.headerSummary", {
                  count: formatNumber(monthRows.length),
                  commission: formatCurrencyMinor(monthCommission, currency),
                })}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-input border border-navy/15 bg-white px-4 text-sm font-semibold text-navy transition hover:border-navy/30 focus-ring disabled:opacity-40"
        >
          <UploadIcon className="h-4 w-4" />
          {t("merchantPages.orders.exportCsv")}
        </button>
      </div>

      {/* Single card: toolbar + table + pagination */}
      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-card" />
      ) : (
        <div className="app-flat-card overflow-hidden">
          {/* Toolbar — single row: search | filters | campaign | range */}
          <div className="flex flex-nowrap items-center gap-4 overflow-x-auto px-4 py-3.5">
            <div className="relative w-[240px] shrink-0 sm:w-[268px] lg:w-[292px]">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="search"
                name="merchant-orders-search"
                aria-label={t("merchantPages.orders.search")}
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={t("merchantPages.orders.search")}
                className="h-10 w-full rounded-full border-0 pl-10 pr-4 text-sm text-navy outline-none placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
                style={{ backgroundColor: ORDERS_SEARCH_BG }}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFilter(f.id);
                    setPage(0);
                  }}
                  className={
                    filter === f.id ? FILTER_PILL_ACTIVE : FILTER_PILL_OUTLINE
                  }
                  style={
                    filter === f.id
                      ? undefined
                      : {
                          borderColor: ORDERS_LINE,
                          color: ORDERS_FILTER_TEXT,
                        }
                  }
                >
                  {f.label}
                </button>
              ))}

              <CampaignFilterPill
                value={campaignFilter}
                campaigns={campaigns ?? []}
                label={t("merchantPages.orders.filterCampaign")}
                onChange={(value) => {
                  setCampaignFilter(value);
                  setPage(0);
                }}
              />
            </div>

            <span
              className="ml-auto shrink-0 whitespace-nowrap pl-2 text-xs font-medium tabular-nums"
              style={{ color: ORDERS_MUTED }}
            >
              {t("merchantPages.orders.rangeSummary", {
                from,
                to,
                total: filtered.length,
              })}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-12">
              <EmptyState title={t("merchantPages.orders.emptyTitle")} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: ORDERS_SEARCH_BG,
                        borderBottom: `1px solid ${ORDERS_LINE}`,
                      }}
                    >
                      {[
                        t("merchantPages.orders.columnOrder"),
                        t("merchantPages.orders.columnProduct"),
                        t("merchantPages.orders.columnRecommender"),
                        t("merchantPages.orders.columnCampaign"),
                        t("merchantPages.orders.columnStatus"),
                        t("merchantPages.orders.columnValue"),
                        t("merchantPages.orders.columnCommission"),
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide"
                          style={{ color: ORDERS_MUTED }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((order) => (
                      <OrderTableRow
                        key={order.id}
                        order={order}
                        campaignName={
                          campaignById.get(order.campaignId) ?? "—"
                        }
                        t={t}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderTop: `1px solid ${ORDERS_LINE}` }}
              >
                <p className="text-sm" style={{ color: ORDERS_MUTED }}>
                  {t("merchantPages.orders.showingSummary", {
                    showing: paged.length,
                    total: filtered.length,
                  })}
                </p>
                <div className="flex items-center gap-1">
                  <PaginationBtn
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    label="‹"
                  />
                  {Array.from({ length: Math.min(pageCount, 3) }, (_, i) => (
                    <PaginationBtn
                      key={i}
                      active={safePage === i}
                      onClick={() => setPage(i)}
                      label={String(i + 1)}
                    />
                  ))}
                  <PaginationBtn
                    disabled={safePage >= pageCount - 1}
                    onClick={() =>
                      setPage((p) => Math.min(pageCount - 1, p + 1))
                    }
                    label="›"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function OrderTableRow({
  order,
  campaignName,
  t,
}: {
  order: OrderSummary;
  campaignName: string;
  t: ReturnType<typeof useT>;
}) {
  const isRefunded =
    order.status === "returned" || order.status === "canceled";
  const statusLabel =
    order.status === "returned"
      ? t("merchantPages.orders.filterRefunded")
      : order.status === "canceled"
        ? t("appPages.orders.cancelled")
        : order.status === "pending"
          ? t("merchantPages.orders.filterPending")
          : t("merchantPages.orders.filterConfirmed");

  const badgeClass =
    order.status === "confirmed"
      ? "bg-green/15 text-[#086838]"
      : order.status === "pending"
        ? "bg-blue/15 text-[#076985]"
        : "bg-navy/8 text-navy/50";

  const recommenderName = order.recommender
    ? `${order.recommender.firstName} ${order.recommender.lastName}`
    : "—";

  return (
    <tr
      className="last:border-0"
      style={{ borderBottom: `1px solid ${ORDERS_ROW_LINE}` }}
    >
      <td className="px-4 py-3.5 align-top">
        <p className="font-bold text-navy">{order.orderNumber ?? "—"}</p>
        <p className="mt-0.5 text-xs text-navy/40">
          {formatOrderTimestamp(order.createdAt)}
        </p>
      </td>
      <td className="px-4 py-3.5 align-top text-[15px] text-navy/70">
        {order.link?.name ?? "—"}
      </td>
      <td className="px-4 py-3.5 align-top">
        {order.recommender ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                avatarColor(recommenderName),
              )}
            >
              {initials(
                order.recommender.firstName,
                order.recommender.lastName,
              )}
            </span>
            <span className="text-[15px] text-navy/70">{recommenderName}</span>
          </div>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3.5 align-top">
        <span className="text-[15px] font-medium text-[#1565C0]">
          {campaignName}
        </span>
      </td>
      <td className="px-4 py-3.5 align-top">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            badgeClass,
          )}
        >
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3.5 align-top font-bold text-navy">
        {formatCurrencyMinor(order.orderAmountMinor, order.currency)}
      </td>
      <td className="px-4 py-3.5 align-top font-bold text-[#086838]">
        {isRefunded ? (
          <span className="font-normal text-navy/35">—</span>
        ) : (
          formatCurrencyMinor(order.commissionAmountMinor, order.currency)
        )}
      </td>
    </tr>
  );
}

function CampaignFilterPill({
  value,
  campaigns,
  label,
  onChange,
}: {
  value: string;
  campaigns: { id: string; name: string }[];
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative shrink-0">
      <select
        name="merchant-orders-campaign"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
      >
        <option value="all">{label}</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div
        className={cn(FILTER_PILL_OUTLINE, "pointer-events-none gap-1 pr-3")}
        style={{ borderColor: ORDERS_LINE, color: ORDERS_FILTER_TEXT }}
        aria-hidden
      >
        {label}
        <ChevronDownIcon
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: ORDERS_MUTED }}
        />
      </div>
    </div>
  );
}

function PaginationBtn({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-semibold transition focus-ring disabled:opacity-35",
        active
          ? "bg-navy text-white"
          : "border bg-white text-navy hover:opacity-80",
      )}
      style={active ? undefined : { borderColor: ORDERS_LINE }}
    >
      {label}
    </button>
  );
}
