/**
 * Cook It — quantity deduction utilities.
 *
 * Handles unit conversion so "500g" from a recipe correctly deducts
 * from "1 kg" in the fridge. All unit keys are lowercase-normalised
 * and aliased so no variant slips through.
 */

// ── Unit normalisation maps (all keys lowercase) ───────────────────────────────

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

// Units that are all equivalent "count" — treat as same dimension
const COUNT_UNITS = new Set([
  '', 'piece', 'pieces', 'pcs', 'pc', 'count', 'whole',
  'clove', 'cloves', 'slice', 'slices', 'bunch', 'bunches',
  'can', 'cans', 'tin', 'tins', 'jar', 'jars', 'bag', 'bags',
  'head', 'heads', 'stalk', 'stalks', 'sprig', 'sprigs',
  'handful', 'handfuls', 'pinch', 'pinches', 'dash', 'dashes',
  'rasher', 'rashers', 'fillet', 'fillets',
])

// ── Core conversion ───────────────────────────────────────────────────────────

/**
 * Convert `amount unit` to `targetUnit` system.
 *
 * Returns the converted number, OR the original `amount` when units are
 * treated as compatible (both count-like, both empty, one empty+one count).
 * Returns null only for a genuine dimension mismatch (weight vs volume).
 */
function convertToSameBase(amount, unit, targetUnit) {
  const u  = (unit        || '').toLowerCase().trim()
  const tu = (targetUnit  || '').toLowerCase().trim()

  // ── Identical ──────────────────────────────────────────────────────────────
  if (u === tu) return amount

  // ── Both count-like ────────────────────────────────────────────────────────
  // "2 cloves" vs "5 pieces" — treat as same dimension, no scaling needed
  if (COUNT_UNITS.has(u) && COUNT_UNITS.has(tu)) return amount

  // ── One is empty / count-like, other is a known measurement ───────────────
  // e.g. recipe says "2 garlic" (no unit), fridge has "200 g" — incompatible
  // but if fridge also has no unit: treat as compatible
  if (COUNT_UNITS.has(u) && !TO_GRAMS[tu] && !TO_ML[tu]) return amount
  if (COUNT_UNITS.has(tu) && !TO_GRAMS[u]  && !TO_ML[u])  return amount

  // ── Both weight ────────────────────────────────────────────────────────────
  if (TO_GRAMS[u] && TO_GRAMS[tu]) {
    return (amount * TO_GRAMS[u]) / TO_GRAMS[tu]
  }

  // ── Both volume ────────────────────────────────────────────────────────────
  if (TO_ML[u] && TO_ML[tu]) {
    return (amount * TO_ML[u]) / TO_ML[tu]
  }

  // ── True dimension mismatch (weight vs volume) ─────────────────────────────
  return null
}

// ── Ingredient qty extraction ─────────────────────────────────────────────────

/**
 * Parse a structured ingredient object into { amount, unit, name }.
 */
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
 * Build the deduction plan for a recipe against fridge items.
 *
 * Unit-mismatch policy (Bug 1 fix):
 *   - Compatible unit systems → compute precise deduction
 *   - Count-like units on both sides → compatible, use 1:1
 *   - True dimension mismatch (g vs ml) → canCompute:false, willDelete:true
 *     so the UI shows the item but asks the user to handle it manually
 */
export function buildDeductionPlan(recipeIngredients, fridgeItems, pantryStaples = []) {
  const stapleSet = new Set(pantryStaples.map(s => s.toLowerCase()))
  const plan = []

  for (const ing of recipeIngredients) {
    const { amount: recipeAmount, unit: recipeUnit, name: ingName } = extractIngredientQty(ing)
    if (!ingName) continue

    if (stapleSet.has(ingName.toLowerCase())) continue

    const fridgeItem = fridgeItems.find(f => {
      const fn = f.name.toLowerCase()
      const rn = ingName.toLowerCase()
      return fn.includes(rn) || rn.includes(fn)
    })
    if (!fridgeItem) continue

    const fridgeQty      = fridgeItem.quantity != null ? Number(fridgeItem.quantity) : null
    const fridgeUnit     = (fridgeItem.unit || '').toLowerCase().trim()
    const recipeUnitNorm = (recipeUnit        || '').toLowerCase().trim()

    // No quantity on either side — mark for removal, don't block the flow
    if (fridgeQty === null || recipeAmount === null) {
      plan.push({
        fridgeItem,
        recipeQty:   { amount: recipeAmount, unit: recipeUnit },
        deductedQty: null,
        remaining:   null,
        willDelete:  true,
        canCompute:  false,
      })
      continue
    }

    const deductedInFridgeUnits = convertToSameBase(recipeAmount, recipeUnitNorm, fridgeUnit)

    if (deductedInFridgeUnits === null) {
      // True dimension mismatch — surface in UI but don't crash
      plan.push({
        fridgeItem,
        recipeQty:   { amount: recipeAmount, unit: recipeUnit },
        deductedQty: null,
        remaining:   null,
        willDelete:  false,
        canCompute:  false,
      })
      continue
    }

    const remaining = fridgeQty - deductedInFridgeUnits
    plan.push({
      fridgeItem,
      recipeQty:   { amount: recipeAmount, unit: recipeUnit },
      deductedQty: deductedInFridgeUnits,
      remaining,
      willDelete:  remaining <= 0,
      canCompute:  true,
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
