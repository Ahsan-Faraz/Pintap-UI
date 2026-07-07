"use client";

import { useMemo, useState } from "react";
import DiscoverShopCard from "@/components/recommender/DiscoverShopCard";
import ShopDetailsSheet from "@/components/recommender/ShopDetailsSheet";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { SearchIcon } from "@/components/ui/icons";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { storesService } from "@/services";
import type { StoreSummary } from "@/lib/types";
import { withStoreBrandingList } from "@/lib/store-branding";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | "home" | "beauty" | "fashion" | "outdoor";

const FILTER_PILL_ACTIVE =
  "inline-flex h-9 shrink-0 items-center rounded-full bg-navy px-4 text-sm font-semibold text-white transition focus-ring";
const FILTER_PILL_INACTIVE =
  "inline-flex h-9 shrink-0 items-center rounded-full border bg-white px-4 text-sm font-semibold text-navy transition focus-ring hover:border-navy/25";
const PILL_LINE = "#E4E7EC";

function categoryBucket(category: string | null | undefined): CategoryFilter | null {
  if (!category) return null;
  const c = category.toLowerCase();
  if (
    c.includes("home") ||
    c.includes("living") ||
    c.includes("plant")
  ) {
    return "home";
  }
  if (c.includes("beauty")) return "beauty";
  if (c.includes("apparel") || c.includes("fashion")) return "fashion";
  if (c.includes("outdoor")) return "outdoor";
  return null;
}

function matchesSearch(store: StoreSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${store.name} ${store.category ?? ""} ${store.primaryDomain ?? ""}`
    .toLowerCase()
    .includes(q);
}

function matchesCategory(store: StoreSummary, filter: CategoryFilter): boolean {
  if (filter === "all") return true;
  return categoryBucket(store.category) === filter;
}

export default function DiscoverPage() {
  const t = useT();
  const { user } = useAppContext();
  const userId = user?.id;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selectedStore, setSelectedStore] = useState<StoreSummary | null>(null);

  const { data, loading } = useAsync(async () => {
    const [myShops, connected] = await Promise.all([
      userId ? storesService.getMyShops(userId) : [],
      storesService.listConnectedStores(),
    ]);
    const joinedIds = new Set(myShops.map((s) => s.id));
    const seen = new Set(joinedIds);
    const stores = withStoreBrandingList([
      ...myShops,
      ...connected.filter((s) => !seen.has(s.id)),
    ]).sort((a, b) => {
      const aJoined = joinedIds.has(a.id) ? 1 : 0;
      const bJoined = joinedIds.has(b.id) ? 1 : 0;
      if (aJoined !== bJoined) return aJoined - bJoined;
      return b.activeCampaignCount - a.activeCampaignCount;
    });

    return { stores, joinedIds };
  }, [userId]);

  const stores = data?.stores ?? [];
  const joinedIds = data?.joinedIds ?? new Set<string>();

  const filtered = useMemo(
    () =>
      stores.filter(
        (s) => matchesSearch(s, query) && matchesCategory(s, category),
      ),
    [stores, query, category],
  );

  const featured = useMemo(() => {
    if (filtered.length === 0) return null;
    return [...filtered].sort(
      (a, b) => b.activeCampaignCount - a.activeCampaignCount,
    )[0]!;
  }, [filtered]);

  const listStores = useMemo(() => {
    if (!featured) return filtered;
    return filtered.filter((s) => s.id !== featured.id);
  }, [filtered, featured]);

  const categories: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: t("appPages.discover.filterAll") },
    { id: "home", label: t("appPages.discover.filterHome") },
    { id: "beauty", label: t("appPages.discover.filterBeauty") },
    { id: "fashion", label: t("appPages.discover.filterFashion") },
    { id: "outdoor", label: t("appPages.discover.filterOutdoor") },
  ];

  return (
    <div className="mx-auto max-w-lg sm:max-w-2xl">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
          {t("appPages.discover.title")}
        </h1>
        <p className="mt-1.5 text-sm text-navy/55 sm:text-base">
          {t("appPages.discover.description")}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("appPages.discover.searchPlaceholder")}
          aria-label={t("appPages.discover.searchPlaceholder")}
          className="h-11 w-full rounded-full border bg-white pl-11 pr-4 text-sm text-navy outline-none placeholder:text-[#94A3B8] focus:border-navy/25"
          style={{ borderColor: PILL_LINE }}
        />
      </div>

      {/* Category filters */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map(({ id, label }) => {
          const active = category === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={cn(active ? FILTER_PILL_ACTIVE : FILTER_PILL_INACTIVE)}
              style={active ? undefined : { borderColor: PILL_LINE }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-card" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[7.5rem] w-full rounded-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="app-flat-card p-4">
          <EmptyState title={t("appPages.discover.noStoresTitle")} />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Featured banner */}
          {featured ? (
            <div className="dashboard-hero-card flex items-center px-5 py-4">
              <span className="inline-flex items-center rounded-full bg-blue/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                {t("appPages.discover.featuredThisWeek")}
              </span>
            </div>
          ) : null}

          {/* Featured shop first */}
          {featured ? (
            <DiscoverShopCard
              store={featured}
              joined={joinedIds.has(featured.id)}
              onSelect={() => setSelectedStore(featured)}
              onJoin={() => setSelectedStore(featured)}
            />
          ) : null}

          {listStores.map((store) => (
            <DiscoverShopCard
              key={store.id}
              joined={joinedIds.has(store.id)}
              store={store}
              onSelect={() => setSelectedStore(store)}
              onJoin={() => setSelectedStore(store)}
            />
          ))}
        </div>
      )}

      <ShopDetailsSheet
        store={selectedStore}
        open={Boolean(selectedStore)}
        onClose={() => setSelectedStore(null)}
      />
    </div>
  );
}
