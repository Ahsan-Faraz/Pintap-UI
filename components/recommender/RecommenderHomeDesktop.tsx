"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CommissionChart from "@/components/recommender/CommissionChart";
import ShopDetailsSheet from "@/components/recommender/ShopDetailsSheet";
import QuickCreate from "@/components/recommender/QuickCreate";
import Thumb from "@/components/ui/Thumb";
import Skeleton from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { MIN_PAYOUT_MINOR } from "@/lib/currency";
import {
  formatCurrencyMinor,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { brandedStoreLogo } from "@/lib/store-branding";
import { cn } from "@/lib/utils";
import {
  analyticsService,
  campaignsService,
  linksService,
  payoutsService,
  storesService,
} from "@/services";
import type {
  RecommenderDashboardRange,
  StoreSummary,
} from "@/lib/types";

const RANGE_OPTIONS: RecommenderDashboardRange[] = ["7d", "30d", "all"];

function nextPayoutDateLabel(locale: string): string {
  const d = new Date();
  d.setDate(15);
  if (d.getTime() <= Date.now()) {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export default function RecommenderHomeDesktop({
  userId,
  firstName,
}: {
  userId: string;
  firstName: string;
}) {
  const t = useT();
  const [range, setRange] = useState<RecommenderDashboardRange>("7d");
  const [selectedStore, setSelectedStore] = useState<StoreSummary | null>(null);

  const { data, loading } = useAsync(async () => {
    const [dashboard, payout, connectedStores, myLinks] = await Promise.all([
      analyticsService.getRecommenderDashboard(userId, range),
      payoutsService.getOverview(userId),
      storesService.listConnectedStores(),
      linksService.listMyLinks({ status: "active" }),
    ]);

    const joinedStoreIds = new Set(
      myLinks.map((l) => l.store?.id).filter(Boolean) as string[],
    );
    const candidateStores = connectedStores.filter(
      (s) => !joinedStoreIds.has(s.id),
    );
    const campaignStores = await Promise.all(
      candidateStores.slice(0, 4).map(async (store) => {
        const campaigns = await campaignsService.listCampaignsForStore(store.id);
        const active = campaigns.find((c) => c.status === "active");
        return active ? { store, campaign: active } : null;
      }),
    );

    return {
      dashboard,
      payout,
      newCampaigns: campaignStores.filter(Boolean).slice(0, 2) as {
        store: StoreSummary;
        campaign: { discountPercent: number; commissionPercent: number; name: string };
      }[],
    };
  }, [userId, range]);

  const dashboard = data?.dashboard;
  const payout = data?.payout;
  const newCampaigns = data?.newCampaigns ?? [];

  const rangeLabel = useMemo(() => {
    if (range === "7d") return t("dashboard.user.desktop.range7d");
    if (range === "30d") return t("dashboard.user.desktop.range30d");
    return t("dashboard.user.desktop.rangeAll");
  }, [range, t]);

  const commissionTitle = t("dashboard.user.desktop.commissionTitle", {
    range: rangeLabel,
  });

  const payoutProgress = useMemo(() => {
    const available = payout?.availableMinor ?? 0;
    const atOrAbove = available >= MIN_PAYOUT_MINOR;
    const pct = atOrAbove
      ? 100
      : Math.min(100, Math.round((available / MIN_PAYOUT_MINOR) * 100));
    const remaining = Math.max(0, MIN_PAYOUT_MINOR - available);
    return { available, atOrAbove, pct, remaining };
  }, [payout?.availableMinor]);

  const locale =
    typeof document !== "undefined" &&
    document.cookie.includes("NEXT_LOCALE=de")
      ? "de-DE"
      : "en-US";

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-navy">
          {t("dashboard.user.greeting", { name: `${firstName} 👋` })}
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
                {opt === "7d"
                  ? t("dashboard.user.desktop.filter7d")
                  : opt === "30d"
                    ? t("dashboard.user.desktop.filter30d")
                    : t("dashboard.user.desktop.filterAll")}
              </button>
            ))}
          </div>

          <Link href="/app/create-link" className={buttonClasses({})}>
            {t("dashboard.user.desktop.newLink")}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Commission card */}
          <div className="dashboard-hero-card relative overflow-hidden rounded-[20px] p-6 sm:p-8">
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/65">
                  {commissionTitle}
                </p>
                {loading ? (
                  <Skeleton className="mt-2 h-12 w-40 bg-white/20" />
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-4xl font-light tracking-tight text-white sm:text-[42px]">
                      {formatCurrencyMinor(
                        dashboard?.commissionMinor ?? 0,
                        dashboard?.currency ?? "EUR",
                      )}
                    </p>
                    {dashboard?.commissionGrowthPercent != null &&
                    dashboard.commissionGrowthPercent !== 0 ? (
                      <span className="inline-flex items-center rounded-full bg-green/20 px-2.5 py-0.5 text-xs font-bold text-green">
                        {dashboard.commissionGrowthPercent > 0 ? "↑" : "↓"}{" "}
                        {formatPercent(Math.abs(dashboard.commissionGrowthPercent))}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-6 text-right sm:gap-8">
                <DesktopStat
                  label={t("dashboard.user.totalClicks")}
                  value={
                    loading
                      ? "—"
                      : formatNumber(dashboard?.clicks ?? 0)
                  }
                />
                <DesktopStat
                  label={t("dashboard.user.orders")}
                  value={
                    loading
                      ? "—"
                      : formatNumber(dashboard?.orders ?? 0)
                  }
                />
                <DesktopStat
                  label={t("dashboard.user.conversion")}
                  value={
                    loading
                      ? "—"
                      : formatPercent(dashboard?.conversionRate ?? 0)
                  }
                />
              </div>
            </div>

            <CommissionChart
              data={dashboard?.dailyCommission ?? []}
              loading={loading}
            />
          </div>

          {/* Top links table */}
          <div className="app-flat-card overflow-hidden p-0">
            <Link
              href="/app/links"
              className="flex items-center justify-between gap-3 px-5 py-4 focus-ring"
            >
              <h2 className="text-base font-extrabold text-navy">
                {t("dashboard.user.desktop.topLinks")}
              </h2>
              <ChevronRightIcon className="h-5 w-5 text-navy/35" />
            </Link>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-t border-navy/8 text-[11px] font-bold uppercase tracking-wide text-navy/45">
                    <th className="px-5 py-3">{t("dashboard.user.desktop.colLink")}</th>
                    <th className="px-3 py-3">{t("dashboard.user.desktop.colCampaign")}</th>
                    <th className="px-3 py-3 text-right">{t("links.clicks")}</th>
                    <th className="px-3 py-3 text-right">{t("links.orders")}</th>
                    <th className="px-5 py-3 text-right">{t("links.earned")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [0, 1, 2].map((i) => (
                      <tr key={i} className="border-t border-navy/8">
                        <td colSpan={5} className="px-5 py-4">
                          <Skeleton className="h-10" />
                        </td>
                      </tr>
                    ))
                  ) : (dashboard?.topLinks.length ?? 0) === 0 ? (
                    <tr className="border-t border-navy/8">
                      <td colSpan={5} className="px-5 py-8 text-center text-navy/55">
                        {t("dashboard.user.noLinksTitle")}
                      </td>
                    </tr>
                  ) : (
                    dashboard!.topLinks.map((row) => (
                      <tr
                        key={row.linkId}
                        className="border-t border-navy/8 transition hover:bg-beige/30"
                      >
                        <td className="px-5 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Thumb
                              src={row.imageUrl}
                              alt={row.name}
                              className="h-10 w-10 shrink-0 rounded-input"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-navy">
                                {row.name}
                              </p>
                              {row.storeName ? (
                                <p className="truncate text-xs text-navy/50">
                                  {row.storeName}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-navy/65">
                          {row.campaignName ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-navy">
                          {formatNumber(row.clicks)}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-navy">
                          {formatNumber(row.orders)}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-green">
                          {formatCurrencyMinor(
                            row.earnedMinor,
                            dashboard!.currency,
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <QuickCreate variant="sidebar" />

          <div className="app-flat-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-navy">
                {t("dashboard.user.desktop.nextPayout")}
              </h3>
              {!loading && (
                <span className="rounded-full bg-green/15 px-2 py-0.5 text-xs font-bold text-green">
                  {payoutProgress.pct}%
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-36" />
            ) : (
              <p className="mt-2 text-xl font-extrabold text-navy">
                {formatCurrencyMinor(
                  payoutProgress.available,
                  payout?.currency ?? "EUR",
                )}{" "}
                <span className="text-base font-semibold text-navy/45">
                  {t("dashboard.user.desktop.ofThreshold", {
                    amount: formatCurrencyMinor(
                      MIN_PAYOUT_MINOR,
                      payout?.currency ?? "EUR",
                    ),
                  })}
                </span>
              </p>
            )}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/8">
              <div
                className="h-full rounded-full bg-green transition-all duration-500"
                style={{ width: `${payoutProgress.pct}%` }}
              />
            </div>
            {!loading && (
              <p className="mt-3 text-sm text-navy/55">
                {payoutProgress.atOrAbove
                  ? t("appPages.payouts.thresholdReady")
                  : t("dashboard.user.desktop.payoutRemaining", {
                      remaining: formatCurrencyMinor(
                        payoutProgress.remaining,
                        payout?.currency ?? "EUR",
                      ),
                      date: nextPayoutDateLabel(locale),
                    })}
              </p>
            )}
          </div>

          <div className="app-flat-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-navy">
                {t("dashboard.user.desktop.newCampaigns")}
              </h3>
              <Link
                href="/app/discover"
                className="text-sm font-bold text-orange hover:text-orange-hover focus-ring rounded-sm"
              >
                {t("dashboard.user.desktop.discover")} →
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </>
              ) : newCampaigns.length === 0 ? (
                <p className="text-sm text-navy/55">
                  {t("appPages.discover.noActiveCampaigns")}
                </p>
              ) : (
                newCampaigns.map(({ store, campaign }) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 border-t border-navy/8 pt-4 first:border-0 first:pt-0"
                  >
                    <Thumb
                      src={brandedStoreLogo(store)}
                      alt={store.name}
                      className="h-11 w-11 shrink-0 rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy">{store.name}</p>
                      <p className="truncate text-xs text-navy/50">
                        {t("dashboard.user.desktop.campaignOffer", {
                          category: store.category ?? t("dashboard.user.explore"),
                          discount: formatPercent(campaign.discountPercent),
                          commission: formatPercent(campaign.commissionPercent),
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStore(store)}
                      className="shrink-0 rounded-input border border-navy/15 px-3 py-1.5 text-xs font-bold text-navy transition hover:border-navy/30 focus-ring"
                    >
                      {t("appPages.discover.join")}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      <ShopDetailsSheet
        store={selectedStore}
        open={Boolean(selectedStore)}
        onClose={() => setSelectedStore(null)}
      />
    </div>
  );
}

function DesktopStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-white/55">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
