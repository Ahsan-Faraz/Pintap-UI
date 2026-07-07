/**
 * Seeds Aurora Goods merchant demo for UI testing.
 * Run: npm run seed:merchant-demo
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MERCHANT_EMAIL = "ahsanfaraz8535@gmail.com";
const MERCHANT_PASSWORD = "ahsan123";
const STORE_SLUG = "aurora-goods-ahsan";
const STORE_NAME = "Aurora Goods";

const BASE62 =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function loadEnv(file) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function shortCode(taken) {
  let sc;
  do {
    const bytes = crypto.randomBytes(8);
    sc = "";
    for (let i = 0; i < 8; i++) sc += BASE62[bytes[i] % BASE62.length];
  } while (taken.has(sc));
  taken.add(sc);
  return sc;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;
const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RECOMMENDERS = [
  { email: "demo-amara@pintap.local", first: "Amara", last: "Okafor" },
  { email: "demo-jordan@pintap.local", first: "Jordan", last: "Pintap" },
  { email: "demo-lena@pintap.local", first: "Lena", last: "Petrov" },
];

const PRODUCTS = [
  "Aurora Linen Throw",
  "Wool Beanie Set",
  "Ceramic Vase Duo",
  "Cedar Candle",
  "Linen Napkin Set",
  "Merino Sweater",
  "Stoneware Mug Set",
  "Handwoven Wool Rug",
];

async function findUserByEmail(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

async function ensureAuthUser(email, password, firstName, lastName) {
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (error) throw new Error(`Create user ${email}: ${error.message}`);
    user = data.user;
    console.log(`  + auth user ${email}`);
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
  }
  await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      accepted_terms: true,
    })
    .eq("id", user.id);
  return user.id;
}

async function ensureRole(userId, role) {
  await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
}

async function main() {
  console.log(`Seeding merchant demo for ${MERCHANT_EMAIL}…`);

  const merchantId = await ensureAuthUser(
    MERCHANT_EMAIL,
    MERCHANT_PASSWORD,
    "Ahsan",
    "Faraz",
  );
  await ensureRole(merchantId, "user");
  await ensureRole(merchantId, "merchant");
  console.log("✓ Merchant account ready");

  let storeId;
  const { data: existingStore } = await admin
    .from("stores")
    .select("id")
    .eq("slug", STORE_SLUG)
    .maybeSingle();

  if (existingStore) {
    storeId = existingStore.id;
    console.log("✓ Store already exists");
  } else {
    storeId = crypto.randomUUID();
    const { error } = await admin.from("stores").insert({
      id: storeId,
      name: STORE_NAME,
      slug: STORE_SLUG,
      merchant_domain: "auroragoods.com",
      primary_domain: "auroragoods.com",
      logo_url: "https://picsum.photos/seed/aurora-logo/200/200",
      country_code: "DE",
      currency: "EUR",
      category: "Home & Living",
      connected: true,
      connected_at: daysAgo(90),
      status: "active",
    });
    if (error) throw new Error(`Store insert: ${error.message}`);
    console.log("  + store Aurora Goods");
  }

  await admin.from("store_members").upsert(
    {
      id: crypto.randomUUID(),
      store_id: storeId,
      user_id: merchantId,
      role: "owner",
    },
    { onConflict: "store_id,user_id", ignoreDuplicates: true },
  );

  let campaignId;
  const { data: existingCampaign } = await admin
    .from("campaigns")
    .select("id")
    .eq("store_id", storeId)
    .eq("name", "Spring Refresh")
    .maybeSingle();

  if (existingCampaign) {
    campaignId = existingCampaign.id;
    console.log("✓ Campaign Spring Refresh exists");
  } else {
    campaignId = crypto.randomUUID();
    const { error } = await admin.from("campaigns").insert({
      id: campaignId,
      store_id: storeId,
      name: "Spring Refresh",
      terms: "20% off sitewide. One use per customer.",
      discount_percent: 20,
      commission_percent: 12,
      start_at: daysAgo(60),
      end_at: daysAgo(-90),
      is_active: true,
      status: "active",
      created_by: merchantId,
    });
    if (error) throw new Error(`Campaign insert: ${error.message}`);
    console.log("  + campaign Spring Refresh");
  }

  const { count: codeCount } = await admin
    .from("campaign_discount_codes")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if ((codeCount ?? 0) < 50) {
    const codes = Array.from({ length: 50 }, (_, i) => ({
      id: crypto.randomUUID(),
      campaign_id: campaignId,
      code: `AURSPR-${String(i + 1).padStart(2, "0")}`,
      status: i < 30 ? "available" : "claimed",
    }));
    await admin.from("campaign_discount_codes").upsert(codes, {
      onConflict: "campaign_id,code",
      ignoreDuplicates: true,
    });
    console.log("  + discount codes");
  }

  const recommenderIds = [];
  for (const r of RECOMMENDERS) {
    const id = await ensureAuthUser(
      r.email,
      "Pintap2026!",
      r.first,
      r.last,
    );
    await ensureRole(id, "user");
    recommenderIds.push({ id, ...r });
  }

  const { data: takenCodes } = await admin.from("links").select("short_code");
  const taken = new Set((takenCodes ?? []).map((r) => r.short_code));

  const linkByUser = new Map();
  for (const r of recommenderIds) {
    const { data: existingLink } = await admin
      .from("links")
      .select("id, discount_code_id")
      .eq("user_id", r.id)
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (existingLink) {
      linkByUser.set(r.id, existingLink);
      continue;
    }

    const { data: freeCode } = await admin
      .from("campaign_discount_codes")
      .select("id, code")
      .eq("campaign_id", campaignId)
      .eq("status", "available")
      .is("claimed_by_link_id", null)
      .limit(1)
      .maybeSingle();

    if (!freeCode) break;

    const sc = shortCode(taken);
    const linkId = crypto.randomUUID();
    await admin.from("links").insert({
      id: linkId,
      user_id: r.id,
      store_id: storeId,
      campaign_id: campaignId,
      discount_code_id: freeCode.id,
      type: "product",
      destination_url: "https://auroragoods.com/products/demo",
      source_host: "auroragoods.com",
      name: PRODUCTS[recommenderIds.indexOf(r) % PRODUCTS.length],
      brand: STORE_NAME,
      image_url: `https://picsum.photos/seed/${sc}/600/600`,
      short_code: sc,
      short_url: `${appUrl}/l/${sc}`,
      is_verified: true,
      status: "active",
      created_at: daysAgo(20),
    });
    await admin
      .from("campaign_discount_codes")
      .update({ claimed_by_link_id: linkId, status: "claimed" })
      .eq("id", freeCode.id);
    linkByUser.set(r.id, { id: linkId, discount_code_id: freeCode.id });
  }
  console.log("✓ Recommender links ready");

  const { count: attrCount } = await admin
    .from("link_order_attributions")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if ((attrCount ?? 0) >= 100) {
    console.log("✓ Orders already seeded");
  } else {
    const statuses = ["confirmed", "confirmed", "confirmed", "pending", "returned"];
    let created = 0;
    for (let i = 0; i < 128; i++) {
      const r = recommenderIds[i % recommenderIds.length];
      const link = linkByUser.get(r.id);
      if (!link) continue;

      const { data: codeRow } = await admin
        .from("campaign_discount_codes")
        .select("id, code")
        .eq("id", link.discount_code_id)
        .maybeSingle();
      if (!codeRow) continue;

      const orderAmount = [14800, 7900, 12400, 4200, 5600, 8900, 9900][i % 7];
      const commission = Math.round(orderAmount * 0.12);
      const status = statuses[i % statuses.length];
      const orderId = crypto.randomUUID();
      const attrId = crypto.randomUUID();
      const processedAt = i < 5 ? hoursAgo(i * 3) : daysAgo(i % 28);

      await admin.from("store_orders").insert({
        id: orderId,
        store_id: storeId,
        external_order_id: `ag-demo-${i + 1000}`,
        external_order_number: `#AG-${1042 - i}`,
        currency: "EUR",
        total_amount_minor: orderAmount,
        processed_at: processedAt,
        created_at: processedAt,
        raw_payload: { discount_codes: [{ code: codeRow.code }] },
      });

      await admin.from("link_order_attributions").insert({
        id: attrId,
        link_id: link.id,
        campaign_id: campaignId,
        discount_code_id: codeRow.id,
        store_order_id: orderId,
        status,
        order_amount_minor: orderAmount,
        commission_amount_minor: commission,
        currency: "EUR",
        source: "store_import",
        created_at: processedAt,
      });

      if (status === "confirmed") {
        await admin.from("commission_ledger_entries").insert({
          id: crypto.randomUUID(),
          user_id: r.id,
          store_id: storeId,
          link_id: link.id,
          attribution_id: attrId,
          type: "earned",
          amount_minor: commission,
          currency: "EUR",
          status: i % 3 === 0 ? "pending" : "available",
          available_at: daysAgo(-7),
          created_at: processedAt,
          metadata: {},
        });
      }
      created++;
    }
    console.log(`✓ Added ${created} attributed orders`);
  }

  // Autumn Collection draft for the new-campaign UI preview path
  const { data: autumn } = await admin
    .from("campaigns")
    .select("id")
    .eq("store_id", storeId)
    .eq("name", "Autumn Collection")
    .maybeSingle();
  if (!autumn) {
    const autumnId = crypto.randomUUID();
    await admin.from("campaigns").insert({
      id: autumnId,
      store_id: storeId,
      name: "Autumn Collection",
      terms: "25% off the Autumn Collection.",
      discount_percent: 25,
      commission_percent: 14,
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T00:00:00.000Z",
      is_active: false,
      status: "scheduled",
      created_by: merchantId,
    });
    const autumnCodes = [
      "AUTUMN-A1K9",
      "AUTUMN-B2L8",
      "AUTUMN-C3M7",
      "AUTUMN-D4N6",
      "AUTUMN-E5P5",
    ].map((code) => ({
      id: crypto.randomUUID(),
      campaign_id: autumnId,
      code,
      status: "available",
    }));
    await admin.from("campaign_discount_codes").insert(autumnCodes);
    console.log("  + Autumn Collection campaign");
  }

  console.log("\nDone! Merchant login:");
  console.log(`  Email:    ${MERCHANT_EMAIL}`);
  console.log(`  Password: ${MERCHANT_PASSWORD}`);
  console.log(`  Portal:   ${appUrl}/merchant/orders`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
