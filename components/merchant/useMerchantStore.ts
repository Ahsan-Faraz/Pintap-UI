"use client";

import { useAppContext } from "@/context/AppProvider";
import { useAsync } from "@/lib/hooks";
import { storesService } from "@/services";

/** Loads the signed-in merchant's stores; exposes the first as the active store. */
export function useMerchantStore() {
  const { user } = useAppContext();
  const userId = user?.id;
  const { data, loading, reload } = useAsync(
    () => (userId ? storesService.getMyStores(userId) : Promise.resolve([])),
    [userId],
  );
  const stores = data ?? [];
  return { store: stores[0] ?? null, stores, loading, reload, userId };
}
