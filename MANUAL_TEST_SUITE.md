# Pintap — Manual Black-Box Test Suite

A complete, click-through test plan for every major feature across the **Recommender (user)**,
**Merchant**, and **Admin** portals, plus **Auth** and the public **Resolver**. No code knowledge
required — each case is *do this → expect that*. Tick the checkbox when a case passes.

> Scope note: this build has **no Stripe and no Shopify** (removed). Money-movement controls
> (funding, payout execution, store auto-connect, CSV import) are intentionally **disabled
> placeholders** — see [§0.3 Intentionally-disabled controls](#03-intentionally-disabled-controls).
> Do **not** file those as bugs.

---

## 0. Before you start

### 0.1 Pick a run mode

The app routes each service to either in-memory **mock** data or **real Supabase**, controlled by
`.env` (`NEXT_PUBLIC_MOCK_DATA_ENABLED` + `NEXT_PUBLIC_LIVE_SERVICES`). Choose one mode for a test
run — **don't test in a half-and-half config** (see the caveat below).

| Mode | `.env` setting | Use it to test | Data richness |
| --- | --- | --- | --- |
| **A — Full mock** (recommended for features) | `NEXT_PUBLIC_MOCK_DATA_ENABLED=true` and `NEXT_PUBLIC_LIVE_SERVICES=` *(empty)* | Every feature/flow end-to-end | Rich, coherent demo dataset |
| **B — Full live** (for backend integration) | `NEXT_PUBLIC_MOCK_DATA_ENABLED=false` | Real Supabase auth, RLS, persistence | Sparse seed (3 users, 3 stores, 1 campaign, 1 link, no orders/ledger/activity yet) |

> **⚠️ Mixed-mode caveat.** The committed `.env` ships a *mix*
> (`LIVE_SERVICES=auth,stores,campaigns,links,orders,analytics`, the rest mock). In that config a
> **real login** (live `auth`) lands on pages that read **mock** payouts/activity data keyed by demo
> IDs — so the recommender dashboard, payouts, etc. look **empty even though you're "logged in."**
> That's expected, not a bug. For a clean test run, switch to **Mode A** (features) or **Mode B**
> (integration). After editing `.env`, **restart `npm run dev`.**

### 0.2 Demo credentials (work in both modes)

| Role | Email | Password |
| --- | --- | --- |
| Recommender (user) | `user@pintap.com` | `Pintap2026!` |
| Merchant | `merchant@pintap.com` | `Pintap2026!` |
| Admin | `admin@pintap.com` | `Pintap2026!` |

> In **mock** mode the admin demo account (Jordan) holds all three roles, so the header shows a
> **USER / MERCHANT / ADMIN** workspace switcher — handy for hopping between portals in one session.

### 0.3 Intentionally-disabled controls

These render but are **disabled** (greyed out) on purpose — they await a payment processor /
provisioning backend that was deliberately left out when Stripe/Shopify were removed. Confirm they
are present-but-disabled; do not treat as failures.

- Merchant → Onboarding: **Connect store** button
- Merchant → Billing: **Add funds** amount + button
- Recommender → Payouts: **Set up payouts** / **Request payout** / **Continue onboarding** buttons
- Admin → Sales import: textarea + **Preview** / **Load sample** buttons

### 0.4 Quality gates (optional sanity check before manual testing)

```bash
npm run typecheck   # expect: no output / no errors
npm run lint        # expect: no warnings or errors
npm run build       # expect: "Compiled successfully", all routes listed
```

### 0.5 Reset demo data (mock mode)

Mock writes (creating links, editing campaigns, etc.) persist to `localStorage`
(`pintap:mock-db:v1`). To return to the seed dataset: open DevTools → Application → Local Storage →
delete that key → reload.

---

## 1. Authentication & access control

| ID | Steps | Expected result | ✅ |
| --- | --- | --- | --- |
| AUTH-01 | Visit `/` (landing). | Landing/marketing page renders; a clear path to **Log in**. | ☐ |
| AUTH-02 | Go to `/login`, sign in as **user@**. | Lands on **`/app`** (recommender home). | ☐ |
| AUTH-03 | Log out, sign in as **merchant@**. | Lands on **`/merchant`**. | ☐ |
| AUTH-04 | Log out, sign in as **admin@**. | Lands on **`/admin`**. | ☐ |
| AUTH-05 | Log in with a **wrong password**. | Inline error ("Invalid email or password"); stays on login. | ☐ |
| AUTH-06 | From the profile menu (top-right), **Sign out**. | Returns to `/login`; protected pages no longer load your session. | ☐ |
| AUTH-07 | **Sign up** at `/signup` with a new email + password, accept terms. | Account is created; **mock**: lands on `/app` as a `user`. **live**: either lands on `/app` or is told to confirm email, then sign in. | ☐ |
| AUTH-08 | Sign up reusing an **existing** email. | Friendly "account already exists" error. | ☐ |
| AUTH-09 | Toggle the **language switcher** (EN ↔ DE) in the header. | All visible copy switches language; choice persists across navigation. | ☐ |
| AUTH-10 *(Mode B only)* | While **logged out**, open `/app`, `/merchant`, `/admin` directly. | Each redirects to `/login?next=…`. | ☐ |
| AUTH-11 *(Mode B only)* | As **user@**, open `/admin` directly. | Redirects to **`/access-denied`** (with a link back to your home portal). | ☐ |
| AUTH-12 *(Mode B only)* | As **user@** already signed in, open `/login`. | Redirects you to your dashboard (no re-login). | ☐ |

---

## 2. Recommender portal (`/app`) — as **user@**

| ID | Steps | Expected result | ✅ |
| --- | --- | --- | --- |
| REC-01 | Open **`/app`** (Home). | KPI cards: **Total clicks, Orders, Conversion, Commission**. In mock mode they show non-zero seeded values. | ☐ |
| REC-02 | Home → "My active links" preview. | Shows a few of your active links (or an empty-state CTA if none). | ☐ |
| REC-03 | Open **`/app/discover`**. | Grid of **connected** stores with their best discount/commission + active-campaign count. Disconnected stores are not listed. | ☐ |
| REC-04 | Discover → type in the **search** box. | List filters by store name / category / domain. | ☐ |
| REC-05 | Open **`/app/create-link`**, paste a product URL from a connected store (mock e.g. `https://auroragoods.com/products/linen-throw`). Click **Verify**. | Verification shows the detected **store, brand, type, image**, and any **campaign options** with available codes. | ☐ |
| REC-06 | Continue REC-05 → optionally pick a campaign → **Create link**. | A short link (`/l/XXXXXXXX`) is generated; you land on the link detail or list with the new link present. If a campaign was chosen, a discount code is reserved to it. | ☐ |
| REC-07 | Try to create a link for a URL you **already** have. | Blocked with "You already have a link for this exact URL." | ☐ |
| REC-08 | Paste an **invalid** (non-http) URL and Verify. | Verification fails with a clear "enter a valid http(s) URL" message; Create is not allowed. | ☐ |
| REC-09 | Open **`/app/links`**. | Table of your links with name, store, campaign, short code, clicks/orders/commission. | ☐ |
| REC-10 | Links → use the **status** filter (active / inactive / all) and **campaign** filter (connected / unconnected), **search**, and **sort** (newest/oldest/name). | List updates correctly for each filter; deleted links are hidden by default. | ☐ |
| REC-11 | Open a link's **detail** page (`/app/links/[id]`). | Shows metrics, destination, short URL with a **copy** control, campaign + discount code (if any), terms. | ☐ |
| REC-12 | Link detail → **edit name / type** and save. | Change persists on reload. | ☐ |
| REC-13 | Link detail → **connect a campaign** (one with available codes). | Campaign + a reserved discount code appear; available-code count for that campaign drops by one. | ☐ |
| REC-14 | Link detail → **remove the campaign**. | Campaign/code cleared; the code returns to the available pool. | ☐ |
| REC-15 | Link detail → **deactivate**, then **reactivate**. | Status toggles; deactivated link's short URL stops resolving (see RES-04). | ☐ |
| REC-16 | Link detail → **delete** the link (confirm dialog). | Link disappears from the default list; any reserved code is released. | ☐ |
| REC-17 | Open **`/app/orders`**. | Orders attributed to your links: order #, store, amount, commission, status (pending/confirmed/returned). | ☐ |
| REC-18 | Open **`/app/payouts`**. | KPIs: **Available / Pending / Paid out**; a **ledger** list; a **payout-method** section. *(Mock as user@: non-zero balances. The setup/request buttons are disabled — §0.3.)* | ☐ |
| REC-19 | Open **`/app/profile`**, edit first/last name, phone, country; save. | Values persist; header/profile menu reflects the new name. | ☐ |
| REC-20 | Open **`/app/help`**. | Help/FAQ content renders. | ☐ |
| REC-21 | Use the header **quick search**. | Jumps to / filters the relevant page. | ☐ |

---

## 3. Public resolver (`/l/[shortcode]`) — logged out is fine

| ID | Steps | Expected result | ✅ |
| --- | --- | --- | --- |
| RES-01 | Visit a seeded short link: **mock** `/l/Aur0Sp11`; **live** the one seeded link (`/l/Aur0Sp11`). | Landing shows the **store**, recommender first name, **discount %**, **discount code**, **terms**, and a **continue to store** CTA. | ☐ |
| RES-02 | Click the **continue / redirect** CTA. | Routes to the store destination; for a connected store with a code, the discount is applied via the redirect URL. | ☐ |
| RES-03 | Reload the resolver page / re-open it. | The visit is **counted as a click** (verify the link's click count rises in REC-09/REC-11 or Admin). | ☐ |
| RES-04 | Visit a **bogus** code, e.g. `/l/ZZZZ0000`, and a **deactivated** link's code. | A clean **"link not found / unavailable"** state — no crash. | ☐ |

---

## 4. Merchant portal (`/merchant`) — as **merchant@**

| ID | Steps | Expected result | ✅ |
| --- | --- | --- | --- |
| MER-01 | Open **`/merchant`** (dashboard). | KPIs: active campaigns, issued links, clicks, orders, commission owed, funded balance. *(If the account has no store, a **"no store"** prompt appears instead — that's MER-02.)* | ☐ |
| MER-02 | If shown, read the **No-store** state. | Explains there's no connected store and links to onboarding. | ☐ |
| MER-03 | Open **`/merchant/onboarding`**. | A checklist (connect store → confirm profile → set funding → first campaign). The **Connect store** button is **disabled** (§0.3); invalid domains show a hint. | ☐ |
| MER-04 | Open **`/merchant/store`**. | Store info (logo, category, country, currency) + connection details (domain, storefront domain, external id, status, connected date). | ☐ |
| MER-05 | Open **`/merchant/campaigns`**. | List of the store's campaigns with status badges (active/scheduled/paused/ended/draft), discount %, commission %, code counts. | ☐ |
| MER-06 | Open **`/merchant/campaigns/new`**. Submit with a **blank name / blank terms**. | Validation blocks submit with clear messages. | ☐ |
| MER-07 | New campaign → set discount or commission **>100** (or <0). | Validation: "must be 0–100." | ☐ |
| MER-08 | New campaign → fill valid fields, choose **Generate codes** (e.g. prefix + count). Save. | Campaign is created with the generated codes; appears in the list; detail shows the codes as **available**. | ☐ |
| MER-09 | New campaign → choose **Upload codes** (paste a few). Save. | Codes are de-duplicated/upper-cased and saved. | ☐ |
| MER-10 | Open a campaign **detail** (`/merchant/campaigns/[id]`). | Shows terms, discount/commission, schedule, code inventory (available/claimed, with the claiming link name where claimed). | ☐ |
| MER-11 | Campaign detail → **edit** name/terms/discount/commission/schedule. Save. | Changes persist. | ☐ |
| MER-12 | Campaign detail → **Add more codes**. | New codes appended; available count increases. | ☐ |
| MER-13 | Campaign detail → **Pause**, then **Resume**, then **Stop**. | Status badge cycles active → paused → active → ended; a paused/ended campaign stops offering codes to new links. | ☐ |
| MER-14 | Open **`/merchant/orders`**. | Orders attributed to this store's campaigns (order #, recommender, amount, commission, status). | ☐ |
| MER-15 | Open **`/merchant/billing`**. | Funded balance, commission owed, **funding state** badge, and funding history. The **Add funds** control is **disabled** (§0.3). | ☐ |
| MER-16 | Open **`/merchant/settings`**. | Store/merchant settings render and are editable where applicable. | ☐ |
| MER-17 *(mock)* | Use the workspace switcher to confirm a merchant with **no** store sees the no-store path, while the seeded merchant sees data. | Behaviour matches the account's store membership. | ☐ |

---

## 5. Admin portal (`/admin`) — as **admin@**

| ID | Steps | Expected result | ✅ |
| --- | --- | --- | --- |
| ADM-01 | Open **`/admin`** (dashboard). | KPIs: users, connected stores, active campaigns, links, clicks, orders, commission owed, payout pending. | ☐ |
| ADM-02 | Open **`/admin/users`**. | Table of all users with roles; search/sort where present. | ☐ |
| ADM-03 | Open **`/admin/stores`**. | All stores incl. connected + disconnected, with status. | ☐ |
| ADM-04 | Open **`/admin/campaigns`**. | All campaigns across stores with status + code counts. | ☐ |
| ADM-05 | Open **`/admin/links`**. | All links platform-wide (deleted hidden). | ☐ |
| ADM-06 | Open **`/admin/orders`**. | All attributed orders; verify the **unmatched orders** section lists orders whose code matched no link (mock: order **#1004 / WELCOME10**). | ☐ |
| ADM-07 | Open **`/admin/payouts`**. | **Payable recommenders** (available/pending, onboarded badge) + **payout batches** (amount, status, transfer state). *(Read-only — there is no queue/mark-paid button in this build.)* | ☐ |
| ADM-08 | Open **`/admin/activity`**. | Chronological activity log (link/campaign/store/order/payout events). | ☐ |
| ADM-09 | Activity → type in **search** and change the **scope** dropdown. | List filters by text and by scope type; "no match" empty state when nothing matches. | ☐ |
| ADM-10 | Open **`/admin/sales-import`**. | Page renders with the CSV format hint; the textarea + **Preview**/**Load sample** are **disabled** (§0.3). | ☐ |
| ADM-11 | Open **`/admin/settings`**. | Admin/system settings render. | ☐ |

---

## 6. Stripe / Shopify removal verification

| ID | Steps | Expected result | ✅ |
| --- | --- | --- | --- |
| RMV-01 | Browser-search (Ctrl/Cmd-F) the word **"Shopify"** on Merchant store, onboarding, and settings pages. | **No occurrences.** Store connection uses a generic **"store domain"** concept. | ☐ |
| RMV-02 | Browser-search **"Stripe"** on Merchant billing and Recommender payouts pages. | **No occurrences.** Funding/payout copy is generic ("add funds", "payout method"). | ☐ |
| RMV-03 | Inspect Merchant **Billing** and Recommender **Payouts**. | No credit-card / bank-detail entry fields, no Stripe Connect onboarding embed. Money controls are disabled placeholders. | ☐ |
| RMV-04 | Inspect Merchant **Store** connection details. | Generic labels (store domain, storefront domain, external id) — no Shopify-specific wording. | ☐ |
| RMV-05 *(optional, code)* | Search the repo for `stripe`/`shopify`. | Only hit is the DB migration `…rename_dropped_integration_schema.sql`, which **documents** the rename. No runtime code references. | ☐ |

---

## 7. Cross-cutting / non-functional

| ID | Steps | Expected result | ✅ |
| --- | --- | --- | --- |
| UX-01 | Resize to mobile width on `/app`, `/app/links`, `/merchant`, `/admin`, `/l/Aur0Sp11`. | Layouts adapt (sidebar collapses to a usable mobile nav); no overflow/clipping. | ☐ |
| UX-02 | Trigger empty states (e.g. a brand-new signup's links/orders/payouts). | Friendly empty-state messaging + a primary CTA, not blank panels. | ☐ |
| UX-03 | Throttle the network (DevTools) and load data pages. | Skeleton loaders appear, then content; a forced failure shows an error state, not a blank crash. | ☐ |
| UX-04 | Tab through forms (login, create-link, new campaign) with the **keyboard**. | Focus rings visible; controls reachable and operable. | ☐ |
| UX-05 | Open DevTools **Console** and click through each portal. | No uncaught errors / red console spam during normal navigation. | ☐ |
| UX-06 *(mock)* | Use the header **role switcher** to jump USER → MERCHANT → ADMIN. | Each portal loads with its own nav and data. | ☐ |

---

## 8. Backend integration smoke test (Mode B — full live only)

Run these only in **Mode B** (`NEXT_PUBLIC_MOCK_DATA_ENABLED=false`) to validate the Supabase wiring.
The live DB is **sparsely seeded** (no orders/ledger/activity yet), so finance/activity pages will
be **empty** — that's expected, not a failure.

| ID | Steps | Expected result | ✅ |
| --- | --- | --- | --- |
| INT-01 | Sign up a brand-new account. | A `profiles` row + default `user` role are created (login works afterward). | ☐ |
| INT-02 | Log in as each demo account. | Real session established; lands on the role's dashboard via real role lookup. | ☐ |
| INT-03 | As **user@**, create a link for the seeded store and reload. | Link **persists** across reload (written to Supabase, not just memory). | ☐ |
| INT-04 | Visit the seeded resolver link `/l/Aur0Sp11` while logged out, then reload. | Resolves via the server route; the click is logged server-side (service role). | ☐ |
| INT-05 | As **user@**, open `/admin`. | Blocked → `/access-denied` (RLS + role gating enforced). | ☐ |
| INT-06 | Open `/app/payouts` and `/admin/activity`. | Pages **load without crashing** and show **empty** states (real ledger/activity are empty). *(Pre-fix these threw "adapter not implemented"; they now read Supabase under RLS.)* | ☐ |
| INT-07 | Open `/admin/payouts`. | Loads; **payable recommenders** + **batches** are empty until finance data is seeded. | ☐ |

---

## Appendix — Mock demo dataset cheat-sheet (Mode A)

Useful expected values when testing in full-mock mode (seed is anchored to "today", amounts fixed):

- **Recommender (Jordan / admin demo, all roles):** active links incl. `Aur0Sp11` (Aurora Linen
  Throw), `Nor0Wt22` (Merino Sweater), `Jrd0Ot33` (no store). Payouts ≈ **$26.16 available**,
  ~€16.50 pending.
- **Stores:** Aurora Goods (USD, connected), Nordic Threads (EUR, connected), Lumen Skincare (USD,
  connected), **Pinecrest Outdoors (disconnected)** — should not appear in Discover.
- **Campaigns:** Spring Refresh 20%/12% (active), Bestsellers 15%/10% (**codes exhausted**), Winter
  Knit 25%/15% (active), SS Preview (**scheduled**), Glow Routine 30%/18% (active), Sample Kit
  (**ended**), Trail Season (**paused**).
- **Resolver demo link:** `/l/Aur0Sp11`.
- **Unmatched order (Admin → Orders):** `#1004` with code `WELCOME10`.
- **Payout batches (Admin → Payouts):** one **queued** ($26.16), one **paid** ($24.00).

---

*Generated as part of a backend-integration review. Fixes applied in this pass: real Supabase
adapters for `payouts` (reads) and `activity`, removal of dead imports, and confirmation that
Stripe/Shopify are fully removed. See the review summary for details.*
