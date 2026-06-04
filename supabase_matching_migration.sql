-- ============================================================
--  Forage – Ingredient Matching & Recipe Quality Migration
--  Run in Supabase SQL Editor.
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- ─── 1. NORMALIZE INGREDIENT HELPER ──────────────────────────────────────────
--
-- Strips qualifying adjectives and normalises plurals so:
--   "large eggs"   → "egg"
--   "fresh basil"  → "basil"
--   "sliced tomatoes" → "tomato"
--   "boneless chicken breasts" → "chicken breast"
-- This runs on BOTH the recipe ingredient and the user's fridge ingredient
-- before comparison, so both sides are on equal footing.

create or replace function public.normalize_ingredient(p_name text)
returns text language plpgsql immutable as $$
declare
  n text := lower(trim(coalesce(p_name, '')));
begin
  -- 1. Strip leading qualifying adjectives (most common TheMealDB prefixes)
  n := regexp_replace(n,
    '^\s*(fresh|dried|frozen|organic|raw|cooked|large|small|medium|big|ripe|'
    'whole|chopped|sliced|diced|minced|grated|crushed|ground|shredded|peeled|'
    'canned|tinned|tinned|boneless|skinless|lean|extra|fine|coarse|'
    'flat-leaf|flat leaf|roughly|finely|thinly|thickly|lightly|'
    'smoked|roasted|toasted|softened|melted|beaten|whisked)\s+',
    '', 'gi');
  -- 2. Normalize common irregular plurals
  n := regexp_replace(n, 'tomatoes$', 'tomato', '');
  n := regexp_replace(n, 'potatoes$', 'potato', '');
  n := regexp_replace(n, 'berries$',  'berry',  '');
  -- 3. Strip trailing 's' for simple plurals (eggs→egg, carrots→carrot)
  --    Only when the stem is ≥4 chars so "peas" doesn't become "pea" but "eggs" becomes "egg"
  --    Exception: words ending in 'ss' (e.g. "cress") are left alone.
  n := regexp_replace(n, '([a-z]{3})(?<!s)s$', '\1', 'g');
  return trim(n);
end;
$$;

-- Test it
-- select normalize_ingredient('large eggs'), normalize_ingredient('fresh basil'),
--        normalize_ingredient('sliced tomatoes'), normalize_ingredient('chicken breasts');

-- ─── 2. IMPROVED SEARCH FUNCTION ─────────────────────────────────────────────
--
-- Changes from the original:
--   a. Both sides are normalized via normalize_ingredient() before comparison
--   b. Word-boundary match replaces raw substring to prevent egg→eggplant false positive
--   c. Sort: recipe-completion ratio DESC (used / total), then used_count DESC
--   d. Requires used_count >= 1 so zero-match recipes are excluded
--   e. Pre-filter: r.ingredients && norm_input still uses GIN index for speed;
--      the word-boundary check runs only on the small result set after GIN filter

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
  -- Normalise and deduplicate the user's ingredient list once
  norm_input as (
    select array_agg(distinct public.normalize_ingredient(i)) as items
    from unnest(p_ingredients) i
    where trim(i) <> ''
  ),

  -- GIN pre-filter (fast): recipe must share at least one raw token with input
  -- This leverages the GIN index; the expensive normalization runs only after
  candidate_recipes as (
    select r.*
    from public.recipes r, norm_input ni
    where r.ingredients && p_ingredients       -- raw GIN overlap (index scan)
       or r.ingredients && ni.items            -- normalized GIN overlap
  ),

  -- Compute precise used/miss counts using word-boundary normalized matching
  scored as (
    select
      cr.*,

      -- used_count: fridge ingredients that match a recipe ingredient (word-boundary)
      (select count(*)::integer
       from unnest((select items from norm_input)) inp
       where exists (
         select 1
         from unnest(cr.ingredients) ri
         where public.normalize_ingredient(ri) = inp                          -- exact after norm
            or public.normalize_ingredient(ri) ~  ('\m' || inp       || '\M') -- ri contains inp as word
            or inp                               ~  ('\m' || public.normalize_ingredient(ri) || '\M') -- inp contains ri as word
       )
      ) as used_count,

      -- miss_count: recipe ingredients not matched by any fridge ingredient
      (select count(*)::integer
       from unnest(cr.ingredients) ri
       where not exists (
         select 1
         from unnest((select items from norm_input)) inp
         where public.normalize_ingredient(ri) = inp
            or public.normalize_ingredient(ri) ~  ('\m' || inp       || '\M')
            or inp                               ~  ('\m' || public.normalize_ingredient(ri) || '\M')
       )
      ) as miss_count

    from candidate_recipes cr
  )

  select
    s.id, s.source_id, s.title, s.ingredients, s.ingredient_lines,
    s.instructions, s.image_url, s.source_url, s.cook_time, s.servings,
    s.tags, s.cuisine,
    s.used_count, s.miss_count
  from scored s
  where
    s.used_count >= 1                                              -- must match at least one ingredient
    and (p_diet     is null or s.tags @> array[lower(p_diet)])
    and (p_max_time is null or s.cook_time is null or s.cook_time <= p_max_time)
    -- Filter: skip recipes where instructions are null or too short to be useful
    and (s.instructions is not null and length(trim(s.instructions)) > 80)
  order by
    -- Primary: recipe-completion ratio (fraction of recipe ingredients you have)
    case when (s.used_count + s.miss_count) > 0
      then s.used_count::float / (s.used_count + s.miss_count)
      else 0
    end desc,
    -- Secondary: absolute count of ingredients you have
    s.used_count desc,
    -- Tertiary: fewest missing
    s.miss_count asc
  limit p_limit
$$;

-- Re-grant execute to authenticated users (required after replace)
grant execute on function public.search_by_ingredients to authenticated, anon;
grant execute on function public.normalize_ingredient   to authenticated, anon;
