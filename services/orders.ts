import { DEFAULT_CURRENCY } from "@/lib/currency";
import { db, saveDb } from "@/lib/mock/store";
import type { AttributionStatus, OrderSummary, StoreOrder } from "@/lib/types";
import { delay } from "@/lib/utils";
import { toOrderSummary as mockOrderSummary } from "@/lib/mock/queries";
import { attributeOrder, pushActivity } from "@/lib/mock/mutations";
import { nowIso } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  mapAttribution,
  mapLink,
  mapProfile,
  mapStore,
  toOrderSummary,
} from "@/lib/supabase/mappers";
import type { Role } from "@/lib/types";
import { pick } from "./_runtime";

export interface UnmatchedOrder extends StoreOrder {
  code: string | null;
  storeName: string | null;
}

export interface SalesImportRow {
  orderNumber: string;
  code: string;
  amountMinor: number;
  currency: string;
  storeId: string | null;
  storeName: string | null;
  willMatch: boolean;
}

export type SalesImportStatus =
  | "attributed"
  | "recorded_unattributed"
  | "unmatched"
  | "error";

export interface SalesImportRowResult {
  line: number;
  status: SalesImportStatus;
  code: string | null;
  orderNumber: string | null;
  reason?: string;
}

export interface SalesImportSummary {
  received: number;
  attributed: number;
  recordedUnattributed: number;
  unmatched: number;
  errors: number;
}

export interface SalesImportResponse {
  ok: true;
  dryRun: boolean;
  summary: SalesImportSummary;
  results: SalesImportRowResult[];
  unmatched: Pick<SalesImportRowResult, "line" | "code" | "reason">[];
  errors: Pick<SalesImportRowResult, "line" | "orderNumber" | "reason">[];
}

export interface OrdersService {
  listOrdersForUser(userId: string): Promise<OrderSummary[]>;
  listOrdersForStore(storeId: string): Promise<OrderSummary[]>;
  listAllOrders(): Promise<OrderSummary[]>;
  listUnmatchedOrders(): Promise<UnmatchedOrder[]>;
  /** Admin: set an attributed order's status (ledger follows automatically). */
  updateAttributionStatus(
    attributionId: string,
    status: AttributionStatus,
  ): Promise<void>;
  previewSalesCsv(csv: string, storeId?: string): Promise<SalesImportResponse>;
  commitSalesCsv(csv: string, storeId?: string): Promise<SalesImportResponse>;
}

function codeOf(order: StoreOrder): string | null {
  const payload = order.rawPayload as
    | { discount_codes?: { code?: string }[] }
    | undefined;
  return payload?.discount_codes?.[0]?.code ?? null;
}

function salesImportResponse(
  results: SalesImportRowResult[],
  dryRun: boolean,
): SalesImportResponse {
  const count = (status: SalesImportStatus) =>
    results.filter((r) => r.status === status).length;
  return {
    ok: true,
    dryRun,
    summary: {
      received: results.length,
      attributed: count("attributed"),
      recordedUnattributed: count("recorded_unattributed"),
      unmatched: count("unmatched"),
      errors: count("error"),
    },
    results,
    unmatched: results
      .filter((r) => r.status === "unmatched")
      .map((r) => ({ line: r.line, code: r.code, reason: r.reason })),
    errors: results
      .filter((r) => r.status === "error")
      .map((r) => ({
        line: r.line,
        orderNumber: r.orderNumber,
        reason: r.reason,
      })),
  };
}

type MockSalesCsvRow = {
  line: number;
  externalOrderId: string;
  code: string;
  amount: string;
  currency: string;
};

const MOCK_SALES_HEADERS: Record<string, keyof Omit<MockSalesCsvRow, "line">> = {
  "external order id": "externalOrderId",
  external_order_id: "externalOrderId",
  "order id": "externalOrderId",
  "order number": "externalOrderId",
  order_number: "externalOrderId",
  "discount code": "code",
  discount_code: "code",
  code: "code",
  "order amount": "amount",
  order_amount: "amount",
  amount: "amount",
  total: "amount",
  currency: "currency",
};

const normalizeSalesHeader = (header: string) =>
  header.toLowerCase().replace(/[^a-z0-9_]+/g, " ").trim();

function parseMockSalesCsv(csv: string): MockSalesCsvRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const first = lines[0] ?? "";
  const hasHeader = /order|external|discount|amount|currency/i.test(first);
  const fields = hasHeader
    ? first.split(",").map((h) => MOCK_SALES_HEADERS[normalizeSalesHeader(h)] ?? null)
    : ["externalOrderId", "code", "amount", "currency"] as const;
  const start = hasHeader ? 1 : 0;

  return lines.slice(start).map((line, index) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Omit<MockSalesCsvRow, "line"> = {
      externalOrderId: "",
      code: "",
      amount: "0",
      currency: DEFAULT_CURRENCY,
    };
    fields.forEach((field, i) => {
      if (field) row[field] = cols[i] ?? "";
    });
    return { line: start + index + 1, ...row };
  });
}

const mock: OrdersService = {
  async listOrdersForUser(userId) {
    await delay();
    const d = db();
    const myLinkIds = new Set(
      d.links.filter((l) => l.userId === userId).map((l) => l.id),
    );
    return d.attributions
      .filter((a) => myLinkIds.has(a.linkId))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((a) => mockOrderSummary(d, a));
  },

  async listOrdersForStore(storeId) {
    await delay();
    const d = db();
    const campaignIds = new Set(
      d.campaigns.filter((c) => c.storeId === storeId).map((c) => c.id),
    );
    return d.attributions
      .filter((a) => campaignIds.has(a.campaignId))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((a) => mockOrderSummary(d, a));
  },

  async listAllOrders() {
    await delay();
    const d = db();
    return d.attributions
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((a) => mockOrderSummary(d, a));
  },

  async listUnmatchedOrders() {
    await delay();
    const d = db();
    const attributed = new Set(d.attributions.map((a) => a.externalOrderId));
    return d.storeOrders
      .filter((o) => !attributed.has(o.id))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((o) => ({
        ...o,
        code: codeOf(o),
        storeName: d.stores.find((s) => s.id === o.storeId)?.name ?? null,
      }));
  },

  async updateAttributionStatus(attributionId, status) {
    await delay(250);
    const d = db();
    const attr = d.attributions.find((a) => a.id === attributionId);
    if (!attr) throw new Error("Order attribution not found");
    attr.status = status;
    // Mirror the DB trigger: the ledger entry follows the attribution status.
    const entry = d.ledger.find((l) => l.attributionId === attributionId);
    if (entry && entry.type !== "paid" && entry.type !== "payout_pending") {
      if (status === "confirmed") {
        entry.type = "earned";
        entry.status = "available";
        entry.availableAt = entry.availableAt ?? nowIso();
      } else if (status === "pending") {
        entry.type = "earned";
        entry.status = "pending";
      } else {
        entry.type = "reversed";
        entry.status = "reversed";
      }
    }
    pushActivity(d, {
      scopeType: "order",
      scopeId: attributionId,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: `order_${status}`,
    });
    saveDb(d);
  },

  async previewSalesCsv(csv) {
    await delay(300);
    const d = db();
    const rows = parseMockSalesCsv(csv);
    if (!rows.length) {
      return salesImportResponse([], true);
    }
    const results = rows.map((row) => {
      const orderNumber = row.externalOrderId;
      const code = row.code.toUpperCase();
      const codeRow = d.discountCodes.find((c) => c.code === code);
      const link = codeRow?.claimedByLinkId
        ? d.links.find((l) => l.id === codeRow.claimedByLinkId)
        : null;
      const store = d.stores.find((s) => s.id === link?.storeId);
      if (!orderNumber) {
        return {
          line: row.line,
          status: "error" as const,
          code: code || null,
          orderNumber: null,
          reason: "missing External Order ID",
        };
      }
      if (!code) {
        return {
          line: row.line,
          status: "unmatched" as const,
          code: null,
          orderNumber,
          reason: "missing discount code",
        };
      }
      if (!codeRow) {
        return {
          line: row.line,
          status: "unmatched" as const,
          code,
          orderNumber,
          reason: "no matching campaign code",
        };
      }
      return {
        line: row.line,
        status: link ? ("attributed" as const) : ("recorded_unattributed" as const),
        code,
        orderNumber,
        reason: link
          ? undefined
          : store
            ? "code not reserved by a recommender link"
            : "code not reserved by a recommender link",
      };
    });
    return salesImportResponse(results, true);
  },

  async commitSalesCsv(csv) {
    await delay(400);
    const preview = await mock.previewSalesCsv(csv);
    const d = db();
    const results = preview.results.map((r) => ({ ...r }));
    const rowsByLine = new Map(parseMockSalesCsv(csv).map((r) => [r.line, r]));
    for (const result of results) {
      if (result.status !== "attributed" && result.status !== "recorded_unattributed") {
        continue;
      }
      const row = rowsByLine.get(result.line);
      if (!row) continue;
      const codeRow = d.discountCodes.find((c) => c.code === row.code.toUpperCase());
      const link = codeRow?.claimedByLinkId
        ? d.links.find((l) => l.id === codeRow.claimedByLinkId)
        : null;
      if (!link?.storeId) continue;
      const attribution = attributeOrder(d, {
        storeId: link.storeId,
        code: row.code.toUpperCase(),
        amountMinor: Math.round(parseFloat(row.amount || "0") * 100),
        currency: row.currency || DEFAULT_CURRENCY,
        orderNumber: row.externalOrderId,
        source: "csv_import",
      });
      if (!attribution.matched) {
        const rowResult = results.find((r) => r.orderNumber === row.externalOrderId);
        if (rowResult) {
          rowResult.status = "recorded_unattributed";
          rowResult.reason = "code not reserved by a recommender link";
        }
      }
    }
    saveDb(d);
    return salesImportResponse(results, false);
  },
};

async function loadOrderSummaries(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  attrRows: ReturnType<typeof mapAttribution> extends infer T ? T[] : never,
) {
  const attrs = attrRows as import("@/lib/types").LinkOrderAttribution[];
  if (attrs.length === 0) return [];

  const linkIds = [...new Set(attrs.map((a) => a.linkId))];
  const codeIds = [...new Set(attrs.map((a) => a.discountCodeId))];
  const orderIds = [...new Set(attrs.map((a) => a.externalOrderId))];

  const [linksRes, codesRes, ordersRes] = await Promise.all([
    supabase.from("links").select("*").in("id", linkIds),
    supabase.from("campaign_discount_codes").select("id, code").in("id", codeIds),
    supabase.from("store_orders").select("*").in("id", orderIds),
  ]);

  const links = (linksRes.data ?? []).map(mapLink);
  const linkMap = new Map(links.map((l) => [l.id, l]));
  const codeMap = new Map((codesRes.data ?? []).map((c) => [c.id, c.code]));
  const orderMap = new Map((ordersRes.data ?? []).map((o) => [o.id, o]));

  const storeIds = [...new Set(links.map((l) => l.storeId).filter(Boolean))] as string[];
  const userIds = [...new Set(links.map((l) => l.userId))];

  const [storesRes, profilesRes, rolesRes] = await Promise.all([
    storeIds.length
      ? supabase.from("stores").select("*").in("id", storeIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("profiles").select("*").in("id", userIds),
    supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
  ]);

  const stores = (storesRes.data ?? []).map(mapStore);
  const storeMap = new Map(stores.map((s) => [s.id, s]));
  const rolesByUser = new Map<string, Role[]>();
  for (const r of rolesRes.data ?? []) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role as Role);
    rolesByUser.set(r.user_id, list);
  }
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id,
      mapProfile(p, rolesByUser.get(p.id) ?? []),
    ]),
  );

  return attrs.map((a) => {
    const link = linkMap.get(a.linkId) ?? null;
    const store = link?.storeId ? (storeMap.get(link.storeId) ?? null) : null;
    const recommender = link ? (profileMap.get(link.userId) ?? null) : null;
    const shopOrder = orderMap.get(a.externalOrderId);
    return toOrderSummary(a, {
      link: link
        ? { id: link.id, name: link.name, shortCode: link.shortCode }
        : null,
      store: store ? { id: store.id, name: store.name } : null,
      recommender: recommender
        ? {
            id: recommender.id,
            firstName: recommender.firstName,
            lastName: recommender.lastName,
          }
        : null,
      orderNumber: shopOrder?.external_order_number ?? null,
      code: codeMap.get(a.discountCodeId) ?? null,
    });
  });
}

const real: OrdersService = {
  async listOrdersForUser(userId) {
    const supabase = createSupabaseBrowserClient();
    const { data: links } = await supabase
      .from("links")
      .select("id")
      .eq("user_id", userId);
    const linkIds = (links ?? []).map((l) => l.id);
    if (linkIds.length === 0) return [];
    const { data, error } = await supabase
      .from("link_order_attributions")
      .select("*")
      .in("link_id", linkIds)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return loadOrderSummaries(supabase, (data ?? []).map(mapAttribution));
  },

  async listOrdersForStore(storeId) {
    // Primary path: server route resolves recommender/link names via the
    // service-role client — RLS hides other users' links & profiles from a
    // merchant's browser session.
    const res = await fetch(
      `/api/merchant/orders?storeId=${encodeURIComponent(storeId)}`,
    );
    if (res.ok) {
      return (await res.json()) as OrderSummary[];
    }

    // Fallback: RLS-limited browser read (order rows visible to members;
    // recommender/link columns come back empty).
    const supabase = createSupabaseBrowserClient();
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("store_id", storeId);
    const campaignIds = (campaigns ?? []).map((c) => c.id);
    if (campaignIds.length === 0) return [];
    const { data, error } = await supabase
      .from("link_order_attributions")
      .select("*")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return loadOrderSummaries(supabase, (data ?? []).map(mapAttribution));
  },

  async listAllOrders() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("link_order_attributions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return loadOrderSummaries(supabase, (data ?? []).map(mapAttribution));
  },

  async listUnmatchedOrders() {
    const supabase = createSupabaseBrowserClient();
    const { data: attrs } = await supabase
      .from("link_order_attributions")
      .select("store_order_id")
      .limit(5000);
    const matched = new Set((attrs ?? []).map((a) => a.store_order_id));
    const { data: orders, error } = await supabase
      .from("store_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const storeIds = [...new Set((orders ?? []).map((o) => o.store_id))];
    const { data: stores } = storeIds.length
      ? await supabase.from("stores").select("id, name").in("id", storeIds)
      : { data: [] as { id: string; name: string }[] };
    const storeMap = new Map((stores ?? []).map((s) => [s.id, s.name]));

    return (orders ?? [])
      .filter((o) => !matched.has(o.id))
      .map((o) => {
        const payload = o.raw_payload as
          | { discount_codes?: { code?: string }[] }
          | undefined;
        return {
          id: o.id,
          storeId: o.store_id,
          externalOrderId: o.external_order_id,
          externalOrderNumber: o.external_order_number,
          currency: o.currency,
          totalAmountMinor: o.total_amount_minor,
          processedAt: o.processed_at,
          rawPayload: o.raw_payload,
          createdAt: o.created_at,
          code: payload?.discount_codes?.[0]?.code ?? null,
          storeName: storeMap.get(o.store_id) ?? null,
        };
      });
  },

  async updateAttributionStatus(attributionId, status) {
    // Atomic SECURITY DEFINER RPC; verifies the caller's admin role
    // server-side and the ledger trigger keeps balances in step.
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_set_attribution_status", {
      p_attribution_id: attributionId,
      p_status: status,
    });
    if (error) throw new Error(error.message);
  },

  async previewSalesCsv(csv, storeId) {
    const res = await fetch("/api/admin/sales-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, storeId: storeId || null, dryRun: true }),
    });
    const json = (await res.json()) as SalesImportResponse | { error?: string };
    if (!res.ok) {
      throw new Error("error" in json && json.error ? json.error : "Could not preview CSV.");
    }
    return json as SalesImportResponse;
  },

  async commitSalesCsv(csv, storeId) {
    const res = await fetch("/api/admin/sales-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, storeId: storeId || null, dryRun: false }),
    });
    const json = (await res.json()) as SalesImportResponse | { error?: string };
    if (!res.ok) {
      throw new Error("error" in json && json.error ? json.error : "Could not import CSV.");
    }
    return json as SalesImportResponse;
  },
};

export const ordersService = pick("orders", mock, real);
