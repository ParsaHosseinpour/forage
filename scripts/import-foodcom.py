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

HF_DATASET = "AkashPS11/recipes_data_food.com"
HF_PARQUET_API = f"https://datasets-server.huggingface.co/parquet?dataset={HF_DATASET}"

BATCH_SIZE = 200          # rows per Supabase upsert call
MIN_INGREDIENTS = 3        # recipes below this are almost always junk/incomplete

# Raised from 40 -> 150. 40 characters is barely one short sentence
# ("Mix well and serve." is 20 chars) and was letting through recipes
# with essentially no real instructions. 150 chars is roughly 2-3
# genuine sentences — enough to actually be a usable recipe step.
MIN_INSTRUCTION_CHARS = 150

# When True (the default, per an explicit decision to prioritise a
# smaller CLEAN dataset over a larger one with broken-looking cards),
# recipes with no image are skipped entirely rather than imported with
# a generic placeholder. Roughly half of Food.com's community-submitted
# recipes have no image at all (confirmed against real sample data),
# so this materially shrinks the imported set — that's the intended
# trade-off. Set to False (or pass --allow-no-image) to import
# image-less recipes anyway if dataset size becomes the priority later.
REQUIRE_IMAGE = True

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
# search) and recipes.ingredient_lines (human-readable display strings)
# are both derived from the paired RecipeIngredientQuantities /
# RecipeIngredientParts columns.
#
# THREE REAL PROBLEMS FOUND IN THE RAW DATA (confirmed against live
# samples of the actual dataset):
#
# 1. Food.com has NO separate units column anywhere in this dataset.
#    RecipeIngredientQuantities is a bare number ("1/4", "1 1/2");
#    RecipeIngredientParts is the ingredient name only. Pairing them
#    literally produces meaningless lines like "1/4 sweet butter" or
#    "1 salt". Fixed with a small reference table of common ingredients
#    where a standard unit can be reasonably guessed, plus a rule that
#    whole-number quantities (not fractions) are almost always counts
#    ("1 onion", "12 mushrooms") and need no unit at all.
#
# 2. Food.com stores descriptive qualifiers as a COMMA SUFFIX inside the
#    ingredient name itself, e.g. "lemons, rind of", "tomatoes, whole".
#    Fixed by parsing the "name, qualifier" pattern and re-composing it
#    in natural reading order ("whole tomatoes") before it reaches the
#    ingredients array.
#
# 3. Some recipes' instructions reference an ingredient that never
#    appears in the parsed ingredient list (e.g. "tarragon" used in a
#    step but absent from Ingredients) — a sign of a misaligned/
#    incomplete source row. Detected and used to deprioritise (not
#    reject) the recipe's quality_score. See flag_orphaned_ingredients().

# Reference table of common ingredients where a bare fractional quantity
# is almost always meaningless and a standard unit can be reasonably
# inferred. Deliberately conservative — only ingredients where guessing
# is low-risk.
_GUESSED_UNIT = {
    'flour': 'cup', 'sugar': 'cup', 'brown sugar': 'cup', 'powdered sugar': 'cup',
    'salt': 'tsp', 'black pepper': 'tsp', 'pepper': 'tsp', 'baking powder': 'tsp',
    'baking soda': 'tsp', 'vanilla': 'tsp', 'vanilla extract': 'tsp',
    'cinnamon': 'tsp', 'nutmeg': 'tsp', 'paprika': 'tsp', 'cumin': 'tsp',
    'oregano': 'tsp', 'basil': 'tsp', 'garlic powder': 'tsp', 'onion powder': 'tsp',
    'italian seasoning': 'tsp', 'thyme': 'tsp', 'rosemary': 'tsp', 'dill': 'tsp',
    'parsley': 'tbsp', 'cilantro': 'tbsp', 'chives': 'tbsp',
    'butter': 'tbsp', 'oil': 'tbsp', 'olive oil': 'tbsp', 'vegetable oil': 'tbsp',
    'soy sauce': 'tbsp', 'lemon juice': 'tbsp', 'lime juice': 'tbsp',
    'milk': 'cup', 'water': 'cup', 'cream': 'cup', 'heavy cream': 'cup',
    'broth': 'cup', 'chicken broth': 'cup', 'beef broth': 'cup', 'stock': 'cup',
    'rice': 'cup', 'wine': 'cup',
    # Grated/shredded cheeses — measured by volume, never counted like eggs.
    # Whole-number quantities were incorrectly falling through to the
    # "bare count is fine" path (e.g. "6 cheddar cheese", which reads as
    # nonsense — cheese isn't sold or measured in units of 6).
    'cheddar cheese': 'cup', 'cheddar': 'cup', 'mozzarella': 'cup',
    'parmesan': 'cup', 'shredded cheese': 'cup', 'grated cheese': 'cup',
    'cream cheese': 'oz', 'cottage cheese': 'cup', 'feta': 'cup',
    'sour cream': 'cup', 'yogurt': 'cup', 'mayonnaise': 'cup',
    'ketchup': 'cup', 'mustard': 'tbsp', 'honey': 'tbsp', 'syrup': 'cup',
    'cocoa powder': 'cup', 'cornstarch': 'tbsp', 'cornmeal': 'cup',
    'breadcrumbs': 'cup', 'panko': 'cup', 'oats': 'cup',
}

# Words that are ALWAYS units/measures on their own — if an ingredient
# name already starts with one (rare, but happens), a preceding number
# is safe regardless of whole/fraction.
_ALREADY_HAS_UNIT = (
    'cup', 'tbsp', 'tablespoon', 'tsp', 'teaspoon', 'oz', 'ounce', 'lb',
    'pound', 'gram', 'kg', 'ml', 'liter', 'litre', 'pint', 'quart', 'gallon',
    'pinch', 'dash', 'clove', 'slice', 'can', 'jar', 'package', 'stalk',
    'sprig', 'head', 'bunch',
)


def _is_whole_number(qty):
    """
    True for plain whole-number quantities ("1", "2", "12") vs
    fractional ones ("1/4", "1 1/2"). This is the reliable signal for
    whether a bare number reads naturally in front of a food noun:
    whole numbers overwhelmingly mean "count of this many" ("1 onion",
    "8 chicken thighs"), while fractions overwhelmingly mean "a fraction
    of a measuring unit" ("1/4 [cup] sugar").
    """
    qty = qty.strip()
    if not qty or '/' in qty:
        return False
    try:
        int(qty)
        return True
    except ValueError:
        return False


def _looks_countable(name_lower):
    """True if this ingredient name already carries its own unit word."""
    return any(name_lower.startswith(u) for u in _ALREADY_HAS_UNIT)


def _split_qualifier(name):
    """
    Food.com stores descriptors as a comma suffix: "lemons, rind of",
    "tomatoes, whole", "onion, finely chopped". Re-compose into natural
    reading order: "whole tomatoes", "finely chopped onion".

    Returns (display_name, countable_base) — countable_base is the
    ORIGINAL base noun before recomposition, so the caller can check
    plurality consistently regardless of qualifier position.
    """
    if ',' not in name:
        return name, name
    base, _, qualifier = name.partition(',')
    base = base.strip()
    qualifier = qualifier.strip()
    if not qualifier or not base:
        cleaned = name.strip()
        return cleaned, cleaned
    if qualifier.endswith(' of'):
        qualifier = qualifier[:-3].strip()
        return f"{base} {qualifier}".strip(), base
    return f"{qualifier} {base}".strip(), base


def _pluralize_unit(unit, qty):
    """
    "1 cup" and "1/2 cup" both stay singular (quantity <= 1); "6 cup"
    and "1 1/2 cup" should read "6 cups" / "1 1/2 cups". Evaluates the
    actual numeric value rather than string-matching "1" literally, so
    fractional quantities under 1 (1/2, 1/4, 1/3) are correctly treated
    as singular too. Only pluralizes units where doing so is
    unambiguous (cup/tsp/tbsp) -- skips abbreviations like "oz"/"lb"
    that don't take a natural plural "s" in common usage.
    """
    no_plural = {'oz', 'lb', 'ml', 'g', 'kg'}
    if unit in no_plural or unit.endswith('s'):
        return unit

    numeric_value = _quantity_to_float(qty)
    is_singular = numeric_value is not None and numeric_value <= 1.0
    return unit if is_singular else f"{unit}s"


def _quantity_to_float(qty):
    """Best-effort numeric value of a quantity string ('1 1/2' -> 1.5, '1/2' -> 0.5, '3' -> 3.0)."""
    qty = qty.strip()
    if not qty:
        return None
    FRACS = {'½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125}
    parts = qty.split()
    total = 0.0
    found_any = False
    for p in parts:
        for f, v in FRACS.items():
            if f in p:
                total += v
                found_any = True
                p = ''
                break
        if not p:
            continue
        if '/' in p:
            try:
                num, den = p.split('/')
                total += float(num) / float(den)
                found_any = True
            except (ValueError, ZeroDivisionError):
                pass
        else:
            try:
                total += float(p)
                found_any = True
            except ValueError:
                pass
    return total if found_any else None


def _guess_display_line(qty, name_clean, countable_base_lower):
    """
    Build the human-readable ingredient line, choosing the least
    misleading representation given that Food.com has no units column:
      - known guessable ingredient -> "1/4 cup sugar" (inferred unit)
      - whole-number quantity -> "1 onion", "12 mushrooms" (bare number
        is correct and unambiguous regardless of singular/plural)
      - fractional quantity, no confident unit guess -> drop the number,
        show just the name: "sugar" reads as intentional; "1/4 sugar"
        does not
      - no qty at all -> just the name
    """
    if not qty:
        return name_clean

    name_lower = name_clean.lower()

    # Narrow grammar guard: Food.com sometimes pairs a plural qualifier
    # with quantity "1" (e.g. "1" + "tomatoes, whole" -> "whole
    # tomatoes"), which is already contradictory in the SOURCE data
    # ("1 whole tomatoes" is not valid English). Drop a bare "1" in
    # front of an already-plural noun rather than build general grammar
    # correction for a narrow mismatch.
    last_word = name_lower.rsplit(' ', 1)[-1]
    is_plural_noun = len(last_word) > 3 and last_word.endswith('s') and not last_word.endswith('ss')
    if qty.strip() == '1' and is_plural_noun:
        return name_clean

    for key, unit in _GUESSED_UNIT.items():
        if key in name_lower:
            unit_display = _pluralize_unit(unit, qty)
            return f"{qty} {unit_display} {name_clean}"

    if _is_whole_number(qty) or _looks_countable(countable_base_lower):
        return f"{qty} {name_clean}"

    return name_clean


def build_ingredient_lines(quantities, parts):
    lines = []
    names_lower = []
    n = max(len(quantities), len(parts))
    for i in range(n):
        qty = quantities[i] if i < len(quantities) else ''
        raw_name = parts[i] if i < len(parts) else ''
        raw_name = (raw_name or '').strip()
        if not raw_name or raw_name.lower() in ('na', 'nan', 'none'):
            continue

        name_clean, countable_base = _split_qualifier(raw_name)
        name_lower = name_clean.lower()

        qty = (qty or '').strip()
        qty = '' if qty.lower() in ('na', 'nan', 'none') else qty

        line = _guess_display_line(qty, name_clean, countable_base.lower())
        lines.append(line)
        names_lower.append(name_lower)
    return lines, names_lower


def flag_orphaned_ingredients(title, instructions_text, ingredient_names_lower):
    """
    Detect two signs that a recipe's source row is internally
    inconsistent -- a sign the ingredient/quantity arrays were
    incomplete or misaligned at the source, not something introduced by
    our parsing:

    1. TITLE CHECK (the stronger, more general signal): a recipe's
       title almost always names its hero ingredient(s) -- "Squash
       Frittata", "Chicken Alfredo", "Beef Stew". If none of the
       meaningful nouns in the title appear anywhere in the parsed
       ingredient list, the row is very likely missing its main
       ingredient entirely (real example: "Yellow Squash Frittata"
       where squash never appears in Ingredients at all, despite being
       used as the primary ingredient across multiple instruction
       steps). This generalises far better than a fixed word list --
       it would have caught the squash case, which a herb/spice-only
       check never could.

    2. HERB CHECK (narrower, kept as a secondary signal): a short list
       of easily-detected named herbs/spices used in instructions but
       absent from Ingredients (e.g. "sprinkle the tarragon on top").

    A quality SIGNAL, not a hard filter -- both checks are heuristics
    that can occasionally false-positive (e.g. a title word that's a
    genuine synonym for something phrased differently in the
    ingredient list), so affected recipes are deprioritised via
    quality_score rather than rejected outright.
    """
    if not instructions_text:
        return False

    # ── 1. Title check ──────────────────────────────────────────────────────
    # Generic recipe-title words that are never themselves the missing
    # ingredient -- filtered out so "Chicken Salad" doesn't flag just
    # because "salad" isn't a literal ingredient name.
    TITLE_STOPWORDS = {
        'the', 'a', 'an', 'with', 'and', 'or', 'in', 'on', 'style', 'recipe',
        'easy', 'quick', 'simple', 'best', 'homemade', 'classic', 'traditional',
        'salad', 'soup', 'stew', 'bake', 'baked', 'roast', 'roasted', 'grilled',
        'fried', 'stir', 'fry', 'casserole', 'dish', 'meal', 'dinner', 'lunch',
        'breakfast', 'dessert', 'appetizer', 'side', 'main', 'sweet', 'savory',
        'spicy', 'creamy', 'crispy', 'fresh', 'delicious', 'perfect', 'ultimate',
        'frittata', 'omelette', 'omelet', 'casserole', 'skillet', 'pot', 'pan',
        'sandwich', 'wrap', 'bowl', 'plate', 'style', 'no', 'low', 'free', 'of',
        'for', 'to', 'my', 'your', 'our', 'this', 'that', 'i', 'ii', 'iii',
    }
    title_words = re.findall(r"[a-z']+", title.lower())
    candidate_words = [
        w for w in title_words
        if len(w) > 3 and w not in TITLE_STOPWORDS and not w.endswith("'s")
    ]
    if candidate_words:
        # If NONE of the meaningful title words appear anywhere in the
        # ingredient list, the title's hero ingredient is likely missing.
        found_any = any(
            any(word in ing for ing in ingredient_names_lower)
            for word in candidate_words
        )
        if not found_any:
            return True

    # ── 2. Herb/spice check ──────────────────────────────────────────────────
    instructions_lower = instructions_text.lower()
    named_check = (
        'tarragon', 'thyme', 'rosemary', 'basil', 'oregano', 'cilantro',
        'parsley', 'dill', 'sage', 'mint', 'chives', 'saffron',
    )
    for herb in named_check:
        if re.search(rf'\b{herb}\b', instructions_lower):
            if not any(herb in n for n in ingredient_names_lower):
                return True

    return False


# ─── Quality scoring (mirrors supabase_step15_migration.sql) ────────────────

def compute_quality_score(ingredient_count, instructions_text, has_orphaned_ingredient=False):
    instr_len = len(instructions_text or '')
    if instr_len < 100 and ingredient_count < 3:
        return 0  # low: no real instructions AND too few ingredients
    if instr_len < 100:
        return 1  # ok: short instructions but enough ingredients
    if has_orphaned_ingredient:
        # Instructions reference an ingredient absent from the parsed
        # list — deprioritised in search rather than ranked equal to a
        # fully consistent recipe, but still importable.
        return 1
    if ingredient_count >= 4 and instr_len >= 200:
        return 2  # good
    return 1


# ─── Row transform: Food.com DataFrame row → Forage `recipes` row ──────────

# Tracks WHY recipes were rejected, for the end-of-run summary. Populated
# by transform_row() as it filters rows; read by main() when printing
# final stats. A plain module-level dict rather than changing
# transform_row's return type, to avoid touching its existing contract.
REJECTION_COUNTS = {
    'too_few_ingredients': 0,
    'short_instructions': 0,
    'no_title': 0,
    'invalid_id': 0,
    'no_image': 0,
}


def transform_row(row):
    quantities = parse_r_vector(row.get('RecipeIngredientQuantities'))
    parts = parse_r_vector(row.get('RecipeIngredientParts'))
    lines, names_lower = build_ingredient_lines(quantities, parts)

    if len(names_lower) < MIN_INGREDIENTS:
        REJECTION_COUNTS['too_few_ingredients'] += 1
        return None  # filtered: too few ingredients to be a usable recipe

    instructions_list = parse_r_vector(row.get('RecipeInstructions'))
    instructions_text = ' '.join(instructions_list).strip()

    if len(instructions_text) < MIN_INSTRUCTION_CHARS:
        REJECTION_COUNTS['short_instructions'] += 1
        return None  # filtered: no meaningful instructions

    title = str(row.get('Name') or '').strip()
    if not title:
        REJECTION_COUNTS['no_title'] += 1
        return None

    recipe_id = row.get('RecipeId')
    if recipe_id is None or (isinstance(recipe_id, float) and math.isnan(recipe_id)):
        REJECTION_COUNTS['invalid_id'] += 1
        return None
    source_id = f"foodcom-{int(recipe_id)}"

    images = parse_r_vector(row.get('Images'))
    # Filter out empty strings, whitespace-only, and Food.com's known
    # placeholder/broken-link patterns before treating "has an image" as
    # true — otherwise a junk URL could count as "has image" and defeat
    # the whole point of this filter.
    valid_images = [
        img for img in images
        if img and img.strip() and img.strip().lower() not in ('character(0)', 'na', 'nan')
        and img.strip().startswith('http')
    ]
    image_url = valid_images[0] if valid_images else None

    if REQUIRE_IMAGE and image_url is None:
        REJECTION_COUNTS['no_image'] += 1
        return None  # filtered: no real image — see REQUIRE_IMAGE comment above

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

    has_orphan = flag_orphaned_ingredients(title, instructions_text, names_lower)
    quality = compute_quality_score(len(names_lower), instructions_text, has_orphan)

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
    parser.add_argument("--allow-no-image", action="store_true",
                         help="Import recipes with no image instead of skipping them (default: image required)")
    args = parser.parse_args()

    global REQUIRE_IMAGE
    if args.allow_no_image:
        REQUIRE_IMAGE = False

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
    print(f"\n  Rejected recipes (why they were skipped):")
    print(f"    No real image:          {REJECTION_COUNTS['no_image']:,}"
          + ("  (REQUIRE_IMAGE is on)" if REQUIRE_IMAGE else "  (image not required, this should be 0)"))
    print(f"    Instructions too short: {REJECTION_COUNTS['short_instructions']:,}  (< {MIN_INSTRUCTION_CHARS} chars)")
    print(f"    Too few ingredients:    {REJECTION_COUNTS['too_few_ingredients']:,}  (< {MIN_INGREDIENTS} ingredients)")
    print(f"    No title:               {REJECTION_COUNTS['no_title']:,}")
    print(f"    Invalid/missing ID:     {REJECTION_COUNTS['invalid_id']:,}")
    if not args.dry_run:
        print(f"\nYour recipes table now has these recipes searchable via search_by_ingredients().")


if __name__ == "__main__":
    main()
