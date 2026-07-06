import { DEFAULT_CURRENCY } from "@/lib/currency";
import { db, saveDb } from "@/lib/mock/store";
import type {
  CommissionLedgerEntry,
  PayableUser,
  PayoutAccount,
  PayoutAccountInput,
  PayoutBatch,
  PayoutBatchRow,
  PayoutOverview,
} from "@/lib/types";
import { delay, nowIso, uid } from "@/lib/utils";
import { pushActivity } from "@/lib/mock/mutations";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { pick } from "./_runtime";

function sumByStatus(
  entries: CommissionLedgerEntry[],
  status: CommissionLedgerEntry["status"],
): number {
  return entries
    .filter((e) => e.status === status)
    .reduce((s, e) => s + e.amountMinor, 0);
}

function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Loose IBAN shape check (country code + 13–32 alphanumerics). */
export function isPlausibleIban(raw: string): boolean {
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalizeIban(raw));
}

function validateAccountInput(input: PayoutAccountInput): PayoutAccountInput {
  const accountHolder = input.accountHolder.trim();
  const iban = normalizeIban(input.iban);
  if (!accountHolder) throw new Error("Account holder is required.");
  if (!isPlausibleIban(iban)) throw new Error("Enter a valid IBAN.");
  return {
    accountHolder,
    iban,
    bic: input.bic?.trim().toUpperCase() || null,
    bankName: input.bankName?.trim() || null,
  };
}

export interface PayoutsService {
  getOverview(userId: string): Promise<PayoutOverview>;
  /** Create/update the signed-in user's bank details for manual payouts. */
  savePayoutAccount(input: PayoutAccountInput): Promise<PayoutAccount>;
  /** User: move their entire available balance into a 'requested' payout batch. */
  requestPayout(): Promise<PayoutBatch>;
  listPayableUsers(): Promise<PayableUser[]>;
  listPayoutBatches(): Promise<PayoutBatchRow[]>;
  /** Admin: move a user's available balance into a queued payout batch. */
  queuePayout(userId: string): Promise<PayoutBatch>;
  /** Admin: record the manual bank transfer as completed. */
  markPayoutPaid(batchId: string, reference?: string): Promise<PayoutBatch>;
  /** Admin: cancel a queued batch and release its balance. */
  cancelPayout(batchId: string): Promise<PayoutBatch>;
}

const mock: PayoutsService = {
  async getOverview(userId) {
    await delay();
    const d = db();
    const ledger = d.ledger
      .filter((l) => l.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const currency = ledger[0]?.currency ?? DEFAULT_CURRENCY;
    const account = d.payoutAccounts.find((a) => a.userId === userId) ?? null;
    return {
      availableMinor: sumByStatus(ledger, "available"),
      pendingMinor: sumByStatus(ledger, "pending"),
      paidMinor: sumByStatus(ledger, "paid"),
      currency,
      account,
      ledger,
    };
  },

  async savePayoutAccount(input) {
    await delay(300);
    const clean = validateAccountInput(input);
    const d = db();
    let account = d.payoutAccounts.find((a) => a.userId === d.currentUserId);
    if (!account) {
      account = {
        id: uid("acct"),
        userId: d.currentUserId,
        externalAccountId: null,
        method: "bank_transfer",
        accountHolder: clean.accountHolder,
        iban: clean.iban,
        bic: clean.bic ?? null,
        bankName: clean.bankName ?? null,
        chargesEnabled: false,
        payoutsEnabled: true,
        detailsSubmitted: true,
        requirementsCurrentlyDue: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      d.payoutAccounts.push(account);
    } else {
      account.accountHolder = clean.accountHolder;
      account.iban = clean.iban;
      account.bic = clean.bic ?? null;
      account.bankName = clean.bankName ?? null;
      account.method = "bank_transfer";
      account.detailsSubmitted = true;
      account.payoutsEnabled = true;
      account.requirementsCurrentlyDue = [];
      account.updatedAt = nowIso();
    }
    pushActivity(d, {
      scopeType: "payout",
      scopeId: account.id,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "payout_account_saved",
    });
    saveDb(d);
    return account;
  },

  async listPayableUsers() {
    await delay();
    const d = db();
    return d.profiles
      .map((p) => {
        const ledger = d.ledger.filter((l) => l.userId === p.id);
        const availableMinor = sumByStatus(ledger, "available");
        const pendingMinor = sumByStatus(ledger, "pending");
        const account = d.payoutAccounts.find((a) => a.userId === p.id) ?? null;
        return {
          user: {
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
          },
          availableMinor,
          pendingMinor,
          currency: ledger[0]?.currency ?? DEFAULT_CURRENCY,
          onboarded: Boolean(account?.payoutsEnabled),
          account,
        };
      })
      .filter((u) => u.availableMinor > 0 || u.pendingMinor > 0)
      .sort((a, b) => b.availableMinor - a.availableMinor);
  },

  async requestPayout() {
    await delay(400);
    const d = db();
    const userId = d.currentUserId;
    const account = d.payoutAccounts.find((a) => a.userId === userId);
    if (!account?.payoutsEnabled || !account.iban) {
      throw new Error("Add your bank details before requesting a payout.");
    }
    const available = d.ledger.filter(
      (l) => l.userId === userId && l.status === "available",
    );
    const amountMinor = available.reduce((s, l) => s + l.amountMinor, 0);
    if (amountMinor <= 0) throw new Error("No available balance to pay out.");
    const batch: PayoutBatch = {
      id: uid("payout"),
      userId,
      transferId: null,
      amountMinor,
      currency: available[0]?.currency ?? DEFAULT_CURRENCY,
      status: "requested",
      createdAt: nowIso(),
      paidAt: null,
    };
    d.payoutBatches.unshift(batch);
    available.forEach((l) => {
      l.type = "payout_pending";
      l.status = "pending";
      l.metadata = { ...(l.metadata ?? {}), payoutBatchId: batch.id };
    });
    pushActivity(d, {
      scopeType: "payout",
      scopeId: batch.id,
      actorType: "user",
      actorId: userId,
      eventType: "payout_requested",
      eventData: { amountMinor, currency: batch.currency },
    });
    saveDb(d);
    return batch;
  },

  async listPayoutBatches() {
    await delay();
    const d = db();
    return [...d.payoutBatches]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((b) => {
        const p = d.profiles.find((x) => x.id === b.userId);
        return {
          ...b,
          user: p
            ? {
                id: p.id,
                firstName: p.firstName,
                lastName: p.lastName,
                email: p.email,
              }
            : null,
        };
      });
  },

  async queuePayout(userId) {
    await delay(400);
    const d = db();
    const available = d.ledger.filter(
      (l) => l.userId === userId && l.status === "available",
    );
    const amountMinor = available.reduce((s, l) => s + l.amountMinor, 0);
    if (amountMinor <= 0) throw new Error("No available balance to pay out.");
    const batch: PayoutBatch = {
      id: uid("payout"),
      userId,
      transferId: null,
      amountMinor,
      currency: available[0]?.currency ?? DEFAULT_CURRENCY,
      status: "queued",
      createdAt: nowIso(),
      paidAt: null,
    };
    d.payoutBatches.unshift(batch);
    // Hold the included ledger entries so they can't be double-queued.
    available.forEach((l) => {
      l.type = "payout_pending";
      l.status = "pending";
      l.metadata = { ...(l.metadata ?? {}), payoutBatchId: batch.id };
    });
    pushActivity(d, {
      scopeType: "payout",
      scopeId: batch.id,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "payout_queued",
      eventData: { amountMinor, currency: batch.currency },
    });
    saveDb(d);
    return batch;
  },

  async markPayoutPaid(batchId, reference) {
    await delay(400);
    const d = db();
    const batch = d.payoutBatches.find((b) => b.id === batchId);
    if (!batch) throw new Error("Payout batch not found");
    if (batch.status !== "queued" && batch.status !== "requested")
      throw new Error("Only queued or requested batches can be marked paid.");
    batch.status = "paid";
    batch.paidAt = nowIso();
    batch.transferId = reference?.trim() || batch.transferId;
    d.ledger
      .filter(
        (l) =>
          l.userId === batch.userId &&
          (l.metadata?.payoutBatchId as string | undefined) === batchId,
      )
      .forEach((l) => {
        l.type = "paid";
        l.status = "paid";
      });
    pushActivity(d, {
      scopeType: "payout",
      scopeId: batchId,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "payout_paid",
      eventData: { amountMinor: batch.amountMinor },
    });
    saveDb(d);
    return batch;
  },

  async cancelPayout(batchId) {
    await delay(300);
    const d = db();
    const batch = d.payoutBatches.find((b) => b.id === batchId);
    if (!batch) throw new Error("Payout batch not found");
    if (batch.status !== "queued" && batch.status !== "requested")
      throw new Error("Only queued or requested batches can be canceled.");
    batch.status = "canceled";
    d.ledger
      .filter(
        (l) => (l.metadata?.payoutBatchId as string | undefined) === batchId,
      )
      .forEach((l) => {
        l.type = l.amountMinor < 0 ? "reversed" : "earned";
        l.status = "available";
        if (l.metadata) delete l.metadata.payoutBatchId;
      });
    pushActivity(d, {
      scopeType: "payout",
      scopeId: batchId,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "payout_canceled",
      eventData: { amountMinor: batch.amountMinor },
    });
    saveDb(d);
    return batch;
  },
};

// --- Real implementation (Supabase) --------------------------------------

function mapLedger(row: Tables<"commission_ledger_entries">): CommissionLedgerEntry {
  return {
    id: row.id,
    userId: row.user_id,
    storeId: row.store_id,
    linkId: row.link_id,
    attributionId: row.attribution_id,
    type: row.type as CommissionLedgerEntry["type"],
    amountMinor: row.amount_minor,
    currency: row.currency,
    status: row.status as CommissionLedgerEntry["status"],
    availableAt: row.available_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

function mapBatch(row: Tables<"payout_batches">): PayoutBatch {
  return {
    id: row.id,
    userId: row.user_id,
    transferId: row.transfer_reference,
    amountMinor: row.amount_minor,
    currency: row.currency,
    status: row.status as PayoutBatch["status"],
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

function mapAccount(row: Tables<"payout_accounts">): PayoutAccount {
  return {
    id: row.id,
    userId: row.user_id,
    externalAccountId: row.external_account_id,
    method: row.method,
    accountHolder: row.account_holder,
    iban: row.iban,
    bic: row.bic,
    bankName: row.bank_name,
    chargesEnabled: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
    detailsSubmitted: row.details_submitted,
    requirementsCurrentlyDue: row.requirements_currently_due,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const real: PayoutsService = {
  async getOverview(userId) {
    const supabase = createSupabaseBrowserClient();
    const [ledgerRes, accountRes] = await Promise.all([
      supabase
        .from("commission_ledger_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("payout_accounts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (ledgerRes.error) throw new Error(ledgerRes.error.message);
    const ledger = (ledgerRes.data ?? []).map(mapLedger);
    return {
      availableMinor: sumByStatus(ledger, "available"),
      pendingMinor: sumByStatus(ledger, "pending"),
      paidMinor: sumByStatus(ledger, "paid"),
      currency: ledger[0]?.currency ?? DEFAULT_CURRENCY,
      account: accountRes.data ? mapAccount(accountRes.data) : null,
      ledger,
    };
  },

  async savePayoutAccount(input) {
    const clean = validateAccountInput(input);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const { data, error } = await supabase
      .from("payout_accounts")
      .upsert(
        {
          user_id: user.id,
          method: "bank_transfer",
          account_holder: clean.accountHolder,
          iban: clean.iban,
          bic: clean.bic ?? null,
          bank_name: clean.bankName ?? null,
          details_submitted: true,
          payouts_enabled: true,
          requirements_currently_due: [],
          updated_at: nowIso(),
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapAccount(data);
  },

  async listPayableUsers() {
    const supabase = createSupabaseBrowserClient();
    const { data: payableRows, error: payableError } = await supabase.rpc(
      "admin_payable_users",
    );
    if (!payableError && payableRows) {
      return payableRows.map((row) => ({
        user: {
          id: row.user_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
        },
        availableMinor: row.available_minor,
        pendingMinor: row.pending_minor,
        currency: row.currency,
        onboarded: row.payouts_enabled,
        account: row.account_id
          ? {
              id: row.account_id,
              userId: row.user_id,
              externalAccountId: null,
              method: "bank_transfer",
              accountHolder: row.account_holder,
              iban: row.iban,
              bic: row.bic,
              bankName: row.bank_name,
              chargesEnabled: false,
              payoutsEnabled: row.payouts_enabled,
              detailsSubmitted: row.payouts_enabled,
              requirementsCurrentlyDue: [],
              createdAt: "",
              updatedAt: "",
            }
          : null,
      }));
    }

    const { data: ledgerRows, error } = await supabase
      .from("commission_ledger_entries")
      .select("user_id, amount_minor, status, currency");
    if (error) throw new Error(error.message);

    const byUser = new Map<
      string,
      { available: number; pending: number; currency: string }
    >();
    for (const l of ledgerRows ?? []) {
      const agg =
        byUser.get(l.user_id) ??
        { available: 0, pending: 0, currency: l.currency };
      if (l.status === "available") agg.available += l.amount_minor;
      else if (l.status === "pending") agg.pending += l.amount_minor;
      byUser.set(l.user_id, agg);
    }
    const payableIds = [...byUser.entries()]
      .filter(([, a]) => a.available > 0 || a.pending > 0)
      .map(([id]) => id);
    if (payableIds.length === 0) return [];

    const [profilesRes, accountsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", payableIds),
      supabase.from("payout_accounts").select("*").in("user_id", payableIds),
    ]);
    const accountByUser = new Map(
      (accountsRes.data ?? []).map((a) => [a.user_id, mapAccount(a)]),
    );
    const profileMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p]),
    );

    return payableIds
      .map((id) => {
        const agg = byUser.get(id)!;
        const p = profileMap.get(id);
        const account = accountByUser.get(id) ?? null;
        return {
          user: {
            id,
            firstName: p?.first_name ?? "",
            lastName: p?.last_name ?? "",
            email: p?.email ?? "",
          },
          availableMinor: agg.available,
          pendingMinor: agg.pending,
          currency: agg.currency,
          onboarded: Boolean(account?.payoutsEnabled),
          account,
        };
      })
      .sort((a, b) => b.availableMinor - a.availableMinor);
  },

  async listPayoutBatches() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("payout_batches")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const batches = (data ?? []).map(mapBatch);

    const userIds = [...new Set(batches.map((b) => b.userId))];
    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds)
      : { data: [] as never[] };
    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          email: p.email,
        },
      ]),
    );

    return batches.map((b) => ({
      ...b,
      user: profileMap.get(b.userId) ?? null,
    }));
  },

  async requestPayout() {
    const supabase = createSupabaseBrowserClient();
    const { data: batchId, error } = await supabase.rpc("request_payout");
    if (error) throw new Error(error.message);
    const { data, error: fetchErr } = await supabase
      .from("payout_batches")
      .select("*")
      .eq("id", batchId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    return mapBatch(data);
  },

  // Payout state changes run through atomic SECURITY DEFINER RPCs that verify
  // the caller's admin role server-side (see the manual-payouts migration).
  async queuePayout(userId) {
    const supabase = createSupabaseBrowserClient();
    const { data: batchId, error } = await supabase.rpc("admin_queue_payout", {
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
    const { data, error: fetchErr } = await supabase
      .from("payout_batches")
      .select("*")
      .eq("id", batchId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    return mapBatch(data);
  },

  async markPayoutPaid(batchId, reference) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_mark_payout_paid", {
      p_batch_id: batchId,
      ...(reference?.trim() ? { p_reference: reference.trim() } : {}),
    });
    if (error) throw new Error(error.message);
    const { data, error: fetchErr } = await supabase
      .from("payout_batches")
      .select("*")
      .eq("id", batchId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    return mapBatch(data);
  },

  async cancelPayout(batchId) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_cancel_payout", {
      p_batch_id: batchId,
    });
    if (error) throw new Error(error.message);
    const { data, error: fetchErr } = await supabase
      .from("payout_batches")
      .select("*")
      .eq("id", batchId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    return mapBatch(data);
  },
};

export const payoutsService = pick("payouts", mock, real);
