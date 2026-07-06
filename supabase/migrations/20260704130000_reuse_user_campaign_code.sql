-- One recommender + one campaign = one coupon code, shared across all of that
-- user's product links for the campaign. Creating a second link for the same
-- campaign reuses the existing code instead of claiming another from the pool.

create or replace function public.claim_discount_code_for_link(p_campaign_id uuid, p_link_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid;
  v_link public.links%rowtype;
  v_code_id uuid;
  v_store_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_link from public.links where id = p_link_id for update;
  if not found or v_link.user_id <> v_uid then
    raise exception 'Link not found';
  end if;

  select c.store_id into v_store_id
  from public.campaigns c
  where c.id = p_campaign_id and c.status = 'active';

  if v_store_id is null then
    raise exception 'Campaign not available';
  end if;

  if v_link.store_id is not null and v_link.store_id <> v_store_id then
    raise exception 'Campaign must belong to the same store as the link';
  end if;

  if v_link.campaign_id = p_campaign_id and v_link.discount_code_id is not null then
    return v_link.discount_code_id;
  end if;

  -- Switching campaigns: release the old code only if no other active link uses it.
  if v_link.discount_code_id is not null
     and v_link.campaign_id is distinct from p_campaign_id then
    if not exists (
      select 1 from public.links
      where user_id = v_uid
        and discount_code_id = v_link.discount_code_id
        and status = 'active'
        and id <> p_link_id
    ) then
      update public.campaign_discount_codes
      set status = 'released', claimed_by_link_id = null
      where id = v_link.discount_code_id;
    end if;
  end if;

  -- Reuse this user's existing code for the campaign (do not take a new coupon).
  select l.discount_code_id into v_code_id
  from public.links l
  where l.user_id = v_uid
    and l.campaign_id = p_campaign_id
    and l.discount_code_id is not null
    and l.status = 'active'
    and l.id <> p_link_id
  limit 1;

  if v_code_id is not null then
    update public.links
    set campaign_id = p_campaign_id,
        discount_code_id = v_code_id,
        store_id = v_store_id,
        updated_at = now()
    where id = p_link_id;
    return v_code_id;
  end if;

  -- First link for this user + campaign: claim a fresh code from the pool.
  select id into v_code_id
  from public.campaign_discount_codes
  where campaign_id = p_campaign_id and status in ('available', 'released')
  order by created_at
  limit 1
  for update skip locked;

  if v_code_id is null then
    raise exception 'No discount codes available';
  end if;

  update public.campaign_discount_codes
  set status = 'claimed', claimed_by_link_id = p_link_id
  where id = v_code_id;

  update public.links
  set campaign_id = p_campaign_id,
      discount_code_id = v_code_id,
      store_id = v_store_id,
      updated_at = now()
  where id = p_link_id;

  return v_code_id;
end;
$function$;

create or replace function public.release_discount_code_for_link(p_link_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid;
  v_link public.links%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_link from public.links where id = p_link_id for update;
  if not found or v_link.user_id <> v_uid then
    raise exception 'Link not found';
  end if;

  if v_link.discount_code_id is not null then
    -- Only return the code to the pool when this user has no other active links
    -- still using it.
    if not exists (
      select 1 from public.links
      where user_id = v_uid
        and discount_code_id = v_link.discount_code_id
        and status = 'active'
        and id <> p_link_id
    ) then
      update public.campaign_discount_codes
      set status = 'released', claimed_by_link_id = null
      where id = v_link.discount_code_id;
    end if;
  end if;

  update public.links
  set campaign_id = null,
      discount_code_id = null,
      updated_at = now()
  where id = p_link_id;
end;
$function$;
