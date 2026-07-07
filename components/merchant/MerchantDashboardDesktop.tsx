"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { AlertIcon, ChevronRightIcon } from "@/components/ui/icons";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import {
  formatCurrencyMinor,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  analyticsService,
  campaignsService,
  ordersService,
} from "@/services";
import type {
  AttributionStatus,
  CampaignSummary,
  MerchantDashboardRange,
  OrderSummary,
} from "@/lib/types";

const RANGE_OPTIONS: MerchantDashboardRange[] = ["30d", "90d", "year"];

const ROW_LINE = "#EEF1F4";
const MUTED = "#94A3B8";

function formatOrderTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  for (let i = 0; i < name.length; i++) {
    h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[h]!;
}

function TrendBadge({
  growth,
  newLabel,
}: {
  growth: number | null;
  newLabel?: string;
}) {
  if (newLabel) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-green/15 px-2 py-0.5 text-xs font-semibold text-[#086838]">
        ↑ {newLabel}
      </span>
    );
  }
  if (growth === null) return null;
  const positive = growth >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        positive ? "bg-green/15 text-[#086838]" : "bg-red-50 text-[#C62828]",
      )}
    >
      {positive ? "↑" : "↓"} {formatPercent(Math.abs(growth))}
    </span>
  );
}

function KpiStat({
  label,
  value,
  growth,
  newLabel,
  loading,
}: {
  label: string;
  value: string;
  growth?: number | null;
  newLabel?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="app-flat-card p-5">
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
    );
  }
  return (
    <div className="app-flat-card p-5">
      <p className="text-sm font-medium text-navy/50">{label}</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <p className="text-2xl font-extrabold tabular-nums text-navy">{value}</p>
        <TrendBadge growth={growth ?? null} newLabel={newLabel} />
      </div>
    </div>
  );
}

function OrderStatusPill({
  status,
  t,
}: {
  status: AttributionStatus;
  t: ReturnType<typeof useT>;
}) {
  const label =
    status === "returned"
      ? t("merchantPages.orders.filterRefunded")
      : status === "canceled"
        ? t("appPages.orders.cancelled")
        : status === "pending"
          ? t("merchantPages.orders.filterPending")
          : t("merchantPages.orders.filterConfirmed");

  const badgeClass =
    status === "confirmed"
      ? "bg-green/15 text-[#086838]"
      : status === "pending"
        ? "bg-blue/15 text-[#076985]"
        : "bg-navy/8 text-navy/50";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        badgeClass,
      )}
    >
      {label}
    </span>
  );
}

function CampaignProgressRow({
  campaign,
  t,
}: {
  campaign: CampaignSummary;
  t: ReturnType<typeof useT>;
}) {
  const low = campaign.codesAvailable <= 3;
  const filled =
    campaign.codesTotal > 0
      ? (campaign.codesAvailable / campaign.codesTotal) * 100
      : 0;

  return (
    <Link
      href={`/merchant/campaigns/${campaign.id}`}
      className="block py-4 first:pt-0 last:pb-0 hover:opacity-90"
    >
      <p className="font-bold text-navy">{campaign.name}</p>
      <p className="mt-0.5 text-sm text-navy/50">
        {t("dashboard.merchant.desktop.offerLine", {
          discount: campaign.discountPercent ?? 0,
          commission: campaign.commissionPercent ?? 0,
        })}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/8">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            low ? "bg-orange" : "bg-[#22C55E]",
          )}
          style={{ width: `${Math.max(0, Math.min(100, filled))}%` }}
        />
      </div>
      <p
        className={cn(
          "mt-1.5 text-xs font-medium",
          low ? "font-semibold text-orange" : "text-[#086838]",
        )}
      >
        {t("merchantPages.campaigns.codesLeft", {
          available: campaign.codesAvailable,
          total: campaign.codesTotal,
        })}
      </p>
    </Link>
  );
}

export default function MerchantDashboardDesktop({
  storeId,
  currency: storeCurrency,
}: {
  storeId: string;
  storeName: string;
  currency: string;
}) {
  const t = useT();
  const [range, setRange] = useState<MerchantDashboardRange>("30d");

  const { data, loading } = useAsync(async () => {
    const [dashboard, kpis, campaigns, orders] = await Promise.all([
      analyticsService.getMerchantDashboard(storeId, range),
      analyticsService.getMerchantKpis(storeId),
      campaignsService.listCampaignsForStore(storeId),
      ordersService.listOrdersForStore(storeId),
    ]);
    return { dashboard, kpis, campaigns, orders };
  }, [storeId, range]);

  const dashboard = data?.dashboard;
  const kpis = data?.kpis;
  const currency = dashboard?.currency ?? kpis?.currency ?? storeCurrency ?? DEFAULT_CURRENCY;
  const activeCampaigns = (data?.campaigns ?? []).filter(
    (c) => c.status === "active",
  );
  const urgentLowStock = activeCampaigns.find((c) => c.codesAvailable <= 2);
  const recentOrders = (data?.orders ?? []).slice(0, 4);

  const newRecommendersLabel = useMemo(() => {
    const n = dashboard?.newRecommenders ?? 0;
    if (n <= 0) return undefined;
    return t("dashboard.merchant.desktop.newRecommenders", { count: n });
  }, [dashboard?.newRecommenders, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">
          {t("nav.dashboard")}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-beige/80 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setRange(opt)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition focus-ring",
                  range === opt
                    ? "bg-white text-navy shadow-sm"
                    : "text-navy/55 hover:text-navy",
                )}
              >
                {opt === "30d"
                  ? t("dashboard.merchant.desktop.range30d")
                  : opt === "90d"
                    ? t("dashboard.merchant.desktop.range90d")
                    : t("dashboard.merchant.desktop.rangeYear")}
              </button>
            ))}
          </div>

          <Link href="/merchant/campaigns/new" className={buttonClasses({})}>
            + {t("dashboard.merchant.newCampaign")}
          </Link>
        </div>
      </div>

      {/* 4 KPIs — single row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStat
          label={t("dashboard.merchant.desktop.revenueViaPintap")}
          value={
            dashboard
              ? formatCurrencyMinor(dashboard.revenueMinor, currency)
              : "—"
          }
          growth={dashboard?.revenueGrowthPercent}
          loading={loading}
        />
        <KpiStat
          label={t("dashboard.merchant.orders")}
          value={
            dashboard
              ? formatNumber(dashboard.orders)
              : kpis
                ? formatNumber(kpis.orders)
                : "—"
          }
          growth={dashboard?.ordersGrowthPercent}
          loading={loading}
        />
        <KpiStat
          label={t("dashboard.merchant.clicks")}
          value={
            dashboard
              ? formatNumber(dashboard.clicks)
              : kpis
                ? formatNumber(kpis.clicks)
                : "—"
          }
          growth={dashboard?.clicksGrowthPercent}
          loading={loading}
        />
        <KpiStat
          label={t("dashboard.merchant.desktop.activeRecommenders")}
          value={
            dashboard
              ? formatNumber(dashboard.activeRecommenders)
              : "—"
          }
          newLabel={newRecommendersLabel}
          loading={loading}
        />
      </div>

      {/* Low-code alert */}
      {urgentLowStock && (
        <div className="flex flex-col gap-3 rounded-card border border-orange/25 bg-orange/10 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
            <p className="text-sm font-medium text-navy">
              {t("dashboard.merchant.desktop.lowCodesAlert", {
                name: urgentLowStock.name,
                left: urgentLowStock.codesAvailable,
              })}
            </p>
          </div>
          <Link
            href={`/merchant/campaigns/${urgentLowStock.id}?addCodes=1`}
            className={buttonClasses({ size: "sm" })}
          >
            {t("merchantPages.campaigns.addCodes")}
          </Link>
        </div>
      )}

      {/* Recent orders (left) · Campaigns (right) */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Recent orders — wide left */}
        <div className="app-flat-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
            <h2 className="text-lg font-extrabold text-navy">
              {t("dashboard.merchant.recentOrders")}
            </h2>
            <Link
              href="/merchant/orders"
              className="inline-flex items-center text-orange hover:opacity-80"
              aria-label={t("common.viewAll")}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-5">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-6">
              <EmptyState title={t("dashboard.merchant.noOrders")} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr
                    className="text-[11px] font-bold uppercase tracking-[0.06em]"
                    style={{ color: MUTED }}
                  >
                    <th className="px-5 py-3 font-bold">
                      {t("dashboard.merchant.desktop.colOrder")}
                    </th>
                    <th className="px-4 py-3 font-bold">
                      {t("dashboard.merchant.desktop.colRecommender")}
                    </th>
                    <th className="px-4 py-3 font-bold">
                      {t("dashboard.merchant.desktop.colStatus")}
                    </th>
                    <th className="px-5 py-3 font-bold">
                      {t("dashboard.merchant.desktop.colValue")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <RecentOrderRow key={order.id} order={order} t={t} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Campaigns + top recommender — narrow right */}
        <div className="app-flat-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
            <h2 className="text-lg font-extrabold text-navy">
              {t("nav.campaigns")}
            </h2>
            <Link
              href="/merchant/campaigns"
              className="text-sm font-semibold text-orange hover:underline"
            >
              {t("dashboard.merchant.desktop.manage")} →
            </Link>
          </div>

          <div className="px-5 py-2">
            {loading ? (
              <Skeleton className="my-4 h-40 w-full" />
            ) : activeCampaigns.length === 0 ? (
              <div className="py-4">
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
              </div>
            ) : (
              <div className="divide-y divide-dashed divide-navy/10">
                {activeCampaigns.slice(0, 2).map((c) => (
                  <CampaignProgressRow key={c.id} campaign={c} t={t} />
                ))}
              </div>
            )}
          </div>

          {dashboard?.topRecommender && (
            <>
              <div className="border-t border-dashed border-navy/10" />
              <div className="px-5 py-4">
                <p
                  className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em]"
                  style={{ color: MUTED }}
                >
                  {t("dashboard.merchant.desktop.topRecommender")}
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold",
                      avatarColor(
                        `${dashboard.topRecommender.firstName} ${dashboard.topRecommender.lastName}`,
                      ),
                    )}
                  >
                    {initials(
                      dashboard.topRecommender.firstName,
                      dashboard.topRecommender.lastName,
                    )}
                  </span>
                  <div>
                    <p className="font-bold text-navy">
                      {dashboard.topRecommender.firstName}{" "}
                      {dashboard.topRecommender.lastName}
                    </p>
                    <p className="text-sm text-navy/50">
                      {t("dashboard.merchant.desktop.topRecommenderStats", {
                        orders: formatNumber(dashboard.topRecommender.orders),
                        revenue: formatCurrencyMinor(
                          dashboard.topRecommender.revenueMinor,
                          currency,
                        ),
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentOrderRow({
  order,
  t,
}: {
  order: OrderSummary;
  t: ReturnType<typeof useT>;
}) {
  const recommenderName = order.recommender
    ? `${order.recommender.firstName} ${order.recommender.lastName}`
    : "—";

  return (
    <tr style={{ borderBottom: `1px solid ${ROW_LINE}` }}>
      <td className="px-5 py-3.5 align-top">
        <p className="font-bold text-navy">{order.orderNumber ?? "—"}</p>
        <p className="mt-0.5 text-xs text-navy/40">
          {formatOrderTimestamp(order.createdAt)}
        </p>
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
        <OrderStatusPill status={order.status} t={t} />
      </td>
      <td className="px-5 py-3.5 align-top font-bold text-navy">
        {formatCurrencyMinor(order.orderAmountMinor, order.currency)}
      </td>
    </tr>
  );
}
