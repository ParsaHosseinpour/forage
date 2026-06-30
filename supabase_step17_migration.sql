-- ============================================================
--  Forage – Step 17 Migration: Derive real diet tags
--  Run in Supabase SQL Editor.
--  https://supabase.com/dashboard/project/_/sql
-- ============================================================
--
-- ROOT CAUSE:
-- scripts/seed-mealdb.js can only ever produce a 'vegetarian' or 'vegan'
-- tag, and only for the small subset of recipes where TheMealDB's own
-- strCategory field happened to literally be "Vegetarian" or "Vegan".
-- The other 4 diet filter options in the UI (gluten free, dairy free,
-- ketogenic, paleo) had ZERO code anywhere that could ever produce them.
-- Selecting any of those 4 filters returned 0 recipes, always, for
-- every user — the search_by_ingredients RPC's diet filter logic was
-- always correct, it just had no real tag data to filter against.
--
-- FIX:
-- Derive diet tags from each recipe's actual ingredient list (data we
-- reliably have for every recipe) using simple keyword exclusion —
-- the same approach used by most ingredient-based diet taggers. These
-- are approximations, not medically authoritative, but vastly better
-- than a filter that always returns nothing.
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.derive_diet_tags(ings text[])
returns text[]
language plpgsql immutable
as $$
declare
  meat_kw   text[] := array['chicken','beef','pork','lamb','turkey','duck','bacon','sausage','ham','veal','venison','goat','rabbit','quail','chorizo','pancetta','gelatin'];
  fish_kw   text[] := array['fish','salmon','tuna','cod','shrimp','prawn','crab','lobster','clam','mussel','scallop','anchovy','tilapia','trout','halibut','squid','octopus'];
  dairy_kw  text[] := array['milk','cheese','butter','cream','yogurt','yoghurt','ghee'];
  egg_kw    text[] := array['egg'];
  gluten_kw text[] := array['flour','wheat','bread','pasta','spaghetti','noodle','barley','rye','couscous','breadcrumbs','tortilla','bun','bagel','cracker','beer','malt'];
  carb_kw   text[] := array['rice','pasta','bread','potato','sugar','flour','noodle','tortilla','corn','oats','honey'];
  legume_kw text[] := array['bean','lentil','chickpea','pea','peanut','soy','tofu','tempeh'];
  -- Plant-based substitutes that contain a dairy WORD ('milk'/'cream'/
  -- 'butter') but aren't dairy at all -- same false-positive class as
  -- 'cream' matching 'ice cream', already guarded against elsewhere.
  non_dairy_sub text[] := array['coconut milk','coconut cream','almond milk','soy milk','oat milk','rice milk','cashew milk','peanut butter','almond butter','cashew butter','cocoa butter','shea butter'];

  has_meat   boolean;
  has_fish   boolean;
  has_dairy  boolean;
  has_egg    boolean;
  has_gluten boolean;
  has_carb   boolean;
  has_legume boolean;
  tags       text[] := array[]::text[];
begin
  has_meat   := exists (select 1 from unnest(ings) i, unnest(meat_kw)   k where i ilike '%' || k || '%');
  has_fish   := exists (select 1 from unnest(ings) i, unnest(fish_kw)   k where i ilike '%' || k || '%');
  has_dairy  := exists (
    select 1 from unnest(ings) i, unnest(dairy_kw) k
    where i ilike '%' || k || '%'
      and not exists (select 1 from unnest(non_dairy_sub) s where i ilike '%' || s || '%')
  );
  has_egg    := exists (select 1 from unnest(ings) i, unnest(egg_kw)    k where i ilike '%' || k || '%');
  has_gluten := exists (select 1 from unnest(ings) i, unnest(gluten_kw) k where i ilike '%' || k || '%');
  has_carb   := exists (select 1 from unnest(ings) i, unnest(carb_kw)  k where i ilike '%' || k || '%');
  has_legume := exists (select 1 from unnest(ings) i, unnest(legume_kw) k where i ilike '%' || k || '%');

  if not has_meat and not has_fish then
    tags := tags || 'vegetarian';
    if not has_dairy and not has_egg then
      tags := tags || 'vegan';
    end if;
  end if;

  if not has_gluten then
    tags := tags || 'gluten free';
  end if;

  if not has_dairy then
    tags := tags || 'dairy free';
  end if;

  if not has_carb and not has_legume then
    tags := tags || 'ketogenic';
  end if;

  if not has_gluten and not has_dairy and not has_legume and not has_carb then
    tags := tags || 'paleo';
  end if;

  return tags;
end;
$$;

-- Backfill: merge derived tags into every existing recipe, deduplicated,
-- preserving any tags already there (cuisine, or the seed script's own
-- vegetarian/vegan tag where TheMealDB's category provided one).
update public.recipes
set tags = (
  select array_agg(distinct t)
  from unnest(tags || public.derive_diet_tags(ingredients)) t
);
