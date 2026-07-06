/**
 * Seed Pintap demo auth users + marketplace data, then verify auth/RLS.
 *
 * Run:  node scripts/seed-demo.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY /
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from the project-root .env.
 * Idempotent — safe to re-run (resets demo passwords, upserts roles + demo rows).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

try {
  const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // .env optional when vars are already in the environment
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

if (!url || !secret || !publishable) {
  console.error("Missing Supabase env vars (URL / SECRET_KEY / PUBLISHABLE_KEY).");
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "Pintap2026!";
const DEFAULT_CURRENCY = "EUR";
const ACCOUNTS = [
  { email: "user@pintap.com", first: "Amara", last: "Okafor", extraRoles: [] },
  { email: "merchant@pintap.com", first: "Mira", last: "Chen", extraRoles: ["merchant"] },
  { email: "admin@pintap.com", first: "Jordan", last: "Blake", extraRoles: ["merchant", "admin"] },
];

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureUser(acc) {
  let user = await findUserByEmail(acc.email);
  if (user) {
    await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: acc.first, last_name: acc.last },
    });
    console.log(`  = ${acc.email} (existing ${user.id})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: acc.first, last_name: acc.last },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  + ${acc.email} (created ${user.id})`);
  }
  for (const role of acc.extraRoles) {
    const { error } = await admin
      .from("user_roles")
      .upsert({ user_id: user.id, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) throw error;
  }
  return user.id;
}

async function upsertStore(row) {
  const { data: existing } = await admin
    .from("stores")
    .select("id")
    .eq("merchant_domain", row.merchant_domain)
    .maybeSingle();
  if (existing) {
    await admin.from("stores").update(row).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await admin.from("stores").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

async function seedDemoMarketplace(userIds) {
  console.log("\nSeeding demo stores, campaigns, links…");

  const storeAurora = await upsertStore({
    name: "Aurora Goods",
    slug: "aurora-goods",
    merchant_domain: "auroragoods.com",
    primary_domain: "auroragoods.com",
    external_store_id: "60011122001",
    logo_url: "https://picsum.photos/seed/aurora-logo/200/200",
    country_code: "US",
    currency: DEFAULT_CURRENCY,
    category: "Home & Living",
    connected: true,
    connected_at: daysAgo(110),
    status: "active",
  });

  const storeNordic = await upsertStore({
    name: "Nordic Threads",
    slug: "nordic-threads",
    merchant_domain: "nordicthreads.com",
    primary_domain: "nordicthreads.com",
    external_store_id: "60011122002",
    logo_url: "https://picsum.photos/seed/nordic-logo/200/200",
    country_code: "GB",
    currency: "EUR",
    category: "Apparel",
    connected: true,
    connected_at: daysAgo(85),
    status: "active",
  });

  await upsertStore({
    name: "Lumen Skincare",
    slug: "lumen-skincare",
    merchant_domain: "lumenskincare.com",
    primary_domain: "lumenskincare.com",
    external_store_id: "60011122003",
    logo_url: "https://picsum.photos/seed/lumen-logo/200/200",
    country_code: "US",
    currency: DEFAULT_CURRENCY,
    category: "Beauty",
    connected: true,
    connected_at: daysAgo(70),
    status: "active",
  });

  await admin.from("store_members").upsert(
    [
      { store_id: storeAurora, user_id: userIds.admin, role: "owner" },
      { store_id: storeNordic, user_id: userIds.merchant, role: "owner" },
    ],
    { onConflict: "store_id,user_id" },
  );

  const campSpringPayload = {
    store_id: storeAurora,
    name: "Spring Collection",
    destination_url: "https://auroragoods.com/collections/spring",
    terms: "15% off spring collection. One use per customer.",
    discount_percent: 15,
    commission_percent: 8,
    start_at: daysAgo(30),
    end_at: null,
    is_active: true,
    status: "active",
    created_by: userIds.merchant,
  };

  let campSpringId;
  const { data: existingCamp } = await admin
    .from("campaigns")
    .select("id")
    .eq("store_id", storeAurora)
    .eq("name", campSpringPayload.name)
    .maybeSingle();
  if (existingCamp) {
    campSpringId = existingCamp.id;
    await admin.from("campaigns").update(campSpringPayload).eq("id", campSpringId);
  } else {
    const { data, error } = await admin
      .from("campaigns")
      .insert(campSpringPayload)
      .select("id")
      .single();
    if (error) throw error;
    campSpringId = data.id;
  }

  const codes = ["AURSPR-01", "AURSPR-02", "AURSPR-03", "AURSPR-04"];
  for (const code of codes) {
    await admin.from("campaign_discount_codes").upsert(
      { campaign_id: campSpringId, code, status: "available" },
      { onConflict: "campaign_id,code", ignoreDuplicates: true },
    );
  }

  const linkPayload = {
    user_id: userIds.user,
    store_id: storeAurora,
    type: "product",
    destination_url: "https://auroragoods.com/products/linen-throw",
    source_host: "auroragoods.com",
    name: "Aurora Linen Throw",
    brand: "Aurora Goods",
    image_url: "https://picsum.photos/seed/linen-throw/600/600",
    is_verified: true,
    short_code: "Aur0Sp11",
    short_url: `${appUrl}/l/Aur0Sp11`,
    status: "active",
  };

  const { data: existingLink } = await admin
    .from("links")
    .select("id")
    .eq("short_code", "Aur0Sp11")
    .maybeSingle();

  let linkId = existingLink?.id;
  if (linkId) {
    await admin.from("links").update(linkPayload).eq("id", linkId);
  } else {
    const { data, error } = await admin.from("links").insert(linkPayload).select("id").single();
    if (error) throw error;
    linkId = data.id;
  }

  const { data: codeRow } = await admin
    .from("campaign_discount_codes")
    .select("id")
    .eq("campaign_id", campSpringId)
    .eq("code", "AURSPR-01")
    .single();

  await admin
    .from("campaign_discount_codes")
    .update({ status: "claimed", claimed_by_link_id: linkId })
    .eq("id", codeRow.id);

  await admin
    .from("links")
    .update({
      campaign_id: campSpringId,
      discount_code_id: codeRow.id,
    })
    .eq("id", linkId);

  for (let i = 0; i < 12; i++) {
    await admin.from("link_clicks").insert({
      link_id: linkId,
      visitor_hash: `vh_demo_${i}`,
      source: "resolver",
      user_agent: "seed-script",
    });
  }

  const counts = await Promise.all([
    admin.from("stores").select("id", { count: "exact", head: true }),
    admin.from("campaigns").select("id", { count: "exact", head: true }),
    admin.from("links").select("id", { count: "exact", head: true }),
  ]);

  console.log(
    `  stores=${counts[0].count} campaigns=${counts[1].count} links=${counts[2].count} (resolver: ${appUrl}/l/Aur0Sp11)`,
  );
}

async function smokeTest(acc, expectedVisibleProfiles) {
  const client = createClient(url, publishable, { auth: { persistSession: false } });
  const { error: signInErr } = await client.auth.signInWithPassword({
    email: acc.email,
    password: PASSWORD,
  });
  if (signInErr) throw new Error(`sign-in failed for ${acc.email}: ${signInErr.message}`);

  const { data: roles } = await client.from("user_roles").select("role");
  const { data: profilesVisible } = await client.from("profiles").select("id");
  const visible = profilesVisible?.length ?? 0;
  const ok = visible === expectedVisibleProfiles;
  console.log(
    `  ${ok ? "OK " : "!! "}${acc.email}: roles=[${(roles ?? [])
      .map((r) => r.role)
      .join(",")}] profilesVisibleUnderRLS=${visible} (expected ${expectedVisibleProfiles})`,
  );
  await client.auth.signOut();
  return ok;
}

console.log("Seeding demo users…");
const userIds = {};
for (const acc of ACCOUNTS) {
  const id = await ensureUser(acc);
  if (acc.email === "user@pintap.com") userIds.user = id;
  if (acc.email === "merchant@pintap.com") userIds.merchant = id;
  if (acc.email === "admin@pintap.com") userIds.admin = id;
}

await seedDemoMarketplace(userIds);

console.log("\nVerifying auth + RLS (sign in via publishable key)…");
const r1 = await smokeTest(ACCOUNTS[0], 1);
const r2 = await smokeTest(ACCOUNTS[1], 1);
const r3 = await smokeTest(ACCOUNTS[2], 3);

console.log(`\n${r1 && r2 && r3 ? "All checks passed." : "Some checks FAILED — see above."}`);
process.exit(r1 && r2 && r3 ? 0 : 1);
