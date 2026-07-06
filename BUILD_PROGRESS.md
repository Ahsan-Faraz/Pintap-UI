# Pintap Build Progress & Handoff

> **Purpose:** Live status of the build against
> [`NEXT_WEB_APP_SCOPE_ARCHITECTURE_REQUIREMENTS.md`](NEXT_WEB_APP_SCOPE_ARCHITECTURE_REQUIREMENTS.md).
> Goal of this work session: **complete Phase 0 + Phase 1** (frontend MVP on mock data).
> Update this file as soon as each item is done so another agent/harness can resume cleanly.
> Last updated: **2026-06-29** — **Phase 2 substantially complete** (auth, role gating, core services on Supabase).

Legend: `[x]` done · `[~]` in progress · `[ ]` not started

---

## Phase 2 — Supabase Auth & Database (SUBSTANTIALLY COMPLETE, 2026-06-29)

**Project:** Supabase `pintap` — ref `gdcyztbupojpmbnsnmwr`, region eu-central-1, Postgres 17.
Live keys live in local `.env` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Drive the DB via the
Supabase MCP server (project id above).

**Rollout strategy (app stays runnable the whole time):** services flip from mock →
real **one at a time** via a per-service allow-list. `services/_runtime.ts` `pick()`
takes a service name and returns the real adapter when `MOCK_DATA_ENABLED=false`
(all real) **or** the name is in `NEXT_PUBLIC_LIVE_SERVICES` (comma-separated).
Empty list + mock mode = today's Phase 1 behaviour. Final state:
`NEXT_PUBLIC_MOCK_DATA_ENABLED=false`.

**Key decisions:**
- Client-imported services use the **publishable** (RLS-enforced) Supabase client.
  Privileged work — resolver click logging, discount-code claiming, store creation on
  domain connect — runs server-side with the **service-role** (`SUPABASE_SECRET_KEY`)
  client and bypasses RLS.
- Roles live in `user_roles` (never `user_metadata`). RLS uses
  `public.has_role(text)` / `public.is_store_member(uuid)` — `SECURITY DEFINER`,
  `search_path=''`, keyed on `auth.uid()` only — to avoid RLS recursion.
- A new `auth.users` row triggers `handle_new_user()` (SECURITY DEFINER) → inserts
  the `profiles` row + default `user` role.

### Checklist
- [x] Core schema migration: 17 tables + checks/indexes + `updated_at` triggers, RLS enabled on all
- [x] Auth/role helpers (`has_role`, `is_store_member`, `owns_link`, `is_campaign_store_member`) + `handle_new_user` trigger
- [x] RLS policies (§5.3) + advisor hardening pass
- [x] Generated DB types → `lib/supabase/database.types.ts`
- [x] Storage buckets: `avatars`, `store-logos`, `link-images`, `imports`
- [x] Install `@supabase/ssr` + `@supabase/supabase-js` (pinned); real client/server/service-role + middleware helpers + root `middleware.ts`
- [x] Per-service live-list runtime (`pick(name, mock, real)` + `isServiceLive`)
- [x] Real `authService` (browser client; profile+roles under RLS; role→landing path)
- [x] Seed demo accounts + roles (`scripts/seed-demo.mjs`); demo stores/campaigns/links later
- [x] Flip `auth` live (`NEXT_PUBLIC_LIVE_SERVICES=auth`); auth + RLS verified via sign-in smoke test; `npm run build` green
- [x] Signup flow (`/signup`, `authService.signUp`, profile trigger + default `user` role)
- [x] Role-based route protection (`/app`→user, `/merchant`→merchant, `/admin`→admin) + `/access-denied`
- [x] Auth callback route (`/auth/callback` exchanges OAuth/magic-link codes)
- [x] RPCs: `claim_discount_code_for_link`, `release_discount_code_for_link`
- [x] Real services: `stores`, `campaigns`, `links`, `orders` (reads), `analytics`
- [x] Resolver API (`/api/resolver/[shortcode]`) + click logging via service role
- [x] Merchant store-connect stub API (`/api/merchant/store-connect`) via service role
- [x] Extended seed: demo stores/campaigns/links (`node scripts/seed-demo.mjs`) incl. `/l/Aur0Sp11`
- [ ] Flip remaining services live in `.env`: `NEXT_PUBLIC_LIVE_SERVICES=auth,stores,campaigns,links,orders,analytics`
- [ ] Optional: visual browser check of login → role redirect + signup
- [ ] Phase 2 remainder: `payouts`, `activity` services; sales CSV commit via service role

### How to run the seed / regenerate types
- Seed demo users + verify auth/RLS: `node scripts/seed-demo.mjs` (idempotent; reads `.env`).
  Demo creds: `user@ / merchant@ / admin@pintap.com`, password `Pintap2026!` — now **real** Supabase logins.
- Regenerate DB types after a schema change → Supabase MCP `generate_typescript_types` → `lib/supabase/database.types.ts`.

### Follow-ups / watch-outs
- `npm audit` reports 9 vulns in the broader dep tree (not the Supabase pkgs). Triage separately; don't `audit fix --force` blindly.
- Mixed mode is active: `auth` is real, all other services still mock. A real login lands on a portal showing **mock** data until that service is migrated — expected.
- To go fully real later: migrate every service, then set `NEXT_PUBLIC_MOCK_DATA_ENABLED=false`.

### Phase 2 source files (app)
- `lib/supabase/client.ts` — memoized browser client (publishable key).
- `lib/supabase/server.ts` — SSR client (cookie-bound) + **service-role** client (secret key, server-only).
- `lib/supabase/middleware.ts` — `updateSession()` (refreshes session, returns user).
- `middleware.ts` (root) — gates `/app|/merchant|/admin` when `auth` is live; passive on mock.
- `lib/supabase/database.types.ts` — generated DB types (regenerate after schema changes).
- `lib/config.ts` — `isServiceLive(name)` reads `NEXT_PUBLIC_LIVE_SERVICES`.
- `services/_runtime.ts` — `pick(name, mock, real)`.
- `services/auth.ts` — real `authService` (browser client; profile+roles read under RLS; role→path).

### Applied migrations (cloud, project `gdcyztbupojpmbnsnmwr`)
1. `phase2_core_schema` — 17 tables, checks, indexes, `set_updated_at()` triggers, RLS enabled on all.
2. `phase2_auth_and_role_helpers` — `has_role`/`is_store_member`/`owns_link`/`is_campaign_store_member` (SECURITY DEFINER, `search_path=''`), `handle_new_user` + `on_auth_user_created` trigger.
3. `phase2_rls_policies` — §5.3 policies (reads scoped to owner/member/admin; privileged writes left to service-role).
4. `phase2_advisor_hardening` — FK covering indexes, revoked `anon`/public RPC on definer fns, split `FOR ALL` admin policies.

### Accepted advisor warnings (do NOT "fix" — would break RLS)
`get_advisors security` reports `authenticated_security_definer_function_executable`
for `has_role`, `is_store_member`, `owns_link`, `is_campaign_store_member`. This is
**intentional**: RLS policies must call these as the `authenticated` role, and each
only inspects `auth.uid()` (reveals the *caller's own* access — no leak/escalation).
Switching them to SECURITY INVOKER would cause RLS recursion. `unused_index` INFOs
are day-0 noise (no traffic yet).

### Working log
- **2026-06-29:** Phase 2 kicked off. Confirmed DB empty. Verified changelog/docs.
- **2026-06-29:** Applied migrations 1–4 above. `list_tables` confirms 17 tables, RLS
  on. Security advisors clean except the 4 accepted helper warnings noted above.
  Generated + saved DB types. **Next:** storage buckets, then install SDK + real
  client/middleware helpers + per-service runtime + real `authService`.
- **2026-06-29:** Storage buckets created. Installed `@supabase/ssr` +
  `@supabase/supabase-js` (pinned). Wrote real client/server/service-role +
  middleware helpers + root `middleware.ts`; converted `pick()` to the named
  per-service form; implemented the real `authService`. `typecheck` + `lint` +
  `build` all green (app still ran on mock at this point).
- **2026-06-29:** Completed signup, role-based middleware, access-denied page, auth callback route.
  Real Supabase adapters for stores/campaigns/links/orders/analytics; resolver + store-connect
  API routes; link code claim/release RPCs; extended seed script. `npm run build` green.
  **Next:** set `NEXT_PUBLIC_LIVE_SERVICES=auth,stores,campaigns,links,orders,analytics` in `.env`
  and smoke-test portals end-to-end; then Phase 3 hardening.

---

## How to run

```bash
npm install        # done (node_modules present)
npm run dev        # start dev server
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build (final gate)
```

Entry: `/` login gateway → `/login`.

Temporary hardcoded credentials until Supabase Auth lands:

- `user@pintap.com` / `Pintap2026!` → `/app`
- `merchant@pintap.com` / `Pintap2026!` → `/merchant`
- `admin@pintap.com` / `Pintap2026!` → `/admin`

---

## Architecture decisions / adaptations (READ FIRST)

These adapt the requirements doc to the **Nova boilerplate** conventions the repo
already uses. Intentional, documented deviations:

1. **No `src/` directory.** The boilerplate keeps `app/`, `components/`, `lib/`,
   `context/` at the repo root with path alias `@/*` → `./*`. The doc says
   `src/services/*`; we use root-level **`services/*`** to match the boilerplate.
2. **Services are isomorphic, mock-first, client-importable.** Each `services/*.ts`
   exposes a typed interface + a mock implementation backed by an in-memory store
   (`lib/mock/store.ts`). Mutations persist for the browser session and are
   mirrored to localStorage, so create-link / reserve-code / click-count workflows
   are fully clickable without a backend. Phase 2+ swaps in real impls behind the
   same interface when `MOCK_DATA_ENABLED` is false. **No UI component imports
   mock arrays directly.**
3. **Data pages are client components** (`"use client"`) that load via services in
   `useEffect`, enabling skeletons/empty/error states cleanly.
4. **Money** is stored in integer minor units (`*Minor`) per the schema; format with
   `lib/format.ts`.
5. **Backend SDKs not installed yet.** `lib/supabase/*` and server helpers are env-guarded
   **placeholders** (no SDK imports) where needed so the build stays green in Phase 1.
   Real clients land in Phase 2+.
6. **Boilerplate placeholders replaced:** the demo `app/api/{auth,user,admin}/*`
   routes and `lib/{auth,user,admin}Api.ts` conflicted with the Supabase/service
   architecture and were removed in favor of the service layer.
7. **Mock writes persist across route reloads.** `lib/mock/store.ts` mirrors the
   mutable mock DB to `localStorage` after service writes. This is required for
   Phase 1 flows like create-link → resolver preview, because `/l/[shortcode]`
   can be reached through a full route/document navigation. Clear
   browser localStorage or call `resetDb()` from `lib/mock/store.ts` to restore
   seed data.
8. **Product-facing mock/demo affordances removed.** The frontend still uses
   populated mock data, but visible demo launchers, role-switch pills, fake
   webhook/import/reset controls, fake funding/payout actions, and
   "mock/demo/Phase" UI copy were removed before backend integration begins.

---

## Phase 0 — Project Setup ✅

- [x] Next.js app with TypeScript + Tailwind (Nova boilerplate base)
- [x] Add Plus Jakarta Sans (`app/layout.tsx`, `--font-jakarta`)
- [x] Add brand tokens (`app/globals.css` `@theme` §9.1)
- [x] Route groups for public/app/merchant/admin/resolver/api
- [x] Mock service layer + seed data (`services/*`, `lib/mock/*`)
- [x] Supabase client/server helpers — env-guarded placeholders (`lib/supabase/*`)
- [x] Lint/typecheck scripts (`package.json`: `lint`, `typecheck`)
- [x] `.env.example` with §12 variables (+ `.gitignore` exception)

## Phase 1 — Frontend MVP With Mock Data

- [x] UI component library (`components/ui/*`, §9.4) + nav shells (`components/portal`, `components/recommender`)
- [x] Landing (`/`) + Auth screens (`/login`, `/auth/callback`, `/auth/verify`)
- [x] Hardcoded credential routing for user/merchant/admin until Supabase Auth
- [x] Recommender home (`/app`)
- [x] Discover stores/campaigns (`/app/discover`)
- [x] Create link flow (`/app/create-link`)
- [x] My Links list + detail (`/app/links`, `/app/links/[id]`)
- [x] Resolver page (`/l/[shortcode]`)
- [x] Recommender orders / payouts / profile / help
- [x] Merchant onboarding UI (`/merchant/onboarding`)
- [x] Merchant dashboard (`/merchant`)
- [x] Campaign list/create/detail (`/merchant/campaigns*`)
- [x] Merchant store / orders / billing / settings
- [x] Admin dashboard (`/admin`)
- [x] Admin tables: users/stores/campaigns/links/orders/payouts/activity/settings
- [x] Responsive mobile + desktop QA
- [x] `npm run typecheck`, `npm run lint`, and `npm run build` green

---

## File map (created so far)

| Area | Path | Status |
| ---- | ---- | ------ |
| Tokens/fonts | `app/globals.css`, `app/layout.tsx` | done |
| Config / types | `lib/config.ts`, `lib/types.ts` | done |
| Pure helpers | `lib/utils.ts`, `lib/format.ts`, `lib/shortcode.ts`, `lib/url-utils.ts` | done |
| Mock layer | `lib/mock/{seed,store,queries,mutations}.ts` | done |
| Services | `services/{auth,links,campaigns,stores,orders,payouts,analytics,activity,index,_runtime}.ts` | done |
| Backend placeholders | `lib/supabase/{client,server}.ts` | done |
| Env | `.env.example` | done |
| UI primitives | `components/ui/*` | done |
| Recommender shell/pages | `components/recommender/*`, `app/app/*` | done |
| Merchant shell/pages | `components/merchant/*`, `app/merchant/*` | done |
| Admin shell/pages | `components/portal/*`, `app/admin/*` | done |
| Resolver | `app/l/[shortcode]/page.tsx` | done |

---

## Handoff notes / next steps

**Done:** Phase 0 + Phase 1 frontend MVP. The app has populated data for
recommender, merchant, admin, and resolver surfaces. Product-facing demo/mock
affordances have been cleaned up: `/` is a login gateway, `/login` uses
hardcoded temporary credentials, role-switch pills are removed, and fake backend
simulation controls are hidden or disabled.

**Verification completed:**
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- Browser smoke: landing, auth, recommender, merchant, admin, and seeded resolver
  routes render without console errors.
- Responsive smoke: `/app`, `/app/links`, `/merchant`, `/admin`, and `/l/Aur0Sp11`
  checked at phone width; recommender mobile header overflow fixed.
- Create-link flow was exercised through verify + create; mock DB persistence was
  then added so newly created short links remain resolvable after route reloads.
- Cleanup pass removed visible `mock`, `demo`, `Phase`, `MVP`, role switcher,
  fake webhook/import/reset, and fake funding/payout action copy from `app/`,
  `components/`, and `context/`.
- Post-cleanup verification on 2026-06-29: `npm run typecheck`, `npm run lint`,
  and `npm run build` all pass.

**Next phase:** Begin Phase 2 — Supabase Cloud Auth/database. Keep the existing
service interfaces and replace mock implementations one service at a time.
Start with auth/profile/role reads, then stores/campaigns/links, then orders and
ledger. Do not expose service-role keys to client components.

**Watch-outs:** Mock data can now persist in browser localStorage. If populated
data looks different from seed state, clear localStorage key `pintap:mock-db:v1`
from dev tools. Mock images use `<img>` wrappers (`Avatar`, `Thumb`) intentionally.
