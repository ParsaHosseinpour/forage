-- ============================================================
--  Forage – Step 5 Migration
--  Run this in the Supabase SQL Editor after the initial migration.
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- ─── 4. SAVED RECIPES ────────────────────────────────────────────────────────
-- Stores the full recipe card JSON so we never need to re-fetch Spoonacular
-- for saved recipes. Enforces one row per user+recipe combo.

create table if not exists public.saved_recipes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  recipe_id   integer     not null,
  recipe_json jsonb       not null,   -- full card data incl. missedIngredients
  saved_at    timestamptz default now(),
  constraint  saved_recipes_unique unique (user_id, recipe_id)
);

alter table public.saved_recipes enable row level security;

create policy "Users manage their own saved recipes"
  on public.saved_recipes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists saved_recipes_user_idx
  on public.saved_recipes(user_id, saved_at desc);


-- ─── 5. SHOPPING CHECKS ──────────────────────────────────────────────────────
-- Tracks which shopping-list items the user has ticked off.
-- The list itself is derived client-side from saved_recipes.missedIngredients;
-- this table only stores the checked state so it survives page refreshes.

create table if not exists public.shopping_checks (
  user_id         uuid  not null references auth.users(id) on delete cascade,
  ingredient_name text  not null,
  primary key (user_id, ingredient_name)
);

alter table public.shopping_checks enable row level security;

create policy "Users manage their own shopping checks"
  on public.shopping_checks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
