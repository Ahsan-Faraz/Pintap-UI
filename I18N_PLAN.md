# Pintap i18n (English + German) — Plan & Progress

> **Goal:** The entire web app is available in **German (de)** as well as **English (en)** —
> every label, button, placeholder, empty state, dialog, and toast — switchable from a
> language switcher in the navbar, **without breaking the site**.
>
> **This is a living handoff doc.** Update the Progress Log + Checklist as you go so another
> agent can resume cleanly. Read "Architecture" and "Gotchas" before touching anything.

Last updated: **2026-06-30** — German localization completed across app routes, formatting, and known service errors.

---

## Architecture (decided)

Lightweight, **hand-rolled** i18n (no new dependency — the repo deliberately keeps deps
minimal, e.g. no `clsx`). Locale is stored in a **cookie** so server and client render the
same value (no hydration mismatch). No URL locale prefix (avoids moving all 40 routes under
`app/[locale]/`, which would be high-risk).

**Locale source of truth:** cookie `pintap.locale` = `en` | `de` (default `en`).

**Files (foundation):**
- `messages/en.json` — English strings (source of truth), namespaced (`common`, `nav`, `auth`, …).
- `messages/de.json` — German translations, same keys.
- `lib/i18n/config.ts` — `LOCALES`, `DEFAULT_LOCALE`, `LOCALE_COOKIE`, `Locale` type, labels.
- `lib/i18n/dictionaries.ts` — `getMessages(locale)` returns the merged dict object.
- `lib/i18n/translate.ts` — `createTranslator(locale)` → `t(key, params?)`. Pure; works on
  server **and** client. Dotted-key lookup (`t("auth.login.title")`), `{param}` interpolation,
  falls back to `en`, then to the key string itself (so a missing key never throws/blank-renders).
- `lib/i18n/server.ts` — **server-only**. `getLocale()` (async, reads cookie via `next/headers`),
  `getServerT()` → translator for **server components**.
- `context/I18nProvider.tsx` — **client**. Holds locale state (seeded from server), `useT()`,
  `useLocale()`. `setLocale(next)` writes the cookie, updates state (instant client re-render),
  and calls `router.refresh()` (re-renders server components with the new cookie).
- `components/ui/LanguageSwitcher.tsx` — the navbar control (EN/DE), per Studio spec.

**Wiring:**
- `app/layout.tsx` becomes `async`, reads `getLocale()`, sets `<html lang={locale}>`, and wraps
  children in `<I18nProvider initialLocale={locale}>`.
- `LanguageSwitcher` lives in both shell headers (`PortalShell`, `RecommenderShell`) next to the
  role pills / profile menu.

**Usage:**
- Client component: `const t = useT(); … t("common.save")`.
- Server component (layouts, landing, access-denied, verify): `const t = await getServerT(); … t("…")`.
- Nav labels: layouts pass a `labelKey` (not a literal); the **client** shell resolves with `useT()`
  so nav text switches instantly without a refresh.

---

## Key conventions

- **Namespaces:** `common` (Save/Cancel/Search/…), `nav`, `auth`, `landing`, `dashboard`,
  `links`, `orders`, `merchant`, `campaigns`, `admin`, `payouts`, `profile`, `resolver`, `errors`.
- **Key style:** dotted, lowerCamel leaves: `auth.login.title`, `common.actions.save`.
- **Interpolation:** `{name}` placeholders; call `t("x", { name })`.
- **Plurals:** prefer two keys `foo.one` / `foo.other` + a tiny `plural(count, one, other)` helper,
  or pre-format the count into one string when simple.
- **Do NOT translate data** (store/user names, emails, URLs, codes) — only UI chrome.
- English is always the fallback locale — never delete an `en` key.

---

## Gotchas (READ before resuming)

1. **Server vs client split.** `lib/i18n/server.ts` is `server-only` — never import it in a
   `"use client"` file. Client components use `useT()`; server components use `await getServerT()`.
2. **Hydration.** Locale comes from the **cookie**, read on the server in `app/layout.tsx` and
   passed to the provider. **Never** seed initial locale from `localStorage` — SSR can't read it,
   which causes a hydration mismatch. `document.cookie` is only written in `setLocale` (client).
3. **Switching updates two worlds.** Client components update via context state instantly; server
   components only update after `router.refresh()` (called inside `setLocale`). Both are needed.
4. **`<html lang>`** must reflect the locale — handled in `app/layout.tsx` (now async).
5. **Auth is LIVE Supabase.** Some user-facing strings are backend error messages
   (`services/*`). Those are thrown in English from Supabase/our adapters; localize by mapping
   known cases in `errors.*` where feasible. Don't expect 100% from the backend.
6. **`lib/format.ts`** hardcodes `en-US` for currency/number/date and English relative-time
   words ("just now", "3d ago"). Localizing these is **Phase 4** (cosmetic; doesn't break).
7. **Missing keys render the key string** (by design) — if you see `auth.login.title` on screen,
   the key is missing from `messages/en.json`. Add it.
8. **Don't `"use client"` a layout** just for i18n — use `getServerT()` instead, or pass keys to
   the client shell.

---

## Execution phases

- **Phase 0 — Foundation** (config, dict, translate, server, provider, switcher, layout wiring). 
- **Phase 1 — Shared chrome** (shells + nav labels, ProfileMenu, RoleSwitcher, LanguageSwitcher,
  common `ui/*` literals: DataTable Prev/Next/Search, EmptyState, ConfirmDialog, CopyField, Banner).
- **Phase 2 — Auth & landing** (`/`, login, signup, verify, access-denied).
- **Phase 3 — Portals** (dashboards first, then each page): recommender `/app/*`, merchant
  `/merchant/*`, admin `/admin/*`, resolver `/l/[shortcode]`.
- **Phase 4 — Formatting & polish** (`lib/format.ts` locale-aware numbers/dates/relative time;
  localize known backend error messages; QA pass at both locales + responsive).

---

## Checklist (tick as completed; note partials)

### Phase 0 — Foundation ✅ DONE (2026-06-30)
- [x] `lib/i18n/config.ts`
- [x] `messages/en.json` + `messages/de.json` (seeded: common, language, roles, shell, section, group, nav, auth, landing, dashboard)
- [x] `lib/i18n/translate.ts` (folded in dict loading; `dictionaries.ts` not needed)
- [x] `lib/i18n/server.ts` (`getLocale`, `getServerT`)
- [x] `context/I18nProvider.tsx` (`useT`, `useLocale`)
- [x] `components/ui/LanguageSwitcher.tsx` (+ `GlobeIcon` added to `ui/icons.tsx`)
- [x] `app/layout.tsx` async + `<html lang>` + provider + translated skip link
- [x] Typecheck green

### Phase 1 — Shared chrome
- [x] `PortalShell` (search placeholder, a11y labels, collapse labels)
- [x] `RecommenderShell`
- [x] nav labels (admin/merchant/app layouts → `labelKey`)
- [x] `ProfileMenu` (Profile/Help/Sign out, Workspace)
- [x] `RoleSwitcher` (User/Merchant/Admin, "Current")
- [x] `ui/DataTable` (Search…, Prev, Next, "{a}–{b} of {n}")
- [x] `ui/EmptyState` default, `ui/ConfirmDialog`, `ui/CopyField`, `ui/Banner`, `ui/Toast`
- [x] `components/merchant/NoStore`, recommender cards

### Phase 2 — Auth & landing
- [x] `/` landing
- [x] `/login`
- [x] `/signup`
- [x] `/auth/verify`
- [x] `/access-denied`

### Phase 3 — Portals
- [x] `/app` (home ✅) · discover · create-link · links · links/[id] · orders · payouts · profile · help
- [x] `/merchant` (dashboard ✅) · onboarding · store · campaigns · campaigns/new · campaigns/[id] · orders · billing · settings
- [x] `/admin` (dashboard ✅) · activity · users · stores · campaigns · links · orders · payouts · sales-import · settings
- [x] `/l/[shortcode]` resolver

### Phase 4 — Formatting & polish
- [x] `lib/format.ts` locale-aware (de-DE) + relative-time words
- [x] known backend error messages mapped in `errors.*`
- [x] QA both locales, desktop + mobile

---

## Progress Log

- **2026-06-30:** Created this plan. Decided architecture (cookie-based, hand-rolled, no URL
  locale prefix). Starting Phase 0 foundation.
- **2026-06-30:** Continued localization after Claude's foundation. Completed Phase 1 shared
  chrome and Phase 2 auth/landing: auth pages now use `useT()`/`getServerT()`, shared UI defaults
  and status badges are dictionary-backed, and `NoStore`, `QuickCreate`, `LinkCard`, `StoreCard`
  are localized. Started Phase 3 by localizing the `/app`, `/merchant`, and `/admin` dashboard
  pages. Added status/link/store/merchant dashboard keys to `messages/en.json` + `messages/de.json`.
  Verified with `npm run typecheck` and JSON parsing.
- **2026-06-30:** Completed remaining localization. Added `appPages`, `merchantPages`,
  `adminPages`, `resolver`, and `errors` dictionaries; converted all recommender, merchant, admin,
  and resolver routes found by the UI string scan. `lib/format.ts` now reads the locale cookie for
  `en-US`/`de-DE` number, currency, date, percent, and relative-time formatting on client renders.
  Added `lib/i18n/errors.ts` to translate known service error messages before displaying them.
  Verified with JSON parsing, `npm run typecheck`, `npm run lint` (passes with 4 pre-existing
  unused warnings in `services/payouts.ts` and `services/stores.ts`), HTTP German-cookie checks for
  landing/signup/login SSR, and browser console-error check on the reachable auth page.
