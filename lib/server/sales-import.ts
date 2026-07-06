import "server-only";

import type { Json, TablesInsert } from "@/lib/supabase/database.types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const ORDER_CHUNK_SIZE = 500;
const ATTRIBUTION_CHUNK_SIZE = 500;

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

type RawCsvRow = {
  externalOrderId?: string;
  orderedAt?: string;
  currency?: string;
  amount?: string;
  discountCode?: string;
  status?: string;
};

type PreparedRow = {
  line: number;
  externalOrderId: string;
  code: string;
  currency: string;
  amountMinor: number;
  processedAt: string;
  rawStatus: string;
  orderedAt: string | null;
};

type CampaignCodeRow = {
  id: string;
  code: string;
  claimed_by_link_id: string | null;
  campaign: {
    id: string;
    store_id: string;
    commission_percent: number | null;
  } | null;
};

const HEADER_ALIASES: Record<string, keyof RawCsvRow> = {
  "external order id": "externalOrderId",
  external_order_id: "externalOrderId",
  "order id": "externalOrderId",
  "order number": "externalOrderId",
  "order_number": "externalOrderId",
  "ordered at": "orderedAt",
  ordered_at: "orderedAt",
  "order date": "orderedAt",
  date: "orderedAt",
  currency: "currency",
  "order amount": "amount",
  order_amount: "amount",
  amount: "amount",
  total: "amount",
  "discount code": "discountCode",
  discount_code: "discountCode",
  code: "discountCode",
  "order status": "status",
  order_status: "status",
  status: "status",
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\r") {
      // Ignore; handled by \n.
    } else if (c === "\n") {
      record.push(field);
      rows.push(record);
      record = [];
      field = "";
    } else {
      field += c;
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    rows.push(record);
  }
  return rows;
}

const normalizeHeader = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9_]+/g, " ").trim();

function parseRows(csv: string): RawCsvRow[] {
  const grid = parseCsv(csv).filter((r) => r.some((c) => c.trim() !== ""));
  if (grid.length === 0) return [];
  const fields = grid[0].map(
    (h) => HEADER_ALIASES[normalizeHeader(h)] ?? null,
  );
  return grid.slice(1).map((cols) => {
    const obj: RawCsvRow = {};
    fields.forEach((fieldName, i) => {
      if (fieldName) obj[fieldName] = (cols[i] ?? "").trim();
    });
    return obj;
  });
}

function toMinor(raw: string | undefined): number {
  const cleaned = String(raw ?? "").replace(/[^0-9.\-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

const STATUS_MAP: Record<string, "pending" | "confirmed" | "canceled" | "returned"> = {
  pending: "pending",
  unfulfilled: "pending",
  open: "pending",
  authorized: "pending",
  on_hold: "pending",
  partially_paid: "pending",
  paid: "confirmed",
  confirmed: "confirmed",
  complete: "confirmed",
  completed: "confirmed",
  fulfilled: "confirmed",
  success: "confirmed",
  closed: "confirmed",
  canceled: "canceled",
  cancelled: "canceled",
  void: "canceled",
  voided: "canceled",
  refunded: "returned",
  returned: "returned",
  chargeback: "returned",
  partially_refunded: "returned",
};

function mapStatus(raw: string): "pending" | "confirmed" | "canceled" | "returned" {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS_MAP[key] ?? "pending";
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function orderKey(storeId: string, externalOrderId: string): string {
  return `${storeId}\u0000${externalOrderId}`;
}

function resultResponse(
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

async function loadCodeMap(codes: string[], storeId: string | null) {
  const supabase = createSupabaseServiceRoleClient();
  const codeMap = new Map<string, CampaignCodeRow>();
  if (codes.length === 0) return codeMap;

  let query = supabase
    .from("campaign_discount_codes")
    .select(
      "id, code, claimed_by_link_id, campaign:campaigns!inner(id, store_id, commission_percent)",
    )
    .in("code", codes);
  if (storeId) query = query.eq("campaign.store_id", storeId);

  const { data, error } = await query;
  if (error) throw new Error(`discount-code lookup failed: ${error.message}`);

  for (const raw of data ?? []) {
    const c = raw as unknown as CampaignCodeRow;
    const existing = codeMap.get(c.code);
    if (!existing || (!existing.claimed_by_link_id && c.claimed_by_link_id)) {
      codeMap.set(c.code, c);
    }
  }
  return codeMap;
}

async function upsertOrders(
  entries: {
    row: PreparedRow;
    codeRow: CampaignCodeRow;
  }[],
  actorId: string,
) {
  const supabase = createSupabaseServiceRoleClient();
  const uniqueRows = new Map<string, TablesInsert<"store_orders">>();
  for (const entry of entries) {
    const campaign = entry.codeRow.campaign;
    if (!campaign) continue;
    const key = orderKey(campaign.store_id, entry.row.externalOrderId);
    uniqueRows.set(key, {
      store_id: campaign.store_id,
      external_order_id: entry.row.externalOrderId,
      external_order_number: entry.row.externalOrderId,
      currency: entry.row.currency,
      total_amount_minor: entry.row.amountMinor,
      processed_at: entry.row.processedAt,
      raw_payload: {
        source: "shopify_csv",
        imported_by: actorId,
        discount_codes: [{ code: entry.row.code }],
        order_status: entry.row.rawStatus,
        ordered_at: entry.row.orderedAt,
      } satisfies Json,
    });
  }

  const orderIdByKey = new Map<string, string>();
  const errorsByKey = new Map<string, string>();
  const rows = [...uniqueRows.values()];

  async function remember(data: { id: string; store_id: string; external_order_id: string }[]) {
    for (const order of data) {
      orderIdByKey.set(orderKey(order.store_id, order.external_order_id), order.id);
    }
  }

  for (const chunk of chunks(rows, ORDER_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("store_orders")
      .upsert(chunk, { onConflict: "store_id,external_order_id" })
      .select("id, store_id, external_order_id");

    if (!error) {
      await remember(data ?? []);
      continue;
    }

    for (const row of chunk) {
      const key = orderKey(row.store_id, row.external_order_id);
      const single = await supabase
        .from("store_orders")
        .upsert(row, { onConflict: "store_id,external_order_id" })
        .select("id, store_id, external_order_id")
        .single();
      if (single.error) errorsByKey.set(key, single.error.message);
      else if (single.data) await remember([single.data]);
    }
  }

  return { orderIdByKey, errorsByKey };
}

async function upsertAttributions(
  entries: {
    row: PreparedRow;
    codeRow: CampaignCodeRow;
    orderId: string;
  }[],
) {
  const supabase = createSupabaseServiceRoleClient();
  const errorsByKey = new Map<string, string>();
  const uniqueRows = new Map<string, TablesInsert<"link_order_attributions">>();

  for (const entry of entries) {
    const campaign = entry.codeRow.campaign;
    const linkId = entry.codeRow.claimed_by_link_id;
    if (!campaign || !linkId) continue;
    const key = `${linkId}\u0000${entry.orderId}\u0000${entry.codeRow.id}`;
    uniqueRows.set(key, {
      link_id: linkId,
      campaign_id: campaign.id,
      discount_code_id: entry.codeRow.id,
      store_order_id: entry.orderId,
      status: mapStatus(entry.row.rawStatus),
      order_amount_minor: entry.row.amountMinor,
      commission_amount_minor: Math.round(
        (entry.row.amountMinor * Number(campaign.commission_percent ?? 0)) / 100,
      ),
      currency: entry.row.currency,
      source: "shopify",
    });
  }

  const rows = [...uniqueRows.values()];
  for (const chunk of chunks(rows, ATTRIBUTION_CHUNK_SIZE)) {
    const { error } = await supabase
      .from("link_order_attributions")
      .upsert(chunk, { onConflict: "link_id,store_order_id,discount_code_id" });

    if (!error) continue;

    for (const row of chunk) {
      const key = `${row.link_id}\u0000${row.store_order_id}\u0000${row.discount_code_id}`;
      const single = await supabase
        .from("link_order_attributions")
        .upsert(row, { onConflict: "link_id,store_order_id,discount_code_id" });
      if (single.error) errorsByKey.set(key, single.error.message);
    }
  }

  return errorsByKey;
}

export async function importSalesCsv({
  csv,
  storeId,
  dryRun,
  actorId,
}: {
  csv: string;
  storeId?: string | null;
  dryRun: boolean;
  actorId: string;
}): Promise<SalesImportResponse> {
  if (!csv.trim()) throw new Error("Empty body. Paste or upload a CSV file.");

  const rawRows = parseRows(csv);
  if (rawRows.length === 0) {
    throw new Error("No data rows found. Make sure the header row is present.");
  }

  const rows: PreparedRow[] = rawRows.map((r, i) => ({
    line: i + 2,
    externalOrderId: (r.externalOrderId ?? "").trim(),
    code: (r.discountCode ?? "").trim().toUpperCase(),
    currency: (r.currency ?? "").trim().toUpperCase() || "EUR",
    amountMinor: toMinor(r.amount),
    processedAt: parseDate(r.orderedAt),
    rawStatus: (r.status ?? "").trim(),
    orderedAt: r.orderedAt || null,
  }));

  const codeMap = await loadCodeMap(
    [...new Set(rows.map((r) => r.code).filter(Boolean))],
    storeId?.trim() || null,
  );

  const results: SalesImportRowResult[] = [];
  const validEntries: { row: PreparedRow; codeRow: CampaignCodeRow }[] = [];

  for (const row of rows) {
    if (!row.externalOrderId) {
      results.push({
        line: row.line,
        status: "error",
        code: row.code || null,
        orderNumber: null,
        reason: "missing External Order ID",
      });
      continue;
    }
    if (!row.code) {
      results.push({
        line: row.line,
        status: "unmatched",
        code: null,
        orderNumber: row.externalOrderId,
        reason: "missing discount code",
      });
      continue;
    }
    const codeRow = codeMap.get(row.code);
    if (!codeRow) {
      results.push({
        line: row.line,
        status: "unmatched",
        code: row.code,
        orderNumber: row.externalOrderId,
        reason: "no matching campaign code",
      });
      continue;
    }
    if (!codeRow.campaign) {
      results.push({
        line: row.line,
        status: "error",
        code: row.code,
        orderNumber: row.externalOrderId,
        reason: "campaign not found for code",
      });
      continue;
    }

    const status = codeRow.claimed_by_link_id
      ? "attributed"
      : "recorded_unattributed";
    results.push({
      line: row.line,
      status,
      code: row.code,
      orderNumber: row.externalOrderId,
      reason: status === "recorded_unattributed"
        ? "code not reserved by a recommender link"
        : undefined,
    });
    validEntries.push({ row, codeRow });
  }

  if (dryRun || validEntries.length === 0) {
    return resultResponse(results, dryRun);
  }

  const { orderIdByKey, errorsByKey } = await upsertOrders(validEntries, actorId);
  const attributionEntries: {
    row: PreparedRow;
    codeRow: CampaignCodeRow;
    orderId: string;
  }[] = [];

  for (const entry of validEntries) {
    const campaign = entry.codeRow.campaign;
    if (!campaign) continue;
    const key = orderKey(campaign.store_id, entry.row.externalOrderId);
    const orderError = errorsByKey.get(key);
    const result = results.find((r) => r.line === entry.row.line);
    if (!result) continue;

    if (orderError) {
      result.status = "error";
      result.reason = orderError;
      continue;
    }

    const orderId = orderIdByKey.get(key);
    if (!orderId) {
      result.status = "error";
      result.reason = "order upsert did not return an id";
      continue;
    }

    if (entry.codeRow.claimed_by_link_id) {
      attributionEntries.push({ ...entry, orderId });
    }
  }

  const attrErrorsByKey = await upsertAttributions(attributionEntries);
  for (const entry of attributionEntries) {
    const linkId = entry.codeRow.claimed_by_link_id;
    if (!linkId) continue;
    const key = `${linkId}\u0000${entry.orderId}\u0000${entry.codeRow.id}`;
    const attrError = attrErrorsByKey.get(key);
    if (!attrError) continue;
    const result = results.find((r) => r.line === entry.row.line);
    if (result) {
      result.status = "error";
      result.reason = attrError;
    }
  }

  return resultResponse(results, false);
}
