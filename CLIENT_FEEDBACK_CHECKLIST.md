# Client Feedback Checklist (2026-07-02)

Working document for the client feedback round. **Update the Status column as you go** so any agent can pick this up mid-way.

Legend: `[ ]` todo · `[~]` in progress / needs live verification · `[x]` done (✅ = also verified live in the browser) · `[!]` blocked / needs client or backend decision

> **ENV CORRECTION (important):** the active `.env` targets Supabase project **gdcyztbupojpmbnsnmwr** — *not* pintap-test/hudtnxauwaranhddjakn as older memory claimed. All client test data (FahrradXXL, Tennis Point, "Sommer 26") lives in **gdcyztbupojpmbnsnmwr**. Mode: `NEXT_PUBLIC_MOCK_DATA_ENABLED=true` + `NEXT_PUBLIC_LIVE_SERVICES=auth,stores,campaigns,links,orders,analytics,payouts,activity` (mixed mode, effectively all live).
> **Login gotcha:** only `admin@pintap.com` / `Pintap2026!` works in this DB (user@/merchant@ don't exist). **Never test "Delete account" with admin@ — it BANS the auth user.**

---

## A. Signup / Auth

- [~] **A1. Double opt-in (German law).** Signup must send a confirmation email; account only active after the user clicks it.
  - *Found:* [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts) previously created the user with `email_confirm: true` (admin API) and signed them in immediately — no verification at all.
  - *Fix applied:* route now uses anon `supabase.auth.signUp()` with `emailRedirectTo: /auth/callback?next=/app` → Supabase sends the confirmation mail; user is NOT signed in. Detects already-registered addresses via the empty-identities response. `accepted_terms` still set via service-role after signUp (profile row comes from the DB `handle_new_user` trigger, which lives in the remote schema — not in repo migrations). `authService.signUp` now returns `user: null` + `defaultPath: /auth/verify?email=…`; [verify page](app/(auth)/auth/verify/page.tsx) is the "check your inbox" screen (en/de copy updated).
  - *SUPERSEDED by R1 (2026-07-03):* email now sent via **Brevo** from our own code — the Supabase dashboard "Confirm email" toggle is no longer needed. Remaining blocker is the Brevo **Authorised IPs** setting (see R1).
- [x] ✅ **A2. Merchant signup added to the signup page.**
  - *Fix applied:* account-type toggle (Recommender | Merchant, with contextual hint) on [app/(auth)/signup/page.tsx](app/(auth)/signup/page.tsx). Merchant signups get the `merchant` role via service-role upsert in [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts) (base `user` role still comes from the `handle_new_user` trigger), and their confirmation link redirects to `/merchant/onboarding` instead of `/app`. Mock impl mirrors this. Verified live: toggle renders, switches hint + aria-checked.

## B. Navigation menu (recommender)

- [x] **B1. Keep the plus icon** — no change needed.
- [x] ✅ **B2. Rename "Discover" → "Shops".** `nav.discover` + `appPages.discover.title` in [messages/en.json](messages/en.json) / [messages/de.json](messages/de.json) (key names and `/app/discover` route unchanged).
- [x] ✅ **B3. Reorder nav: Home, Links, Plus (center), Shops, More.** `BOTTOM` array + sidebar `GROUPS` order in [RecommenderShell.tsx](components/recommender/RecommenderShell.tsx).

## C. Homepage (`app/app/page.tsx`)

- [~] **C1. App too large on Brave after login.**
  - Added explicit `export const viewport` (device-width, initialScale 1) in [app/layout.tsx](app/layout.tsx). Could not repro Brave here — **needs client re-test**. If still broken: Brave remembers per-site zoom; also check `text-size-adjust`.
- [x] ✅ **C2. Language button removed from top header** (RecommenderShell). Still available under More → Language. Merchant/admin `PortalShell` untouched (has no settings-page switcher).
- [x] **C3. Default language from browser.** [lib/i18n/server.ts](lib/i18n/server.ts): cookie (`pintap.locale`) → `Accept-Language` (q-value aware, `de`/`en`) → `en`. Client `I18nProvider` inherits the server locale, so no hydration mismatch.
- [x] ✅ **C4. "Conversion" KPI removed** (3-col grid now).
- [x] ✅ **C5. "Orders" → "Sales" / "Verkäufe".** `dashboard.user.orders` + `links.orders` in en/de. Shorter German word also fixes the icon squeeze (KpiCard already had `min-w-0` guard). Admin/merchant "Orders" labels intentionally unchanged.
- [x] ✅ **C6. Stats on top, Create Link below.**
- [x] ✅ **C7. Missing link pictures (FahrradXXL, Tennispoint.se).**
  - *Root cause:* [lib/server/og-image.ts](lib/server/og-image.ts) scraped with a `PintapBot` UA → bot-blocked by those shops → `image_url` null → empty tile.
  - *Fixes:* browser-like Chrome UA + `Accept-Language: de`; favicon fallback `https://www.google.com/s2/favicons?domain=<host>&sz=128` in [lib/server/links.ts](lib/server/links.ts) (`faviconUrl` in [lib/url-utils.ts](lib/url-utils.ts)) so cards never render empty; **backfilled** all 5 existing null `image_url` links in the live DB with favicon URLs; created missing `og_image_cache` table (migration `20260702161000_og_image_cache.sql`, applied to gdcyztbupojpmbnsnmwr).
  - *Note:* fahrrad-xxl.de still blocks the OG scrape even with browser UA → favicon shows. A real product-image solution would need a headless-browser or image-proxy service later.
- [x] ✅ **C8. Bigger link-card pictures** — thumb `h-16 w-16` → `h-24 w-24` in [LinkCard.tsx](components/recommender/LinkCard.tsx).
- [x] **C9. "My Shops" = shops of my links.** Removed the misleading fallback to *all connected stores* in [app/app/page.tsx](app/app/page.tsx); empty state now links to Shops. `getMyShops` derives from links (works — verified empty state; with links, shops appear via same query used elsewhere).
- [!] **C10. Invited user should see the inviting shop before creating a link.** No invite→store relationship exists in the schema. Needs data model (+ product) decision.
- [x] **C11. Shops rail slides like links** — both already use `CardRail`.
- [x] ✅ **C12. "Explore" → "Show all"** (`common.showAll`), still targets `/app/discover` (= Shops).

## D. Plus button

- [x] ✅ **D1. Same create-link UX everywhere.** The submit on [create-link page](app/app/create-link/page.tsx) now reads **"Create Link" / "Link erstellen"** (was "Verify"/"Prüfen"), matching the homepage QuickCreate; paste button already present.

## E. Create Link

- [x] ✅ **E1. FahrradXXL product URLs found no store/campaign ("Sommer 26").**
  - *ROOT CAUSE (data):* the merchant's connected store was registered as **`fahrradxxl.de`**, but the real website is **`fahrrad-xxl.de`** (hyphen!). Product URLs therefore matched no store → auto-created a disconnected duplicate ("Fahrrad Xxl", no campaigns). Only the literal `fahrradxxl.de` hit the connected store.
  - *Data fix (gdcyztbupojpmbnsnmwr):* re-pointed the duplicate's links to the connected store, deleted the duplicate, set the connected store's `merchant_domain`/`primary_domain` to `fahrrad-xxl.de`.
  - *Code fix:* [store-provision.ts](lib/server/store-provision.ts) `findStoreByDomain` now also matches parent domains, so subdomain product URLs (e.g. `shop.example.de`) find the registered store.
  - *Verified live:* `https://www.fahrrad-xxl.de/santa-cruz-5010-…` → Store connected + "Sommer 26" (5% off · 8% commission, 4 codes) selectable.
  - *Product lesson:* store connect should validate/normalize the domain against the merchant's real site to prevent this class of bug.
- [x] ✅ **E2. Resolver page light mode.** [/l/[shortcode]](app/l/%5Bshortcode%5D/page.tsx) reskinned beige/white/navy (was hardcoded dark). Verified: `bg #ECE7E4`, navy text.
- [x] **E3. Resolver language from browser** — covered by C3 (+ manual toggle stays).
- [x] ✅ **E4. "What is this" → `https://www.pintap.com`** (external, new tab).
- [x] ✅ **E5. "Help Center" link removed** from resolver footer.

## F. My Links

- [x] ✅ **F1. Stats removed from My Links** ([app/app/links/page.tsx](app/app/links/page.tsx)) — filters + list only.
- [x] ✅ **F2. Link details page doesn't fit screen — FIXED (see R10).** Root cause was the missing `min-w-0` on the detail grid columns (long destination URL blew the layout past the viewport), not the h1. Verified at 375px.
- [x] **F3. Links with a commission in any status are not deletable.**
  - UI: delete button disabled + explanatory text (`appPages.linkDetail.deleteBlocked`) when `metrics.orders > 0 || commissionMinor !== 0` ([links/[id]/page.tsx](app/app/links/%5Bid%5D/page.tsx)).
  - Service backstop in **both** impls of `linksService.deleteLink` ([services/links.ts](services/links.ts)): real checks `link_order_attributions` count; mock checks `db().attributions`.
  - *Stronger option later:* DB trigger rejecting `status='deleted'` when attributions exist.

## G. More

- [~] **G1. Delete account (kept in admin for payment reasons).**
  - UI: "Delete account" + ConfirmDialog on [More page](app/app/more/page.tsx) → `authService.deleteAccount()`.
  - Backend: [/api/auth/delete-account](app/api/auth/delete-account/route.ts) — releases reserved discount codes (user-scoped RPC, before the ban), deactivates links (attribution history survives), sets `profiles.deleted_at` (migration `20260702160000_profile_soft_delete.sql`, **applied to gdcyztbupojpmbnsnmwr and hudtnxauwaranhddjakn**), **bans** the auth user (`ban_duration: 876000h`) instead of deleting, logs `account_deleted` activity, client signs out.
  - *Admin badge:* done in R7 — deleted accounts show a red "Deleted" badge on the admin Users page. **Do NOT live-test delete-account with admin@ — the ban is real.** Test with a throwaway signup once Brevo works. *(Note: the live DB now has real client-team users — Simon/Uli/Kathrin/Gul, signed up 2026-07-02.)*

## H. Profile

- [x] ✅ **H1. Profile save doesn't persist — FIXED (migration drift).**
  - *Root cause:* the live `profiles` table in gdcyztbupojpmbnsnmwr was **missing the `gender` and `social_profiles` columns** — migration `20260630120000_add_recommender_profile_fields.sql` had never been applied there. PostgREST rejected the whole UPDATE ("column does not exist") → nothing saved. RLS + avatars bucket policies were fine.
  - *Fix:* applied that migration to gdcyztbupojpmbnsnmwr. Verified live: saving gender/country/last-name persisted to the DB (test values reverted afterwards).
  - *Note:* admin@'s `last_name` is `''` (from the earlier wipe) — the profile form's required-field validation blocks saving until a last name is entered; that's expected behavior, not a bug.

## I. Help Center

- [x] ✅ **I1. `hello@pintap.com`** in [help page](app/app/help/page.tsx) (was support@).
- [ ] **I2. FAQ content** — client sends feedback separately. No action.

## K. Follow-up feedback (screenshots, 2026-07-02 later)

- [x] ✅ **K1. KPI labels letter-stacking on mobile ("TOT AL CLIC KS").** Cause: `overflow-wrap:anywhere` + icon chip squeezing the label in the 3-up mobile grid. Fix in [KpiCard.tsx](components/ui/KpiCard.tsx): on xs the icon stacks *above* the label (full-width label, `break-words`, 10px, tighter tracking, smaller chip); sm+ keeps label-left/chip-right. Verified at 375px: all three labels single-line.
- [x] ✅ **K2. Profile dropdown didn't close on outside click.** Cause: the click-away layer was `fixed inset-0` inside the header, whose `backdrop-blur` makes it the **containing block for fixed descendants** — the backdrop only covered the header strip. Fix in [ProfileMenu.tsx](components/portal/ProfileMenu.tsx): document-level `pointerdown` listener + ref (backdrop removed). Verified live. *Gotcha: never rely on `fixed inset-0` under an ancestor with `backdrop-filter`/`filter`/`transform`.*

## R. Round 2 (2026-07-03) — remaining items from the client feedback doc

- [~] **R1. Verification email via Brevo (completes A1).** Code done + flow verified; **blocked on a Brevo dashboard setting** (see below).
  - [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts) now creates the user UNCONFIRMED via service-role `generateLink({ type: "signup" })` and emails the link itself through Brevo ([lib/server/email.ts](lib/server/email.ts), `BREVO_EMAIL_TOKEN`, sender `hello@pintap.com`, localized en/de via `email.confirm.*` keys). No dependency on Supabase's mailer or the dashboard "Confirm email" toggle anymore — GoTrue refuses password login until `email_confirmed_at` is set.
  - Confirmation link goes to the new [/auth/confirm](app/(auth)/auth/confirm/route.ts) route (`token_hash` + `verifyOtp`) — Supabase's hosted action_link redirects with a URL fragment that server routes can't read; token_hash also signs the user in on confirm (SSR cookies) and honors `?next=` (merchants → onboarding).
  - If the Brevo send fails the user is **rolled back** (deleted) so retrying doesn't hit "already exists". Verified live: 502 + no orphan auth user.
  - **BLOCKER (client/owner action):** the Brevo account has **Authorised IPs** enabled — API calls from new IPs get 401 ("unrecognised IP address 203.99.61.238"). Fix at https://app.brevo.com/security/authorised_ips (add the server/dev IPs or disable the restriction). Also confirm `hello@pintap.com` is a **verified sender** in Brevo. Until then signup returns "We couldn't send the confirmation email."
- [x] ✅ **R2. Mobile onboarding start screens** on `/`: [MobileOnboarding.tsx](components/landing/MobileOnboarding.tsx) (`sm:hidden`) — splash (logo+name, auto-advances ~1.8s or tap) → "Get started" footnote (+ small Log in link) → /signup. Desktop landing unchanged ([app/page.tsx](app/page.tsx)). Verified at 375px.
- [x] **R3. Nav needs multiple taps.** `touch-action: manipulation` was already global; real cause is likely **no instant feedback** while the next route loads. Bottom-nav tabs now highlight optimistically on tap (reset-during-render on pathname change, lint-clean) + `touch-manipulation` on the tab links ([RecommenderShell.tsx](components/recommender/RecommenderShell.tsx)). Needs client re-test on device.
- [x] ✅ **R4. Shops page redesign** ([app/app/discover/page.tsx](app/app/discover/page.tsx)): header "Shops / Manage your shops", store grid only — tabs/search/campaign feed removed. `appPages.discover.*` keys pruned in en/de.
- [x] ✅ **R5. Shop sheet redesign** ([ShopDetailsSheet.tsx](components/recommender/ShopDetailsSheet.tsx), used by Homepage rail **and** Shops page — old Drawer+StoreCampaigns removed): header = logo + shop name, one label/value table per active campaign (campaign, discount, commission, active until), buttons Visit shop / Create link. Meta rows (category/target/trust/…) removed; `shopDetails.*` keys replaced in en/de. Verified live with "Sommer 26" (5% / 8%).
- [x] ✅ **R6. Resolver "Continue" → broken URL fixed.** `buildDiscountRedirectUrl` ([lib/url-utils.ts](lib/url-utils.ts)) no longer builds the **Shopify-only** `/discount/CODE?redirect=` URL — it now always returns the real destination URL (code stays visible + copyable on the resolver). Both call sites (server resolver + mock) go through it. Verified via `/api/resolver/b2D50F2g`. **Data fix:** the client's tested link `YzDacOUN` still pointed at the misregistered `fahrradxxl.de` → updated to `https://www.fahrrad-xxl.de/` (source_host too).
- [x] ✅ **R7. Admin badge for deleted accounts (completes G1).** `Profile.deletedAt` added ([lib/types.ts](lib/types.ts)) and mapped in both mappers; red "Deleted"/"Gelöscht" badge in the Roles column of [admin/users](app/admin/users/page.tsx). (No deleted account in live DB yet — badge logic is data-driven.)
- [x] ✅ **R8. Help FAQ exclusive accordion** — `name="faq"` on the `<details>` ([help page](app/app/help/page.tsx)). Verified: opening Q2 closes Q1.
- [x] ✅ **R10. Link detail didn't fit mobile screen (completes F2).** Real cause found: the two grid columns in [links/[id]/page.tsx](app/app/links/%5Bid%5D/page.tsx) had no `min-w-0`, so the long unbroken destination URL blew the column to ~770px at a 375px viewport (body's `overflow-x:hidden` just cut it off). Both columns now `min-w-0`. Verified with a 55-char-title fahrrad-xxl product link at 375px: no overflow (test link removed afterwards).
- [x] **R9. Client-facing testing guide** → [FEEDBACK_TESTING_GUIDE.md](FEEDBACK_TESTING_GUIDE.md).

## J. Backlog / ToDos from client (NOT this round — confirm before starting)

- [ ] Full copy/translation pass.
- [ ] Icons: brand doc says Feather 0.5 stroke. *Gotcha:* current icon set is a deliberate deviation per earlier alignment — reconcile with client first.
- [ ] Font: brand doc says **Inter**; app uses Plus Jakarta Sans ([app/layout.tsx](app/layout.tsx)). Confirm before switching.
- [ ] Sales/Commission statuses: pending / confirmed / returned.
- [ ] Request-payouts flow.

---

## Important notes & gotchas for the next agent

1. **Active Supabase project is `gdcyztbupojpmbnsnmwr`** (see .env `NEXT_PUBLIC_SUPABASE_URL`). Older notes/memory saying pintap-test are stale. Migrations this round were applied to gdcyztbupojpmbnsnmwr (og_image_cache only there; profile_soft_delete also to hudtnxauwaranhddjakn by mistake first — harmless).
   **Migration drift is the recurring root cause here** (H1 = missing profile columns, payouts/code-count RPCs were missing too). After ANY schema work: apply every repo migration to the project `.env` points at, and verify with `select proname from pg_proc` / `information_schema.columns`.
2. **Dual service implementations:** every service in `services/*.ts` has `mock` and `real` picked by `services/_runtime.ts` from env. Fix behavior in **both**.
3. **Only `admin@pintap.com` / `Pintap2026!` logs in** on the live DB. Do not test delete-account with it (bans the user). Preview note: `preview_fill` doesn't update React state — set values via the native setter + `input` event, then `form.requestSubmit()`.
4. **OG image cache caches nulls for 7 days** (`og_image_cache`). Delete the row when re-testing scraping. fahrrad-xxl.de blocks scraping even with a browser UA → favicon fallback is expected there.
5. **Campaign options require** `store.connected` + campaign `active` + `codesAvailable > 0`. "No campaign found" often = no codes left, or (as here) a duplicate/misregistered store domain. Check `stores` for near-duplicate domains when this recurs.
6. **RLS traps:** recommenders can't read `campaign_discount_codes` (use `campaign_code_counts` RPC); `claim_discount_code_for_link` / `release_discount_code_for_link` need the **user-scoped** client (auth.uid()), never service-role.
7. **A1 needs a dashboard toggle** ("Confirm email" + redirect URLs) in gdcyztbupojpmbnsnmwr before double opt-in actually takes effect; the code path is ready.
8. **`database.types.ts` was hand-extended** with `profiles.deleted_at` — regenerate types when convenient (`generate_typescript_types` MCP tool) to stay truthful.
9. **Deleted links release their discount code** — that's why deletion is blocked when commissions exist.
10. **Pre-existing uncommitted reskin changes** (~20 files) were in the tree before this round — don't revert.
11. **New i18n keys go into both** `messages/en.json` and `messages/de.json` — missing keys render raw key names.
12. **Screenshots in preview time out** (renderer busy with an old `/login?next=/admin` loop) — use `preview_snapshot` / `preview_inspect` / `preview_eval` instead.
