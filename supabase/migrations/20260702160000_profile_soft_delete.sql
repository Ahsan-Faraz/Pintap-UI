-- Account soft-delete (client req 2026-07-02): users can delete their account,
-- but the profile row must survive for admin/payment history. The auth user is
-- banned via the service-role API in /api/auth/delete-account, not here.

alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Set when the user deletes their account. Row is kept for payment/audit history; the auth user is banned so they cannot sign in again.';
