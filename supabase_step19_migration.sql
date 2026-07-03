-- ============================================================
--  Forage – Step 19 Migration: Fix search_by_ingredients timeout
--  Run in Supabase SQL Editor.
--  https://supabase.com/dashboard/project/_/sql
-- ============================================================
--
-- BUG (reported after importing 1,717 Food.com recipes):
--   "Search failed: DB search failed: canceling statement due to
--    statement timeout"
--
-- ROOT CAUSE:
-- search_by_ingredients() computed used_count/miss_count by calling
-- ingredient_matches() -- a plpgsql function that itself calls
-- normalize_ingredient() TWICE per call (once per argument) -- inside
-- TWO nested loops per candidate recipe: one loop over every fridge
-- ingredient x every recipe ingredient for used_count, a second
-- separate loop doing the same for miss_count.
--
-- With ~320 TheMealDB-only recipes and short fridge lists this was
-- invisible (low thousands of function calls total). At 1,717 recipes
-- -- especially Food.com recipes, which tend to have more ingredients
-- per recipe than TheMealDB's -- the candidate set surviving the GIN
-- pre-filter, multiplied by fridge-ingredient-count, multiplied by
-- recipe-ingredient-count, multiplied by 2 (used + miss loops), pushed
-- total plpgsql function calls into the tens/hundreds of thousands per
-- search. Supabase's default statement_timeout (8s on most tiers) killed
-- the query before it could finish. The 320-recipe database was hiding
-- a real architectural scaling problem, not causing a new one.
--
-- FIX (two changes, applied together):
--   1. Cap the CANDIDATE set with a LIMIT before the expensive matching
--      pass runs, instead of matching against every GIN-filtered row and
--      only limiting at the very end. The GIN filter can still return
--      thousands of loosely-overlapping rows; we only need to
--      precisely score a bounded number of them.
--   2. Normalize each candidate recipe's ingredients ONCE per recipe
--      instead of re-normalizing every recipe ingredient on every
--      single fridge-ingredient comparison inside ingredient_matches().
--      This removes the dominant source of redundant work.
--
-- NOTE ON A MISTAKE IN THE FIRST VERSION OF THIS FILE:
-- An earlier version of this migration also added
-- `set local statement_timeout = '20s'` as an extra safety margin. That
-- was wrong: the function is declared `stable` (it only reads data, a
-- true statement), but SET modifies session configuration, which
-- Postgres forbids inside any `stable` or `immutable` function --
-- failing with "SET is not allowed in a non-volatile function". Marking
-- the function `volatile` instead would have "fixed" the error but was
-- the wrong trade-off: it would stop Postgres from optimizing/caching a
-- function that is, in fact, read-only, undermining the actual
-- performance fix. The correct resolution was simply to remove the SET
-- line -- changes 1 and 2 above are what actually eliminate the
-- timeout; the SET was speculative "just in case" padding that was
-- never load-bearing and directly contradicted the function's own
-- `stable` contract.
-- ──────────────────────────────────────────────────────────────────────────────

drop function if exists public.search_by_ingredients(text[], integer, text, integer);

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
language plpgsql stable
as $$
begin
  return query
  with
    norm_input as (
      select array_agg(distinct public.normalize_ingredient(i)) as items
      from unnest(p_ingredients) i
      where trim(i) != ''
    ),
    -- Cap candidates BEFORE the expensive per-ingredient matching pass.
    -- The GIN overlap filter alone can return thousands of loosely
    -- related rows on a 1,700+ recipe table; we only need to precisely
    -- score a bounded number of them, not all of them.
    candidates as (
      select r.*
      from public.recipes r, norm_input
      where
        r.ingredients && norm_input.items
        and (p_diet     is null or r.tags @> array[lower(p_diet)])
        and (p_max_time is null or r.cook_time is null or r.cook_time <= p_max_time)
      -- Rough pre-sort so the recipes most likely to be relevant survive
      -- the cap: raw ingredient overlap count (cheap array op, no
      -- function calls), before the precise word-boundary scoring below.
      order by cardinality(
        array(select unnest(r.ingredients) intersect select unnest(norm_input.items))
      ) desc
      limit greatest(p_limit * 8, 200)
    ),
    -- Normalize each candidate's ingredient list ONCE per recipe, instead
    -- of re-normalizing every recipe ingredient on every fridge-ingredient
    -- comparison (the actual cause of the timeout).
    candidates_normalized as (
      select
        c.*,
        (select array_agg(public.normalize_ingredient(ri)) from unnest(c.ingredients) ri)
          as norm_ingredients
      from candidates c
    )
  select
    c.id, c.source_id, c.title, c.ingredients, c.ingredient_lines,
    c.instructions, c.image_url, c.source_url, c.cook_time, c.servings,
    c.tags, c.cuisine,

    (select count(*)::integer
     from unnest((select items from norm_input)) inp
     where exists (
       select 1 from unnest(c.norm_ingredients) ri
       where inp = ri
          or (' ' || ri || ' ') like ('% ' || inp || ' %')
          or (' ' || inp || ' ') like ('% ' || ri || ' %')
     )
    ) as used_count,

    (select count(*)::integer
     from unnest(c.norm_ingredients) ri
     where not exists (
       select 1 from unnest((select items from norm_input)) inp
       where inp = ri
          or (' ' || ri || ' ') like ('% ' || inp || ' %')
          or (' ' || inp || ' ') like ('% ' || ri || ' %')
     )
    ) as miss_count,

    c.calories, c.protein_g, c.carbs_g, c.fat_g

  from candidates_normalized c, norm_input
  order by used_count desc, miss_count asc
  limit p_limit;
end;
$$;
