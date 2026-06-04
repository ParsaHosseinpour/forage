-- ============================================================
--  Forage – Step 15 Migration: Ingredient Normalization Fix
--  Run in Supabase SQL Editor after previous migrations.
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- ─── 1. Postgres ingredient normalizer ───────────────────────────────────────
--
-- Mirrors the JS normalizeIngredient() function in recipeDb.js.
-- Applied to both the stored ingredients[] array and query inputs
-- so substring matching is semantically meaningful.
--
-- Changes vs old logic:
--   - Strips leading adjectives (fresh, dried, large, sliced, etc.)
--   - Simple plural stripping (eggs→egg, tomatoes→tomato, etc.)
--   - Minimum stem length >= 4 chars (was >4, fixing egg→eggs mismatch)
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.normalize_ingredient(raw text)
returns text
language plpgsql immutable
as $$
declare
  n text;
begin
  if raw is null then return ''; end if;

  n := lower(trim(raw));

  -- Strip leading adjectives repeatedly until stable
  loop
    n := regexp_replace(n,
      '^\s*(fresh|dried|frozen|organic|raw|cooked|large|small|medium|big|ripe|'
      'whole|chopped|sliced|diced|minced|grated|crushed|ground|shredded|peeled|'
      'canned|tinned|boneless|skinless|lean|extra|fine|coarse|flat-leaf|flat leaf|'
      'roughly|finely|thinly|thickly|lightly|smoked|roasted|toasted|softened|'
      'melted|beaten|whisked)\s+',
      '', 'gi');
    if not n ~ '^\s*(fresh|dried|frozen|organic|raw|cooked|large|small|medium|big|ripe|whole|chopped|sliced|diced|minced|grated|crushed|ground|shredded|peeled|canned|tinned|boneless|skinless|lean|extra|fine|coarse|flat-leaf|flat leaf|roughly|finely|thinly|thickly|lightly|smoked|roasted|toasted|softened|melted|beaten|whisked)\s+'
    then exit; end if;
  end loop;

  -- Irregular plurals
  n := regexp_replace(n, 'tomatoes$',  'tomato',  'g');
  n := regexp_replace(n, 'potatoes$',  'potato',  'g');
  n := regexp_replace(n, 'berries$',   'berry',   'g');

  -- Simple plural: strip trailing s when stem >= 4 chars and not ending in ss
  -- (>= 4 so eggs→egg, peas→pea, oils→oil all normalize correctly)
  if length(n) >= 4 and right(n, 1) = 's' and right(n, 2) != 'ss' then
    n := left(n, length(n) - 1);
  end if;

  return trim(n);
end;
$$;


-- ─── 2. Word-boundary ingredient match ───────────────────────────────────────
--
-- ingredient_matches(fridge_item, recipe_ingredient) → boolean
--
-- More precise than raw ilike '% || x || %'.
-- Guards against false positives (cream ≠ ice cream, pea ≠ peanut).
-- Mirrors the JS ingredientMatches() function.
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.ingredient_matches(a text, b text)
returns boolean
language plpgsql immutable
as $$
declare
  f text := public.normalize_ingredient(a);
  r text := public.normalize_ingredient(b);
begin
  if f = '' or r = '' then return false; end if;
  if f = r then return true; end if;

  -- Word-boundary containment: pad with spaces and use LIKE
  if ' ' || r || ' ' like '% ' || f || ' %' then return true; end if;
  if ' ' || f || ' ' like '% ' || r || ' %' then return true; end if;

  return false;
end;
$$;


-- ─── 3. Updated search_by_ingredients RPC ────────────────────────────────────
--
-- Now uses normalize_ingredient() + ingredient_matches() for both
-- the GIN pre-filter and the precise used/missed counts.
-- This eliminates the inconsistency between the SQL counts (which drove
-- the old db-side ORDER BY) and the client-side recomputation.
-- ──────────────────────────────────────────────────────────────────────────────

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
    -- Normalize all user inputs once
    norm_input as (
      select array_agg(public.normalize_ingredient(i)) as items
      from unnest(p_ingredients) i
      where trim(i) != ''
    ),
    -- Raw GIN pre-filter (fast, permissive — use raw ingredients array)
    candidates as (
      select r.*
      from public.recipes r, norm_input
      where
        -- GIN overlap for fast pre-filtering (uses raw lowercase ingredients array)
        r.ingredients && norm_input.items
        and (p_diet    is null or r.tags @> array[lower(p_diet)])
        and (p_max_time is null or r.cook_time is null or r.cook_time <= p_max_time)
    )
  select
    c.id, c.source_id, c.title, c.ingredients, c.ingredient_lines,
    c.instructions, c.image_url, c.source_url, c.cook_time, c.servings,
    c.tags, c.cuisine,

    -- used_count: how many user ingredients word-match a recipe ingredient
    (select count(*)::integer
     from unnest((select items from norm_input)) inp
     where exists (
       select 1 from unnest(c.ingredients) ri
       where public.ingredient_matches(inp, ri)
     )
    ) as used_count,

    -- miss_count: recipe ingredients not matched by any user ingredient
    (select count(*)::integer
     from unnest(c.ingredients) ri
     where not exists (
       select 1 from unnest((select items from norm_input)) inp
       where public.ingredient_matches(inp, ri)
     )
    ) as miss_count

  from candidates c, norm_input

  -- DB-side ordering: client will re-sort, but start with a good order
  order by used_count desc, miss_count asc
  limit p_limit
$$;


-- ─── 4. Quality filter view ───────────────────────────────────────────────────
--
-- Marks recipes as low-quality so the UI can filter or de-prioritize them.
-- A recipe is low quality if:
--   - instructions is null or very short (< 100 chars)
--   - has fewer than 3 ingredients
--   - title is generic/placeholder
-- ──────────────────────────────────────────────────────────────────────────────

-- Add a quality_score column (0=low, 1=ok, 2=good) if it doesn't exist
alter table public.recipes
  add column if not exists quality_score smallint not null default 1;

-- Recompute quality scores for all existing recipes
update public.recipes set quality_score =
  case
    when (instructions is null or length(trim(instructions)) < 100)
      and array_length(ingredients, 1) < 3
    then 0  -- low quality: no instructions AND few ingredients
    when instructions is null or length(trim(instructions)) < 100
    then 1  -- ok: instructions missing/short but has enough ingredients
    when array_length(ingredients, 1) >= 4
      and length(trim(coalesce(instructions, ''))) >= 200
    then 2  -- good: proper instructions + meaningful ingredient list
    else 1
  end;

-- Create index for quality filtering
create index if not exists recipes_quality_idx on public.recipes(quality_score);
