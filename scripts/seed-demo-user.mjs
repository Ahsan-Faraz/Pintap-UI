/**
 * Seeds demo recommender data for the Gul Sher test account.
 * Run: node scripts/seed-demo-user.mjs
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEMO_EMAIL = "i222637@nu.edu.pk";
const DEMO_PASSWORD = "Jan42007@";
const DEMO_USER_ID = "27ca939a-3dc4-4d05-be15-c21477e33a21";

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

function shortCode() {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += BASE62[bytes[i] % BASE62.length];
  return out;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

const img = (seed) => `https://picsum.photos/seed/${seed}/600/600`;

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

async function ensurePassword(userId) {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`Password update failed: ${error.message}`);
}

async function getTakenShortCodes() {
  const { data } = await admin.from("links").select("short_code");
  return new Set((data ?? []).map((r) => r.short_code));
}

async function pickStoreAndCampaign() {
  const { data: stores } = await admin
    .from("stores")
    .select("id,name,slug,currency")
    .eq("connected", true)
    .limit(20);
  if (!stores?.length) return { store: null, campaign: null, code: null };

  for (const store of stores) {
    const { data: campaigns } = await admin
      .from("campaigns")
      .select("id,name,store_id,status")
      .eq("store_id", store.id)
      .eq("status", "active")
      .limit(5);
    for (const campaign of campaigns ?? []) {
      const { data: codes } = await admin
        .from("campaign_discount_codes")
        .select("id,code,campaign_id,status,claimed_by_link_id")
        .eq("campaign_id", campaign.id)
        .is("claimed_by_link_id", null)
        .eq("status", "available")
        .limit(1);
      if (codes?.[0]) {
        return { store, campaign, code: codes[0] };
      }
    }
  }
  return { store: stores[0], campaign: null, code: null };
}

async function main() {
  console.log(`Seeding demo data for ${DEMO_EMAIL}…`);

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const authUser = list?.users?.find(
    (u) => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase(),
  );
  const userId = authUser?.id ?? DEMO_USER_ID;

  await ensurePassword(userId);
  console.log("✓ Password set and email confirmed");

  const { data: existingLinks } = await admin
    .from("links")
    .select("id,short_code,name")
    .eq("user_id", userId);

  const messyIds = (existingLinks ?? [])
    .filter((l) =>
      /^\d+$|^Ref=|^Kreidler/i.test(l.name ?? "") ||
      l.name === "3065006932",
    )
    .map((l) => l.id);

  if (messyIds.length) {
    await admin
      .from("links")
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .in("id", messyIds);
    console.log(`✓ Archived ${messyIds.length} test scrape links`);
  }

  const { data: activeDemoLinks } = await admin
    .from("links")
    .select("id,name")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("name", [
      "Lumen Glow Serum",
      "Hand-thrown Ceramic Vase",
      "Lambswool Beanie",
      "Nordic Merino Sweater",
      "Indie Press Shop",
    ]);

  if ((activeDemoLinks ?? []).length >= 4) {
    console.log("✓ Demo links already present — skipping link creation");
  } else {
    const taken = await getTakenShortCodes();
    const { store, campaign, code } = await pickStoreAndCampaign();
    const currency = store?.currency ?? "EUR";

    const { data: stores } = await admin
      .from("stores")
      .select("id,name,slug,currency")
      .eq("connected", true)
      .limit(5);
    const storeA = stores?.[0] ?? store;
    const storeB = stores?.[1] ?? storeA;
    const storeC = stores?.[2] ?? storeA;

    const demoSpecs = [
      {
        name: "Lumen Glow Serum",
        brand: "Lumen Skincare",
        type: "product",
        destinationUrl: "https://lumenskincare.com/products/glow-serum",
        sourceHost: "lumenskincare.com",
        imageUrl: img("glow-serum"),
        storeId: store?.id ?? storeA?.id ?? null,
        campaignId: campaign?.id ?? null,
        discountCodeId: null,
        status: "active",
        createdAt: daysAgo(22),
      },
      {
        name: "Hand-thrown Ceramic Vase",
        brand: "Aurora Goods",
        type: "product",
        destinationUrl: "https://auroragoods.com/products/ceramic-vase",
        sourceHost: "auroragoods.com",
        imageUrl: img("ceramic-vase"),
        storeId: storeA?.id ?? null,
        campaignId: null,
        discountCodeId: null,
        status: "active",
        createdAt: daysAgo(15),
      },
      {
        name: "Lambswool Beanie",
        brand: "Nordic Threads",
        type: "product",
        destinationUrl: "https://nordicthreads.com/products/wool-beanie",
        sourceHost: "nordicthreads.com",
        imageUrl: img("wool-beanie"),
        storeId: storeB?.id ?? null,
        campaignId: null,
        discountCodeId: null,
        status: "active",
        createdAt: daysAgo(10),
      },
      {
        name: "Nordic Merino Sweater",
        brand: "Nordic Threads",
        type: "product",
        destinationUrl: "https://nordicthreads.com/products/merino-sweater",
        sourceHost: "nordicthreads.com",
        imageUrl: img("merino-sweater"),
        storeId: storeC?.id ?? null,
        campaignId: null,
        discountCodeId: null,
        status: "active",
        createdAt: daysAgo(8),
      },
      {
        name: "Indie Press Shop",
        brand: null,
        type: "shop",
        destinationUrl: "https://indie-press.com",
        sourceHost: "indie-press.com",
        imageUrl: img("indie-press"),
        storeId: null,
        campaignId: null,
        discountCodeId: null,
        status: "active",
        createdAt: daysAgo(7),
      },
      {
        name: "Winter Craft Market",
        brand: null,
        type: "other",
        destinationUrl: "https://craft-fair.com/events/winter-market",
        sourceHost: "craft-fair.com",
        imageUrl: img("winter-market"),
        storeId: null,
        campaignId: null,
        discountCodeId: null,
        status: "deleted",
        createdAt: daysAgo(30),
      },
    ];

    const insertedLinks = [];

    for (const spec of demoSpecs) {
      let sc = shortCode();
      while (taken.has(sc)) sc = shortCode();
      taken.add(sc);

      const linkId = crypto.randomUUID();
      const row = {
        id: linkId,
        user_id: userId,
        name: spec.name,
        brand: spec.brand,
        type: spec.type,
        destination_url: spec.destinationUrl,
        source_host: spec.sourceHost,
        image_url: spec.imageUrl,
        short_code: sc,
        short_url: `${appUrl}/l/${sc}`,
        is_verified: true,
        status: spec.status,
        store_id: spec.storeId,
        campaign_id: spec.campaignId,
        discount_code_id: spec.discountCodeId,
        created_at: spec.createdAt,
        updated_at: spec.createdAt,
        deleted_at: spec.status === "deleted" ? daysAgo(5) : null,
      };

      const { error } = await admin.from("links").insert(row);
      if (error) {
        console.warn(`  skip link "${spec.name}": ${error.message}`);
        continue;
      }

      if (spec.campaignId && code && spec.name === "Lumen Glow Serum") {
        await admin
          .from("links")
          .update({ discount_code_id: code.id })
          .eq("id", linkId);
        await admin
          .from("campaign_discount_codes")
          .update({ claimed_by_link_id: linkId, status: "claimed" })
          .eq("id", code.id);
      }

      insertedLinks.push({ ...row, linkId });
      console.log(`  + link "${spec.name}" (${sc})`);
    }

    const activeInserted = insertedLinks.filter((l) => l.status === "active");
    if (activeInserted.length >= 2) {
      const primary = activeInserted[0];
      const secondary = activeInserted[1];

      const clickRows = [];
      for (let i = 0; i < 48; i++) {
        clickRows.push({
          id: crypto.randomUUID(),
          link_id: primary.linkId,
          visitor_hash: `demo_v_${i % 30}`,
          user_agent: i % 2 ? "Mozilla/5.0 (iPhone)" : "Mozilla/5.0 (Macintosh)",
          country_code: ["DE", "GB", "US", "PK"][i % 4],
          source: ["instagram", "whatsapp", "direct", "tiktok"][i % 4],
          clicked_at: hoursAgo(Math.floor(i * 4) + (i % 6)),
        });
      }
      for (let i = 0; i < 19; i++) {
        clickRows.push({
          id: crypto.randomUUID(),
          link_id: secondary.linkId,
          visitor_hash: `demo_v2_${i % 12}`,
          user_agent: "Mozilla/5.0 (iPhone)",
          country_code: "DE",
          source: "instagram",
          clicked_at: hoursAgo(i * 8 + 2),
        });
      }
      await admin.from("link_clicks").insert(clickRows);
      console.log(`✓ Added ${clickRows.length} link clicks`);

      if (primary.store_id && primary.campaign_id && code) {
        const orderId = crypto.randomUUID();
        const orderId2 = crypto.randomUUID();
        const attrId = crypto.randomUUID();
        const attrId2 = crypto.randomUUID();

        await admin.from("store_orders").insert([
          {
            id: orderId,
            store_id: primary.store_id,
            external_order_id: `demo-${Date.now()}-1`,
            external_order_number: "#DEMO-1001",
            currency,
            total_amount_minor: 6400,
            processed_at: daysAgo(15),
            created_at: daysAgo(15),
            raw_payload: { discount_codes: [{ code: code.code }] },
          },
          {
            id: orderId2,
            store_id: primary.store_id,
            external_order_id: `demo-${Date.now()}-2`,
            external_order_number: "#DEMO-1002",
            currency,
            total_amount_minor: 4800,
            processed_at: hoursAgo(20),
            created_at: hoursAgo(20),
            raw_payload: { discount_codes: [{ code: code.code }] },
          },
        ]);

        await admin.from("link_order_attributions").insert([
          {
            id: attrId,
            link_id: primary.linkId,
            campaign_id: primary.campaign_id,
            discount_code_id: code.id,
            store_order_id: orderId,
            status: "confirmed",
            order_amount_minor: 6400,
            commission_amount_minor: 1152,
            currency,
            source: "store_import",
            created_at: daysAgo(15),
          },
          {
            id: attrId2,
            link_id: primary.linkId,
            campaign_id: primary.campaign_id,
            discount_code_id: code.id,
            store_order_id: orderId2,
            status: "pending",
            order_amount_minor: 4800,
            commission_amount_minor: 864,
            currency,
            source: "store_import",
            created_at: hoursAgo(20),
          },
        ]);

        await admin.from("commission_ledger_entries").insert([
          {
            id: crypto.randomUUID(),
            user_id: userId,
            store_id: primary.store_id,
            link_id: primary.linkId,
            attribution_id: attrId,
            type: "earned",
            amount_minor: 1152,
            currency,
            status: "available",
            available_at: daysAgo(1),
            created_at: daysAgo(15),
            metadata: {},
          },
          {
            id: crypto.randomUUID(),
            user_id: userId,
            store_id: primary.store_id,
            link_id: primary.linkId,
            attribution_id: attrId2,
            type: "earned",
            amount_minor: 864,
            currency,
            status: "pending",
            available_at: daysFromNow(13),
            created_at: hoursAgo(20),
            metadata: {},
          },
          {
            id: crypto.randomUUID(),
            user_id: userId,
            store_id: primary.store_id,
            link_id: primary.linkId,
            attribution_id: null,
            type: "paid",
            amount_minor: 2400,
            currency,
            status: "paid",
            available_at: daysAgo(30),
            created_at: daysAgo(45),
            metadata: {},
          },
        ]);
        console.log("✓ Added orders, attributions, and commission ledger");
      } else {
        console.log(
          "  (no campaign discount code available — KPIs will show clicks only)",
        );
      }
    }
  }

  console.log("\nDone! Log in with:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
