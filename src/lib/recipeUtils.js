import { normalizeIngredient } from './ingredientNormalize'

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
 *
 * v2 fix: tier lookups previously used plain `.includes()`, which is a raw
 * substring check with no word boundaries. That caused real false positives:
 *   "graham crackers" → matched "ham" (CORE_PROTEINS) → treated as core protein
 *   "cornstarch"       → matched "corn" (SUPPORTING)   → over-weighted
 * Fixed by matching on whole words/phrases only (padded-space boundaries).
 *
 * It also conflated genuinely ambiguous terms — "pepper" alone almost always
 * means the spice in a recipe line, but the word also appears inside
 * "bell pepper" (the vegetable). A small exact-match override list resolves
 * the common, unambiguous cases (plain "pepper", "black pepper", "cornstarch",
 * "corn syrup", "popcorn") to 'minor' before the general tier lists run.
 */

const CORE_PROTEINS = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal',
  'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut', 'bass',
  'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'scallop',
  'mince', 'steak', 'chop', 'fillet',
  'bacon', 'ham', 'sausage', 'chorizo', 'pancetta',
  'tofu', 'tempeh', 'seitan',
  // small coverage additions — previously fell through to 'minor' by default
  'octopus', 'squid', 'venison', 'rabbit', 'quail', 'goat',
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
  // small coverage additions
  'naan', 'roti', 'chapati', 'bagel', 'barley',
]

const SUPPORTING = [
  'tomato', 'onion', 'shallot', 'leek', 'capsicum',
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
  // 'bell pepper' / 'red pepper' kept as the vegetable form. Bare or
  // qualified-as-spice "pepper" is handled by MINOR_OVERRIDES below, so it
  // doesn't dilute the dedicated vegetable terms here.
  'bell pepper', 'red pepper', 'green pepper', 'yellow pepper',
]

/**
 * Exact-match overrides — checked BEFORE the tier lists.
 * These are ingredient names that are genuinely ambiguous as substrings
 * (pepper) or were getting accidentally over-weighted as processed/refined
 * pantry items rather than the fresh ingredient they're named after (corn).
 * Exact match only — so this never touches "bell pepper" or "sweet corn".
 */
const MINOR_OVERRIDES = new Set([
  'pepper', 'black pepper', 'white pepper', 'cayenne pepper',
  'pepper flakes', 'red pepper flakes', 'crushed red pepper', 'ground pepper',
  'corn syrup', 'cornstarch', 'corn starch', 'cornflour', 'corn flour', 'popcorn',
])

const TIER_WEIGHT = { core: 5, supporting: 2, minor: 0.5 }

/** Word/phrase-boundary substring match — avoids "graham" matching "ham". */
function hasWordMatch(name, terms) {
  const padded = ` ${name} `
  return terms.some(term => padded.includes(` ${term} `))
}

function classifyTier(name = '') {
  const n = normalizeIngredient(name)
  if (MINOR_OVERRIDES.has(n)) return 'minor'
  if (hasWordMatch(n, CORE_PROTEINS)) return 'core'
  if (hasWordMatch(n, CORE_CARBS)) return 'core'
  if (hasWordMatch(n, SUPPORTING)) return 'supporting'
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
