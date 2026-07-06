# Next.js Boilerplate Nova

A minimal, opinionated Next.js boilerplate with layouts, API routes, and a clean project structure — ready to build on.

## Tech Stack & Versions

| Package      | Version |
| ------------ | ------- |
| Next.js      | 16.1    |
| React        | 19.2    |
| React DOM    | 19.2    |
| TypeScript   | 5.x     |
| Tailwind CSS | 4.x     |
| ESLint       | 9.x     |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

## Tailwind CSS Setup

This project uses **Tailwind CSS v4** with PostCSS — no `tailwind.config` file needed.

Tailwind is imported in `app/globals.css`:

```css
@import "tailwindcss";
```

All utility classes work out of the box. Use `@theme` in `globals.css` to customize design tokens.

## Project Structure

```
app/
├── layout.tsx                   # Root layout (fonts, providers, global shell)
├── globals.css                  # Global styles + Tailwind import
│
├── (user)/                      # Route group — public-facing pages
│   ├── layout.tsx               # User layout (Navbar + Footer)
│   ├── page.tsx                 # Home page (/)
│   └── about/
│       └── page.tsx             # About page (/about)
│
├── admin/                       # Admin section (/admin)
│   ├── layout.tsx               # Admin layout (Sidebar)
│   ├── page.tsx                 # Dashboard (/admin)
│   ├── users/
│   │   └── page.tsx             # Users page (/admin/users)
│   └── settings/
│       └── page.tsx             # Settings page (/admin/settings)
│
└── api/                         # Backend API routes
    ├── auth/
    │   ├── login/route.ts       # POST /api/auth/login
    │   ├── register/route.ts    # POST /api/auth/register
    │   └── logout/route.ts      # POST /api/auth/logout
    ├── user/
    │   └── profile/route.ts     # GET & PATCH /api/user/profile
    └── admin/
        ├── users/route.ts       # GET /api/admin/users
        └── stats/route.ts       # GET /api/admin/stats

components/
├── shared/                      # Shared/reusable components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── Sidebar.tsx
├── home/                        # Components specific to the Home page
│   └── Hero.tsx
└── dashboard/                   # Components specific to Admin pages
    └── Cards.tsx

context/
└── AppProvider.tsx               # Global React context provider

lib/
├── adminApi.ts                   # Admin API integration helpers
├── userApi.ts                    # User API integration helpers
└── authApi.ts                    # Auth API integration helpers

public/                           # Static assets
```

## Conventions

### Routing (`app/`)

Next.js uses **file-based routing**. Each `page.tsx` in the `app/` directory becomes a route automatically. No router configuration needed.

- **Route groups** — Folders wrapped in parentheses like `(user)` create a shared layout without affecting the URL. The `(user)` group renders the public Navbar + Footer layout for `/`, `/about`, etc.
- **Regular folders** — Folders like `admin/` add a URL segment. Everything under `app/admin/` is served at `/admin/*`.

### Layouts (`app/**/layout.tsx`)

Layouts are the Next.js equivalent of React Router's `<Outlet />`. Each `layout.tsx` wraps its child routes automatically:

- **Root layout** (`app/layout.tsx`) — Wraps the entire app. Includes fonts, global providers, and `<html>`/`<body>` tags.
- **User layout** (`app/(user)/layout.tsx`) — Navbar + Footer for public pages. The `(user)` route group keeps the URL clean (no `/user` prefix).
- **Admin layout** (`app/admin/layout.tsx`) — Sidebar for admin pages. All child routes under `/admin` get this layout.

### Components (`components/`)

- **`shared/`** — Reusable components used across multiple pages (Navbar, Footer, Sidebar, etc.).
- **`<page>/`** — Page-specific components grouped by feature/page name. For example, components only used on the Home page go in `components/home/`.

### Context Providers (`context/`)

Global and feature-level React context providers. The root `AppProvider` is wrapped around the entire app in `app/layout.tsx`. Must be a client component (`"use client"`).

### API Routes (`app/api/`)

Next.js API routes act as your **backend**. Each `route.ts` file exports named functions for HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`). These run server-side and never ship to the client.

```
app/api/
├── auth/           # Authentication endpoints
├── user/           # User-related endpoints
└── admin/          # Admin-related endpoints
```

All route handlers use `NextResponse` from `next/server` and follow REST conventions.

### API Integration Helpers (`lib/`)

Client-side API integration code follows the naming pattern `*Api.ts`:

- `adminApi.ts` — Admin-related API calls
- `userApi.ts` — User-related API calls
- `authApi.ts` — Auth-related API calls

Each file exports functions that handle `fetch` requests. Keep API logic out of components — import from `lib/` instead.

### Environment Variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_*` — Exposed to the browser.
- All others — Server-only (accessible in API routes and server components).
