import { db } from "@/lib/mock/store";
import type { ActivityEvent } from "@/lib/types";
import { delay } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { pick } from "./_runtime";

export interface ActivityFilter {
  q?: string;
  scopeType?: string;
}

export interface ActivityService {
  listActivity(filter?: ActivityFilter): Promise<ActivityEvent[]>;
}

function matchesQuery(rows: ActivityEvent[], q: string): ActivityEvent[] {
  const needle = q.toLowerCase();
  return rows.filter(
    (r) =>
      r.eventType.toLowerCase().includes(needle) ||
      JSON.stringify(r.eventData).toLowerCase().includes(needle) ||
      (r.scopeId ?? "").toLowerCase().includes(needle),
  );
}

const mock: ActivityService = {
  async listActivity(filter = {}) {
    await delay();
    let rows = [...db().activity].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
    if (filter.scopeType) {
      rows = rows.filter((r) => r.scopeType === filter.scopeType);
    }
    if (filter.q) {
      rows = matchesQuery(rows, filter.q);
    }
    return rows;
  },
};

// --- Real implementation (Supabase) --------------------------------------

function mapActivity(row: Tables<"activity_events">): ActivityEvent {
  return {
    id: row.id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    actorType: row.actor_type as ActivityEvent["actorType"],
    actorId: row.actor_id,
    eventType: row.event_type,
    eventData: (row.event_data ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

const real: ActivityService = {
  async listActivity(filter = {}) {
    const supabase = createSupabaseBrowserClient();
    let query = supabase
      .from("activity_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter.scopeType) {
      query = query.eq("scope_type", filter.scopeType);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []).map(mapActivity);
    return filter.q ? matchesQuery(rows, filter.q) : rows;
  },
};

export const activityService = pick("activity", mock, real);
