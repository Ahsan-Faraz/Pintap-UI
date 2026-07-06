-- Enforce the 25 EUR minimum before a recommender can request a payout.

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
  v_min bigint := 2500;
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

  perform 1 from public.commission_ledger_entries
  where user_id = v_user and status = 'available'
  for update;

  select coalesce(sum(amount_minor), 0), min(currency)
  into v_amount, v_currency
  from public.commission_ledger_entries
  where user_id = v_user and status = 'available';

  if v_amount < v_min then
    raise exception 'Minimum payout amount is 25 EUR';
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
