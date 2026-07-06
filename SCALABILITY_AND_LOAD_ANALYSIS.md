# Pintap — Scalability & Load Analysis (target: 1,000 concurrent users)

Date: 2026-07-02 · Scope: implementation-level review of this Next.js + Supabase build.
Companion docs: `NEXT_WEB_APP_SCOPE_ARCHITECTURE_REQUIREMENTS.md`, `ingest.md` (Cloud Run order-ingest).

## 0. TL;DR — priority order

| # | Item | Impact | Effort | Where |
|---|------|--------|--------|-------|
| 1 | Stop counting clicks by fetching every click row | High | Low | `services/links.ts`, `services/analytics.ts` |
| 2 | Verify JWTs locally in middleware + put roles in the token | High | Medium | `middleware.ts`, `lib/supabase/middleware.ts` |
| 3 | Paginate all admin/merchant list endpoints | High | Medium | `services/orders.ts`, `services/links.ts`, `app/admin/*` |
| 4 | Cache the resolver page + keep click writes off the critical path | High | Low | `app/l/[shortcode]`, `lib/server/resolver.ts` |
| 5 | Collapse per-page query fan-out into RPCs / embedded selects | Medium | Medium | `loadLinkSummaries`, `loadOrderSummaries`, `listPayableUsers` |
| 6 | Timeout + cache the OG-image scrape on link verify | Medium | Low | `lib/server/og-image.ts` |
| 7 | Batch the ingest service's row-by-row upserts | Medium | Low | Cloud Run service (`ingest.md`) |
| 8 | Load-test with k6 before launch; alert on Supabase saturation | — | Low | new `loadtest/` |

Rough traffic model: 1,000 concurrent users ≈ 30–80 req/s sustained app traffic
(dashboards poll nothing; interactions are click-driven), plus resolver traffic that is
bursty (a viral link can produce hundreds of clicks/minute on `/l/[shortcode]` from
*anonymous* visitors — that's the real hot path, not the signed-in dashboards).

---

## 1. What is already in good shape

- **Money is integer minor units** everywhere (`*_amount_minor int`) — no float drift.
- **Idempotent ingestion**: `store_orders (store_id, external_order_id)` and
  `link_order_attributions (link_id, store_order_id, discount_code_id)` unique keys make
  the Cloud Run CSV ingest safely re-runnable.
- **Ledger is trigger-maintained** (`sync_ledger_for_attribution`, migration
  `20260702130000`): balances are computed transactionally in the DB, not in app code, so
  concurrent ingests can't double-write commissions.
- **Atomic money mutations** are SECURITY DEFINER RPCs (`admin_queue_payout`,
  `admin_mark_payout_paid`, `admin_cancel_payout`, `claim_discount_code_for_link` with
  `FOR UPDATE SKIP LOCKED`) — single-transaction, role-checked in the function, no
  read-modify-write races from the client. `admin_queue_payout` locks the user's
  available ledger rows so two admins can't double-queue.
- **Indexes** exist on every FK/hot column (see `pg_indexes`); short-code lookups are
  unique-index point reads. (The advisor's "unused index" INFOs are just the empty DB.)
- **Short-code generation** now inserts + retries on `23505` instead of loading every
  existing code (fixed in `lib/server/links.ts`), and store lookup by domain is an
  indexed equality query instead of a full-table scan (`lib/server/store-provision.ts`).
- **RLS everywhere** with `(select auth.uid())` initplan form (fast per-statement, not
  per-row evaluation).

---

## 2. Hot path #1 — the resolver (`/l/[shortcode]`)

This is the only route anonymous internet traffic hits, so it defines your burst
capacity. Today every hit is a dynamic render doing 5 queries (link, store, campaign,
code, profile) via `getResolverViewServer`.

Recommendations:

1. **Cache the resolver view.** Link content changes rarely (name/image/code). Wrap the
   lookup with Next's `unstable_cache`/`"use cache"` keyed by shortcode with
   `revalidate: 60` (and call `revalidateTag(shortcode)` from link update/delete paths).
   A viral link then costs ~1 DB read per minute instead of per click.
2. **Collapse the 5 queries into one.** Either a single PostgREST embedded select
   (`links?select=*,store:stores(*),campaign:campaigns(*),code:campaign_discount_codes(code),profile:profiles(first_name,avatar_url)`)
   or a small `resolver_view(short_code)` SQL function. One round trip instead of five.
3. **Keep click recording non-blocking.** The client already fire-and-forgets the POST;
   inside the route use `after()`/`waitUntil` so the insert never delays the response.
   If click volume ever spikes past what single-row inserts like, buffer into an
   unlogged staging table or Supabase Queues and flush in batches — not needed at
   1k CCU, good to know the escape hatch.
4. **Serve the resolver page static-shell + client fetch or cached RSC** so CDN absorbs
   repeat hits; the page is mobile-first and tiny, so full-route caching is cheap.

## 3. Hot path #2 — middleware auth on every navigation

`middleware.ts` runs on *every* matched request and does:
`supabase.auth.getUser()` (network call to Supabase Auth) **plus** a `user_roles` query.
That's 2 sequential network round trips per page navigation × every signed-in user.
At 1k CCU this is the single biggest self-inflicted latency/throughput cost, and
Supabase Auth has per-project rate limits you can hit before Postgres sweats.

Recommendations:

1. **Verify the JWT locally.** Enable asymmetric JWT signing keys on the project and use
   `supabase.auth.getClaims()` (verifies signature against the cached JWKS — no network)
   instead of `getUser()` for the middleware gate. Keep `getUser()` only where you must
   revalidate (e.g. change-password).
2. **Embed roles in the token.** Add a [Custom Access Token Auth Hook] that copies
   `user_roles` into a `roles` claim on sign-in/refresh. Middleware then reads roles from
   the verified claims — zero DB queries per request. (Role changes propagate on next
   token refresh, ≤1h; acceptable for this product, and you can force-refresh on grant.)
3. **Narrow the matcher.** `/l/*`, `/api/resolver/*` and other public routes don't need
   session refresh at all — exclude them so anonymous resolver bursts never touch Auth.

## 4. Query fan-out and over-fetching in the service layer

Patterns that are O(fine) today and O(problem) with real data:

| Location | Problem | Fix |
|---|---|---|
| `loadLinkSummaries` (`services/links.ts`) | Fetches **all click rows** (`select link_id`) for the user's links and counts in JS. 50 links × 2k clicks = 100k rows to the browser to render "clicks: 2000". Same pattern in `analytics.ts` (recommender/merchant KPIs). | Use `count: "exact", head: true` per link — or better, one grouped RPC `link_click_counts(link_ids uuid[])` (mirror of `campaign_code_counts`), or maintain a `links.click_count` counter column bumped by the click insert. |
| `loadOrderSummaries` (`services/orders.ts`) | 6 sequential-ish queries per page load (attrs → links, codes, orders → stores, profiles, roles). | One embedded select from `link_order_attributions` with nested `links(name, short_code, user_id, profiles(first_name,last_name))` etc., or a `order_summaries` SQL view. |
| `listAllOrders`, `listAllLinks`, `listUnmatchedOrders`, `activity` | Unbounded `select *` of whole tables into the browser; DataTable paginates client-side. | Server-side pagination: `.range(from, to)` + total count, filter/search as query params. Unmatched orders should be a SQL anti-join (`not exists`) with `limit`, not "fetch everything and diff two arrays in JS". |
| `listPayableUsers` (`services/payouts.ts`) | Reads **every ledger row in the system** and aggregates in JS. | `select user_id, sum(...) filter (...) group by user_id having ...` as an RPC/view; return only payable users. |
| `getAdminKpis` | 8 parallel queries — OK — but two of them (`ledger`, `payout_batches`) fetch rows to sum in JS. | Sum in SQL (`.select("amount_minor.sum()")` or an RPC `admin_kpis()` returning one row). |
| `stores` summaries | `summarizeStores` fetches all campaigns for all stores to compute per-store bests. | Acceptable while stores ≈ dozens; move to a view (`store_summaries`) when the Discover list grows. |

General rule to adopt: **anything that renders a number should ship a number from
Postgres, not the rows behind it.**

## 5. External I/O on user-facing paths

- **`fetchOgImage` in `verifyLinkUrlForUser`** scrapes an arbitrary merchant page during
  link verification. Slow/unresponsive shops make *your* verify endpoint slow, and 1k
  users creating links concurrently = uncontrolled outbound fan-out. Add: 3–5s
  `AbortSignal.timeout`, response size cap, and a cache table (`og_image_cache(url_hash,
  image_url, fetched_at)`) with ~7-day TTL. Consider deferring the scrape post-create
  (link works immediately, image fills in async).
- **Cloud Run ingest** (`ingest.md`): `for (const r of rows) await ingestOne(r)` is one
  round trip *per CSV row* × 2 (order upsert + attribution upsert). A 10k-row export =
  ~20k sequential requests. Batch it: chunk `upsert([...500 rows], { onConflict })` for
  `store_orders`, map returned ids, then batch-upsert attributions. The DB trigger keeps
  the ledger correct either way. Also add a `p-limit`-style concurrency cap (e.g. 4
  chunks in flight) instead of full serialization.

## 6. Database / Supabase platform

- **Compute tier**: the free/small tier caps Postgres connections and IOPS. For 1k CCU
  move to at least a Small/Medium compute; watch the dashboard's connection and
  cache-hit metrics under load. All app traffic goes through PostgREST + Supavisor
  (pooled), so client connection count is not the issue — CPU on RLS-heavy selects is.
- **RLS advisor WARN**: `campaign_discount_codes` now has two permissive SELECT policies
  (member/admin + own-claimed-code). Both are cheap subqueries; accepted trade-off. If it
  shows up in `pg_stat_statements` later, merge into one policy with `OR`.
- **`pg_stat_statements`** is your friend: after the first load test, sort by
  `total_exec_time` and fix the top 5 — don't guess.
- **Activity table growth**: `activity_events` is append-only and unbounded. Add a
  monthly cron (Supabase Cron) to archive/delete rows older than N months, and always
  query it with `limit` (the service already caps at 200 ✓).
- **`link_clicks` growth**: same — it's the fastest-growing table. Consider a
  `pg_cron` rollup into `link_click_daily(link_id, day, count)` once row counts pass a
  few million; dashboards then read the rollup.
- **Backups/PITR** once real money data flows — ledger + payouts are the tables you
  cannot lose.

## 7. Next.js app layer

- **Client-side data waterfalls**: pages like merchant orders do
  `useMerchantStore()` → wait → `listOrdersForStore()` (2 sequential round trips after
  hydration). Read-heavy admin/merchant pages are good candidates for **React Server
  Components**: fetch on the server (one region-local hop to Supabase), stream HTML,
  drop the client waterfall. Start with `/admin/*` tables — they're also the
  pagination offenders.
- **Route handlers**: `/api/links/verify` and `/api/links` are Node runtime — fine.
  `/api/resolver/[shortcode]` GET should send `Cache-Control: public, s-maxage=60,
  stale-while-revalidate=300` once resolver caching (§2) lands.
- **Bundle**: mock seed (`lib/mock/*`) is imported by every service module and ships to
  the browser even in live mode. Gate it behind `MOCK_DATA_ENABLED` dynamic import (or
  accept the ~tens of KB — measure with `next build --profile` / bundle analyzer).
- **Images**: store logos / link images are hot-linked (`picsum`, merchant OG images).
  Use `next/image` with `remotePatterns` for resizing+caching, or proxy through Supabase
  Storage `link-images` (bucket already planned in §5.2 of the architecture doc).
- **Deployment**: one Vercel project — enable Fluid/auto-scaling defaults, set the
  function region to the Supabase region (`ap-southeast-1` for the current test project;
  `eu-central-1` for prod `pintap`) so every query is a same-region hop. **Region
  mismatch is a silent 100–200ms tax on every request.**

## 8. Correctness under concurrency (already handled vs. watchlist)

Handled:
- Code claiming: `FOR UPDATE SKIP LOCKED` — two users grabbing the last code can't
  double-claim.
- Payout queue/mark-paid/cancel: row-locked, status-guarded transitions.
- Ledger: one entry per attribution, paid/queued entries are never mutated (reversals
  after payout produce compensating entries).
- Store auto-create race: unique violation → re-fetch (23505 handler).

Watchlist:
- `claim_discount_code_for_link` releases the old code and claims a new one in one
  transaction ✓, but the **link create + claim** in `createLinkForUser` spans two
  transactions (insert link → RPC). On claim failure the link is rolled back by
  compensating delete ✓ — if you later add more steps, fold the whole create into one
  RPC.
- Multi-currency: `admin_queue_payout` takes `min(currency)` — fine while everything is
  EUR; if multi-currency ever lands, group entries per currency into separate batches.
- The ingest API's `x-store-id` scoping is optional; identical codes in two stores'
  campaigns can mis-attribute if the header is omitted. Make the header mandatory on
  the Cloud Run service once more than one store sends CSVs.

## 9. Load-testing & observability plan

1. **k6 scenarios** (checked into `loadtest/`):
   - `resolver_burst`: 500 VUs hitting `/l/<code>` + click POST (anonymous) — expect
     p95 < 300ms, 0 5xx.
   - `dashboard_browse`: 300 VUs signed-in (pre-seeded session cookies), cycling
     `/app`, `/app/links`, `/app/orders`, `/app/payouts` — expect p95 < 800ms.
   - `create_link`: 50 VUs doing verify→create→claim — watch code-claim contention and
     OG-fetch timeouts.
   - `ingest`: POST a 5k-row CSV while `dashboard_browse` runs — dashboards must not
     degrade (ingest is service-role, bypasses PostgREST caches).
2. **Seed script** to generate realistic volume (10k users, 100k links, 1M clicks,
   100k orders) — numbers small enough for Postgres, big enough to expose the §4
   over-fetching immediately.
3. **Observe**: Supabase dashboard (CPU, connections, cache hit, slowest queries via
   `pg_stat_statements`), Vercel analytics (function duration, cold starts), and a
   simple uptime check on `/api/health` (already exists ✓).
4. **Alert thresholds**: DB CPU > 70% sustained, auth error rate > 1%, resolver p95 >
   500ms.

## 10. Suggested implementation order

1. Middleware: local JWT verification + roles-in-claims (biggest global win, no UX change).
2. Click counts via aggregate/RPC (removes the worst over-fetch; touches 3 functions).
3. Resolver caching + single-query view + `after()` clicks.
4. Server-side pagination for admin orders/links/activity + payable-users RPC.
5. OG-image timeout/cache; ingest batching (coordinate the Cloud Run redeploy).
6. Seed + k6 suite; fix whatever `pg_stat_statements` surfaces.
7. RSC migration of admin/merchant tables (opportunistic, page by page).

With items 1–4 done, this stack (one Next.js app + Supabase Small compute) comfortably
covers 1,000 concurrent users; the remaining items are headroom and hygiene rather than
prerequisites.
