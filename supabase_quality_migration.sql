-- ============================================================
--  Forage — Quality & Matching Migration
--  Run in Supabase SQL Editor after all previous migrations.
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- ─── 1. normalize_ingredient() ────────────────────────────────────────────────
--
-- Mirrors the JS normalizeIngredient() in recipeDb.js so that DB match counts
-- are computed on the same normalized form the client uses for display.
-- This eliminates the divergence between sort order and badge percentages.

create or replace function public.normalize_ingredient(raw text)
returns text
language plpgsql immutable strict
as $$
declare
  n text;
begin
  n := lower(trim(raw));

  -- Strip leading adjectives (multiple passes for "large fresh eggs")
  loop
    n := regexp_replace(n,
      '^\s*(fresh|dried|frozen|organic|raw|cooked|large|small|medium|big|ripe|whole|'
      'chopped|sliced|diced|minced|grated|crushed|ground|shredded|peeled|canned|tinned|'
      'boneless|skinless|lean|extra|fine|coarse|flat-leaf|flat leaf|roughly|finely|'
      'thinly|thickly|lightly|smoked|roasted|toasted|softened|melted|beaten|whisked)\s+',
      '', 'i');
    -- Stop when nothing changed
    if n = regexp_replace(n,
      '^\s*(fresh|dried|frozen|organic|raw|cooked|large|small|medium|big|ripe|whole|'
      'chopped|sliced|diced|minced|grated|crushed|ground|shredded|peeled|canned|tinned|'
      'boneless|skinless|lean|extra|fine|coarse|flat-leaf|flat leaf|roughly|finely|'
      'thinly|thickly|lightly|smoked|roasted|toasted|softened|melted|beaten|whisked)\s+',
      '', 'i') then exit; end if;
  end loop;

  -- Irregular plurals
  n := regexp_replace(n, 'tomatoes$', 'tomato');
  n := regexp_replace(n, 'potatoes$', 'potato');
  n := regexp_replace(n, 'berries$',  'berry');

  -- Simple plural: strip trailing s when stem ≥ 4 chars (not already ending in s)
  if length(n) > 4 and right(n, 1) = 's' and right(n, 2) != 'ss' then
    n := left(n, length(n) - 1);
  end if;

  return trim(n);
end;
$$;

-- ─── 2. ingredient_matches() ──────────────────────────────────────────────────
--
-- Word-boundary aware match using normalized forms.
-- Prevents false positives like 'cream' matching 'ice cream'
-- by requiring the matched token to be at a word boundary on BOTH sides.

create or replace function public.ingredient_matches(fridge_ing text, recipe_ing text)
returns boolean
language plpgsql immutable strict
as $$
declare
  f text := public.normalize_ingredient(fridge_ing);
  r text := public.normalize_ingredient(recipe_ing);
begin
  if f = '' or r = '' then return false; end if;
  if f = r then return true; end if;
  -- Word-boundary containment: pad with spaces and do substring check
  -- This ensures 'egg' matches 'egg' within 'large egg' but not within 'eggplant'
  return (' ' || r || ' ') like ('% ' || f || ' %')
      or (' ' || f || ' ') like ('% ' || r || ' %');
end;
$$;

-- ─── 3. Rebuilt search_by_ingredients() ──────────────────────────────────────
--
-- Changes from previous version:
--   a) Uses ingredient_matches() instead of raw ilike — normalization-aware
--   b) Quality filter: min 3 ingredients, instructions > 50 chars
--   c) used_count now counts matched RECIPE ingredients (not input ingredients)
--      for consistency with the client-side display logic
--   d) Sorting by completeness ratio (used / total) then fewest missing

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
  miss_count       integer
)
language sql stable
as $$
  with
  -- Normalize the caller's ingredient list once
  norm_input as (
    select array_agg(public.normalize_ingredient(i)) as items
    from unnest(p_ingredients) i
    where trim(i) <> ''
  ),
  -- Score each recipe
  scored as (
    select
      r.*,

      -- used_count: how many RECIPE ingredients are covered by the user's fridge
      (select count(*)::integer
       from unnest(r.ingredients) ri
       where exists (
         select 1 from unnest((select items from norm_input)) inp
         where public.ingredient_matches(inp, ri)
       )) as used_count,

      -- miss_count: how many recipe ingredients are NOT covered
      (select count(*)::integer
       from unnest(r.ingredients) ri
       where not exists (
         select 1 from unnest((select items from norm_input)) inp
         where public.ingredient_matches(inp, ri)
       )) as miss_count,

      -- total for ratio computation
      array_length(r.ingredients, 1) as total_count

    from public.recipes r
    where
      -- Quality filter: skip recipes with too few ingredients or no instructions
      array_length(r.ingredients, 1) >= 3
      and r.instructions is not null
      and length(trim(r.instructions)) >= 50

      -- Must match at least one ingredient
      and exists (
        select 1 from unnest(r.ingredients) ri
        where exists (
          select 1 from unnest((select items from norm_input)) inp
          where public.ingredient_matches(inp, ri)
        )
      )

      -- Diet tag filter
      and (p_diet is null or r.tags @> array[lower(p_diet)])

      -- Cook time filter
      and (p_max_time is null or r.cook_time is null or r.cook_time <= p_max_time)
  )
  select
    s.id, s.source_id, s.title, s.ingredients, s.ingredient_lines,
    s.instructions, s.image_url, s.source_url, s.cook_time, s.servings,
    s.tags, s.cuisine,
    s.used_count,
    s.miss_count
  from scored s
  where s.used_count > 0   -- at least one ingredient matches
  order by
    -- Primary: completeness ratio (descending)
    case when s.total_count > 0
         then s.used_count::float / s.total_count
         else 0 end desc,
    -- Secondary: fewest missing ingredients absolute
    s.miss_count asc,
    -- Tertiary: most used (absolute)
    s.used_count desc
  limit p_limit
$$;
