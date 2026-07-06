"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import KpiCard from "@/components/ui/KpiCard";
import { Section } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import QuickCreate from "@/components/recommender/QuickCreate";
import LinkCard from "@/components/recommender/LinkCard";
import StoreCard from "@/components/recommender/StoreCard";
import CardRail from "@/components/recommender/CardRail";
import LinkPreviewModal from "@/components/recommender/LinkPreviewModal";
import ShopDetailsSheet from "@/components/recommender/ShopDetailsSheet";
import {
  ActivityIcon,
  EuroIcon,
  LinkIcon,
  ReceiptIcon,
  StoreIcon,
} from "@/components/ui/icons";
import { useAppContext } from "@/context/AppProvider";
import { useAsync } from "@/lib/hooks";
import { analyticsService, linksService, storesService } from "@/services";
import type { LinkSummary, StoreSummary } from "@/lib/types";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";
import { useT } from "@/context/I18nProvider";

export default function RecommenderHomePage() {
  const { user } = useAppContext();
  const t = useT();
  const userId = user?.id;
  const [selectedLink, setSelectedLink] = useState<LinkSummary | null>(null);
  const [selectedShop, setSelectedShop] = useState<StoreSummary | null>(null);

  const { data, loading } = useAsync(async () => {
    const [kpis, links, myShops] = await Promise.all([
      userId ? analyticsService.getRecommenderKpis(userId) : null,
      linksService.listMyLinks({ status: "active", sort: "newest" }),
      userId ? storesService.getMyShops(userId) : [],
    ]);
    // "My shops" = shops I have links with (client feedback: no fallback to all
    // connected shops — the empty state points new users at Shops instead).
    return { kpis, links, shops: myShops };
  }, [userId]);

  const kpis = data?.kpis;
  const links = data?.links ?? [];
  const shops = data?.shops ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">
          {user
            ? t("dashboard.user.greeting", { name: user.firstName })
            : t("dashboard.user.welcomeBack")}
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          {t("dashboard.user.subtitle")}
        </p>
      </div>

      {/* Stats first (client feedback), then the Create-Link section below. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KpiCard
          label={t("dashboard.user.totalClicks")}
          value={kpis ? formatNumber(kpis.clicks) : "—"}
          icon={<ActivityIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.user.orders")}
          value={kpis ? formatNumber(kpis.orders) : "—"}
          icon={<ReceiptIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.user.commission")}
          value={
            kpis ? formatCurrencyMinor(kpis.commissionMinor, kpis.currency) : "—"
          }
          icon={<EuroIcon />}
          loading={loading}
          accent="green"
        />
      </div>

      {/* R-01: prominent Create-Link section. */}
      <div className="mt-5">
        <QuickCreate />
      </div>

      {/* R-04: active links, newest first, horizontal swipe. Click → preview (R-05). */}
      <div className="mt-5">
        <Section
          title={t("dashboard.user.myActiveLinks")}
          icon={<LinkIcon />}
          action={
            <Link
              href="/app/links"
              className="text-sm font-semibold text-orange hover:underline"
            >
              {t("common.showAll")}
            </Link>
          }
        >
          {loading ? (
            <CardRail>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-72 shrink-0 snap-start" />
              ))}
            </CardRail>
          ) : links.length === 0 ? (
            <EmptyState
              title={t("dashboard.user.noLinksTitle")}
              description={t("dashboard.user.noLinksDesc")}
              action={
                <Link href="/app/create-link" className={buttonClasses({})}>
                  {t("dashboard.user.createLink")}
                </Link>
              }
            />
          ) : (
            <CardRail>
              {links.map((l) => (
                <div key={l.id} className="w-72 shrink-0 snap-start">
                  <LinkCard link={l} onSelect={setSelectedLink} />
                </div>
              ))}
            </CardRail>
          )}
        </Section>
      </div>

      {/* R-06: my shops, newest first, horizontal swipe. Click → details (R-07). */}
      <div className="mt-5">
        <Section
          title={t("dashboard.user.myShops")}
          icon={<StoreIcon />}
          action={
            <Link
              href="/app/discover"
              className="text-sm font-semibold text-orange hover:underline"
            >
              {t("common.showAll")}
            </Link>
          }
        >
          {loading ? (
            <CardRail>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-72 shrink-0 snap-start" />
              ))}
            </CardRail>
          ) : shops.length === 0 ? (
            <EmptyState
              title={t("dashboard.user.noShopsTitle")}
              description={t("dashboard.user.noShopsDesc")}
              action={
                <Link href="/app/discover" className={buttonClasses({})}>
                  {t("dashboard.user.discoverShops")}
                </Link>
              }
            />
          ) : (
            <CardRail>
              {shops.map((s) => (
                <div key={s.id} className="w-72 shrink-0 snap-start">
                  <StoreCard store={s} onSelect={() => setSelectedShop(s)} />
                </div>
              ))}
            </CardRail>
          )}
        </Section>
      </div>

      <LinkPreviewModal
        link={selectedLink}
        open={Boolean(selectedLink)}
        onClose={() => setSelectedLink(null)}
      />
      <ShopDetailsSheet
        store={selectedShop}
        open={Boolean(selectedShop)}
        onClose={() => setSelectedShop(null)}
      />
    </div>
  );
}
