/**
 * Forage — Cook It deduction utilities.
 *
 * Unit conversion strategy:
 *
 *   1. Same unit / same dimension  → exact conversion (g↔kg, ml↔L, etc.)
 *   2. Both count-like             → 1:1 compatible (piece ↔ clove ↔ slice …)
 *   3. Cross-dimensional (count↔weight, count↔volume)
 *        → look up TYPICAL_WEIGHTS / TYPICAL_VOLUMES for the ingredient name
 *          and estimate; mark result isEstimated:true so the UI can flag it
 *        → if ingredient not in table: canCompute:false — shown in modal with
 *          editable input so user decides the deduction manually
 *   4. Weight ↔ volume             → genuinely incompatible, canCompute:false
 */

// ── Unit tables (all keys lowercase) ─────────────────────────────────────────

const TO_GRAMS = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
}

const TO_ML = {
  ml: 1, milliliter: 1, millilitre: 1, milliliters: 1, millilitres: 1,
  l: 1000, liter: 1000, litre: 1000, liters: 1000, litres: 1000,
  'fl oz': 29.57, 'fluid ounce': 29.57, 'fluid ounces': 29.57,
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15, tbs: 15,
  tsp: 5,  teaspoon: 5,  teaspoons: 5,
}

const COUNT_UNITS = new Set([
  '', 'piece', 'pieces', 'pcs', 'pc', 'count', 'whole',
  'clove', 'cloves', 'slice', 'slices', 'bunch', 'bunches',
  'can', 'cans', 'tin', 'tins', 'jar', 'jars', 'bag', 'bags',
  'head', 'heads', 'stalk', 'stalks', 'sprig', 'sprigs',
  'handful', 'handfuls', 'pinch', 'pinches', 'dash', 'dashes',
  'rasher', 'rashers', 'fillet', 'fillets',
])

// ── Typical weight per piece (grams) ──────────────────────────────────────────
//
// Used when recipe says "2 chicken breasts" but fridge has "500g chicken breast".
// Keys are lowercase substrings; longest matching key wins.
// Source: common culinary references / average supermarket weights.

const TYPICAL_WEIGHTS_G = [
  // Proteins — ordered longest-first so "chicken breast" beats "chicken"
  { key: 'chicken breast',    g: 200 },
  { key: 'chicken thigh',     g: 130 },
  { key: 'chicken leg',       g: 250 },
  { key: 'chicken wing',      g:  90 },
  { key: 'chicken drumstick', g: 120 },
  { key: 'chicken',           g: 200 },   // fallback for plain "chicken"
  { key: 'beef steak',        g: 250 },
  { key: 'pork chop',         g: 200 },
  { key: 'lamb chop',         g: 120 },
  { key: 'salmon fillet',     g: 180 },
  { key: 'cod fillet',        g: 150 },
  { key: 'fish fillet',       g: 150 },
  { key: 'sausage',           g:  80 },
  { key: 'rasher',            g:  25 },
  { key: 'bacon',             g:  25 },   // per rasher
  // Dairy / eggs
  { key: 'large egg',         g:  70 },
  { key: 'egg',               g:  60 },
  // Produce — alliums
  { key: 'garlic clove',      g:   5 },
  { key: 'garlic',            g:   5 },
  { key: 'shallot',           g:  30 },
  { key: 'red onion',         g: 140 },
  { key: 'onion',             g: 150 },
  { key: 'leek',              g: 100 },
  // Tomatoes
  { key: 'cherry tomato',     g:  15 },
  { key: 'plum tomato',       g:  80 },
  { key: 'roma tomato',       g:  80 },
  { key: 'tomato',            g: 120 },
  // Other veg
  { key: 'bell pepper',       g: 150 },
  { key: 'red pepper',        g: 150 },
  { key: 'green pepper',      g: 150 },
  { key: 'yellow pepper',     g: 150 },
  { key: 'pepper',            g: 150 },
  { key: 'chilli',            g:  15 },
  { key: 'chili',             g:  15 },
  { key: 'jalapeno',          g:  15 },
  { key: 'portobello',        g:  80 },
  { key: 'mushroom',          g:  20 },
  { key: 'carrot',            g:  80 },
  { key: 'sweet potato',      g: 200 },
  { key: 'potato',            g: 150 },
  { key: 'zucchini',          g: 200 },
  { key: 'courgette',         g: 200 },
  { key: 'eggplant',          g: 300 },
  { key: 'aubergine',         g: 300 },
  { key: 'corn',              g: 150 },
  { key: 'cob',               g: 150 },
  { key: 'beetroot',          g: 200 },
  { key: 'turnip',            g: 150 },
  { key: 'parsnip',           g: 100 },
  { key: 'celery stalk',      g:  40 },
  { key: 'celery',            g:  40 },
  // Fruit
  { key: 'lemon',             g: 100 },
  { key: 'lime',              g:  70 },
  { key: 'orange',            g: 150 },
  { key: 'avocado',           g: 200 },
  { key: 'apple',             g: 180 },
  { key: 'pear',              g: 160 },
  { key: 'banana',            g: 120 },
  { key: 'mango',             g: 300 },
  { key: 'fig',               g:  50 },
  { key: 'date',              g:  25 },
]

// Typical volume per piece (ml) — for count↔volume mismatches
const TYPICAL_VOLUMES_ML = [
  { key: 'can of tomato',     ml: 400 },
  { key: 'can of coconut',    ml: 400 },
  { key: 'can of chickpea',   ml: 400 },
  { key: 'can of bean',       ml: 400 },
  { key: 'can of lentil',     ml: 400 },
  { key: 'can',               ml: 400 },
  { key: 'tin',               ml: 400 },
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

function lookupTypicalWeight(ingName) {
  const n = ingName.toLowerCase()
  // Longest key first so more-specific entries win
  for (const { key, g } of TYPICAL_WEIGHTS_G) {
    if (n.includes(key)) return g
  }
  return null
}

function lookupTypicalVolume(ingName) {
  const n = ingName.toLowerCase()
  for (const { key, ml } of TYPICAL_VOLUMES_ML) {
    if (n.includes(key)) return ml
  }
  return null
}

// ── Core conversion ───────────────────────────────────────────────────────────

/**
 * Convert `amount recipeUnit` into `fridgeUnit` scale.
 *
 * Returns:
 *   { value: number, isEstimated: false }  — exact conversion
 *   { value: number, isEstimated: true  }  — estimated via typical weight/volume
 *   null                                   — genuinely incompatible, no estimate
 */
function convertUnits(amount, recipeUnit, fridgeUnit, ingName) {
  const ru = (recipeUnit || '').toLowerCase().trim()
  const fu = (fridgeUnit || '').toLowerCase().trim()
  const exact = (v) => ({ value: v, isEstimated: false })
  const est   = (v) => ({ value: v, isEstimated: true  })

  // ── Identical ──────────────────────────────────────────────────────────────
  if (ru === fu) return exact(amount)

  // ── Both count-like ────────────────────────────────────────────────────────
  if (COUNT_UNITS.has(ru) && COUNT_UNITS.has(fu)) return exact(amount)

  // ── Same physical dimension ────────────────────────────────────────────────
  if (TO_GRAMS[ru] && TO_GRAMS[fu]) {
    return exact((amount * TO_GRAMS[ru]) / TO_GRAMS[fu])
  }
  if (TO_ML[ru] && TO_ML[fu]) {
    return exact((amount * TO_ML[ru]) / TO_ML[fu])
  }

  // ── Cross-dimensional: count ↔ weight ──────────────────────────────────────
  const gPerPiece = lookupTypicalWeight(ingName)

  if (COUNT_UNITS.has(ru) && TO_GRAMS[fu] && gPerPiece != null) {
    // "2 chicken breasts" → g → fridge unit
    return est((amount * gPerPiece) / TO_GRAMS[fu])
  }
  if (TO_GRAMS[ru] && COUNT_UNITS.has(fu) && gPerPiece != null) {
    // "500g chicken" → pieces
    return est((amount * TO_GRAMS[ru]) / gPerPiece)
  }

  // ── Cross-dimensional: count ↔ volume ──────────────────────────────────────
  const mlPerPiece = lookupTypicalVolume(ingName)

  if (COUNT_UNITS.has(ru) && TO_ML[fu] && mlPerPiece != null) {
    return est((amount * mlPerPiece) / TO_ML[fu])
  }
  if (TO_ML[ru] && COUNT_UNITS.has(fu) && mlPerPiece != null) {
    return est((amount * TO_ML[ru]) / mlPerPiece)
  }

  // ── Unresolvable ───────────────────────────────────────────────────────────
  // e.g. count ingredient not in lookup table, or weight vs volume
  return null
}

// ── Ingredient qty extraction ─────────────────────────────────────────────────

export function extractIngredientQty(ing) {
  if (ing.amount !== undefined && ing.amount !== null) {
    return {
      amount: Number(ing.amount) || null,
      unit:   (ing.unit || '').toLowerCase().trim(),
      name:   ing.name || '',
    }
  }

  const original = (ing.original || ing.name || '').trim()
  const match = original.match(
    /^([\d½¼¾⅓⅔⅛.\/\s]+)\s*(kg|g|ml|l|L|oz|lb|cup|tbsp|tsp|piece|pieces|bunch|clove|cloves|slice|slices|can|cans|handful|pinch)?\s+(.+)/i
  )
  if (match) {
    const rawNum = match[1].trim().replace(/\s/g, '')
    const num    = rawNum.includes('/')
      ? rawNum.split('/').reduce((a, b) => Number(a) / Number(b))
      : parseFloat(rawNum)
    return {
      amount: isNaN(num) ? null : num,
      unit:   (match[2] || '').toLowerCase().trim(),
      name:   match[3].trim(),
    }
  }

  return { amount: null, unit: '', name: original }
}

// ── Deduction plan ────────────────────────────────────────────────────────────

/**
 * Build a deduction plan for a recipe against the current fridge inventory.
 *
 * Each plan item:
 *   fridgeItem   — the matched fridge row
 *   recipeQty    — { amount, unit } as stated in the recipe
 *   deductedQty  — amount to remove, expressed in the fridge's unit
 *   remaining    — fridgeQty - deductedQty
 *   willDelete   — true if remaining ≤ 0
 *   canCompute   — true if deductedQty is a real number
 *   isEstimated  — true if the deduction used a typical weight/volume estimate
 *   typicalNote  — human-readable explanation of the estimate (e.g. "~200g/piece")
 */
export function buildDeductionPlan(recipeIngredients, fridgeItems, pantryStaples = []) {
  const stapleSet = new Set(pantryStaples.map(s => s.toLowerCase()))
  const plan = []

  for (const ing of recipeIngredients) {
    const { amount: recipeAmount, unit: recipeUnit, name: ingName } = extractIngredientQty(ing)
    if (!ingName) continue
    if (stapleSet.has(ingName.toLowerCase())) continue

    // Fuzzy name match against fridge
    const fridgeItem = fridgeItems.find(f => {
      const fn = f.name.toLowerCase()
      const rn = ingName.toLowerCase()
      return fn.includes(rn) || rn.includes(fn)
    })
    if (!fridgeItem) continue

    const fridgeQty  = fridgeItem.quantity != null ? Number(fridgeItem.quantity) : null
    const fridgeUnit = (fridgeItem.unit || '').toLowerCase().trim()
    const recipeUnitNorm = (recipeUnit || '').toLowerCase().trim()

    // No numeric quantity on either side
    if (fridgeQty === null || recipeAmount === null) {
      plan.push({
        fridgeItem,
        recipeQty:   { amount: recipeAmount, unit: recipeUnit },
        deductedQty: null, remaining: null,
        willDelete: true, canCompute: false, isEstimated: false,
        typicalNote: null,
      })
      continue
    }

    const result = convertUnits(recipeAmount, recipeUnitNorm, fridgeUnit, ingName)

    if (result === null) {
      // Genuinely unresolvable — show in modal, user can edit or skip
      plan.push({
        fridgeItem,
        recipeQty:   { amount: recipeAmount, unit: recipeUnit },
        deductedQty: null, remaining: null,
        willDelete: false, canCompute: false, isEstimated: false,
        typicalNote: null,
      })
      continue
    }

    const { value: deductedQty, isEstimated } = result
    const remaining = fridgeQty - deductedQty

    // Build a human note for estimates
    let typicalNote = null
    if (isEstimated) {
      const gpp = lookupTypicalWeight(ingName)
      const mpp = lookupTypicalVolume(ingName)
      if (gpp != null) typicalNote = `~${gpp}g per piece`
      else if (mpp != null) typicalNote = `~${mpp}ml per unit`
    }

    plan.push({
      fridgeItem,
      recipeQty:   { amount: recipeAmount, unit: recipeUnit },
      deductedQty: parseFloat(deductedQty.toFixed(4)),
      remaining:   parseFloat(remaining.toFixed(4)),
      willDelete:  remaining <= 0,
      canCompute:  true,
      isEstimated,
      typicalNote,
    })
  }

  return plan
}

/** Format a quantity + unit nicely for display */
export function formatQty(amount, unit) {
  if (amount == null) return ''
  const n = Number.isInteger(amount) ? amount : parseFloat(amount.toFixed(1))
  return unit ? `${n} ${unit}` : String(n)
}
