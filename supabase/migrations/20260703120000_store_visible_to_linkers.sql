-- Client feedback 2026-07-03: shops auto-created from a user's link (no
-- merchant yet: connected=false, status='pending') were visible in admin but
-- NOT to the user who created the link — stores_select_visible only allowed
-- connected/active/member/admin. Let users see every store they hold a link
-- with, regardless of merchant/connection status.

-- security definer so the policy check bypasses links RLS (and avoids any
-- stores<->links policy recursion), mirroring is_store_member().
create or replace function public.user_has_link_with_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from links
    where links.store_id = p_store_id
      and links.user_id = auth.uid()
  );
$$;

revoke all on function public.user_has_link_with_store(uuid) from anon, public;
grant execute on function public.user_has_link_with_store(uuid) to authenticated;

drop policy if exists stores_select_visible on public.stores;
create policy stores_select_visible on public.stores
  for select to authenticated
  using (
    connected
    or status = 'active'
    or is_store_member(id)
    or has_role('admin')
    or user_has_link_with_store(id)
  );
