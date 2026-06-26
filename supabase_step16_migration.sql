-- ============================================================
--  Forage – Step 16 Migration: Fix "-us" plural-strip bug
--  Run in Supabase SQL Editor.
--  https://supabase.com/dashboard/project/_/sql
-- ============================================================
--
-- normalize_ingredient() was stripping the trailing 's' from ANY word
-- ending in a single 's', treating it as a plural. That's wrong for
-- Latin-derived singular nouns ending in '-us': octopus, asparagus,
-- couscous, hummus, citrus all got mangled into nonexistent words
-- ("asparagus" -> "asparagu"), silently breaking ingredient matching
-- and tier classification for those items.
--
-- This re-defines the function with the same logic as the client-side
-- fix in src/lib/recipeDb.js — excludes '-us' endings from the
-- plural-strip rule.
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

  n := regexp_replace(n, 'tomatoes$',  'tomato',  'g');
  n := regexp_replace(n, 'potatoes$',  'potato',  'g');
  n := regexp_replace(n, 'berries$',   'berry',   'g');

  -- Simple plural: strip trailing s when stem >= 4 chars, not ending in ss,
  -- and not ending in 'us' (octopus/asparagus/couscous/hummus/citrus are
  -- singular nouns, not plurals — stripping their 's' broke the word).
  if length(n) >= 4
     and right(n, 1) = 's'
     and right(n, 2) != 'ss'
     and right(n, 2) != 'us'
  then
    n := left(n, length(n) - 1);
  end if;

  return trim(n);
end;
$$;
