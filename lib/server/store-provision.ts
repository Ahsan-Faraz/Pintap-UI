import "server-only";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { Store } from "@/lib/types";
import { faviconUrl, normalizeHost, normalizeStoreDomain, storeNameFromHost } from "@/lib/url-utils";
import { mapStore } from "@/lib/supabase/mappers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function domainMatchesStore(
  domain: string,
  store: { merchant_domain: string | null; primary_domain: string | null },
) {
  const host = normalizeHost(domain);
  return (
    (store.merchant_domain && normalizeHost(store.merchant_domain) === host) ||
    (store.primary_domain && normalizeHost(store.primary_domain) === host)
  );
}

/**
 * The host plus its parent domains down to the registrable domain, most
 * specific first — `shop.fahrradxxl.de` → [`shop.fahrradxxl.de`, `fahrradxxl.de`].
 * Lets product URLs on subdomains still match the merchant's registered store.
 */
function candidateHosts(host: string): string[] {
  const labels = host.split(".");
  const candidates: string[] = [];
  for (let i = 0; i + 2 <= labels.length; i++) {
    candidates.push(labels.slice(i).join("."));
  }
  return candidates.length ? candidates : [host];
}

/** Find a store row by normalized domain, regardless of connection status. */
export async function findStoreByDomain(domain: string): Promise<Store | null> {
  const host = normalizeStoreDomain(domain) ?? normalizeHost(domain);
  if (!host) return null;

  const admin = createSupabaseServiceRoleClient();
  const candidates = candidateHosts(host);
  const list = `(${candidates.join(",")})`;
  // Domains are normalized on write, so an indexed equality match does it —
  // never scan the whole stores table per lookup.
  const { data: rows, error } = await admin
    .from("stores")
    .select("*")
    .or(`merchant_domain.in.${list},primary_domain.in.${list}`)
    .limit(10);
  if (error) throw new Error(error.message);

  // Prefer the most specific domain match (exact host before parent domain).
  for (const candidate of candidates) {
    const row = (rows ?? []).find((s) => domainMatchesStore(candidate, s));
    if (row) return mapStore(row);
  }
  return null;
}

/**
 * Slug derived from the full host so "shop.com" and "shop.de" never collide
 * on the stores.slug unique constraint (the old first-label slug did).
 */
export function slugForHost(host: string): string {
  return host.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

/**
 * Resolve an existing store by domain or auto-create one for link creation.
 * Auto-created stores are online, unverified, and not connected by default.
 */
export async function resolveOrCreateStoreByDomain(
  domain: string,
  options: { createdBy: string; userId: string },
): Promise<Store> {
  const existing = await findStoreByDomain(domain);
  if (existing) return existing;

  const host = normalizeStoreDomain(domain) ?? normalizeHost(domain);
  if (!host) throw new Error("Enter a valid store domain.");

  const admin = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  const { data: created, error } = await admin
    .from("stores")
    .insert({
      name: storeNameFromHost(host),
      slug: slugForHost(host),
      merchant_domain: host,
      primary_domain: host,
      // No platform connection yet → no external store id (unique, nullable).
      external_store_id: null,
      // The site's own favicon, not a random stock photo — an auto-created
      // store should still look like the merchant it points at.
      logo_url: faviconUrl(host),
      country_code: "US",
      currency: DEFAULT_CURRENCY,
      connected: false,
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    // Unique violation → another request created the same store concurrently.
    const raced = await findStoreByDomain(host);
    if (raced) return raced;
  }
  if (error || !created) {
    throw new Error(error?.message ?? "Could not create store.");
  }

  await admin.from("activity_events").insert({
    scope_type: "store",
    scope_id: created.id,
    actor_type: "user",
    actor_id: options.userId,
    event_type: "store_auto_created",
    event_data: {
      domain: host,
      createdBy: options.createdBy,
      channelType: "online",
      verified: false,
    },
  });

  return mapStore(created);
}
