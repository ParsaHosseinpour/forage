-- ============================================================
--  Forage – Step 10 Migration: Cook History
--  Run in Supabase SQL Editor after previous migrations.
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

create table if not exists public.cook_history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  recipe_id   text not null,                -- recipe.id (string for cross-source compat)
  recipe_json jsonb not null,               -- snapshot at time of cooking
  cooked_at   timestamptz default now(),
  notes       text                          -- optional user note (future use)
);

alter table public.cook_history enable row level security;

create policy "Users manage their own history"
  on public.cook_history for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists cook_history_user_idx  on public.cook_history(user_id);
create index if not exists cook_history_time_idx  on public.cook_history(user_id, cooked_at desc);
