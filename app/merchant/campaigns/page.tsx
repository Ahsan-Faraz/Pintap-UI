"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { PlusIcon } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  ActiveCampaignCard,
  EndedCampaignCard,
  ScheduledCampaignCard,
  DEFAULT_CURRENCY,
} from "@/components/merchant/CampaignListingCard";
import { useAsync } from "@/lib/hooks";
import { analyticsService, campaignsService } from "@/services";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import type { CampaignSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "active" | "scheduled" | "ended";

const FILTER_PILL_ACTIVE =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-navy px-4 text-sm font-semibold text-white transition focus-ring";
const FILTER_PILL_INACTIVE =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-navy transition focus-ring hover:opacity-90";
const FILTER_PILL_INACTIVE_BG = "#EDF0F4";
const FILTER_PILL_COUNT_MUTED = "#64748B";

function tabForStatus(status: CampaignSummary["status"]): Tab {
  if (status === "scheduled" || status === "draft") return "scheduled";
  if (status === "ended") return "ended";
  return "active";
}

export default function MerchantCampaignsPage() {
  const t = useT();
  const { toast } = useToast();
  const { store, loading: storeLoading } = useMerchantStore();
  const storeId = store?.id;
  const [tab, setTab] = useState<Tab>("active");
  const [pausingId, setPausingId] = useState<string | null>(null);

  const { data: campaigns, loading, reload } = useAsync(
    () =>
      storeId
        ? campaignsService.listCampaignsForStore(storeId)
        : Promise.resolve([]),
    [storeId],
  );

  const { data: metricsRows } = useAsync(
    () =>
      storeId
        ? analyticsService.getCampaignMetricsForStore(storeId)
        : Promise.resolve([]),
    [storeId],
  );

  const metricsByCampaign = useMemo(
    () => new Map((metricsRows ?? []).map((m) => [m.campaignId, m])),
    [metricsRows],
  );

  const rows = campaigns ?? [];
  const currency = store?.currency ?? DEFAULT_CURRENCY;

  const counts = useMemo(() => {
    const active = rows.filter((c) => tabForStatus(c.status) === "active").length;
    const scheduled = rows.filter((c) => tabForStatus(c.status) === "scheduled").length;
    const ended = rows.filter((c) => tabForStatus(c.status) === "ended").length;
    return { active, scheduled, ended };
  }, [rows]);

  const filtered = useMemo(
    () => rows.filter((c) => tabForStatus(c.status) === tab),
    [rows, tab],
  );

  const cardLabels = {
    live: t("merchantPages.campaigns.statusLive"),
    lowCodes: t("merchantPages.campaigns.statusLowCodes"),
    paused: t("merchantPages.campaigns.statusPaused"),
    ended: t("merchantPages.campaigns.statusEnded"),
    edit: t("merchantPages.campaigns.edit"),
    pause: t("merchantPages.campaigns.pauseShort"),
    addCodes: t("merchantPages.campaigns.addCodes"),
    recommenders: t("merchantPages.campaigns.metricRecommenders"),
    clicks: t("merchantPages.campaigns.metricClicks"),
    orders: t("merchantPages.campaigns.metricOrders"),
    revenue: t("merchantPages.campaigns.metricRevenue"),
    discountCodes: t("merchantPages.campaigns.metricDiscountCodes"),
    codesLeft: (available: number, total: number) =>
      t("merchantPages.campaigns.codesLeft", { available, total }),
    subtitle: (discount: number, commission: number, dates: string) =>
      t("merchantPages.campaigns.offerLine", { discount, commission, dates }),
    starts: (date: string) => t("merchantPages.campaigns.startsOn", { date }),
    scheduledSubtitle: (discount: number, commission: number, codes: number) =>
      t("merchantPages.campaigns.scheduledLine", { discount, commission, codes }),
  };

  async function handlePause(campaignId: string) {
    setPausingId(campaignId);
    try {
      await campaignsService.pauseCampaign(campaignId);
      toast({
        title: t("merchantPages.campaigns.paused"),
        variant: "success",
      });
      reload();
    } catch (e) {
      toast({
        title: translateError(t, e, "merchantPages.campaigns.createFailed"),
        variant: "error",
      });
    } finally {
      setPausingId(null);
    }
  }

  function emptyForTab() {
    if (tab === "scheduled") {
      return {
        title: t("merchantPages.campaigns.emptyScheduledTitle"),
        description: t("merchantPages.campaigns.emptyScheduledDescription"),
      };
    }
    if (tab === "ended") {
      return {
        title: t("merchantPages.campaigns.emptyEndedTitle"),
        description: t("merchantPages.campaigns.emptyEndedDescription"),
      };
    }
    return {
      title: t("merchantPages.campaigns.emptyTitle"),
      description: t("merchantPages.campaigns.emptyDescription"),
    };
  }

  if (storeLoading) return <Skeleton className="h-64 w-full" />;
  if (!store) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold text-navy">
          {t("merchantPages.campaigns.title")}
        </h1>
        <NoStore />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    {
      id: "active",
      label: t("merchantPages.campaigns.tabActive"),
      count: counts.active,
    },
    {
      id: "scheduled",
      label: t("merchantPages.campaigns.tabScheduled"),
      count: counts.scheduled,
    },
    {
      id: "ended",
      label: t("merchantPages.campaigns.tabEnded"),
      count: counts.ended,
    },
  ];

  const empty = emptyForTab();

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-navy">
              {t("merchantPages.campaigns.title")}
            </h1>
            {!loading && rows.length > 0 && (
              <p className="text-sm text-navy/45">
                {t("merchantPages.campaigns.headerSummary", counts)}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/merchant/campaigns/new"
          className={buttonClasses({
            variant: "primary",
            size: "md",
            className: "inline-flex shrink-0 self-start rounded-full px-5 shadow-sm",
          })}
        >
          <PlusIcon className="h-4 w-4" />
          {t("merchantPages.campaigns.new")}
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(({ id, label, count }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(active ? FILTER_PILL_ACTIVE : FILTER_PILL_INACTIVE)}
              style={
                active ? undefined : { backgroundColor: FILTER_PILL_INACTIVE_BG }
              }
            >
              <span>{label}</span>
              <span
                className={active ? "text-white/80" : undefined}
                style={active ? undefined : { color: FILTER_PILL_COUNT_MUTED }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Campaign cards */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={empty.title}
          description={empty.description}
          action={
            tab === "active" ? (
              <Link
                href="/merchant/campaigns/new"
                className={buttonClasses({
                  className: "rounded-full px-5",
                })}
              >
                <PlusIcon className="h-4 w-4" />
                {t("merchantPages.campaigns.new")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((campaign) => {
            const metrics = metricsByCampaign.get(campaign.id) ?? {
              campaignId: campaign.id,
              recommenders: 0,
              clicks: 0,
              orders: 0,
              revenueMinor: 0,
            };

            if (tab === "scheduled") {
              return (
                <ScheduledCampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  labels={{
                    edit: cardLabels.edit,
                    starts: cardLabels.starts,
                    subtitle: cardLabels.scheduledSubtitle,
                  }}
                />
              );
            }

            if (tab === "ended") {
              return (
                <EndedCampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  metrics={metrics}
                  currency={currency}
                  labels={{
                    ended: cardLabels.ended,
                    edit: cardLabels.edit,
                    recommenders: cardLabels.recommenders,
                    clicks: cardLabels.clicks,
                    orders: cardLabels.orders,
                    revenue: cardLabels.revenue,
                    subtitle: cardLabels.subtitle,
                  }}
                />
              );
            }

            return (
              <ActiveCampaignCard
                key={campaign.id}
                campaign={campaign}
                metrics={metrics}
                currency={currency}
                labels={cardLabels}
                onPause={() => void handlePause(campaign.id)}
                pausing={pausingId === campaign.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
