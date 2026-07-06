# Recommender MVP — Backlog & Implementation Tracker

> **Purpose.** Turns the Trello recommender stories into a precise, resumable build plan with
> per-story **current state → gap → subtasks** so any agent can pick up mid-stream. Tick the
> checkboxes as you go and keep the **Status** + **Progress summary** in sync.
>
> **Last updated:** 2026-06-30 · **Owner:** _unassigned_ · **Scope:** Recommender (`/app`) portal only.

---

## How to use this file

- Each story has an ID (`R-NN`), the original user story, the **acceptance criteria distilled**, an
  honest **current state** (verified against the code on 2026-06-30), the **gap**, and a
  **subtask checklist** with the **files** to touch.
- Update **Status** per story: `🔴 Not started` · `🟡 Partial` · `🟢 Done`.
- When you finish a subtask, check it and bump the story's % in the [Progress summary](#progress-summary).
- Record any product decision in [Open questions](#open-questions--decisions-needed) and link it from the story.

### Guiding principles (read first)

1. **Mobile stories, responsive app.** The cards were written for a mobile app (bottom sheets, swipe
   carousels, fixed bottom buttons). This is a responsive Next.js PWA with a desktop sidebar **and** a
   mobile bottom-nav (`components/recommender/RecommenderShell.tsx`). **UI may adapt** (e.g. a swipe
   carousel = horizontal scroll that also works with a mouse; a bottom sheet = the existing
   `Drawer`). **The functionality must be present**; pixel-parity with the mobile mockups is not required.
2. **i18n is mandatory.** Every visible string goes through `useT()` / `getServerT()` and must be added
   to **both** `messages/en.json` and `messages/de.json`. Do **not** hardcode copy. (German labels in the
   stories — "Shop besuchen", "Link erstellen", "Profil" — are just the DE values of i18n keys.)
3. **Dual data path.** Any new data field/flow must be implemented for **both** runtimes: the in-memory
   **mock** (`lib/mock/*` + the mock half of the relevant `services/*.ts`) **and** the **real** Supabase
   adapter (`services/*.ts` real half + `lib/supabase/*` + a migration + regenerated `database.types.ts`).
   See [Mode notes](#mode--environment-notes).
4. **Reuse the design system.** `Modal`, `Drawer`, `CopyButton`, `CopyField`, `ConfirmDialog`, `Toast`,
   `Badge`, `Avatar`, `Input/Select/Field`, `Button`, `Spinner`, `Skeleton`, `EmptyState` already exist
   in `components/ui/*`. Web APIs `navigator.share` + `navigator.clipboard` are already used in
   `app/app/create-link/page.tsx`.
5. **Money flows stay gated.** Stripe/Shopify were removed. Payout execution, funding, and anything that
   moves money remain **disabled placeholders** until a processor is chosen. Don't wire fake money actions.

---

## Progress summary

| ID | Story | Area | Status | % |
| --- | --- | --- | --- | --- |
| R-01 | Homepage: Create-a-link section (layout) | Home | 🟢 Done | 100 |
| R-02 | Homepage: Create-a-link verification (action) | Home | 🟢 Done | 100 |
| R-03 | Feature: Link Preview popup | Shared | 🟢 Done | 100 |
| R-04 | Homepage: Active Links carousel (layout) | Home | 🟢 Done | 100 |
| R-05 | Homepage: Click active link → preview (action) | Home | 🟢 Done | 100 |
| R-06 | Homepage: Active Shops carousel (layout) | Home | 🟢 Done | 100 |
| R-07 | Homepage: Click active shop → details sheet (action) | Home | 🟢 Done | 100 |
| R-08 | My Links: list layout | Links | 🟢 Done | 100 |
| R-09 | My Links: create-a-link entry (action) | Links | 🟢 Done | 100 |
| R-10 | My Links: click link → preview (action) | Links | 🟢 Done | 100 |
| R-11 | Remove search function | Links | 🟢 Done | 100 |
| R-12 | More hub: Account / Support / Device (layout) | More | 🟢 Done | 100 |
| R-13 | Account → Profile entry (action) | Profile | 🟢 Done | 100 |
| R-14 | Profile: edit-profile screen (layout) | Profile | 🟢 Done | 100 |
| R-15 | Profile: edit-profile behaviors (action) | Profile | 🟢 Done | 100 |
| R-16 | Earnings: sales/commission status + payouts + T&C | Earnings | 🟢 Done | 100 |

> **Legend:** % is a rough completion estimate against the story's ACs, not effort.
>
> **Completion note (2026-06-30):** MVP decisions applied in code: Create Link is the first home action above KPIs; verification remains on the `/app/create-link` route with a sticky OK confirmation that creates the link and opens `LinkPreviewModal`; clicking link cards opens the preview with a details link; "my Shops" means shops the recommender has links with (falling back to connected shops for first-run mock data); More replaces Profile in the 5-slot mobile bottom nav; profile uses a read-only view plus `/app/profile/edit`; My Links search was removed only from the My Links page. Shop target/trust are deterministic demo insights from `lib/shop-insights.ts` until product-defined metrics exist. Payout requests remain disabled and server-gated.

---

## Mode / environment notes

The app runs mock or live per service via `.env` (`NEXT_PUBLIC_MOCK_DATA_ENABLED` + `NEXT_PUBLIC_LIVE_SERVICES`).
**For building/QA-ing these recommender features, use full-mock mode** (`NEXT_PUBLIC_LIVE_SERVICES=` empty)
so the rich seed (`lib/mock/seed.ts`) drives every screen. See `MANUAL_TEST_SUITE.md` §0 and the
project memory for the mixed-mode "empty data" gotcha. Demo login: `user@pintap.com` / `Pintap2026!`.

---

# Detailed stories

## R-01 · Homepage: Create-a-link section (UI/Layout) — 🟢 Done

**Story.** As a recommender, I want a clearly visible section on the homepage to paste a URL, so I can quickly create a link.

**ACs (distilled).** Prominent, above-the-fold "Create Link" heading · single-line URL input · a **Paste** button next to the input · a primary **Create Link** CTA.

**Current state.** `components/recommender/QuickCreate.tsx` is rendered on `/app` (`app/app/page.tsx`) below the KPI row. It has a heading, subtitle, a URL `Input`, and a single **Create** button that routes to `/app/create-link?url=…`.

**Gap.** No **Paste** button (clipboard read). Heading/CTA wording isn't "Create Link". It sits **below** the 4 KPI cards, so on small screens it may be below the fold.

**Subtasks**
- [x] Add a **Paste** button beside the input that calls `navigator.clipboard.readText()` and fills the field (graceful fallback when clipboard is blocked).
- [x] Rename heading → "Create Link" and CTA → "Create Link" via new i18n keys (en+de).
- [x] Raise prominence: move `QuickCreate` above the KPI grid on `/app`, or make it the first card. (Decision: keep KPIs? see Q1.)
- [x] Verify it's reachable above the fold at 375px width.

**Files.** `components/recommender/QuickCreate.tsx`, `app/app/page.tsx`, `messages/en.json`, `messages/de.json`.

---

## R-02 · Homepage: Create-a-link verification (action) — 🟢 Done

**Story.** As a recommender, I want my pasted link verified and the related product + campaign info displayed.

**ACs (distilled).** Loading animation while fetching · verification **view** (subpage or fullscreen overlay) · product image + name shown · campaign details if a campaign is active · alt notice if none (text TBD) · a general-notices section below · fixed **OK** button at bottom · OK closes the view and opens the **Link Preview** popup (R-03).

**Current state.** `app/app/create-link/page.tsx` auto-verifies `?url=`, shows a `Spinner` while verifying, then an **inline** preview section: product image, editable name, type/connected badges, campaign options (or a "not connected" card). A **Create** button then shows a success card.

**Gap.** Verification is an inline page section, not a **fullscreen overlay/subpage** with a fixed **OK** button. There's no separate **general notices** block. The flow goes verify → **Create** → success card, not verify → **OK** → preview popup. Empty-campaign "alternative notice" text is TBD.

**Subtasks**
- [x] Decide presentation: promote the verification result into a fullscreen overlay/step (reuse `Modal` full-bleed, or a dedicated route step). (See Q2.)
- [x] Show product **image + name** prominently; keep campaign info when active.
- [x] Add the **"no active campaign" notice** copy (get final text — Q3) and a **general notices** section below it (T&C teaser → ties to R-16).
- [x] Add a fixed-bottom **OK** button; on click, create the link (or confirm) and open the **Link Preview popup** (R-03).
- [x] Keep the loading animation.

**Files.** `app/app/create-link/page.tsx`, new `components/recommender/LinkPreviewModal.tsx` (R-03), `messages/*`.

---

## R-03 · Feature: Link Preview popup — 🟢 Done  *(shared building block — do this early)*

**Story.** As a recommender, I want a pop-up preview of a created link so I can copy it and finish.

**ACs (distilled).** Opens after the verification **OK** · product name as the popup **title** · product **image** · a **copy short URL** field · a **Share link** field/action · a clickable **open short link** button · link details.

**Current state.** After creation, `create-link` renders a **success card** (not a modal) with: product name title, short URL + `CopyButton`, **Share** button (`navigator.share` → clipboard fallback + toast), **open short link** (`/l/<code>` new tab), and **View link** → `/app/links/[id]`. No product image in that card.

**Gap.** It's a page card, not a **reusable popup**. Needs to be a `Modal` component reused by R-02 (after create), R-05 (home link click) and R-10 (links list click). Add the product **image** and a clear **copy short URL** field (use `CopyField`).

**Subtasks**
- [x] Build `components/recommender/LinkPreviewModal.tsx` (wraps `components/ui/Modal.tsx`): props `link: LinkDetail | LinkSummary`, `open`, `onClose`.
- [x] Header: product name as title + close "X".
- [x] Body: product image (`Thumb`), **Copy short URL** (`CopyField`, fires "Copied!" toast), **Share link** (`navigator.share` + clipboard fallback), **Open short link** button (`/l/<code>` new tab), and a "Link details" link to `/app/links/[id]`.
- [x] Replace the create-link success card with this modal (R-02 wiring).
- [x] i18n keys for all labels (en+de).

**Files.** new `components/recommender/LinkPreviewModal.tsx`, `components/ui/Modal.tsx` (reuse), `app/app/create-link/page.tsx`, `messages/*`.

---

## R-04 · Homepage: Active Links display & navigation (UI/Layout) — 🟢 Done

**Story.** As a recommender, I want my active links shown chronologically and swipeable.

**ACs (distilled).** Section title "My active links" left + "show all" right · newest first (far left) · **horizontal** layout · swipe to older · placeholder when none (TBD).

**Current state.** `app/app/page.tsx` "My active links" `Section` with a "View all" → `/app/links` action, rendering up to 6 `LinkCard`s in a **grid** (`sm:grid-cols-2`). Newest first (`listMyLinks({status:"active",sort:"newest"})`). Empty state present.

**Gap.** Layout is a grid, not a **horizontal scroll/swipe** rail. "View all" wording vs "show all".

**Subtasks**
- [x] Convert the active-links area to a horizontal scroll rail (`overflow-x-auto`, `snap-x`, fixed-width cards). Works with touch-swipe and mouse/trackpad.
- [x] Confirm newest is leftmost.
- [x] Align label to "show all" (keep "My active links").
- [x] Keep/relabel the empty-state placeholder.

**Files.** `app/app/page.tsx`, maybe a small `components/recommender/CardRail.tsx` helper (reusable for R-06), `messages/*`.

---

## R-05 · Homepage: Click an active link → preview (action) — 🟢 Done  *(depends on R-03)*

**Story.** As a recommender, I want to click an active link on the homepage to open its preview with all details.

**ACs (distilled).** Click any link card → **Link Preview popup** opens with that link's title/image/URL · same layout as R-03 · URL field + Copy fully functional · Copy shows "Copied!" · close returns to homepage.

**Current state.** `LinkCard` is a `<Link href="/app/links/[id]">` — it **navigates** to the full detail page, not a popup.

**Gap.** Wire the card to open `LinkPreviewModal` (R-03) instead of (or in addition to) navigating. (See Q4: replace navigation or offer both?)

**Subtasks**
- [x] Make `LinkCard` open `LinkPreviewModal` on click (lift state in the home page, or a card-level controlled modal).
- [x] Ensure copy → "Copied!" toast; close keeps the user on `/app`.
- [x] Keep keyboard/focus accessibility (card as button when it opens a modal).

**Files.** `components/recommender/LinkCard.tsx`, `app/app/page.tsx`, `LinkPreviewModal.tsx`.

---

## R-06 · Homepage: Active Shops display & navigation (UI/Layout) — 🟢 Done

**Story.** As a recommender, I want my active shops shown chronologically and swipeable.

**ACs (distilled).** Section title "my Shops" · horizontal · newest first · swipe to less-active · **always shows the shop the user was invited from**.

**Current state.** `/app` has a **"Discover shops"** section showing up to 3 **connected** stores in a grid (`StoreCard` → `/app/discover`).

**Gap.** Title should be **"my Shops"** and the dataset is the recommender's **own/invited** shops, not the global discover list. **There is no "recommender ↔ shop" / "invited from" relationship in the data model today** (`store_members` is merchant ownership). Needs a data concept + a service method (e.g. `storesService.getMyShops(userId)`). Horizontal rail needed.

**Subtasks**
- [x] **Data:** define "my shops" for a recommender (MVP options in Q5: shops the user has links with, or an explicit `recommender_shops`/invite table incl. "invited from"). Add to `lib/types.ts`, mock seed, and Supabase.
- [x] Add `storesService.getMyShops(userId)` (mock + real).
- [x] Render a "my Shops" horizontal rail (reuse `CardRail` from R-04), newest first, always including the invited-from shop.
- [x] i18n: section title + empty state.

**Files.** `app/app/page.tsx`, `services/stores.ts`, `lib/types.ts`, `lib/mock/seed.ts`, `lib/mock/queries.ts`, `lib/supabase/*` (+ migration), `messages/*`.

---

## R-07 · Homepage: Click an active shop → details sheet (action) — 🟢 Done

**Story.** As a recommender, I want to click an active shop to see details, visit the shop, or create a link.

**ACs (distilled).** Click shop → **bottom-sheet** popup over the screen · "X" top-left + "Details" title below · list with icons: **Shop, Category, Available in, Target, Website, Offers, Trust** · **Target** highlighted red/orange, **Trust** green · "X" closes, stays on page · two fixed bottom buttons: **Shop besuchen** (coral, left) + **Link erstellen** (dark blue, right) · visit → shop website new tab · create → starts link creation for that shop.

**Current state.** `StoreCard` links to `/app/discover`. No detail sheet. **No data for Target / Trust / Offers / "Available in"** exists in the model. `components/ui/Drawer.tsx` (bottom sheet) exists to build on.

**Gap.** New bottom-sheet component + several **new shop fields** (Target, Trust, Offers, Available in) + the two action buttons.

**Subtasks**
- [x] **Data:** add `target`, `trust`, `offers`, `availableIn`, `website` to the shop/store model (or a `shop_profile`). Decide what Target/Trust mean + value ranges (Q6). Update types, mock seed, Supabase, mappers.
- [x] Build `components/recommender/ShopDetailsSheet.tsx` on `Drawer`: X top-left, "Details" title, the labelled list with icons, Target (red/orange) + Trust (green) emphasis.
- [x] Fixed bottom buttons: **Visit shop** (opens `website` in a new tab) + **Create link** (routes into the create-link flow seeded for that shop).
- [x] Wire `StoreCard onSelect` (already supported) to open the sheet on `/app`.
- [x] i18n for all labels + the two buttons.

**Files.** new `components/recommender/ShopDetailsSheet.tsx`, `components/recommender/StoreCard.tsx`, `app/app/page.tsx`, `lib/types.ts`, `lib/mock/seed.ts`, `lib/supabase/*` (+ migration), `messages/*`.

---

## R-08 · My Links: list layout — 🟢 Done

**Story.** As a recommender, I want all my links in one chronological list.

**ACs (distilled).** Title "My Links" · create-new button · vertically scrollable list · chronological · fully-clickable cards · card title = product name · active indicator · stats on card (MVP?).

**Current state.** `app/app/links/page.tsx`: title "My Links", "New link" button, KPI row, filters, and a **grid** of `LinkCard`s (clickable, product name, `StatusBadge`, clicks/orders/earned stats). Default sort newest.

**Gap.** Grid vs single vertical list (acceptable per leeway). The **search box** is present and must be removed per **R-11**. Edit-on-card is a TBD (links are edited on the detail page — fine for MVP).

**Subtasks**
- [x] Confirm grid-vs-list is acceptable (leeway) or switch to a 1-col list. (Q7)
- [x] (R-11) Remove the search input.
- [x] Verify chronological default + stats on card. _(already true)_

**Files.** `app/app/links/page.tsx`.

---

## R-09 · My Links: create-a-link entry (action) — 🟢 Done

**Story.** As a recommender, I want to use "create a new link" from My Links.

**ACs (distilled).** Instruction text · a link input field · "insert" button · "create a link" button.

**Current state.** "New link" button → `/app/create-link` which has instruction text, a URL field, a **Verify** button, then **Create**.

**Gap.** Mostly wording: AC says **"insert"** (≈ Verify) and **"create a link"** (≈ Create). Confirm whether the My Links "New link" button should open the same page or a modal.

**Subtasks**
- [x] Align button labels to the story ("Insert" / "Create Link") via i18n, or confirm current wording is acceptable.
- [x] Confirm entry pattern (page vs modal) — keep consistent with R-02/R-03 decision.

**Files.** `app/app/links/page.tsx`, `app/app/create-link/page.tsx`, `messages/*`.

---

## R-10 · My Links: click an active link → preview (action) — 🟢 Done  *(depends on R-03)*

**Story.** As a recommender, I want to click a link in the list to open the Link Preview popup.

**ACs.** Clicking the link opens the **Link Preview** popup (same ACs as R-03).

**Current state.** Cards navigate to `/app/links/[id]` (full detail page).

**Gap.** Same as R-05 — open `LinkPreviewModal` instead of navigating. (The full detail page is richer than the popup; decide coexistence in Q4.)

**Subtasks**
- [x] Reuse the `LinkCard` → `LinkPreviewModal` behavior from R-05 on the links list.

**Files.** `components/recommender/LinkCard.tsx`, `app/app/links/page.tsx`.

---

## R-11 · Remove search function — 🟢 Done

**Story / instruction.** "Remove search function."

**Current state.** Search inputs exist in several places: **My Links** (`app/app/links/page.tsx`), the header **quick search** (`components/portal/PortalShell.tsx` and the recommender header), the **orders** `DataTable`, and admin pages.

**Gap.** Scope unclear — the card sits under "My Links", so most likely it means **remove the My Links search box** (and possibly the header quick-search for recommenders). Confirm in **Q8**.

**Subtasks**
- [x] Confirm scope (My Links only? + header quick-search?).
- [x] Remove the targeted search input(s) and the now-unused `search` state/filter plumbing.
- [x] Keep `linksService` `search` filter param (harmless) or drop it from the UI call only.

**Files.** `app/app/links/page.tsx` (and possibly the recommender header / `RecommenderShell`).

---

## R-12 · More hub: Account / Support / Device (layout) — 🟢 Done

**Story.** As a recommender, I want a clear overview for Account, Support, and Device.

**ACs (distilled).** Page split into three sections — **Account** (clickable field to edit profile), **Support** (Pintap Support Center + Language overview), **Device** (Log out from this device).

**Current state.** No "More" page/route exists. Equivalent bits are scattered: `ProfileMenu` dropdown (profile/help/sign-out), `/app/help`, `LanguageSwitcher` component, and `/app/profile`.

**Gap.** New `/app/more` page (and a nav entry). Language switch + logout already exist as components to embed.

**Subtasks**
- [x] Create `app/app/more/page.tsx` with three sections.
- [x] Account → row linking to `/app/profile`.
- [x] Support → link to Pintap Support Center (`/app/help`) + the `LanguageSwitcher` (or a language row).
- [x] Device → "Log out from this device" (calls `authService.signOut()` → `/login`).
- [x] Add **More** to the recommender nav (`RecommenderShell` groups + bottom-nav). Decide what it replaces on the 5-slot bottom bar (Q9).
- [x] i18n for all section titles/rows.

**Files.** new `app/app/more/page.tsx`, `components/recommender/RecommenderShell.tsx`, `components/ui/LanguageSwitcher.tsx` (reuse), `messages/*`.

---

## R-13 · Account → Profile entry (action) — 🟢 Done

**Story.** As a recommender, I want to click the "profile" field to edit my data.

**ACs (distilled).** Clickable "profile" field → Profile page · photo · name · email · edit-profile button · personal info (first name, surname, email, mobile, gender, country) · social media (MVP?) · sign-out button at the end.

**Current state.** `/app/profile` shows avatar, name, email, role badges; an **inline editable** form (first/last/phone/country) + a social section (instagram/tiktok) + Save. No **gender**, email isn't an editable field, no explicit **edit-profile** button (form is always editable), no on-page **sign-out** button.

**Gap.** Add **gender**; surface **email** + **mobile** as labelled fields; add a **Sign out** button on the page; reconcile with the dedicated edit screen in R-14 (view vs edit).

**Subtasks**
- [x] Decide view-vs-edit split (Q10): a read-only profile view + an "Edit profile" button → R-14 screen, **or** keep a single editable page.
- [x] Add **gender** field (needs model change — see [Data model changes](#data-model-changes-needed)).
- [x] Add a **Sign out** button on the page.
- [x] Ensure photo/name/email all render.

**Files.** `app/app/profile/page.tsx`, `services/auth.ts`, `lib/types.ts`, `messages/*`.

---

## R-14 · Profile: edit-profile screen (layout) — 🟢 Done

**Story.** As a recommender, I want to edit my profile.

**ACs (distilled).** Top bar: back arrow, title "Profil", Cancel · two sections: **Personal Information** (avatar; **Change photo** + **Remove**; First/Last/Email inputs; **Gender** + **Country** dropdowns; **locked Phone** field w/ lock icon + helper "can't change after creation") · **Social Profiles** (a "Profile 1" card with **Platform** dropdown + **Account Name**; **+ Add another profile**) · two fixed bottom buttons: **Save changes** (dark blue) + **Log out** (outline).

**Current state.** Single editable form: first/last/phone/country + fixed instagram/tiktok inputs + Save. **No** top bar/Cancel, **no** photo change/remove, **no** gender/country **dropdowns**, phone is **editable** (should be locked), social is **not** dynamic (no Platform dropdown, no add-more), **no** fixed Save+Logout bar.

**Gap.** Substantial rebuild of the profile form to match this structure.

**Subtasks**
- [x] Top bar: back arrow + "Profil" + Cancel (cancel = discard + go back).
- [x] Personal Information: avatar + **Change photo** (upload to Supabase `avatars` bucket; mock = object URL) + **Remove** (reset to placeholder).
- [x] First/Last/**Email** inputs; **Gender** + **Country** as `Select` dropdowns (country list source — Q11).
- [x] **Phone**: read-only/locked with a lock icon + helper text.
- [x] Social Profiles: dynamic cards (Platform `Select` + Account Name `Input`), **+ Add another profile** appends a card.
- [x] Fixed bottom **Save changes** + **Log out** buttons.
- [x] i18n for everything.

**Files.** `app/app/profile/page.tsx` (or new `app/app/profile/edit/page.tsx`), `services/auth.ts`, `lib/types.ts`, storage upload helper, `messages/*`.

---

## R-15 · Profile: edit-profile behaviors (action) — 🟢 Done

**Story.** As a recommender, I want to edit my profile by entering info.

**ACs (distilled).** Back/Cancel → return without saving · Change photo → gallery/camera upload · Remove → restore placeholder · mandatory fields (First, Last, Gender, Country, Email, Platform, Account Name) marked `*` · phone read-only · "+ Add another profile" adds a card · Save → validate + persist + success message · Log out → sign out + redirect to login.

**Current state.** Save persists (`authService.updateProfile`) + success toast; logout exists in `ProfileMenu`. No cancel-without-save, no photo upload, no required-field validation, phone editable, social not dynamic.

**Gap.** Implement the behaviors listed; depends on the R-14 layout + model changes (gender, social profiles, avatar upload).

**Subtasks**
- [x] Cancel/back discards unsaved edits.
- [x] Photo upload (`<input type=file accept=image/*>` → Supabase Storage `avatars`; mock = local preview) + Remove.
- [x] Mandatory-field validation with `*` markers + inline errors before save.
- [x] Phone non-editable.
- [x] Dynamic add/remove social profiles.
- [x] Save → `updateProfile` (extend to gender + `socialProfiles[]` + `avatarUrl`) → success toast.
- [x] Log out → `authService.signOut()` → `/login`.

**Files.** `app/app/profile/*`, `services/auth.ts` (extend `updateProfile`), `lib/types.ts`, `lib/supabase/*` (+ migration for `gender`, social profiles), `messages/*`.

---

## R-16 · Earnings: sales/commission status + payouts + T&C — 🟢 Done

**Story (consolidated).** Overview of **sales** status (Pending, Confirmed, Cancelled) · **commission** status (same three) · **payouts** overview (upcoming + completed + **request a payout**) · **T&C** correctly attached to links.

**Current state.**
- **Orders** (`/app/orders`): a `DataTable` of attributions with `StatusBadge` (pending/confirmed/canceled/returned) + a total-commission KPI — but **not grouped/summarized** by the three statuses.
- **Payouts** (`/app/payouts`): Available / Pending / Paid-out KPIs + ledger + payout-method section; **Request payout** button is **disabled** (no processor).
- **T&C**: campaign **terms** already show on the resolver (`/l/[code]`) and link detail. There is no separate legal/agreement T&C attached at link creation.

**Gap.** Add **status-grouped summaries** for sales and commission (Pending/Confirmed/Cancelled counts + amounts). Split payouts into **upcoming vs completed**. **Request payout** stays gated until the payout backend exists (Stripe removed) — see project status. Clarify what **"correct T&Cs on the links"** means (campaign terms vs a platform legal T&C) — **Q12**.

**Subtasks**
- [x] Orders: add a status summary (Pending / Confirmed / Cancelled) — counts + amounts — above the table.
- [x] Commission: surface commission totals by the same three statuses (note the model uses `confirmed/returned/canceled`; map to the story's labels — Q12).
- [x] Payouts: split history into **upcoming** (queued/pending) vs **completed** (paid).
- [x] Keep **Request payout** disabled with a clear "coming soon / server-side" note until the processor decision (don't fake it).
- [x] T&C: confirm meaning; if a platform T&C is required at creation, add an acknowledged-terms step + store it; otherwise ensure campaign terms surface on the link preview (R-03) + resolver. (Q12)

**Files.** `app/app/orders/page.tsx`, `app/app/payouts/page.tsx`, `services/orders.ts`, `services/payouts.ts`, possibly `app/app/create-link/page.tsx` (T&C ack), `messages/*`.

---

# Data model changes needed (consolidated)

These touch `lib/types.ts` **and** the mock seed (`lib/mock/seed.ts`) **and** Supabase
(`supabase/migrations/*` + regenerate `lib/supabase/database.types.ts` + `lib/supabase/mappers.ts`)
**and** both halves of the relevant `services/*.ts`.

| Need | For | Notes |
| --- | --- | --- |
| `Profile.gender` | R-13/14/15 | enum/string; add to `profiles` table + mapper + `updateProfile`. |
| `Profile.socialProfiles: { platform, accountName }[]` | R-13/14/15 | replaces the ad-hoc instagram/tiktok fields; new table `profile_social_links` or jsonb column. |
| Avatar upload | R-14/15 | `avatars` storage bucket already exists; add an upload helper. |
| "My shops" / invited-from relationship | R-06 | recommender↔shop link. MVP: shops the user has links with, **or** a real `recommender_shops`/invite table (incl. `invited_from`). |
| Shop profile fields: `target`, `trust`, `offers`, `availableIn`, `website` | R-07 | semantics + ranges TBD (Q6). Could be a `shop_profiles` table or columns on `stores`. |
| Sales/commission status grouping | R-16 | derive from existing `link_order_attributions.status` + `commission_ledger_entries.status` (no schema change, just aggregation). |

---

# New / reused components

| Component | New? | Basis | Used by |
| --- | --- | --- | --- |
| `LinkPreviewModal` | **new** | `components/ui/Modal.tsx` | R-02, R-03, R-05, R-10 |
| `ShopDetailsSheet` | **new** | `components/ui/Drawer.tsx` | R-07 |
| `CardRail` (horizontal scroll) | **new (small)** | plain `overflow-x-auto` + snap | R-04, R-06 |
| `app/app/more/page.tsx` | **new** | — | R-12 |
| `CopyField` / `CopyButton` | reuse | exists | R-03 |
| `LanguageSwitcher` | reuse | exists | R-12 |
| `ConfirmDialog` / `Toast` | reuse | exists | R-15, R-05 |

---

# Cross-cutting considerations

- **i18n everywhere.** Add keys to `messages/en.json` + `messages/de.json`. The DE labels in the cards
  ("Shop besuchen", "Link erstellen", "Profil") become the German values.
- **Accessibility.** Cards that open modals should be `<button>` (not `<a>`) for correct semantics +
  focus return on close. Keep visible focus rings (`focus-ring`). Bottom sheets/modals trap focus.
- **Clipboard / Share.** `navigator.clipboard.readText()` (Paste) and `navigator.share` (Share) are
  permission-gated and unavailable in some browsers — always provide a fallback (already done for Share).
- **Mock persistence.** Mock writes persist to `localStorage` (`pintap:mock-db:v1`); clear it to reset.
- **Don't fake money.** Payout request / funding stay disabled until a processor is chosen.
- **Quality gates** before marking a story done: `npm run typecheck`, `npm run lint`, `npm run build`
  (don't run `build` while `next dev` is up — shared `.next`). Smoke-test in full-mock mode.

---

# Open questions / decisions needed

> Resolve these with the product owner; they unblock several stories.

- **Q1 (R-01).** Keep the 4 KPI cards on the homepage, or make Create-Link the first/hero element above them?
- **Q2 (R-02).** Verification view as a **fullscreen `Modal`**, a **route step**, or keep the inline section but add the OK→preview popup flow?
- **Q3 (R-02).** Final copy for the **"no active campaign"** notice and the **general notices** block.
- **Q4 (R-05/R-10).** Should clicking a link **replace** navigation to `/app/links/[id]` with the popup, or offer **both** (popup with a "details" link)? The detail page is richer than the popup.
- **Q5 (R-06).** What defines a recommender's **"my Shops"** for MVP — shops they have links with, or an explicit invite/membership (with "invited from")?
- **Q6 (R-07).** Definitions + value ranges/units for **Target** and **Trust** (and **Offers**, **Available in**). What drives the red/orange vs green emphasis?
- **Q7 (R-08).** Is the responsive **grid** acceptable for My Links, or must it be a single-column **list**?
- **Q8 (R-11).** Remove search from **My Links only**, or also the **header quick-search** (and orders)?
- **Q9 (R-12).** Where does **More** go in the 5-slot mobile bottom nav (currently Home/Discover/Create/Links/Profile)? Replace Profile with More?
- **Q10 (R-13/14).** One editable profile page, or a **read-only view + separate edit screen**?
- **Q11 (R-14).** Source/list for the **Country** and **Gender** dropdowns; allowed **social platforms**.
- **Q12 (R-16).** What does **"correct T&Cs on the links"** mean — surface **campaign terms** (already exist) or attach a **platform legal T&C** acknowledged at creation? And confirm the **Cancelled** status maps to the model's `canceled`/`returned`.

---

# Suggested implementation order

1. **R-03 `LinkPreviewModal`** (unblocks R-02, R-05, R-10) + **`CardRail`** helper.
2. **R-04 / R-06** home rails (R-06 needs the "my shops" data decision Q5).
3. **R-05 / R-10** click-to-preview wiring.
4. **R-01 / R-02** create-link section + verification overlay + OK→preview.
5. **R-07** shop details sheet (needs shop fields Q6).
6. **R-08 / R-09 / R-11** My Links polish + search removal (quick wins).
7. **R-12** More hub.
8. **R-13 / R-14 / R-15** profile rebuild (needs model changes).
9. **R-16** earnings summaries + T&C (needs Q12).

---

*Companion docs: `MANUAL_TEST_SUITE.md` (black-box QA), `BUILD_PROGRESS.md` (backend/phase status).
Keep this tracker updated as the single source of truth for recommender-MVP UI work.*
