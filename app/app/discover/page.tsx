"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import StoreCard from "@/components/recommender/StoreCard";
import ShopDetailsSheet from "@/components/recommender/ShopDetailsSheet";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { storesService } from "@/services";
import type { StoreSummary } from "@/lib/types";

/**
 * Shops page (route kept at /app/discover). Client feedback 2026-07: no
 * Discover header, no stores/campaigns tabs, no search, no stats — just
 * "Shops / Manage your shops" and the store grid, like My Links.
 *
 * Shown: the user's own shops first (every store they have a link with, even
 * merchant-less auto-created ones — client feedback 2026-07-03), then the
 * remaining connected stores.
 */
export default function ShopsPage() {
  const t = useT();
  const { user } = useAppContext();
  const userId = user?.id;
  const [selectedStore, setSelectedStore] = useState<StoreSummary | null>(null);

  const { data: stores, loading } = useAsync(async () => {
    const [myShops, connected] = await Promise.all([
      userId ? storesService.getMyShops(userId) : [],
      storesService.listConnectedStores(),
    ]);
    const seen = new Set(myShops.map((s) => s.id));
    return [...myShops, ...connected.filter((s) => !seen.has(s.id))];
  }, [userId]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("appPages.discover.title")}
        description={t("appPages.discover.description")}
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (stores ?? []).length === 0 ? (
        <EmptyState title={t("appPages.discover.noStoresTitle")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(stores ?? []).map((s) => (
            <StoreCard key={s.id} store={s} onSelect={() => setSelectedStore(s)} />
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
