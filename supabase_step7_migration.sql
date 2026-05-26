-- ============================================================
--  Forage – Step 7 Migration
--  Run in Supabase SQL Editor after the previous migrations.
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- Add pantry_staples to profiles
-- Stored as a JSON array of ingredient name strings, e.g. ["salt","olive oil"]
-- Defaults to empty so existing users are unaffected.

alter table public.profiles
  add column if not exists pantry_staples jsonb not null default '[]'::jsonb;
