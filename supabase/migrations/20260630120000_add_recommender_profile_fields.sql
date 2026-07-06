-- Recommender profile fields for the MVP profile editor.
alter table public.profiles
  add column if not exists gender text,
  add column if not exists social_profiles jsonb not null default '[]'::jsonb;

