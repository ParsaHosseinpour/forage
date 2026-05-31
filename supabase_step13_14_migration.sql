-- ============================================================
--  Forage – Step 13 & 14 Migration
--  Run in Supabase SQL Editor after previous migrations.
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- ─── 1. MEAL PLAN TABLE (Step 14) ────────────────────────────────────────────
--
-- One row per scheduled recipe slot.
-- week_start is stored as a DATE so we can easily fetch the current week.
-- slot_day: 0=Monday … 6=Sunday
-- slot_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'

create table if not exists public.meal_plan (
  id           bigint generated always as identity primary key,
  user_id      uuid   not null references auth.users(id) on delete cascade,
  week_start   date   not null,          -- ISO date of Monday for this week
  slot_day     smallint not null          -- 0 = Mon, 6 = Sun
                check (slot_day between 0 and 6),
  slot_type    text   not null
                check (slot_type in ('breakfast','lunch','dinner','snack')),
  recipe_json  jsonb  not null,          -- full recipe snapshot
  recipe_id    text   not null,
  created_at   timestamptz default now()
);

alter table public.meal_plan enable row level security;

create policy "Users manage their own plan"
  on public.meal_plan for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists meal_plan_user_week_idx
  on public.meal_plan(user_id, week_start);
