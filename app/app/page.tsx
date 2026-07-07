"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import LinkCard from "@/components/recommender/LinkCard";
import StoreCard from "@/components/recommender/StoreCard";
import CardRail from "@/components/recommender/CardRail";
import LinkPreviewModal from "@/components/recommender/LinkPreviewModal";
import ShopDetailsSheet from "@/components/recommender/ShopDetailsSheet";
import DashboardHeroPattern from "@/components/recommender/DashboardHeroPattern";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useAppContext } from "@/context/AppProvider";
import { useAsync } from "@/lib/hooks";
import { analyticsService, linksService, storesService } from "@/services";
import type { LinkSummary, StoreSummary } from "@/lib/types";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";
import { useT } from "@/context/I18nProvider";
import { ensureFahrradXxlOnHomeShops } from "@/lib/store-branding";

function SectionHeader({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="mb-3 flex items-center justify-between gap-3 group focus-ring rounded-input"
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

  // Render the greeting with the user's name in bold. We interpolate a sentinel
  // in place of the name, then split around it so the name can be wrapped in a
  // <strong> regardless of locale word order ("Hi {name}!" / "Hallo {name}!").
  const NAME_TOKEN = "\uFFFF";
  const greetingRaw = user
    ? t("dashboard.user.greeting", { name: NAME_TOKEN })
    : t("dashboard.user.welcomeBack");
  const [greetBefore, greetAfter] = greetingRaw.split(NAME_TOKEN);

  return (
    <div className="mx-auto max-w-lg sm:max-w-5xl">
      {/* Hero dashboard card */}
      <div className="dashboard-hero-card relative flex min-h-[264px] flex-col overflow-hidden p-5 sm:min-h-[308px] sm:p-8">
        <DashboardHeroPattern />

        <div className="relative max-w-[74%] space-y-1.5 sm:max-w-[65%]">
          <p className="text-2xl font-normal leading-snug text-white sm:text-[30px]">
            {greetBefore}
            {user && <span className="font-bold">{user.firstName}</span>}
            {greetAfter ?? ""}
          </p>
          <p className="text-lg font-normal leading-snug text-white/90 sm:text-2xl">
            {t("dashboard.user.subtitle")}
          </p>
        </div>

        <div className="relative mt-auto grid grid-cols-3 gap-2 pt-10 sm:gap-4">
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

      {/* My Links — horizontal rail */}
      <div className="mt-6">
        <SectionHeader
          title={t("dashboard.user.myActiveLinks")}
          href="/app/links"
        />
        {loading ? (
          <CardRail>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className="link-rail-item h-[248px] shrink-0 snap-start self-stretch rounded-card"
              />
            ))}
          </CardRail>
        ) : links.length === 0 ? (
          <div className="app-flat-card p-4">
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
          <CardRail>
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
        <SectionHeader
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
          <div className="app-flat-card p-4">
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
    <div className="text-left">
      <p className="text-[11px] font-semibold text-white/70 sm:text-xs">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-1 h-9 w-20 bg-white/20 sm:h-12" />
      ) : (
        <p
          className={`mt-0.5 font-light leading-none tracking-tight text-4xl sm:text-5xl ${
            accent ? "text-green" : "text-white"
          }`}
        >
          {value}
        </p>
      )}
    </div>
  );
}
