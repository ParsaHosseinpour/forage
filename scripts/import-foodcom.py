#!/usr/bin/env python3
"""
Forage — Food.com Recipe Import (Kaggle 64k-alternative: 522k recipes, MIT licensed)

Imports the "Food.com - Recipes and Reviews" dataset into Forage's Supabase
`recipes` table. This is the dataset selected after the architectural
evaluation of Allrecipes-scraping vs. licensed alternatives (see project
history) — chosen because it is:
  - MIT licensed (mirrored on Hugging Face by AkashPS11), no scraping,
    no ToS risk, no anti-bot engineering required
  - 522,517 recipes — far exceeds the original 50k target
  - Real per-recipe nutrition (Calories, Protein, Carbs, Fat, and more)
    on the large majority of rows — TheMealDB (Forage's only prior source)
    has none at all
  - Ingredient format ("1 cup flour", "2 large eggs") is the same
    natural-language style our ingredientParser.js and
    normalize_ingredient() were already built around

Source: https://huggingface.co/datasets/AkashPS11/recipes_data_food.com
License: MIT

WHY PYTHON, NOT NODE (unlike scripts/seed-mealdb.js):
Streaming and filtering a 522k-row, multi-GB Parquet dataset efficiently
needs a real columnar Parquet reader (pyarrow) with pandas for cleaning.
Node has no mature equivalent without heavy native bindings. This script
is a one-time (or occasional re-run) operation, not part of the app's
runtime, so a different language for tooling is fine.

USAGE:

    pip install pandas pyarrow supabase python-dotenv
    SUPABASE_SERVICE_KEY=your_service_role_key python3 scripts/import-foodcom.py

    Optional flags:
      --limit N       Import only the first N qualifying recipes (for testing)
      --min-quality N Skip recipes below this quality bar (default: 2, see below)
      --dry-run       Parse and print stats without writing to Supabase

Where to get the service role key:
    Supabase Dashboard → Project Settings → API → service_role (secret)

PREREQUISITE: run supabase_step18_migration.sql first (adds the nutrition
columns this script populates).

RUNTIME: expect 20-40 minutes for the full dataset on a normal connection,
most of it spent streaming ~1-2GB of Parquet shards and batched upserts.
"""

import argparse
import math
import os
import re
import sys
import time

try:
    import pandas as pd
    import requests
    from supabase import create_client
except ImportError:
    print("Missing dependencies. Run:")
    print("  pip install pandas pyarrow supabase python-dotenv requests")
    sys.exit(1)

# ─── Config ─────────────────────────────────────────────────────────────────

SUPABASE_URL = "https://vgwtbfnccxiaplhhhzqd.supabase.co"
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

HF_DATASET = "AkashPS11/recipes_data_food.com"
HF_PARQUET_API = f"https://datasets-server.huggingface.co/parquet?dataset={HF_DATASET}"

BATCH_SIZE = 200          # rows per Supabase upsert call
MIN_INGREDIENTS = 3        # recipes below this are almost always junk/incomplete
MIN_INSTRUCTION_CHARS = 40  # filters out placeholder/empty instructions

# ─── R-vector string parser (defensive fallback) ────────────────────────────
#
# Parquet stores Food.com's list-columns (RecipeIngredientParts, etc.) as
# real arrays — pandas.read_parquet returns them as numpy arrays already,
# NOT as R-style "c(...)" text. The HF web viewer *displays* R formatting
# for readability, but that's cosmetic. This parser exists purely as a
# defensive fallback in case any shard, or a future re-export, serializes
# a column as a literal string instead of a native array.

_R_STRING_RE = re.compile(r'"((?:[^"\\]|\\.)*)"')


def parse_r_vector(value):
    """Coerce a Food.com list-column value into a plain Python list of str."""
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [str(v).strip() for v in value if v is not None and str(v).strip()]
    try:
        import numpy as np
        if isinstance(value, np.ndarray):
            return [str(v).strip() for v in value.tolist() if v is not None and str(v).strip()]
    except ImportError:
        pass

    s = str(value).strip()
    if s in ("", "NA", "character(0)", "nan", "None"):
        return []
    if s.startswith('c(') and s.endswith(')'):
        inner = s[2:-1]
    elif s.startswith('"') and s.endswith('"'):
        return [s[1:-1]]
    else:
        inner = s
    items = _R_STRING_RE.findall(inner)
    return [i.replace('\\"', '"').replace('\\\\', '\\') for i in items]


# ─── ISO 8601 duration parser (CookTime / PrepTime / TotalTime) ─────────────
#
# Food.com times are ISO 8601 durations: "PT24H45M", "PT5M", "PT2H15M".
# Forage's `recipes.cook_time` column is a plain integer of minutes.

_DURATION_RE = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?')


def parse_duration_minutes(value):
    if not value or not isinstance(value, str):
        return None
    m = _DURATION_RE.match(value.strip())
    if not m:
        return None
    hours = int(m.group(1) or 0)
    minutes = int(m.group(2) or 0)
    total = hours * 60 + minutes
    return total if total > 0 else None


# ─── Diet tag derivation (mirrors supabase_step17_migration.sql / seed-mealdb.js) ──
#
# Kept in sync with the JS/SQL versions already in the Forage codebase so
# a recipe classified 'vegetarian' here means the same thing everywhere.
# See supabase_step17_migration.sql for the full rationale and the
# coconut-milk / peanut-butter false-positive fix this mirrors.

_MEAT_KW = {'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'bacon', 'sausage',
            'ham', 'veal', 'venison', 'goat', 'rabbit', 'quail', 'chorizo', 'pancetta', 'gelatin'}
_FISH_KW = {'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'crab', 'lobster',
            'clam', 'mussel', 'scallop', 'anchovy', 'tilapia', 'trout', 'halibut', 'squid', 'octopus'}
_DAIRY_KW = {'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'ghee'}
_EGG_KW = {'egg'}
_GLUTEN_KW = {'flour', 'wheat', 'bread', 'pasta', 'spaghetti', 'noodle', 'barley', 'rye',
              'couscous', 'breadcrumbs', 'tortilla', 'bun', 'bagel', 'cracker', 'beer', 'malt'}
_CARB_KW = {'rice', 'pasta', 'bread', 'potato', 'sugar', 'flour', 'noodle', 'tortilla', 'corn', 'oats', 'honey'}
_LEGUME_KW = {'bean', 'lentil', 'chickpea', 'pea', 'peanut', 'soy', 'tofu', 'tempeh'}
_NON_DAIRY_SUBS = {'coconut milk', 'coconut cream', 'almond milk', 'soy milk', 'oat milk',
                    'rice milk', 'cashew milk', 'peanut butter', 'almond butter',
                    'cashew butter', 'cocoa butter', 'shea butter'}


def _has_any(ingredients_lower, keywords):
    return any(any(kw in ing for kw in keywords) for ing in ingredients_lower)


def _has_dairy_real(ingredients_lower):
    for ing in ingredients_lower:
        if any(sub in ing for sub in _NON_DAIRY_SUBS):
            continue
        if any(kw in ing for kw in _DAIRY_KW):
            return True
    return False


def derive_diet_tags(ingredients):
    lower = [i.lower() for i in ingredients if i]
    has_meat = _has_any(lower, _MEAT_KW)
    has_fish = _has_any(lower, _FISH_KW)
    has_dairy = _has_dairy_real(lower)
    has_egg = _has_any(lower, _EGG_KW)
    has_gluten = _has_any(lower, _GLUTEN_KW)
    has_carb = _has_any(lower, _CARB_KW)
    has_legume = _has_any(lower, _LEGUME_KW)

    tags = []
    if not has_meat and not has_fish:
        tags.append('vegetarian')
        if not has_dairy and not has_egg:
            tags.append('vegan')
    if not has_gluten:
        tags.append('gluten free')
    if not has_dairy:
        tags.append('dairy free')
    if not has_carb and not has_legume:
        tags.append('ketogenic')
    if not has_gluten and not has_dairy and not has_legume and not has_carb:
        tags.append('paleo')
    return tags


# ─── Ingredient line builder ─────────────────────────────────────────────────
#
# recipes.ingredients (normalised lowercase names, for the GIN-indexed
# search) and recipes.ingredient_lines (human-readable "qty unit name"
# strings, e.g. "1 cup flour") are both derived from the paired
# RecipeIngredientQuantities / RecipeIngredientParts columns.

def build_ingredient_lines(quantities, parts):
    lines = []
    names_lower = []
    n = max(len(quantities), len(parts))
    for i in range(n):
        qty = quantities[i] if i < len(quantities) else ''
        name = parts[i] if i < len(parts) else ''
        name = (name or '').strip()
        if not name or name.lower() in ('na', 'nan', 'none'):
            continue
        qty = (qty or '').strip()
        qty = '' if qty.lower() in ('na', 'nan', 'none') else qty
        line = f"{qty} {name}".strip() if qty else name
        lines.append(line)
        names_lower.append(name.lower())
    return lines, names_lower


# ─── Quality scoring (mirrors supabase_step15_migration.sql) ────────────────

def compute_quality_score(ingredient_count, instructions_text):
    instr_len = len(instructions_text or '')
    if instr_len < 100 and ingredient_count < 3:
        return 0  # low: no real instructions AND too few ingredients
    if instr_len < 100:
        return 1  # ok: short instructions but enough ingredients
    if ingredient_count >= 4 and instr_len >= 200:
        return 2  # good
    return 1


# ─── Row transform: Food.com DataFrame row → Forage `recipes` row ──────────

def transform_row(row):
    quantities = parse_r_vector(row.get('RecipeIngredientQuantities'))
    parts = parse_r_vector(row.get('RecipeIngredientParts'))
    lines, names_lower = build_ingredient_lines(quantities, parts)

    if len(names_lower) < MIN_INGREDIENTS:
        return None  # filtered: too few ingredients to be a usable recipe

    instructions_list = parse_r_vector(row.get('RecipeInstructions'))
    instructions_text = ' '.join(instructions_list).strip()

    if len(instructions_text) < MIN_INSTRUCTION_CHARS:
        return None  # filtered: no meaningful instructions

    title = str(row.get('Name') or '').strip()
    if not title:
        return None

    recipe_id = row.get('RecipeId')
    if recipe_id is None or (isinstance(recipe_id, float) and math.isnan(recipe_id)):
        return None
    source_id = f"foodcom-{int(recipe_id)}"

    images = parse_r_vector(row.get('Images'))
    image_url = images[0] if images else None

    # Deliberately NOT using TotalTime: Food.com's TotalTime includes
    # marinating/freezing/rising time, which can run into DAYS for many
    # recipes (e.g. this exact dataset's "Low-Fat Berry Blue Frozen
    # Dessert" has a 24-hour freeze -> TotalTime of 1485 minutes). Forage
    # displays this as a plain "N min" badge and the Time filter caps at
    # 60 min, so a multi-day TotalTime would either look absurd or get
    # the recipe wrongly excluded by every non-"any time" filter option.
    # CookTime (active cooking only) is the correct semantic match; fall
    # back to PrepTime if CookTime is missing, and leave it null rather
    # than guess if neither is present (dbRowToRecipe's instruction-count
    # estimate kicks in for null cook_time, same as the TheMealDB path).
    cook_time = parse_duration_minutes(row.get('CookTime')) \
        or parse_duration_minutes(row.get('PrepTime'))
    # Known limitation: Food.com's CookTime field itself sometimes bundles
    # passive time (freezing, marinating, rising) with no way to separate
    # it from active cooking at the data level — e.g. a frozen dessert's
    # CookTime is its 24h freeze, not hands-on time. There's no fully
    # correct fix without re-deriving from instruction text (unreliable).
    # Clamp at 4 hours (240 min) so multi-day outliers don't corrupt the
    # Time filter UX; recipes above that just show no time badge and fall
    # back to dbRowToRecipe's instruction-count estimate, same as any
    # recipe with cook_time NULL.
    if cook_time is not None and cook_time > 240:
        cook_time = None

    servings = row.get('RecipeServings')
    servings = int(servings) if servings is not None and not (isinstance(servings, float) and math.isnan(servings)) else 4
    servings = max(1, min(servings, 50))  # sanity clamp

    cuisine_raw = row.get('RecipeCategory')
    cuisine = str(cuisine_raw).strip() if cuisine_raw and str(cuisine_raw).strip().lower() != 'nan' else None

    tags = derive_diet_tags(parts)

    def _num(key):
        v = row.get(key)
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return None
        return float(v)

    quality = compute_quality_score(len(names_lower), instructions_text)

    return {
        "source_id": source_id,
        "source": "foodcom",
        "title": title,
        "ingredients": names_lower,
        "ingredient_lines": lines,
        "instructions": instructions_text,
        "image_url": image_url,
        "source_url": None,
        "cook_time": cook_time,
        "servings": servings,
        "tags": tags,
        "cuisine": cuisine,
        "quality_score": quality,
        "calories": _num('Calories'),
        "protein_g": _num('ProteinContent'),
        "carbs_g": _num('CarbohydrateContent'),
        "fat_g": _num('FatContent'),
        "saturated_fat_g": _num('SaturatedFatContent'),
        "sugar_g": _num('SugarContent'),
        "fiber_g": _num('FiberContent'),
        "sodium_mg": _num('SodiumContent'),
        "cholesterol_mg": _num('CholesterolContent'),
    }


# ─── Parquet shard discovery ──────────────────────────────────────────────────

def get_parquet_urls():
    resp = requests.get(HF_PARQUET_API, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    urls = [f["url"] for f in data.get("parquet_files", []) if f.get("split") == "train"]
    if not urls:
        # Fall back to whatever splits exist if there's no "train" split
        urls = [f["url"] for f in data.get("parquet_files", [])]
    if not urls:
        raise RuntimeError(
            f"No Parquet shards found for {HF_DATASET}. "
            f"Check https://huggingface.co/datasets/{HF_DATASET} is still public."
        )
    return urls


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Import Food.com recipes into Forage")
    parser.add_argument("--limit", type=int, default=None, help="Import at most N recipes (for testing)")
    parser.add_argument("--min-quality", type=int, default=1, help="Skip recipes below this quality_score (0-2)")
    parser.add_argument("--dry-run", action="store_true", help="Parse and report stats without writing to Supabase")
    args = parser.parse_args()

    if not args.dry_run and not SUPABASE_SERVICE_KEY:
        print("Error: SUPABASE_SERVICE_KEY environment variable is required (unless --dry-run).")
        print("Get it from: Supabase Dashboard → Settings → API → service_role")
        sys.exit(1)

    print("🌿 Forage — Food.com Recipe Import\n")

    print(f"Discovering Parquet shards for {HF_DATASET}...")
    urls = get_parquet_urls()
    print(f"  Found {len(urls)} shard(s)\n")

    supabase = None if args.dry_run else create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    total_seen = 0
    total_kept = 0
    total_written = 0
    quality_counts = {0: 0, 1: 0, 2: 0}
    nutrition_present = 0
    batch = []

    def flush_batch():
        nonlocal total_written, batch
        if not batch:
            return
        if args.dry_run:
            total_written += len(batch)
        else:
            result = supabase.table("recipes").upsert(
                batch, on_conflict="source_id", ignore_duplicates=False
            ).execute()
            total_written += len(result.data) if result.data else len(batch)
        batch = []

    start = time.time()

    for shard_idx, url in enumerate(urls, 1):
        print(f"Shard {shard_idx}/{len(urls)}: streaming {url.split('/')[-1]}...")
        df = pd.read_parquet(url)
        print(f"  {len(df):,} rows in this shard")

        for _, row in df.iterrows():
            total_seen += 1
            if args.limit and total_kept >= args.limit:
                break

            transformed = transform_row(row)
            if transformed is None:
                continue

            if transformed["quality_score"] < args.min_quality:
                quality_counts[transformed["quality_score"]] += 1
                continue

            quality_counts[transformed["quality_score"]] += 1
            if transformed["calories"] is not None:
                nutrition_present += 1

            total_kept += 1
            batch.append(transformed)

            if len(batch) >= BATCH_SIZE:
                flush_batch()

            if total_kept % 5000 == 0:
                elapsed = time.time() - start
                print(f"  ...{total_kept:,} recipes imported ({elapsed:.0f}s elapsed)")

        if args.limit and total_kept >= args.limit:
            break

    flush_batch()

    elapsed = time.time() - start
    print(f"\n✅ Import {'simulated' if args.dry_run else 'complete'} in {elapsed:.0f}s\n")
    print(f"  Rows scanned:        {total_seen:,}")
    print(f"  Recipes kept:        {total_kept:,}")
    print(f"  Recipes written:     {total_written:,}")
    print(f"  With nutrition data: {nutrition_present:,} ({100 * nutrition_present / max(total_kept, 1):.1f}%)")
    print(f"  Quality breakdown:   low={quality_counts[0]:,}  ok={quality_counts[1]:,}  good={quality_counts[2]:,}")
    if not args.dry_run:
        print(f"\nYour recipes table now has these recipes searchable via search_by_ingredients().")


if __name__ == "__main__":
    main()
