-- ============================================================
--  Forage – Step 8 Migration: Self-hosted Recipe Database
--  Run in Supabase SQL Editor:
--  https://supabase.com/dashboard/project/vgwtbfnccxiaplhhhzqd/sql
-- ============================================================

-- ─── 1. RECIPES TABLE ────────────────────────────────────────────────────────

create table if not exists public.recipes (
  id               bigint generated always as identity primary key,
  source_id        text unique,               -- external ID (TheMealDB idMeal, etc.)
  source           text default 'mealdb',     -- 'mealdb' | 'user'
  title            text not null,
  -- Normalised lowercase names for fast overlap matching: ['chicken','rice','soy sauce']
  ingredients      text[] not null default '{}',
  -- Human-readable lines: ['200g chicken breast', '1 cup rice']
  ingredient_lines text[] not null default '{}',
  instructions     text,
  image_url        text,
  source_url       text,
  cook_time        integer,                   -- total minutes (NULL = unknown)
  servings         integer,
  -- Dietary/cuisine tags: ['vegetarian','italian','gluten free']
  tags             text[] not null default '{}',
  cuisine          text,
  created_at       timestamptz default now()
);

-- GIN index enables fast @> containment and && overlap queries on arrays
create index if not exists recipes_ingredients_gin
  on public.recipes using gin(ingredients);

-- GIN index on tags for diet filtering
create index if not exists recipes_tags_gin
  on public.recipes using gin(tags);

-- Full-text search on title
create index if not exists recipes_title_fts
  on public.recipes using gin(to_tsvector('english', title));

-- Public read access — no auth needed to query recipes
alter table public.recipes enable row level security;

create policy "Anyone can read recipes"
  on public.recipes for select
  using (true);

create policy "Authenticated users can insert recipes"
  on public.recipes for insert
  to authenticated
  with check (true);


-- ─── 2. INGREDIENT SEARCH FUNCTION ───────────────────────────────────────────
--
-- search_by_ingredients(ingredients, limit, diet, max_time)
--
-- Scoring logic:
--   used_count  = how many of YOUR ingredients appear in the recipe
--   miss_count  = how many recipe ingredients you're missing
--
-- Ordered by: most used ingredients first, then fewest missing.
-- GIN index makes this fast even on 10k+ recipes.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.search_by_ingredients(
  p_ingredients text[],
  p_limit       integer default 12,
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
  -- Normalise input to lowercase for case-insensitive matching
  with norm_input as (
    select array_agg(lower(trim(i))) as items
    from unnest(p_ingredients) i
  )
  select
    r.id,
    r.source_id,
    r.title,
    r.ingredients,
    r.ingredient_lines,
    r.instructions,
    r.image_url,
    r.source_url,
    r.cook_time,
    r.servings,
    r.tags,
    r.cuisine,

    -- used_count: input ingredients that appear in recipe (substring match)
    (select count(*)::integer
     from unnest((select items from norm_input)) inp
     where exists (
       select 1 from unnest(r.ingredients) ri
       where ri ilike '%' || inp || '%'
         or  inp ilike '%' || ri || '%'
     )) as used_count,

    -- miss_count: recipe ingredients not covered by any input
    (select count(*)::integer
     from unnest(r.ingredients) ri
     where not exists (
       select 1 from unnest((select items from norm_input)) inp
       where ri ilike '%' || inp || '%'
         or  inp ilike '%' || ri || '%'
     )) as miss_count

  from public.recipes r
  where
    -- Must match at least one input ingredient (pre-filter with GIN index)
    r.ingredients && (select items from norm_input)
    -- Diet tag filter
    and (p_diet is null or r.tags @> array[lower(p_diet)])
    -- Cook time filter
    and (p_max_time is null or r.cook_time is null or r.cook_time <= p_max_time)

  order by used_count desc, miss_count asc
  limit p_limit
$$;
