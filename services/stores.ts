import { DEFAULT_CURRENCY } from "@/lib/currency";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  mapCampaign,
  mapStore,
  toStoreSummary,
} from "@/lib/supabase/mappers";
import type { FundingState, MerchantFundingTransaction, Store, StoreSummary } from "@/lib/types";
import { delay } from "@/lib/utils";
import { faviconUrl, normalizeStoreDomain, storeNameFromHost } from "@/lib/url-utils";
import { fundingStateForStore, toStoreSummary as mockToStoreSummary } from "@/lib/mock/queries";
import { db, saveDb } from "@/lib/mock/store";
import { pushActivity } from "@/lib/mock/mutations";
import { nowIso, uid } from "@/lib/utils";
import { pick } from "./_runtime";

export interface StoreConnectResult {
  ok: boolean;
  store?: StoreSummary;
  error?: string;
}

export interface StoresService {
  listStores(): Promise<StoreSummary[]>;
  listConnectedStores(): Promise<StoreSummary[]>;
  searchStores(query: string): Promise<StoreSummary[]>;
  getStore(id: string): Promise<Store | null>;
  getStoreSummary(id: string): Promise<StoreSummary | null>;
  getMyStores(userId: string): Promise<StoreSummary[]>;
  /** Shops a recommender is active in (has at least one link with), newest first. */
  getMyShops(userId: string): Promise<StoreSummary[]>;
  listFunding(storeId: string): Promise<MerchantFundingTransaction[]>;
  getFundingState(storeId: string): Promise<FundingState>;
  /** Validates the domain and connects the store for the signed-in merchant. */
  startStoreConnect(storeDomain: string): Promise<StoreConnectResult>;
  /** Update store profile fields the merchant controls (RLS: store members). */
  updateStore(id: string, patch: { name?: string }): Promise<Store>;
}

async function fetchCampaignsForStores(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  storeIds: string[],
) {
  if (storeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .in("store_id", storeIds);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCampaign);
}

async function summarizeStores(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  rows: ReturnType<typeof mapStore> extends infer T ? T[] : never,
): Promise<StoreSummary[]> {
  const storeRows = rows as Store[];
  const campaigns = await fetchCampaignsForStores(
    supabase,
    storeRows.map((s) => s.id),
  );
  return storeRows.map((s) => toStoreSummary(s, campaigns));
}

const mock: StoresService = {
  async listStores() {
    await delay();
    const d = db();
    return d.stores.map((s) => mockToStoreSummary(d, s));
  },

  async listConnectedStores() {
    await delay();
    const d = db();
    return d.stores
      .filter((s) => s.connected)
      .map((s) => mockToStoreSummary(d, s));
  },

  async searchStores(query) {
    await delay();
    const d = db();
    const q = query.trim().toLowerCase();
    return d.stores
      .filter((s) => s.connected)
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          (s.category ?? "").toLowerCase().includes(q) ||
          (s.primaryDomain ?? "").toLowerCase().includes(q),
      )
      .map((s) => mockToStoreSummary(d, s));
  },

  async getStore(id) {
    await delay(120);
    return db().stores.find((s) => s.id === id) ?? null;
  },

  async getStoreSummary(id) {
    await delay(120);
    const d = db();
    const s = d.stores.find((x) => x.id === id);
    return s ? mockToStoreSummary(d, s) : null;
  },

  async getMyStores(userId) {
    await delay();
    const d = db();
    const ids = new Set(
      d.storeMembers.filter((m) => m.userId === userId).map((m) => m.storeId),
    );
    return d.stores.filter((s) => ids.has(s.id)).map((s) => mockToStoreSummary(d, s));
  },

  async getMyShops(userId) {
    await delay();
    const d = db();
    const latestByStore = new Map<string, number>();
    for (const l of d.links) {
      if (l.userId !== userId || !l.storeId) continue;
      const ts = +new Date(l.createdAt);
      latestByStore.set(
        l.storeId,
        Math.max(latestByStore.get(l.storeId) ?? 0, ts),
      );
    }
    return [...latestByStore.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => d.stores.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => mockToStoreSummary(d, s));
  },

  async listFunding(storeId) {
    await delay();
    return db()
      .funding.filter((f) => f.storeId === storeId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async getFundingState(storeId) {
    await delay(100);
    return fundingStateForStore(db(), storeId);
  },

  async startStoreConnect(storeDomain) {
    await delay(900);
    const domain = normalizeStoreDomain(storeDomain);
    if (!domain) {
      return {
        ok: false,
        error: "Enter a valid store domain (e.g. yourstore.com).",
      };
    }
    const d = db();
    const me = d.currentUserId;
    let store = d.stores.find((s) => s.merchantDomain === domain);
    const slug = domain.split(".")[0] ?? domain;
    if (!store) {
      store = {
        id: uid("store"),
        name: storeNameFromHost(domain),
        slug,
        merchantDomain: domain,
        primaryDomain: domain,
        externalId: String(60000000000 + d.stores.length),
        logoUrl: faviconUrl(domain),
        countryCode: "US",
        currency: DEFAULT_CURRENCY,
        category: null,
        connected: true,
        connectedAt: nowIso(),
        disconnectedAt: null,
        status: "active",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      d.stores.push(store);
    } else {
      store.connected = true;
      store.status = "active";
      store.connectedAt = nowIso();
      store.disconnectedAt = null;
      store.updatedAt = nowIso();
    }

    if (!d.storeMembers.some((m) => m.storeId === store!.id && m.userId === me)) {
      d.storeMembers.push({
        id: uid("sm"),
        storeId: store.id,
        userId: me,
        role: "owner",
        createdAt: nowIso(),
      });
    }
    const profile = d.profiles.find((p) => p.id === me);
    if (profile && !profile.roles.includes("merchant")) {
      profile.roles.push("merchant");
    }
    pushActivity(d, {
      scopeType: "store",
      scopeId: store.id,
      actorType: "user",
      actorId: me,
      eventType: "store_connected",
      eventData: { domain },
    });
    saveDb(d);
    return { ok: true, store: mockToStoreSummary(d, store) };
  },

  async updateStore(id, patch) {
    await delay(250);
    const d = db();
    const store = d.stores.find((s) => s.id === id);
    if (!store) throw new Error("Store not found");
    if (patch.name != null && patch.name.trim()) store.name = patch.name.trim();
    store.updatedAt = nowIso();
    pushActivity(d, {
      scopeType: "store",
      scopeId: id,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "store_updated",
      eventData: { name: store.name },
    });
    saveDb(d);
    return store;
  },
};

const real: StoresService = {
  async listStores() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return summarizeStores(supabase, (data ?? []).map(mapStore));
  },

  async listConnectedStores() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("connected", true)
      .order("name");
    if (error) throw new Error(error.message);
    return summarizeStores(supabase, (data ?? []).map(mapStore));
  },

  async searchStores(query) {
    const all = await real.listConnectedStores();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q) ||
        (s.primaryDomain ?? "").toLowerCase().includes(q),
    );
  },

  async getStore(id) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapStore(data) : null;
  },

  async getStoreSummary(id) {
    const store = await real.getStore(id);
    if (!store) return null;
    const supabase = createSupabaseBrowserClient();
    const campaigns = await fetchCampaignsForStores(supabase, [id]);
    return toStoreSummary(store, campaigns);
  },

  async getMyStores(userId) {
    const supabase = createSupabaseBrowserClient();
    const { data: members, error: memberErr } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", userId);
    if (memberErr) throw new Error(memberErr.message);
    const ids = (members ?? []).map((m) => m.store_id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from("stores").select("*").in("id", ids);
    if (error) throw new Error(error.message);
    return summarizeStores(supabase, (data ?? []).map(mapStore));
  },

  async getMyShops(userId) {
    const supabase = createSupabaseBrowserClient();
    const { data: links } = await supabase
      .from("links")
      .select("store_id, created_at")
      .eq("user_id", userId)
      .not("store_id", "is", null)
      .order("created_at", { ascending: false });
    const orderedIds: string[] = [];
    const seen = new Set<string>();
    for (const l of links ?? []) {
      if (l.store_id && !seen.has(l.store_id)) {
        seen.add(l.store_id);
        orderedIds.push(l.store_id);
      }
    }
    if (orderedIds.length === 0) return [];
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .in("id", orderedIds);
    if (error) throw new Error(error.message);
    const summaries = await summarizeStores(supabase, (data ?? []).map(mapStore));
    const byId = new Map(summaries.map((s) => [s.id, s]));
    return orderedIds
      .map((id) => byId.get(id))
      .filter((s): s is StoreSummary => Boolean(s));
  },

  async listFunding(storeId) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("merchant_funding_transactions")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((f) => ({
      id: f.id,
      storeId: f.store_id,
      paymentReference: f.payment_reference,
      checkoutReference: f.checkout_reference,
      amountMinor: f.amount_minor,
      currency: f.currency,
      status: f.status as MerchantFundingTransaction["status"],
      createdAt: f.created_at,
    }));
  },

  async getFundingState(storeId) {
    const supabase = createSupabaseBrowserClient();
    const { data: funding } = await supabase
      .from("merchant_funding_transactions")
      .select("amount_minor, status")
      .eq("store_id", storeId);
    const { data: ledger } = await supabase
      .from("commission_ledger_entries")
      .select("amount_minor, status")
      .eq("store_id", storeId);
    const funded = (funding ?? [])
      .filter((f) => f.status === "paid")
      .reduce((s, f) => s + f.amount_minor, 0);
    const owed = (ledger ?? [])
      .filter((l) => l.status === "pending" || l.status === "available")
      .reduce((s, l) => s + Math.max(0, l.amount_minor), 0);
    if (funded <= 0) return "not_funded";
    if (funded >= owed) return "funded";
    return "partially_funded";
  },

  async startStoreConnect(storeDomain) {
    const res = await fetch("/api/merchant/store-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeDomain }),
    });
    const json = (await res.json()) as StoreConnectResult;
    if (!res.ok && !json.error) {
      throw new Error("Could not connect store.");
    }
    return json;
  },

  async updateStore(id, patch) {
    const supabase = createSupabaseBrowserClient();
    const updates: { name?: string; updated_at: string } = {
      updated_at: nowIso(),
    };
    if (patch.name != null && patch.name.trim()) updates.name = patch.name.trim();
    const { data, error } = await supabase
      .from("stores")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapStore(data);
  },
};

export const storesService = pick("stores", mock, real);
