#!/usr/bin/env python3
"""
Forage — AI-Generated Iranian Recipe Import

Imports the 50 Claude-generated Iranian recipes (validated in
validate.py — 49/50 passed clean, 1 fixed for a naming error) into the
Supabase `recipes` table.

Unlike scripts/import-foodcom.py, these recipes:
  - Were generated with structured {quantity, unit, name} fields from
    the start, so there is no free-text parsing/guessing needed — the
    entire class of bugs found in the Food.com import (missing units,
    backwards qualifiers, orphaned ingredients) doesn't apply here,
    because the structure was correct from the moment of generation.
  - Have NO images yet (explicitly, per user decision to add ~100
    photos later once there are real users). image_url is stored as
    NULL and these rows are tagged source='ai-generated' so they can
    be easily found and updated with real photos in a follow-up pass.
  - Do not go through REQUIRE_IMAGE filtering (that flag is specific
    to scripts/import-foodcom.py and Food.com's per-recipe quality
    bar) — these are approved for import without images by explicit
    user decision, tracked via the source tag for later follow-up.

USAGE:
    pip install supabase
    SUPABASE_SERVICE_KEY=your_service_role_key python3 scripts/import-ai-iranian.py

    Optional:
      --dry-run    Validate and report without writing to Supabase
"""

import argparse
import json
import os
import sys

try:
    from supabase import create_client
except ImportError:
    print("Missing dependency. Run: pip install supabase")
    sys.exit(1)

def _env_file_value(name):
    """Read NAME=value from the repo's .env (used as a fallback for the project URL)."""
    try:
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
        with open(env_path, encoding="utf-8") as fh:
            for line in fh:
                if line.startswith(name + "="):
                    return line.split("=", 1)[1].strip()
    except OSError:
        pass
    return None


SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("VITE_SUPABASE_URL")
    or _env_file_value("VITE_SUPABASE_URL")
)
if not SUPABASE_URL:
    print("Error: set SUPABASE_URL (or VITE_SUPABASE_URL in the repo's .env) to your Supabase project URL.")
    sys.exit(1)
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# ─── Unit pluralization (mirrors import-foodcom.py's _pluralize_unit) ──────
# Kept consistent with the Food.com importer so ingredient display reads
# the same way regardless of which source a recipe came from.

_NO_PLURAL = {'oz', 'lb', 'ml', 'g', 'kg', 'l'}


def _quantity_to_float(qty):
    if qty is None:
        return None
    try:
        return float(qty)
    except (TypeError, ValueError):
        return None


def _pluralize_unit(unit, qty):
    if unit is None:
        return None
    if unit in _NO_PLURAL or unit.endswith('s'):
        return unit
    numeric = _quantity_to_float(qty)
    is_singular = numeric is not None and numeric <= 1.0
    return unit if is_singular else f"{unit}s"


def _format_quantity_display(qty):
    """1.5 -> '1 1/2', 0.5 -> '1/2', 2 -> '2' — matches the display style
    already used throughout Forage's ingredient lines."""
    if qty is None:
        return ''
    if qty == int(qty):
        return str(int(qty))
    whole = int(qty)
    frac = qty - whole
    FRACS = {0.5: '1/2', 0.25: '1/4', 0.75: '3/4', 0.333: '1/3', 0.667: '2/3'}
    closest = min(FRACS.keys(), key=lambda f: abs(f - frac))
    if abs(closest - frac) < 0.05:
        frac_str = FRACS[closest]
        return f"{whole} {frac_str}" if whole > 0 else frac_str
    return str(qty)


def build_ingredient_line(ing):
    """Build a human-readable line from a structured {quantity, unit, name}
    ingredient object — the inverse of the free-text parsing needed for
    Food.com, since these ingredients are already structured correctly."""
    name = ing['name'].strip()
    qty = ing.get('quantity')
    unit = ing.get('unit')

    if qty is None:
        return name  # "salt", "black pepper" — to-taste items, no fake number

    qty_display = _format_quantity_display(qty)

    # "piece" is redundant with the ingredient name itself and reads
    # awkwardly ("2 pieces onion") compared to how Food.com-sourced
    # recipes display the same kind of item ("1 onion", "8 chicken
    # thighs" — no unit word at all for naturally countable foods).
    # Drop it for display consistency across both recipe sources; the
    # underlying data still has unit: "piece" for anyone reading the
    # structured ingredients array directly.
    if unit in ('piece', 'pieces'):
        return f"{qty_display} {name}"

    if unit:
        unit_display = _pluralize_unit(unit, qty)
        return f"{qty_display} {unit_display} {name}"
    return f"{qty_display} {name}"


def transform_recipe(recipe, index):
    ingredients_lower = [ing['name'].strip().lower() for ing in recipe['ingredients']]
    ingredient_lines = [build_ingredient_line(ing) for ing in recipe['ingredients']]

    instructions_text = ' '.join(
        f"{i+1}. {step}" for i, step in enumerate(recipe['instructions'])
    )

    tags = list(recipe.get('tags', []))
    # meal_type isn't a column on `recipes` yet — folded into tags so it's
    # at least searchable/filterable, consistent with how cuisine-adjacent
    # metadata is already handled via the tags array elsewhere in the schema.
    if recipe.get('meal_type'):
        tags.append(recipe['meal_type'])

    return {
        "source_id": f"ai-iranian-{index:03d}",
        "source": "ai-generated",
        "title": recipe['title'],
        "ingredients": ingredients_lower,
        "ingredient_lines": ingredient_lines,
        "instructions": instructions_text,
        "image_url": None,  # explicitly none — see module docstring
        "source_url": None,
        "cook_time": recipe.get('cook_time_minutes'),
        "servings": recipe.get('servings', 4),
        "tags": tags,
        "cuisine": recipe.get('cuisine', 'Iranian'),
        "quality_score": 2,  # structured generation with validated consistency — "good" tier
        "calories": recipe.get('calories'),
        "protein_g": recipe.get('protein_g'),
        "carbs_g": recipe.get('carbs_g'),
        "fat_g": recipe.get('fat_g'),
    }


def main():
    parser = argparse.ArgumentParser(description="Import AI-generated Iranian recipes")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.dry_run and not SUPABASE_SERVICE_KEY:
        print("Error: SUPABASE_SERVICE_KEY environment variable is required (unless --dry-run).")
        sys.exit(1)

    with open('scripts/data/iranian-recipes-batch1.json') as f:
        batch1 = json.load(f)
    with open('scripts/data/iranian-recipes-batch2.json') as f:
        batch2 = json.load(f)
    all_recipes = batch1 + batch2

    print(f"🌿 Forage — AI-Generated Iranian Recipe Import\n")
    print(f"Loaded {len(all_recipes)} recipes\n")

    rows = [transform_recipe(r, i) for i, r in enumerate(all_recipes, 1)]

    print("Sample transformed row (first recipe):")
    print(json.dumps(rows[0], indent=2, ensure_ascii=False)[:800])
    print("...\n")

    if args.dry_run:
        print(f"✅ Dry run complete. {len(rows)} recipes ready to import.")
        print("   No image_url — all rows will have image_url = NULL.")
        print("   Run again without --dry-run to actually write to Supabase.")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    result = supabase.table("recipes").upsert(
        rows, on_conflict="source_id", ignore_duplicates=False
    ).execute()

    written = len(result.data) if result.data else 0
    print(f"✅ Imported {written} recipes with source='ai-generated'.")
    print(f"   All have image_url = NULL — find them later with:")
    print(f"   select id, title from recipes where source = 'ai-generated' and image_url is null;")


if __name__ == "__main__":
    main()
