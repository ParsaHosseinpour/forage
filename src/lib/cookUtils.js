/**
 * Cook It — quantity deduction utilities.
 *
 * Handles unit conversion so "500g" from a recipe correctly deducts
 * from "1 kg" in the fridge, and "2 pieces" from "5 pieces".
 */

// Normalisation to grams
const TO_GRAMS = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 }
// Normalisation to ml
const TO_ML    = { ml: 1, L: 1000, 'fl oz': 29.57, cup: 240, tbsp: 15, tsp: 5 }

/**
 * Attempt to convert `amount unit` to the `targetUnit` system.
 * Returns null if the units are incompatible (e.g., grams vs pieces).
 */
function convertToSameBase(amount, unit, targetUnit) {
  const u  = (unit || '').toLowerCase()
  const tu = (targetUnit || '').toLowerCase()

  // Same unit — trivial
  if (u === tu) return amount

  // Both in weight system
  if (TO_GRAMS[u] && TO_GRAMS[tu]) {
    return (amount * TO_GRAMS[u]) / TO_GRAMS[tu]
  }

  // Both in volume system
  if (TO_ML[u] && TO_ML[tu]) {
    return (amount * TO_ML[u]) / TO_ML[tu]
  }

  // Incompatible — can't convert
  return null
}

/**
 * Parse an ingredient quantity string like "200g chicken breast"
 * or a structured Spoonacular ingredient object into { amount, unit, name }.
 *
 * @param {object} ing — extendedIngredient from Spoonacular or DB
 * @returns {{ amount: number|null, unit: string, name: string }}
 */
export function extractIngredientQty(ing) {
  // Spoonacular provides .amount and .unit directly
  if (ing.amount !== undefined && ing.amount !== null) {
    return {
      amount: Number(ing.amount) || null,
      unit:   (ing.unit || '').toLowerCase().trim(),
      name:   ing.name || '',
    }
  }

  // DB recipes / mock: parse from the "original" line e.g. "200g chicken"
  const original = (ing.original || ing.name || '').trim()
  const match = original.match(
    /^([\d½¼¾⅓⅔⅛.\/\s]+)\s*(kg|g|ml|l|L|oz|lb|cup|tbsp|tsp|piece|pieces|bunch|clove|cloves|slice|slices|can|cans|handful|pinch)?\s+(.+)/i
  )
  if (match) {
    const rawNum = match[1].trim().replace(/\s/g, '')
    const num = rawNum.includes('/')
      ? rawNum.split('/').reduce((a, b) => a / b)
      : parseFloat(rawNum)
    return {
      amount: isNaN(num) ? null : num,
      unit:   (match[2] || '').toLowerCase().trim(),
      name:   match[3].trim(),
    }
  }

  // Fallback: just the name, no quantity
  return { amount: null, unit: '', name: original }
}

/**
 * Build the deduction plan for a recipe against fridge items.
 *
 * For each recipe ingredient that's "in the fridge":
 *   - If quantity is tracked: calculate remaining after deduction
 *   - If no quantity tracked: mark as "will be removed entirely"
 *
 * @param {object[]} recipeIngredients — detail.extendedIngredients
 * @param {object[]} fridgeItems       — from useFridge
 * @param {string[]} pantryStaples     — skip these
 * @returns {DeductionItem[]}
 *
 * DeductionItem: {
 *   fridgeItem:   fridge row (id, name, quantity, unit)
 *   recipeQty:    { amount, unit } from the recipe
 *   deductedQty:  amount to remove (in fridge's unit)
 *   remaining:    fridge.quantity - deductedQty (null if no qty tracked)
 *   willDelete:   boolean — remaining ≤ 0 or no qty tracked
 *   canCompute:   boolean — false if unit mismatch prevented math
 * }
 */
export function buildDeductionPlan(recipeIngredients, fridgeItems, pantryStaples = []) {
  const stapleSet = new Set(pantryStaples.map(s => s.toLowerCase()))
  const plan = []

  for (const ing of recipeIngredients) {
    const { amount: recipeAmount, unit: recipeUnit, name: ingName } = extractIngredientQty(ing)
    if (!ingName) continue

    // Skip pantry staples
    if (stapleSet.has(ingName.toLowerCase())) continue

    // Find matching fridge item (fuzzy name match)
    const fridgeItem = fridgeItems.find(f => {
      const fn = f.name.toLowerCase()
      const rn = ingName.toLowerCase()
      return fn.includes(rn) || rn.includes(fn)
    })

    if (!fridgeItem) continue // ingredient not in fridge at all

    const fridgeQty    = fridgeItem.quantity != null ? Number(fridgeItem.quantity) : null
    const fridgeUnit   = (fridgeItem.unit || '').toLowerCase().trim()
    const recipeUnitNorm = (recipeUnit || '').toLowerCase().trim()

    // No quantity tracked in fridge → will just mark for deletion prompt
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

    // Try unit conversion
    const deductedInFridgeUnits = convertToSameBase(recipeAmount, recipeUnitNorm, fridgeUnit)

    if (deductedInFridgeUnits === null) {
      // Units incompatible (e.g. recipe says "2 cloves", fridge has "150 g")
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
      recipeQty:      { amount: recipeAmount, unit: recipeUnit },
      deductedQty:    deductedInFridgeUnits,
      remaining:      remaining,
      willDelete:     remaining <= 0,
      canCompute:     true,
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
