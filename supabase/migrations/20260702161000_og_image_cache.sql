-- Server-side Open Graph scrape cache used by lib/server/og-image.ts.
-- Accessed only via the service-role client; RLS enabled with no policies
-- so anon/authenticated clients can't touch it.
create table if not exists public.og_image_cache (
  url_hash text primary key,
  page_url text not null,
  image_url text,
  fetched_at timestamptz not null default now()
);

alter table public.og_image_cache enable row level security;
