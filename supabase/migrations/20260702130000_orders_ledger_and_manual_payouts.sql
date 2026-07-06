-- Orders → ledger sync + manual (bank-transfer) payouts.
--
-- 1. commission_ledger_entries are now maintained automatically from
--    link_order_attributions via trigger, so the external order-ingest API
--    (Cloud Run, see ingest.md) produces payable balances without changes.
-- 2. payout_accounts becomes a manual bank-details record (IBAN/BIC) that the
--    recommender writes and the admin reads; Stripe-era external_account_id is
--    now optional.
-- 3. Recommenders can read the discount codes their own links claimed.
-- 4. campaign_code_counts(): aggregate-only counts for recommender-facing UIs
--    (RLS hides the code rows themselves from non-members).
-- 5. admin_* RPCs: atomic, SECURITY DEFINER, admin-gated payout queue / mark
--    paid / cancel and attribution status management.

-- ---------------------------------------------------------------------------
-- 1. Payout accounts: manual bank transfer details
-- ---------------------------------------------------------------------------

alter table public.payout_accounts
  alter column external_account_id drop not null;

alter table public.payout_accounts
  add column if not exists method text not null default 'bank_transfer',
  add column if not exists account_holder text,
  add column if not exists iban text,
  add column if not exists bic text,
  add column if not exists bank_name text;

-- Users manage their own payout account (admin keeps read via existing policy).
drop policy if exists payout_accounts_insert_own on public.payout_accounts;
create policy payout_accounts_insert_own
  on public.payout_accounts for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists payout_accounts_update_own on public.payout_accounts;
create policy payout_accounts_update_own
  on public.payout_accounts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Recommenders can see the code their own link claimed
-- ---------------------------------------------------------------------------

drop policy if exists cdc_select_claimed_owner on public.campaign_discount_codes;
create policy cdc_select_claimed_owner
  on public.campaign_discount_codes for select to authenticated
  using (
    claimed_by_link_id is not null
    and public.owns_link(claimed_by_link_id)
  );

-- ---------------------------------------------------------------------------
-- 3. Aggregate-only code counts for any authenticated user
-- ---------------------------------------------------------------------------

create or replace function public.campaign_code_counts(p_campaign_ids uuid[])
returns table (
  campaign_id uuid,
  codes_total integer,
  codes_available integer,
  codes_claimed integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.campaign_id,
    count(*)::int,
    count(*) filter (where c.status = 'available')::int,
    count(*) filter (where c.status = 'claimed')::int
  from public.campaign_discount_codes c
  where c.campaign_id = any (p_campaign_ids)
  group by c.campaign_id;
$$;

revoke all on function public.campaign_code_counts(uuid[]) from anon;
grant execute on function public.campaign_code_counts(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Ledger sync: one ledger entry per attribution, kept in step with status
-- ---------------------------------------------------------------------------

-- Fast lookup of the entries included in a payout batch.
create index if not exists idx_ledger_payout_batch
  on public.commission_ledger_entries ((metadata ->> 'payoutBatchId'));

create or replace function public.sync_ledger_for_attribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_store uuid;
  v_entry public.commission_ledger_entries%rowtype;
  v_type text;
  v_status text;
begin
  select l.user_id, l.store_id into v_user, v_store
  from public.links l where l.id = new.link_id;
  if v_user is null then
    return new;
  end if;

  if new.status = 'confirmed' then
    v_type := 'earned'; v_status := 'available';
  elsif new.status = 'pending' then
    v_type := 'earned'; v_status := 'pending';
  else -- canceled / returned
    v_type := 'reversed'; v_status := 'reversed';
  end if;

  select * into v_entry
  from public.commission_ledger_entries
  where attribution_id = new.id
    and (metadata ->> 'compensates') is null
  order by created_at
  limit 1;

  if not found then
    insert into public.commission_ledger_entries
      (user_id, store_id, link_id, attribution_id, type, amount_minor,
       currency, status, available_at, metadata)
    values
      (v_user, v_store, new.link_id, new.id, v_type,
       new.commission_amount_minor, new.currency, v_status,
       case when v_status = 'available' then now() end, '{}'::jsonb);
  elsif v_entry.type in ('payout_pending', 'paid') then
    -- Already paid out or locked in a queued batch: never mutate — write a
    -- compensating entry when the order is reversed after payout.
    if v_type = 'reversed' and not exists (
      select 1 from public.commission_ledger_entries
      where (metadata ->> 'compensates') = v_entry.id::text
    ) then
      insert into public.commission_ledger_entries
        (user_id, store_id, link_id, attribution_id, type, amount_minor,
         currency, status, available_at, metadata)
      values
        (v_user, v_store, new.link_id, new.id, 'reversed',
         -v_entry.amount_minor, new.currency, 'available', now(),
         jsonb_build_object('compensates', v_entry.id));
    end if;
  else
    update public.commission_ledger_entries
    set type = v_type,
        status = v_status,
        amount_minor = new.commission_amount_minor,
        available_at = case
          when v_status = 'available' then coalesce(available_at, now())
          else available_at
        end
    where id = v_entry.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_loa_sync_ledger on public.link_order_attributions;
create trigger trg_loa_sync_ledger
  after insert or update of status, commission_amount_minor, currency
  on public.link_order_attributions
  for each row execute function public.sync_ledger_for_attribution();

-- Backfill entries for attributions ingested before this migration.
insert into public.commission_ledger_entries
  (user_id, store_id, link_id, attribution_id, type, amount_minor,
   currency, status, available_at)
select
  l.user_id, l.store_id, a.link_id, a.id,
  case when a.status in ('canceled', 'returned') then 'reversed' else 'earned' end,
  a.commission_amount_minor, a.currency,
  case
    when a.status = 'confirmed' then 'available'
    when a.status = 'pending' then 'pending'
    else 'reversed'
  end,
  case when a.status = 'confirmed' then now() end
from public.link_order_attributions a
join public.links l on l.id = a.link_id
where not exists (
  select 1 from public.commission_ledger_entries e where e.attribution_id = a.id
);

-- ---------------------------------------------------------------------------
-- 5. Admin RPCs (atomic, called with the signed-in admin's client)
-- ---------------------------------------------------------------------------

create or replace function public.admin_queue_payout(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch_id uuid;
  v_amount bigint;
  v_currency text;
begin
  if not public.has_role('admin') then
    raise exception 'Admin role required';
  end if;

  -- Lock the user's available entries so two admins can't double-queue.
  perform 1 from public.commission_ledger_entries
  where user_id = p_user_id and status = 'available'
  for update;

  select coalesce(sum(amount_minor), 0), min(currency)
  into v_amount, v_currency
  from public.commission_ledger_entries
  where user_id = p_user_id and status = 'available';

  if v_amount <= 0 then
    raise exception 'No available balance to pay out';
  end if;

  insert into public.payout_batches (user_id, amount_minor, currency, status)
  values (p_user_id, v_amount, v_currency, 'queued')
  returning id into v_batch_id;

  update public.commission_ledger_entries
  set type = 'payout_pending',
      status = 'pending',
      metadata = metadata || jsonb_build_object('payoutBatchId', v_batch_id)
  where user_id = p_user_id and status = 'available';

  return v_batch_id;
end;
$$;

create or replace function public.admin_mark_payout_paid(
  p_batch_id uuid,
  p_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.payout_batches%rowtype;
begin
  if not public.has_role('admin') then
    raise exception 'Admin role required';
  end if;

  select * into v_batch from public.payout_batches
  where id = p_batch_id for update;
  if not found then
    raise exception 'Payout batch not found';
  end if;
  if v_batch.status <> 'queued' then
    raise exception 'Only queued batches can be marked paid';
  end if;

  update public.payout_batches
  set status = 'paid',
      paid_at = now(),
      transfer_reference = coalesce(p_reference, transfer_reference)
  where id = p_batch_id;

  update public.commission_ledger_entries
  set type = 'paid', status = 'paid'
  where (metadata ->> 'payoutBatchId') = p_batch_id::text;
end;
$$;

create or replace function public.admin_cancel_payout(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.payout_batches%rowtype;
begin
  if not public.has_role('admin') then
    raise exception 'Admin role required';
  end if;

  select * into v_batch from public.payout_batches
  where id = p_batch_id for update;
  if not found then
    raise exception 'Payout batch not found';
  end if;
  if v_batch.status <> 'queued' then
    raise exception 'Only queued batches can be canceled';
  end if;

  update public.payout_batches
  set status = 'canceled'
  where id = p_batch_id;

  -- Release the held entries back to the available balance.
  update public.commission_ledger_entries
  set type = case when amount_minor < 0 then 'reversed' else 'earned' end,
      status = 'available',
      metadata = metadata - 'payoutBatchId'
  where (metadata ->> 'payoutBatchId') = p_batch_id::text;
end;
$$;

create or replace function public.admin_set_attribution_status(
  p_attribution_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Admin role required';
  end if;
  if p_status not in ('pending', 'confirmed', 'canceled', 'returned') then
    raise exception 'Invalid status %', p_status;
  end if;

  update public.link_order_attributions
  set status = p_status
  where id = p_attribution_id;
  if not found then
    raise exception 'Order attribution not found';
  end if;
end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_queue_payout(uuid)',
    'admin_mark_payout_paid(uuid, text)',
    'admin_cancel_payout(uuid)',
    'admin_set_attribution_status(uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
