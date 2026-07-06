-- Client backlog: user-initiated payout requests. A recommender with a saved
-- bank account can move their available balance into a payout batch with
-- status 'requested'; admin then marks it paid (or cancels it) with the
-- existing manual-payout tools.

alter table public.payout_batches
  drop constraint payout_batches_status_check;
alter table public.payout_batches
  add constraint payout_batches_status_check
  check (status = any (array['draft', 'requested', 'queued', 'paid', 'failed', 'canceled']));

-- User-scoped twin of admin_queue_payout().
create or replace function public.request_payout()
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid;
  v_batch_id uuid;
  v_amount bigint;
  v_currency text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.payout_accounts
    where user_id = v_user and payouts_enabled and iban is not null
  ) then
    raise exception 'Add your bank details before requesting a payout';
  end if;

  -- Lock the user's available entries so concurrent requests can't double-book.
  perform 1 from public.commission_ledger_entries
  where user_id = v_user and status = 'available'
  for update;

  select coalesce(sum(amount_minor), 0), min(currency)
  into v_amount, v_currency
  from public.commission_ledger_entries
  where user_id = v_user and status = 'available';

  if v_amount <= 0 then
    raise exception 'No available balance to pay out';
  end if;

  insert into public.payout_batches (user_id, amount_minor, currency, status)
  values (v_user, v_amount, v_currency, 'requested')
  returning id into v_batch_id;

  update public.commission_ledger_entries
  set type = 'payout_pending',
      status = 'pending',
      metadata = metadata || jsonb_build_object('payoutBatchId', v_batch_id)
  where user_id = v_user and status = 'available';

  return v_batch_id;
end;
$$;

revoke all on function public.request_payout() from anon, public;
grant execute on function public.request_payout() to authenticated;

-- Admin tools now accept user-requested batches too.
create or replace function public.admin_mark_payout_paid(p_batch_id uuid, p_reference text default null::text)
returns void
language plpgsql
security definer
set search_path to ''
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
  if v_batch.status not in ('queued', 'requested') then
    raise exception 'Only queued or requested batches can be marked paid';
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
set search_path to ''
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
  if v_batch.status not in ('queued', 'requested') then
    raise exception 'Only queued or requested batches can be canceled';
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
