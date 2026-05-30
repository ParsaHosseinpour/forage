/**
 * Forage — Unit Normalisation
 *
 * Core principle: store everything in base metric units (g, ml).
 * Display converts back to human-readable form.
 *
 * Also provides ingredient domain classification for unit sanitisation:
 * chicken cannot be measured in litres; milk cannot be measured in grams.
 */

// ─── Conversion tables ────────────────────────────────────────────────────────

export const WEIGHT_TO_G = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 }
export const VOLUME_TO_ML = { ml: 1, L: 1000, l: 1000, 'fl oz': 29.57, cup: 240, tbsp: 15, tsp: 5 }

// Units that are always 1:1 (no conversion needed, just pass through)
export const COUNT_UNITS = new Set([
  'piece', 'bunch', 'clove', 'slice', 'can', 'jar', 'bag', 'head',
  'stalk', 'sprig', 'handful', 'pinch', 'dash', 'drop', 'sheet',
  'rasher', 'fillet', '',
])

export function isWeightUnit(u)  { return !!WEIGHT_TO_G[(u || '').toLowerCase()] }
export function isVolumeUnit(u)  { return !!VOLUME_TO_ML[(u || '').toLowerCase()] }
export function isCountUnit(u)   { return COUNT_UNITS.has((u || '').toLowerCase()) }

// ─── Normalise to base unit ───────────────────────────────────────────────────

/**
 * Convert amount+unit to base unit.
 * Solids → grams, liquids → ml, counts → untouched.
 *
 * Returns { amount: number, unit: string }
 */
export function toBaseUnit(amount, unit) {
  const u = (unit || '').toLowerCase().trim()
  const a = Number(amount) || 0

  if (WEIGHT_TO_G[u]) return { amount: a * WEIGHT_TO_G[u],  unit: 'g'  }
  if (VOLUME_TO_ML[u]) return { amount: a * VOLUME_TO_ML[u], unit: 'ml' }
  return { amount: a, unit: u }  // count units pass through
}

/**
 * Convert base unit (g or ml) back to a human-friendly unit.
 * 1500 g → 1.5 kg, 250 ml → 250 ml, 1000 ml → 1 L
 */
export function fromBaseUnit(amount, baseUnit) {
  const u = (baseUnit || '').toLowerCase()
  const a = Number(amount) || 0

  if (u === 'g') {
    if (a >= 1000) return { amount: round(a / 1000), unit: 'kg' }
    return { amount: round(a), unit: 'g' }
  }
  if (u === 'ml') {
    if (a >= 1000) return { amount: round(a / 1000), unit: 'L' }
    if (a >= 240) return { amount: round(a / 240, 1), unit: 'cup' }
    if (a >= 15)  return { amount: round(a / 15,  1), unit: 'tbsp' }
    return { amount: round(a), unit: 'ml' }
  }
  return { amount: round(a), unit: baseUnit }
}

function round(n, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

// ─── Display helper ───────────────────────────────────────────────────────────

/** "500 g", "1.5 kg", "2 cups" */
export function displayQty(amount, unit) {
  if (amount == null || amount === '') return ''
  const { amount: a, unit: u } = fromBaseUnit(Number(amount), unit)
  return u ? `${a} ${u}` : String(a)
}

// ─── Domain classification (for unit sanitisation) ────────────────────────────

/**
 * Physical domain of an ingredient name.
 * Used to reject nonsensical unit assignments (e.g. "1L chicken").
 *
 * 'weight'  → sold by weight only (meat, flour, cheese, vegetables)
 * 'volume'  → sold by volume only (milk, oil, wine, broth)
 * 'count'   → sold by count (eggs, lemons, cans)
 * 'any'     → no restriction (salt, sugar — can be measured both ways)
 */

const WEIGHT_ONLY = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal', 'mince',
  'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'fish', 'shrimp', 'prawn',
  'bacon', 'ham', 'sausage', 'chorizo', 'pancetta', 'steak', 'fillet',
  'tofu', 'tempeh',
  'cheese', 'parmesan', 'mozzarella', 'cheddar', 'feta', 'ricotta',
  'butter',
  'pasta', 'spaghetti', 'linguine', 'penne', 'rice', 'flour', 'oats',
  'quinoa', 'couscous', 'breadcrumbs', 'chocolate',
  'tomato', 'onion', 'carrot', 'potato', 'spinach', 'broccoli',
  'mushroom', 'pepper', 'zucchini', 'eggplant', 'cabbage', 'cucumber',
  'apple', 'banana', 'mango', 'strawberries',
]

const VOLUME_ONLY = [
  'milk', 'cream', 'coconut milk', 'coconut cream', 'almond milk', 'oat milk',
  'wine', 'beer', 'stock', 'broth',
  'juice',
]

const COUNT_ONLY = [
  'egg', 'eggs', 'lemon', 'lime', 'orange',
]

export function getIngredientDomain(name) {
  const n = (name || '').toLowerCase()
  if (WEIGHT_ONLY.some(w => n.includes(w))) return 'weight'
  if (VOLUME_ONLY.some(v => n.includes(v))) return 'volume'
  if (COUNT_ONLY.some(c => n === c || n.startsWith(c))) return 'count'
  return 'any'
}

/**
 * Sanitise a unit against the ingredient's physical domain.
 * Returns the corrected unit (may be empty string if the unit is nonsensical).
 *
 * Examples:
 *   sanitiseUnit('chicken', 'L')   → ''    (volume on weight-domain ingredient)
 *   sanitiseUnit('milk',    'g')   → ''    (weight on volume-domain ingredient)
 *   sanitiseUnit('milk',    'ml')  → 'ml'  ✓
 *   sanitiseUnit('chicken', 'g')   → 'g'   ✓
 *   sanitiseUnit('salt',    'tsp') → 'tsp' ✓  (any domain)
 *   sanitiseUnit('eggs',    '')    → ''    ✓  (count, no unit fine)
 */
export function sanitiseUnit(ingredientName, unit) {
  if (!unit) return ''
  const domain = getIngredientDomain(ingredientName)
  const u = unit.toLowerCase().trim()

  if (domain === 'weight' && isVolumeUnit(u)) return ''
  if (domain === 'volume' && isWeightUnit(u)) return ''
  if (domain === 'count' && (isWeightUnit(u) || isVolumeUnit(u))) return ''
  return unit
}

// ─── Aggregation helper ───────────────────────────────────────────────────────

/**
 * Attempt to merge incoming ingredient into existing fridge item.
 *
 * Returns null if the units are incompatible (caller should insert new row).
 * Returns { quantity, unit } update payload if merge is possible.
 */
export function mergeQuantity(existing, incoming) {
  const existQty  = Number(existing.quantity) || 0
  const existUnit = (existing.unit || '').toLowerCase()
  const inQty     = Number(incoming.quantity) || 0
  const inUnit    = (incoming.unit || '').toLowerCase()

  // Neither has a quantity → nothing to merge
  if (existQty === 0 && inQty === 0) return { quantity: null, unit: existing.unit }

  // Convert both to base, then back to the existing unit
  const { amount: existBase, unit: baseUnit } = toBaseUnit(existQty, existUnit)
  const { amount: inBase,    unit: baseIn   } = toBaseUnit(inQty,    inUnit)

  // Incompatible domains (weight vs volume, or weight vs count)
  if (baseUnit !== baseIn && baseUnit !== '' && baseIn !== '') {
    // If one has no unit, use the other's domain
    if (!existUnit && inUnit) return null  // can't merge unit-less into unit
    if (!inUnit && existUnit) return null
    return null  // truly incompatible
  }

  const sumBase = existBase + inBase
  const display = fromBaseUnit(sumBase, baseUnit || baseIn)
  return { quantity: display.amount, unit: display.unit }
}
