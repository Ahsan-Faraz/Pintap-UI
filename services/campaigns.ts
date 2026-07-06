import { db, saveDb } from "@/lib/mock/store";
import type {
  Campaign,
  CampaignCodeRow,
  CampaignDiscountCode,
  CampaignStatus,
  CampaignSummary,
  CreateCampaignInput,
  DiscountCodeSourceInput,
} from "@/lib/types";
import { delay, nowIso, uid } from "@/lib/utils";
import { codeCounts, toCampaignSummary as mockCampaignSummary } from "@/lib/mock/queries";
import { pushActivity } from "@/lib/mock/mutations";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  mapCampaign,
  mapStore,
  storeById,
  toCampaignSummary,
} from "@/lib/supabase/mappers";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { pick } from "./_runtime";

export type { CampaignCodeRow };

export interface CampaignsService {
  listCampaigns(): Promise<CampaignSummary[]>;
  listCampaignsForOwner(userId: string): Promise<CampaignSummary[]>;
  listCampaignsForStore(storeId: string): Promise<CampaignSummary[]>;
  getCampaign(id: string): Promise<CampaignSummary | null>;
  listCodes(campaignId: string): Promise<CampaignCodeRow[]>;
  createCampaign(input: CreateCampaignInput): Promise<CampaignSummary>;
  updateCampaign(
    id: string,
    patch: Partial<
      Pick<
        Campaign,
        | "name"
        | "terms"
        | "startAt"
        | "endAt"
        | "discountPercent"
        | "commissionPercent"
      >
    >,
  ): Promise<CampaignSummary>;
  addCodes(
    campaignId: string,
    source: DiscountCodeSourceInput,
  ): Promise<CampaignSummary>;
  pauseCampaign(id: string): Promise<CampaignSummary>;
  resumeCampaign(id: string): Promise<CampaignSummary>;
  stopCampaign(id: string): Promise<CampaignSummary>;
}

function ownerStoreIds(userId: string): Set<string> {
  return new Set(
    db()
      .storeMembers.filter((m) => m.userId === userId)
      .map((m) => m.storeId),
  );
}

function deriveStatus(input: {
  isActive?: boolean;
  startAt: string;
  endAt?: string | null;
}): CampaignStatus {
  if (input.isActive === false) return "draft";
  const now = Date.now();
  if (+new Date(input.startAt) > now) return "scheduled";
  if (input.endAt && +new Date(input.endAt) < now) return "ended";
  return "active";
}

function buildCodes(
  campaignId: string,
  source: DiscountCodeSourceInput,
  existing: string[],
): CampaignDiscountCode[] {
  const taken = new Set(existing);
  const out: CampaignDiscountCode[] = [];
  const push = (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c || taken.has(c)) return;
    taken.add(c);
    out.push({
      id: uid("code"),
      campaignId,
      code: c,
      status: "available",
      claimedByLinkId: null,
      createdAt: nowIso(),
    });
  };
  if (source.kind === "generate") {
    const count = Math.max(1, Math.min(500, Math.floor(source.count)));
    const prefix = (source.prefix || "PT").trim().toUpperCase();
    for (let i = 0; i < count; i++) {
      push(`${prefix}-${String(i + 1).padStart(3, "0")}`);
    }
  } else {
    source.codes
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 500)
      .forEach(push);
  }
  return out;
}

function validate(input: CreateCampaignInput) {
  if (!input.storeId) throw new Error("Select a store.");
  if (!input.name?.trim()) throw new Error("Campaign name is required.");
  if (!input.terms?.trim()) throw new Error("Campaign terms are required.");
  if (input.discountPercent < 0 || input.discountPercent > 100)
    throw new Error("Discount percent must be 0–100.");
  if (input.commissionPercent < 0 || input.commissionPercent > 100)
    throw new Error("Commission percent must be 0–100.");
  if (input.codeSource.kind === "generate") {
    if (input.codeSource.count < 1 || input.codeSource.count > 500)
      throw new Error("Code count must be 1–500.");
  } else if (input.codeSource.codes.filter((c) => c.trim()).length < 1) {
    throw new Error("Upload at least one discount code.");
  }
}

const mock: CampaignsService = {
  async listCampaigns() {
    await delay();
    const d = db();
    return d.campaigns
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      .map((c) => mockCampaignSummary(d, c));
  },

  async listCampaignsForOwner(userId) {
    await delay();
    const d = db();
    const stores = ownerStoreIds(userId);
    return d.campaigns
      .filter((c) => stores.has(c.storeId))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      .map((c) => mockCampaignSummary(d, c));
  },

  async listCampaignsForStore(storeId) {
    await delay();
    const d = db();
    return d.campaigns
      .filter((c) => c.storeId === storeId)
      .map((c) => mockCampaignSummary(d, c));
  },

  async getCampaign(id) {
    await delay(150);
    const d = db();
    const c = d.campaigns.find((x) => x.id === id);
    return c ? mockCampaignSummary(d, c) : null;
  },

  async listCodes(campaignId) {
    await delay();
    const d = db();
    return d.discountCodes
      .filter((c) => c.campaignId === campaignId)
      .map((c) => {
        const link = c.claimedByLinkId
          ? d.links.find((l) => l.id === c.claimedByLinkId)
          : null;
        const profile = link
          ? d.profiles.find((p) => p.id === link.userId)
          : null;
        return {
          ...c,
          claimedLinkName: link?.name ?? null,
          claimedByName: profile
            ? [profile.firstName, profile.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || profile.email
            : null,
        };
      });
  },

  async createCampaign(input) {
    await delay(400);
    validate(input);
    const d = db();
    const id = uid("camp");
    const campaign: Campaign = {
      id,
      storeId: input.storeId,
      name: input.name.trim(),
      destinationUrl: input.destinationUrl ?? null,
      productHandle: input.productHandle ?? null,
      productId: null,
      terms: input.terms.trim(),
      discountPercent: input.discountPercent,
      commissionPercent: input.commissionPercent,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      isActive: input.isActive ?? true,
      status: deriveStatus(input),
      maxBudgetMinor: input.maxBudgetMinor ?? null,
      maxClaims: input.maxClaims ?? null,
      createdBy: d.currentUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    d.campaigns.push(campaign);
    d.discountCodes.push(...buildCodes(id, input.codeSource, []));
    pushActivity(d, {
      scopeType: "campaign",
      scopeId: id,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "campaign_created",
      eventData: { campaign: campaign.name },
    });
    saveDb(d);
    return mockCampaignSummary(d, campaign);
  },

  async updateCampaign(id, patch) {
    await delay();
    const d = db();
    const c = d.campaigns.find((x) => x.id === id);
    if (!c) throw new Error("Campaign not found");
    if (patch.discountPercent != null) {
      if (patch.discountPercent < 0 || patch.discountPercent > 100)
        throw new Error("Discount percent must be 0–100.");
      c.discountPercent = patch.discountPercent;
    }
    if (patch.commissionPercent != null) {
      if (patch.commissionPercent < 0 || patch.commissionPercent > 100)
        throw new Error("Commission percent must be 0–100.");
      c.commissionPercent = patch.commissionPercent;
    }
    if (patch.name != null) c.name = patch.name.trim() || c.name;
    if (patch.terms != null) c.terms = patch.terms.trim() || c.terms;
    if (patch.startAt != null) c.startAt = patch.startAt;
    if (patch.endAt !== undefined) c.endAt = patch.endAt;
    c.updatedAt = nowIso();
    saveDb(d);
    return mockCampaignSummary(d, c);
  },

  async addCodes(campaignId, source) {
    await delay();
    const d = db();
    const c = d.campaigns.find((x) => x.id === campaignId);
    if (!c) throw new Error("Campaign not found");
    const existing = d.discountCodes
      .filter((x) => x.campaignId === campaignId)
      .map((x) => x.code);
    d.discountCodes.push(...buildCodes(campaignId, source, existing));
    c.updatedAt = nowIso();
    pushActivity(d, {
      scopeType: "campaign",
      scopeId: campaignId,
      actorType: "user",
      actorId: d.currentUserId,
      eventType: "campaign_codes_added",
      eventData: codeCounts(d, campaignId),
    });
    saveDb(d);
    return mockCampaignSummary(d, c);
  },

  async pauseCampaign(id) {
    return setStatus(id, "paused", false);
  },
  async resumeCampaign(id) {
    return setStatus(id, "active", true);
  },
  async stopCampaign(id) {
    return setStatus(id, "ended", false);
  },
};

function setStatus(id: string, status: CampaignStatus, isActive: boolean) {
  const d = db();
  const c = d.campaigns.find((x) => x.id === id);
  if (!c) throw new Error("Campaign not found");
  c.status = status;
  c.isActive = isActive;
  c.updatedAt = nowIso();
  pushActivity(d, {
    scopeType: "campaign",
    scopeId: id,
    actorType: "user",
    actorId: d.currentUserId,
    eventType: `campaign_${status}`,
    eventData: { campaign: c.name },
  });
  saveDb(d);
  return Promise.resolve(mockCampaignSummary(d, c));
}

async function loadCampaignContext(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  campaignRows: ReturnType<typeof mapCampaign> extends infer T ? T[] : never,
) {
  const rows = campaignRows as import("@/lib/types").Campaign[];
  const storeIds = [...new Set(rows.map((c) => c.storeId))];
  const campaignIds = rows.map((c) => c.id);

  // Code counts come from an aggregate-only SECURITY DEFINER function: RLS
  // hides the code rows themselves from recommenders, which used to make every
  // campaign look like it had 0 codes outside merchant/admin sessions.
  const [storesRes, countsRes] = await Promise.all([
    storeIds.length
      ? supabase.from("stores").select("*").in("id", storeIds)
      : Promise.resolve({ data: [] as never[] }),
    campaignIds.length
      ? supabase.rpc("campaign_code_counts", { p_campaign_ids: campaignIds })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const stores = (storesRes.data ?? []).map(mapStore);
  const countsByCampaign = new Map(
    (countsRes.data ?? []).map((r) => [
      r.campaign_id,
      {
        codesTotal: r.codes_total,
        codesAvailable: r.codes_available,
        codesClaimed: r.codes_claimed,
      },
    ]),
  );

  return rows.map((c) =>
    toCampaignSummary(
      c,
      storeById(stores, c.storeId),
      countsByCampaign.get(c.id) ?? {
        codesTotal: 0,
        codesAvailable: 0,
        codesClaimed: 0,
      },
    ),
  );
}

const real: CampaignsService = {
  async listCampaigns() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return loadCampaignContext(supabase, (data ?? []).map(mapCampaign));
  },

  async listCampaignsForOwner(userId) {
    const supabase = createSupabaseBrowserClient();
    const { data: members } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", userId);
    const storeIds = (members ?? []).map((m) => m.store_id);
    if (storeIds.length === 0) return [];
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .in("store_id", storeIds)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return loadCampaignContext(supabase, (data ?? []).map(mapCampaign));
  },

  async listCampaignsForStore(storeId) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return loadCampaignContext(supabase, (data ?? []).map(mapCampaign));
  },

  async getCampaign(id) {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const [summary] = await loadCampaignContext(supabase, [mapCampaign(data)]);
    return summary ?? null;
  },

  async listCodes(campaignId) {
    // Primary path: server route resolves the recommender's name via the
    // service-role client. RLS otherwise hides other users' links & profiles,
    // so a merchant browser query can't name who claimed a code.
    const res = await fetch(
      `/api/merchant/campaigns/${encodeURIComponent(campaignId)}/codes`,
    );
    if (res.ok) {
      return (await res.json()) as CampaignCodeRow[];
    }

    // Fallback: RLS-limited browser read (codes are visible to store members;
    // recommender names are not, so they come back null).
    const supabase = createSupabaseBrowserClient();
    const { data: codes, error } = await supabase
      .from("campaign_discount_codes")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at");
    if (error) throw new Error(error.message);

    const claimedIds = (codes ?? [])
      .map((c) => c.claimed_by_link_id)
      .filter(Boolean) as string[];
    const linkNames = new Map<string, string>();
    if (claimedIds.length) {
      const { data: links } = await supabase
        .from("links")
        .select("id, name")
        .in("id", claimedIds);
      for (const l of links ?? []) linkNames.set(l.id, l.name);
    }

    return (codes ?? []).map((c) => ({
      id: c.id,
      campaignId: c.campaign_id,
      code: c.code,
      status: c.status as CampaignDiscountCode["status"],
      claimedByLinkId: c.claimed_by_link_id,
      createdAt: c.created_at,
      claimedLinkName: c.claimed_by_link_id
        ? (linkNames.get(c.claimed_by_link_id) ?? null)
        : null,
      claimedByName: null,
    }));
  },

  async createCampaign(input) {
    validate(input);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const status = deriveStatus(input);
    const row: TablesInsert<"campaigns"> = {
      store_id: input.storeId,
      name: input.name.trim(),
      destination_url: input.destinationUrl ?? null,
      product_handle: input.productHandle ?? null,
      terms: input.terms.trim(),
      discount_percent: input.discountPercent,
      commission_percent: input.commissionPercent,
      start_at: input.startAt,
      end_at: input.endAt ?? null,
      is_active: input.isActive ?? true,
      status,
      created_by: user.id,
    };
    const { data: created, error } = await supabase
      .from("campaigns")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const codes = buildCodes(created.id, input.codeSource, []);
    if (codes.length) {
      const { error: codeErr } = await supabase
        .from("campaign_discount_codes")
        .insert(
          codes.map((c) => ({
            campaign_id: c.campaignId,
            code: c.code,
            status: c.status,
          })),
        );
      if (codeErr) throw new Error(codeErr.message);
    }

    const summary = await real.getCampaign(created.id);
    if (!summary) throw new Error("Campaign not found after create.");
    return summary;
  },

  async updateCampaign(id, patch) {
    const supabase = createSupabaseBrowserClient();
    const updates: TablesUpdate<"campaigns"> = { updated_at: nowIso() };
    if (patch.discountPercent != null) {
      if (patch.discountPercent < 0 || patch.discountPercent > 100)
        throw new Error("Discount percent must be 0–100.");
      updates.discount_percent = patch.discountPercent;
    }
    if (patch.commissionPercent != null) {
      if (patch.commissionPercent < 0 || patch.commissionPercent > 100)
        throw new Error("Commission percent must be 0–100.");
      updates.commission_percent = patch.commissionPercent;
    }
    if (patch.name != null) updates.name = patch.name.trim() || undefined;
    if (patch.terms != null) updates.terms = patch.terms.trim() || undefined;
    if (patch.startAt != null) updates.start_at = patch.startAt;
    if (patch.endAt !== undefined) updates.end_at = patch.endAt;

    const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
    if (error) throw new Error(error.message);
    const summary = await real.getCampaign(id);
    if (!summary) throw new Error("Campaign not found");
    return summary;
  },

  async addCodes(campaignId, source) {
    const supabase = createSupabaseBrowserClient();
    const { data: existing } = await supabase
      .from("campaign_discount_codes")
      .select("code")
      .eq("campaign_id", campaignId);
    const codes = buildCodes(
      campaignId,
      source,
      (existing ?? []).map((c) => c.code),
    );
    if (codes.length) {
      const { error } = await supabase.from("campaign_discount_codes").insert(
        codes.map((c) => ({
          campaign_id: c.campaignId,
          code: c.code,
          status: c.status,
        })),
      );
      if (error) throw new Error(error.message);
    }
    const summary = await real.getCampaign(campaignId);
    if (!summary) throw new Error("Campaign not found");
    return summary;
  },

  async pauseCampaign(id) {
    return realSetStatus(id, "paused", false);
  },
  async resumeCampaign(id) {
    return realSetStatus(id, "active", true);
  },
  async stopCampaign(id) {
    return realSetStatus(id, "ended", false);
  },
};

async function realSetStatus(
  id: string,
  status: CampaignStatus,
  isActive: boolean,
) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status, is_active: isActive, updated_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  const summary = await real.getCampaign(id);
  if (!summary) throw new Error("Campaign not found");
  return summary;
}

export const campaignsService = pick("campaigns", mock, real);
