import { normalizeIngredient } from './recipeDb'

/**
 * Tier-based ingredient matching.
 *
 * Problem with naive (used / total) × 100:
 *   "Beef Bolognese" — have all 8 spices, missing beef → shows 88% match.
 *
 * Fix: weight ingredients by culinary importance.
 *   Core    (protein/main carb) → 5×  — missing these tanks the dish
 *   Support (veg, dairy, eggs)  → 2×  — notable but cookable without
 *   Minor   (herbs, spices, oil)→ 0.5×— almost always substitutable
 */

const CORE_PROTEINS = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal',
  'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut', 'bass',
  'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'scallop',
  'mince', 'ground beef', 'steak', 'chop', 'fillet',
  'bacon', 'ham', 'sausage', 'chorizo', 'pancetta',
  'tofu', 'tempeh', 'seitan',
]

const CORE_CARBS = [
  'pasta', 'spaghetti', 'linguine', 'fettuccine', 'penne', 'rigatoni',
  'tagliatelle', 'lasagne', 'gnocchi', 'orzo', 'macaroni',
  'rice', 'risotto', 'arborio',
  'bread', 'baguette', 'sourdough', 'ciabatta', 'brioche',
  'potato', 'potatoes', 'sweet potato',
  'noodle', 'ramen', 'udon', 'soba', 'vermicelli',
  'tortilla', 'taco', 'pita', 'flatbread', 'wrap',
  'pizza dough', 'pastry', 'puff pastry', 'shortcrust',
  'quinoa', 'couscous', 'polenta', 'grits', 'bulgur', 'farro',
  'flour',  // when used as a main base (bread/pastry), not thickener
]

const SUPPORTING = [
  'tomato', 'onion', 'shallot', 'leek', 'pepper', 'capsicum',
  'mushroom', 'spinach', 'broccoli', 'cauliflower', 'cabbage',
  'carrot', 'celery', 'zucchini', 'courgette', 'eggplant', 'aubergine',
  'squash', 'pumpkin', 'corn', 'pea', 'green bean', 'asparagus',
  'artichoke', 'fennel', 'turnip', 'parsnip', 'beetroot',
  'lettuce', 'kale', 'chard', 'bok choy',
  'avocado', 'cucumber', 'lemon', 'lime', 'orange',
  'apple', 'pear', 'mango', 'pineapple', 'banana',
  'bean', 'lentil', 'chickpea', 'black bean', 'kidney bean',
  'cheese', 'parmesan', 'mozzarella', 'cheddar', 'feta', 'ricotta',
  'cream', 'heavy cream', 'sour cream', 'creme fraiche',
  'milk', 'yogurt', 'butter',
  'egg',  // 'eggs' normalizes to 'egg'
  'coconut milk', 'coconut cream',
]

const TIER_WEIGHT = { core: 5, supporting: 2, minor: 0.5 }

function classifyTier(name = '') {
  const n = normalizeIngredient(name)
  if (CORE_PROTEINS.some(p => n.includes(p))) return 'core'
  if (CORE_CARBS.some(p => n.includes(p))) return 'core'
  if (SUPPORTING.some(p => n.includes(p))) return 'supporting'
  return 'minor'
}

/**
 * Calculate a weighted match percentage.
 *
 * @param {Array} usedIngredients   — Spoonacular usedIngredients array
 * @param {Array} missedIngredients — Spoonacular missedIngredients array
 * @returns {number|null} 0–100 percentage, or null if no data
 */
export function weightedMatchPct(usedIngredients = [], missedIngredients = []) {
  const used   = Array.isArray(usedIngredients)   ? usedIngredients   : []
  const missed = Array.isArray(missedIngredients) ? missedIngredients : []
  const all    = [...used, ...missed]

  if (all.length === 0) return null

  let totalWeight = 0
  let usedWeight  = 0

  for (const ing of all) {
    totalWeight += TIER_WEIGHT[classifyTier(ing.name || ing.original)]
  }
  for (const ing of used) {
    usedWeight += TIER_WEIGHT[classifyTier(ing.name || ing.original)]
  }

  if (totalWeight === 0) return 100
  return Math.round((usedWeight / totalWeight) * 100)
}

/**
 * Return the tier of a missing ingredient — used in RecipeDetail
 * to sort and visually flag which missing items really matter.
 *
 * @returns {'core'|'supporting'|'minor'}
 */
export function getMissingTier(ingName = '') {
  return classifyTier(ingName)
}
