-- ============================================================
--  Forage – Step 20 Migration: Clean up existing low-quality recipes
--  Run in Supabase SQL Editor.
--  https://supabase.com/dashboard/project/_/sql
-- ============================================================
--
-- WHY THIS MIGRATION EXISTS:
-- The previous fix (raising MIN_INSTRUCTION_CHARS to 150 and adding
-- REQUIRE_IMAGE=True in scripts/import-foodcom.py) only affects FUTURE
-- import runs. Recipes already sitting in the `recipes` table from
-- earlier imports are untouched by re-running the script, because:
--   - the importer's upsert is keyed on source_id, and only WRITES rows
--     that pass transform_row()'s filters
--   - a recipe that fails the new filters returns None from
--     transform_row() and is simply skipped in the import loop --
--     it's never sent to Supabase at all, so the existing row in your
--     database is neither updated nor deleted
-- Result: re-running the import script can only ADD new clean recipes
-- alongside the old ones. It cannot remove or fix the ~1,700 recipes
-- already imported before the stricter filters existed. This migration
-- is the missing piece: it deletes existing recipes that fail the same
-- bar the importer now enforces for new ones.
--
-- IMPORTANT: this is IRREVERSIBLE. Recipes deleted here are gone
-- (though the Food.com import is safe to re-run afterward — anything
-- that qualifies will simply be re-imported with clean data).
--
-- Run this AFTER re-running scripts/import-foodcom.py at least once
-- with the strict filters, OR run it standalone if you just want to
-- prune the existing bad data without importing anything new yet.
-- ──────────────────────────────────────────────────────────────────────────────

-- Preview first — run this SELECT alone to see what would be deleted
-- before actually running the DELETE below. Uncomment to preview:
--
-- select id, title, image_url, length(coalesce(instructions, '')) as instr_len,
--        array_length(ingredients, 1) as ingredient_count
-- from public.recipes
-- where source = 'foodcom'
--   and (
--     image_url is null
--     or trim(image_url) = ''
--     or image_url not ilike 'http%'
--     or length(coalesce(instructions, '')) < 150
--     or coalesce(array_length(ingredients, 1), 0) < 3
--   )
-- order by title;

-- Actual cleanup. Scoped to source = 'foodcom' only — this deliberately
-- does NOT touch TheMealDB recipes (source = 'mealdb'), which never had
-- an image requirement in the first place and are a separate, smaller
-- curated set from scripts/seed-mealdb.js.
delete from public.recipes
where source = 'foodcom'
  and (
    image_url is null
    or trim(image_url) = ''
    or image_url not ilike 'http%'
    or length(coalesce(instructions, '')) < 150
    or coalesce(array_length(ingredients, 1), 0) < 3
  );

-- Report how many recipes remain after cleanup, split by source, so you
-- can see the before/after directly in the SQL editor's result pane.
select source, count(*) as recipe_count
from public.recipes
group by source
order by source;
