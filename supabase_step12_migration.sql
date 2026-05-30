-- ============================================================
--  Forage – Step 12 Migration
--  Run in Supabase SQL Editor after previous migrations.
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- Add rating (1–5), meal_type, and calorie snapshot to cook_history.
-- All columns are nullable so existing rows are unaffected.

alter table public.cook_history
  add column if not exists rating             smallint check (rating between 1 and 5),
  add column if not exists meal_type          text check (meal_type in ('breakfast','lunch','dinner','snack')),
  add column if not exists calories_per_serving numeric;
