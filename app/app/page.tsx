"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import QuickCreate from "@/components/recommender/QuickCreate";
import LinkCard from "@/components/recommender/LinkCard";
import StoreCard from "@/components/recommender/StoreCard";
import CardRail from "@/components/recommender/CardRail";
import LinkPreviewModal from "@/components/recommender/LinkPreviewModal";
import ShopDetailsSheet from "@/components/recommender/ShopDetailsSheet";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useAppContext } from "@/context/AppProvider";
import { useAsync } from "@/lib/hooks";
import { analyticsService, linksService, storesService } from "@/services";
import type { LinkSummary, StoreSummary } from "@/lib/types";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";
import { useT } from "@/context/I18nProvider";
import { ensureFahrradXxlOnHomeShops } from "@/lib/store-branding";

function ClaySectionHeader({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="clay-section-header mb-3 group focus-ring rounded-[12px]"
    >
      <h2 className="text-lg font-extrabold text-navy">{title}</h2>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-navy/6 text-navy/35 transition group-hover:bg-navy/10 group-hover:text-navy/55">
        <ChevronRightIcon className="h-5 w-5" />
      </span>
    </Link>
  );
}

export default function RecommenderHomePage() {
  const { user } = useAppContext();
  const t = useT();
  const userId = user?.id;
  const [selectedLink, setSelectedLink] = useState<LinkSummary | null>(null);
  const [selectedShop, setSelectedShop] = useState<StoreSummary | null>(null);

  const { data, loading } = useAsync(async () => {
    const [kpis, links, myShops, connectedShops] = await Promise.all([
      userId ? analyticsService.getRecommenderKpis(userId) : null,
      linksService.listMyLinks({ status: "active", sort: "newest" }),
      userId ? storesService.getMyShops(userId) : [],
      storesService.listConnectedStores(),
    ]);
    return {
      kpis,
      links,
      shops: ensureFahrradXxlOnHomeShops(myShops, connectedShops),
    };
  }, [userId]);

  const kpis = data?.kpis;
  const links = data?.links ?? [];
  const shops = data?.shops ?? [];

  const greeting = user
    ? t("dashboard.user.greeting", { name: user.firstName })
    : t("dashboard.user.welcomeBack");

  return (
    <div className="mx-auto max-w-lg sm:max-w-5xl">
      {/* Hero dashboard card — navy clay with inline KPIs */}
      <div className="clay-card-navy relative overflow-hidden p-5 sm:p-6">
        {/* Brand watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-4 h-40 w-40 opacity-[0.12] sm:h-48 sm:w-48"
          style={{
            backgroundImage: "url(/pintap-icon.svg)",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 right-8 h-32 w-32 opacity-[0.08] sm:h-40 sm:w-40"
          style={{
            backgroundImage: "url(/pintap-icon.svg)",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />

        <p className="relative max-w-[85%] text-lg font-bold leading-snug text-white sm:text-xl">
          {greeting}{" "}
          <span className="font-semibold text-white/90">
            {t("dashboard.user.subtitle")}
          </span>
        </p>

        <div className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <HeroStat
            label={t("dashboard.user.totalClicks")}
            value={kpis ? formatNumber(kpis.clicks) : "—"}
            loading={loading}
          />
          <HeroStat
            label={t("dashboard.user.orders")}
            value={kpis ? formatNumber(kpis.orders) : "—"}
            loading={loading}
          />
          <HeroStat
            label={t("dashboard.user.commission")}
            value={
              kpis
                ? formatCurrencyMinor(kpis.commissionMinor, kpis.currency)
                : "—"
            }
            loading={loading}
            accent
          />
        </div>
      </div>

      {/* Create-link — functionality preserved, clay styled */}
      <div className="mt-4">
        <QuickCreate />
      </div>

      {/* My Links — horizontal rail */}
      <div className="mt-6">
        <ClaySectionHeader
          title={t("dashboard.user.myActiveLinks")}
          href="/app/links"
        />
        {loading ? (
          <CardRail className="-mx-4 px-4 sm:mx-0 sm:px-1">
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className="link-rail-item h-[248px] shrink-0 snap-start self-stretch rounded-[20px]"
              />
            ))}
          </CardRail>
        ) : links.length === 0 ? (
          <div className="clay-surface p-4">
            <EmptyState
              title={t("dashboard.user.noLinksTitle")}
              description={t("dashboard.user.noLinksDesc")}
              action={
                <Link href="/app/create-link" className={buttonClasses({})}>
                  {t("dashboard.user.createLink")}
                </Link>
              }
            />
          </div>
        ) : (
          <CardRail className="-mx-4 px-4 sm:mx-0 sm:px-1">
            {links.map((l) => (
              <div key={l.id} className="link-rail-item shrink-0 snap-start self-stretch">
                <LinkCard link={l} onSelect={setSelectedLink} variant="rail" />
              </div>
            ))}
          </CardRail>
        )}
      </div>

      {/* My Shops — compact logo rail */}
      <div className="mt-6">
        <ClaySectionHeader
          title={t("dashboard.user.myShops")}
          href="/app/discover"
        />
        {loading ? (
          <>
            <CardRail className="-mx-4 px-4 sm:hidden">
              {[0, 1, 2].map((i) => (
                <Skeleton
                  key={i}
                  className="shop-rail-item h-[128px] shrink-0 snap-start self-stretch rounded-[20px]"
                />
              ))}
            </CardRail>
            <div className="hidden gap-4 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[136px] rounded-[20px]" />
              ))}
            </div>
          </>
        ) : shops.length === 0 ? (
          <div className="clay-surface p-4">
            <EmptyState
              title={t("dashboard.user.noShopsTitle")}
              description={t("dashboard.user.noShopsDesc")}
              action={
                <Link href="/app/discover" className={buttonClasses({})}>
                  {t("dashboard.user.discoverShops")}
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile: horizontal rail */}
            <CardRail className="-mx-4 px-4 sm:hidden">
              {shops.map((s) => (
                <div key={s.id} className="shop-rail-item shrink-0 snap-start self-stretch">
                  <StoreCard store={s} onSelect={() => setSelectedShop(s)} variant="compact" />
                </div>
              ))}
            </CardRail>
            {/* Desktop: responsive grid */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {shops.map((s) => (
                <StoreCard
                  key={s.id}
                  store={s}
                  onSelect={() => setSelectedShop(s)}
                  variant="compact"
                />
              ))}
            </div>
          </>
        )}
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

function HeroStat({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value: string;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      {loading ? (
        <Skeleton className="mx-auto h-7 w-16 bg-white/20" />
      ) : (
        <p
          className={`text-xl font-extrabold tracking-tight sm:text-2xl ${
            accent ? "text-green" : "text-white"
          }`}
        >
          {value}
        </p>
      )}
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/65 sm:text-xs">
        {label}
      </p>
    </div>
  );
}
