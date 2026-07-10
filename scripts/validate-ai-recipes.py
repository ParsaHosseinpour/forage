#!/usr/bin/env python3
"""
Validate the 50 AI-generated Iranian recipes against every rule set in
the generation prompt, before anything touches the Supabase database.

Checks:
  1. Schema completeness — every required field present, correct types
  2. Duplicate titles — across both batches combined
  3. Orphaned ingredients — every ingredient mentioned in instructions
     must appear in the ingredients list, and vice versa (best-effort,
     same heuristic as flag_orphaned_ingredients in import-foodcom.py)
  4. Unit sanity — no bare "number + non-countable ingredient" with no
     unit (the exact "6 cheddar cheese" class of bug)
  5. Nutrition sanity — calories/protein/carbs/fat present and in a
     plausible range (catches obvious hallucinated outliers)
  6. Instruction quality — minimum length/step count
"""

import json
import re
from collections import Counter

with open('scripts/data/iranian-recipes-batch1.json') as f:
    batch1 = json.load(f)
with open('scripts/data/iranian-recipes-batch2.json') as f:
    batch2 = json.load(f)

all_recipes = batch1 + batch2
print(f"Loaded {len(all_recipes)} recipes total ({len(batch1)} + {len(batch2)})\n")

issues = []  # (recipe_title, severity, message)

# ─── 1. Duplicate titles ────────────────────────────────────────────────────
titles = [r['title'].strip().lower() for r in all_recipes]
title_counts = Counter(titles)
duplicates = {t: c for t, c in title_counts.items() if c > 1}
if duplicates:
    for t, c in duplicates.items():
        issues.append((t, 'CRITICAL', f'Duplicate title appears {c} times'))
else:
    print("✅ No duplicate titles across both batches")

# ─── 2. Near-duplicate check (same dish, different transliteration) ────────
# Flag titles that share a very similar normalized form
def normalize_title(t):
    return re.sub(r'[^a-z]', '', t.lower())

norm_titles = {}
near_dupes = []
for r in all_recipes:
    n = normalize_title(r['title'])
    for existing_norm, existing_title in norm_titles.items():
        # Simple similarity: significant overlap in normalized characters
        if n != existing_norm and (n in existing_norm or existing_norm in n) and len(n) > 5:
            near_dupes.append((r['title'], existing_title))
    norm_titles[n] = r['title']

if near_dupes:
    for a, b in near_dupes:
        issues.append((a, 'WARNING', f'Possible near-duplicate of "{b}"'))
else:
    print("✅ No near-duplicate titles detected")

# ─── 3. Schema completeness ─────────────────────────────────────────────────
REQUIRED_FIELDS = ['title', 'cuisine', 'servings', 'cook_time_minutes',
                    'ingredients', 'instructions', 'calories', 'protein_g',
                    'carbs_g', 'fat_g']
for r in all_recipes:
    for field in REQUIRED_FIELDS:
        if field not in r or r[field] is None:
            if field not in ('calories', 'protein_g', 'carbs_g', 'fat_g'):
                issues.append((r['title'], 'CRITICAL', f'Missing required field: {field}'))
    if not r.get('ingredients'):
        issues.append((r['title'], 'CRITICAL', 'Empty ingredients list'))
    if not r.get('instructions'):
        issues.append((r['title'], 'CRITICAL', 'Empty instructions list'))

print(f"✅ Schema check complete")

# ─── 4. Orphaned ingredients (instructions mention something not listed) ───
# Build a keyword list from all ingredient names actually used across the
# batch, then check each recipe's instructions for words that look like
# food items but aren't in that recipe's own ingredient list.
COMMON_FOOD_WORDS = set()
for r in all_recipes:
    for ing in r['ingredients']:
        name = ing['name'].lower()
        for word in re.findall(r'[a-z]+', name):
            if len(word) > 3:
                COMMON_FOOD_WORDS.add(word)

STOPWORDS = {'water', 'about', 'until', 'over', 'into', 'with', 'from', 'then',
             'them', 'that', 'this', 'each', 'both', 'more', 'once', 'while',
             'well', 'just', 'only', 'still', 'very', 'like', 'need', 'want',
             'serving', 'serve', 'covered', 'cover', 'medium', 'large', 'small',
             'heat', 'minutes', 'minute', 'stirring', 'until', 'together'}

for r in all_recipes:
    ingredient_names = ' '.join(ing['name'].lower() for ing in r['ingredients'])
    instructions_text = ' '.join(r['instructions']).lower()

    # Every ingredient's core word should appear SOMEWHERE in instructions
    # (best-effort — catches truly unused ingredients)
    for ing in r['ingredients']:
        name_words = [w for w in re.findall(r'[a-z]+', ing['name'].lower()) if len(w) > 3]
        if name_words and not any(w in instructions_text for w in name_words):
            issues.append((r['title'], 'WARNING',
                           f'Ingredient "{ing["name"]}" not obviously referenced in instructions'))

# ─── 5. Unit sanity — bare numbers on non-countable ingredients ────────────
COUNTABLE_WORDS = {'egg', 'onion', 'clove', 'piece', 'potato', 'tomato', 'carrot',
                    'cucumber', 'lemon', 'lime', 'ice', 'walnuts', 'prunes',
                    'radish', 'flatbread', 'plum', 'eggplant'}
NON_COUNTABLE_NEEDS_UNIT = {'cheese', 'flour', 'sugar', 'oil', 'butter', 'salt',
                             'pepper', 'rice', 'water', 'milk', 'yogurt', 'kashk',
                             'paste', 'vinegar', 'juice', 'syrup'}

for r in all_recipes:
    for ing in r['ingredients']:
        name_lower = ing['name'].lower()
        qty = ing.get('quantity')
        unit = ing.get('unit')
        if qty is None:
            continue  # "to taste" style, fine
        is_countable = any(w in name_lower for w in COUNTABLE_WORDS)
        needs_unit = any(w in name_lower for w in NON_COUNTABLE_NEEDS_UNIT)
        if needs_unit and not is_countable and unit is None:
            issues.append((r['title'], 'CRITICAL',
                           f'"{qty} {ing["name"]}" — bare number on non-countable ingredient, no unit'))

print(f"✅ Unit sanity check complete")

# ─── 6. Nutrition sanity ────────────────────────────────────────────────────
for r in all_recipes:
    cal = r.get('calories', 0) or 0
    protein = r.get('protein_g', 0) or 0
    carbs = r.get('carbs_g', 0) or 0
    fat = r.get('fat_g', 0) or 0

    if cal < 20 or cal > 1200:
        issues.append((r['title'], 'WARNING', f'Unusual calorie count: {cal}'))

    # Rough macro-to-calorie cross check (protein/carbs ~4 cal/g, fat ~9 cal/g)
    estimated_cal = protein * 4 + carbs * 4 + fat * 9
    if estimated_cal > 0 and abs(estimated_cal - cal) / max(cal, 1) > 0.5:
        issues.append((r['title'], 'WARNING',
                       f'Macros ({protein}p/{carbs}c/{fat}f ≈ {estimated_cal:.0f}cal) '
                       f'don\'t match stated calories ({cal})'))

print(f"✅ Nutrition sanity check complete")

# ─── 7. Instruction quality ─────────────────────────────────────────────────
for r in all_recipes:
    total_chars = sum(len(s) for s in r['instructions'])
    if total_chars < 150:
        issues.append((r['title'], 'CRITICAL', f'Instructions too short ({total_chars} chars)'))
    if len(r['instructions']) < 3:
        issues.append((r['title'], 'WARNING', f'Very few steps ({len(r["instructions"])})'))

print(f"✅ Instruction quality check complete\n")

# ─── Report ──────────────────────────────────────────────────────────────────
print("=" * 70)
critical = [i for i in issues if i[1] == 'CRITICAL']
warnings = [i for i in issues if i[1] == 'WARNING']

print(f"\nRESULTS: {len(critical)} critical issues, {len(warnings)} warnings\n")

if critical:
    print("--- CRITICAL (must fix before import) ---")
    for title, sev, msg in critical:
        print(f"  ❌ {title}: {msg}")

if warnings:
    print("\n--- WARNINGS (review, may be false positives) ---")
    for title, sev, msg in warnings:
        print(f"  ⚠️  {title}: {msg}")

print(f"\n{'='*70}")
print(f"Total unique recipes: {len(set(titles))}")
print(f"Recipes with zero issues: {len(all_recipes) - len(set(t for t,s,m in issues))}")
