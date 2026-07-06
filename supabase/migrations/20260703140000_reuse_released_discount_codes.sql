-- Released discount codes were stranded.
--
-- When a link is deleted, its campaign is switched, or an account is removed, its
-- discount code is set to status 'released' (claimed_by_link_id = NULL). But the
-- claim function and the count helper only ever looked at status = 'available',
-- so a released code was never re-offered — the campaign silently ran dry and the
-- Create-Link flow reported "no campaign found" even though codes existed.
--
-- Fix: treat 'released' as part of the usable pool everywhere codes are claimed
-- or counted. This also revives any codes already stuck in 'released'.

create or replace function public.claim_discount_code_for_link(p_campaign_id uuid, p_link_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
DECLARE
  v_uid uuid;
  v_link public.links%ROWTYPE;
  v_code_id uuid;
  v_store_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_link FROM public.links WHERE id = p_link_id FOR UPDATE;
  IF NOT FOUND OR v_link.user_id <> v_uid THEN
    RAISE EXCEPTION 'Link not found';
  END IF;

  SELECT c.store_id INTO v_store_id
  FROM public.campaigns c
  WHERE c.id = p_campaign_id AND c.status = 'active';

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not available';
  END IF;

  IF v_link.store_id IS NOT NULL AND v_link.store_id <> v_store_id THEN
    RAISE EXCEPTION 'Campaign must belong to the same store as the link';
  END IF;

  IF v_link.discount_code_id IS NOT NULL THEN
    UPDATE public.campaign_discount_codes
    SET status = 'released', claimed_by_link_id = NULL
    WHERE id = v_link.discount_code_id AND claimed_by_link_id = p_link_id;
  END IF;

  -- 'available' = never used, 'released' = returned to the pool. Both are claimable.
  SELECT id INTO v_code_id
  FROM public.campaign_discount_codes
  WHERE campaign_id = p_campaign_id AND status IN ('available', 'released')
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'No discount codes available';
  END IF;

  UPDATE public.campaign_discount_codes
  SET status = 'claimed', claimed_by_link_id = p_link_id
  WHERE id = v_code_id;

  UPDATE public.links
  SET campaign_id = p_campaign_id,
      discount_code_id = v_code_id,
      store_id = v_store_id,
      updated_at = now()
  WHERE id = p_link_id;

  RETURN v_code_id;
END;
$function$;

create or replace function public.campaign_code_counts(p_campaign_ids uuid[])
 returns table(campaign_id uuid, codes_total integer, codes_available integer, codes_claimed integer)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select
    c.campaign_id,
    count(*)::int,
    -- released codes are reusable, so they count as available
    count(*) filter (where c.status in ('available', 'released'))::int,
    count(*) filter (where c.status = 'claimed')::int
  from public.campaign_discount_codes c
  where c.campaign_id = any (p_campaign_ids)
  group by c.campaign_id;
$function$;
