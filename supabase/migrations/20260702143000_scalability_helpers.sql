-- Scalability helpers for aggregate reads and bounded external preview caching.

create table if not exists public.og_image_cache (
  url_hash text primary key,
  page_url text not null,
  image_url text,
  fetched_at timestamptz not null default now()
);

alter table public.og_image_cache enable row level security;

drop policy if exists og_image_cache_admin_all on public.og_image_cache;
create policy og_image_cache_admin_all
  on public.og_image_cache for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create index if not exists idx_og_image_cache_fetched_at
  on public.og_image_cache (fetched_at);

create or replace function public.link_click_counts(p_link_ids uuid[])
returns table (
  link_id uuid,
  clicks bigint
)
language sql
security definer
set search_path = public
as $$
  select lc.link_id, count(*)::bigint as clicks
  from public.link_clicks lc
  join public.links l on l.id = lc.link_id
  where lc.link_id = any(p_link_ids)
    and (
      l.user_id = auth.uid()
      or public.has_role('admin')
      or (l.store_id is not null and public.is_store_member(l.store_id))
    )
  group by lc.link_id;
$$;

revoke all on function public.link_click_counts(uuid[]) from anon;
grant execute on function public.link_click_counts(uuid[]) to authenticated;

create or replace function public.admin_kpis()
returns table (
  users bigint,
  connected_stores bigint,
  active_campaigns bigint,
  links bigint,
  clicks bigint,
  orders bigint,
  commission_owed_minor bigint,
  payout_pending_minor bigint,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    (select count(*) from public.profiles)::bigint,
    (select count(*) from public.stores where connected = true)::bigint,
    (select count(*) from public.campaigns where status = 'active')::bigint,
    (select count(*) from public.links where status <> 'deleted')::bigint,
    (select count(*) from public.link_clicks)::bigint,
    (select count(*) from public.link_order_attributions)::bigint,
    coalesce((
      select sum(greatest(amount_minor, 0))::bigint
      from public.commission_ledger_entries
      where status in ('pending', 'available')
    ), 0),
    coalesce((
      select sum(amount_minor)::bigint
      from public.payout_batches
      where status in ('queued', 'draft')
    ), 0),
    coalesce((
      select min(currency)
      from public.commission_ledger_entries
      where status in ('pending', 'available')
    ), 'EUR');
end;
$$;

revoke all on function public.admin_kpis() from anon;
grant execute on function public.admin_kpis() to authenticated;

create or replace function public.admin_payable_users()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  available_minor bigint,
  pending_minor bigint,
  currency text,
  account_id uuid,
  account_holder text,
  iban text,
  bic text,
  bank_name text,
  payouts_enabled boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
  with ledger as (
    select
      cle.user_id,
      sum(cle.amount_minor) filter (where cle.status = 'available')::bigint as available_minor,
      sum(cle.amount_minor) filter (where cle.status = 'pending')::bigint as pending_minor,
      min(cle.currency) as currency
    from public.commission_ledger_entries cle
    where cle.status in ('available', 'pending')
    group by cle.user_id
    having
      coalesce(sum(cle.amount_minor) filter (where cle.status = 'available'), 0) > 0
      or coalesce(sum(cle.amount_minor) filter (where cle.status = 'pending'), 0) > 0
  )
  select
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    coalesce(l.available_minor, 0),
    coalesce(l.pending_minor, 0),
    coalesce(l.currency, 'EUR'),
    pa.id,
    pa.account_holder,
    pa.iban,
    pa.bic,
    pa.bank_name,
    coalesce(pa.payouts_enabled, false)
  from ledger l
  join public.profiles p on p.id = l.user_id
  left join public.payout_accounts pa on pa.user_id = l.user_id
  order by coalesce(l.available_minor, 0) desc;
end;
$$;

revoke all on function public.admin_payable_users() from anon;
grant execute on function public.admin_payable_users() to authenticated;
