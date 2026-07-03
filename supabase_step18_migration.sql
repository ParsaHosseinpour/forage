-- ============================================================
--  Forage – Step 18 Migration: Nutrition columns + Food.com import support
--  Run in Supabase SQL Editor.
--  https://supabase.com/dashboard/project/_/sql
-- ============================================================
--
-- Prerequisite for scripts/import-foodcom.py.
--
-- The `recipes` table has no nutrition columns at all today — Forage has
-- shown a nutrition strip in RecipeDetail.jsx since early on, but it has
-- always rendered nothing because there was never a `nutrition` field to
-- read (TheMealDB, our only source until now, doesn't provide it either).
--
-- The Food.com dataset (huggingface.co/datasets/AkashPS11/recipes_data_food.com,
-- MIT licensed, 522k+ recipes) provides real per-recipe macros for the vast
-- majority of rows: Calories, FatContent, SaturatedFatContent,
-- CholesterolContent, SodiumContent, CarbohydrateContent, FiberContent,
-- SugarContent, ProteinContent — all as clean floats, already computed.
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.recipes
  add column if not exists calories        numeric,
  add column if not exists protein_g       numeric,
  add column if not exists carbs_g         numeric,
  add column if not exists fat_g           numeric,
  add column if not exists saturated_fat_g numeric,
  add column if not exists sugar_g         numeric,
  add column if not exists fiber_g         numeric,
  add column if not exists sodium_mg       numeric,
  add column if not exists cholesterol_mg  numeric;

-- Index for future "sort by calories" / nutrition-based filtering.
-- Partial index (WHERE calories IS NOT NULL) keeps it small since a
-- meaningful fraction of any recipe dataset lacks nutrition data.
create index if not exists recipes_calories_idx
  on public.recipes(calories)
  where calories is not null;

-- Update search_by_ingredients to also return the new nutrition columns,
-- so RecipeDetail's nutrition strip has real data to render without a
-- second round-trip per recipe.
create or replace function public.search_by_ingredients(
  p_ingredients text[],
  p_limit       integer default 20,
  p_diet        text    default null,
  p_max_time    integer default null
)
returns table (
  id               bigint,
  source_id        text,
  title            text,
  ingredients      text[],
  ingredient_lines text[],
  instructions     text,
  image_url        text,
  source_url       text,
  cook_time        integer,
  servings         integer,
  tags             text[],
  cuisine          text,
  used_count       integer,
  miss_count       integer,
  calories         numeric,
  protein_g        numeric,
  carbs_g          numeric,
  fat_g            numeric
)
language sql stable
as $$
  with
    norm_input as (
      select array_agg(public.normalize_ingredient(i)) as items
      from unnest(p_ingredients) i
      where trim(i) != ''
    ),
    candidates as (
      select r.*
      from public.recipes r, norm_input
      where
        r.ingredients && norm_input.items
        and (p_diet    is null or r.tags @> array[lower(p_diet)])
        and (p_max_time is null or r.cook_time is null or r.cook_time <= p_max_time)
    )
  select
    c.id, c.source_id, c.title, c.ingredients, c.ingredient_lines,
    c.instructions, c.image_url, c.source_url, c.cook_time, c.servings,
    c.tags, c.cuisine,

    (select count(*)::integer
     from unnest((select items from norm_input)) inp
     where exists (
       select 1 from unnest(c.ingredients) ri
       where public.ingredient_matches(inp, ri)
     )
    ) as used_count,

    (select count(*)::integer
     from unnest(c.ingredients) ri
     where not exists (
       select 1 from unnest((select items from norm_input)) inp
       where public.ingredient_matches(inp, ri)
     )
    ) as miss_count,

    c.calories, c.protein_g, c.carbs_g, c.fat_g

  from candidates c, norm_input
  order by used_count desc, miss_count asc
  limit p_limit
$$;
