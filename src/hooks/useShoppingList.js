import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getShoppingChecks,
  checkShoppingItem,
  uncheckShoppingItem,
  clearShoppingChecks,
} from '../lib/supabase'

/**
 * Builds a comprehensive shopping list from saved recipes.
 *
 * Uses extendedIngredients (every ingredient) rather than missedIngredients
 * (pre-computed at search time) so the list is always complete and can be
 * cross-checked live against current fridge contents.
 *
 * Items are split into:
 *   - need:  not in fridge
 *   - have:  already in fridge
 *
 * Both lists are deduplicated and sorted.
 */
export function useShoppingList(userId, savedRecipes, fridgeItems = []) {
  const [checked, setChecked] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    getShoppingChecks(userId).then(set => {
      setChecked(set)
      setLoading(false)
    })
  }, [userId])

  // Build normalised fridge name set for cross-checking
  const fridgeNameSet = useMemo(() =>
    new Set(fridgeItems.map(i => i.name.toLowerCase().trim())),
    [fridgeItems]
  )

  const inFridge = useCallback((ingName) => {
    const n = (ingName || '').toLowerCase().trim()
    return [...fridgeNameSet].some(f => f.includes(n) || n.includes(f))
  }, [fridgeNameSet])

  // Derive deduplicated lists from all saved recipe extendedIngredients
  const { need, have } = useMemo(() => {
    const needMap = new Map()
    const haveMap = new Map()

    for (const row of savedRecipes) {
      const recipe     = row.recipe_json ?? row
      const recipeName = recipe.title ?? 'Unknown recipe'

      // Prefer extendedIngredients (full list); fall back to missedIngredients
      const allIngs = recipe.extendedIngredients?.length
        ? recipe.extendedIngredients
        : recipe.missedIngredients ?? []

      for (const ing of allIngs) {
        const name = (ing.name || '').trim()
        if (!name) continue
        const key   = name.toLowerCase()
        const entry = {
          name,
          original: ing.original || name,
          amount:   ing.amount  != null ? ing.amount  : null,
          unit:     ing.unit    ?? '',
          recipes:  [recipeName],
        }

        const target = inFridge(name) ? haveMap : needMap

        if (target.has(key)) {
          target.get(key).recipes.push(recipeName)
        } else {
          target.set(key, entry)
        }
      }
    }

    return {
      need: [...needMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      have: [...haveMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [savedRecipes, inFridge])

  const toggle = useCallback(async (ingredientName) => {
    const key       = ingredientName.toLowerCase().trim()
    const isTicked  = checked.has(key)
    setChecked(prev => {
      const next = new Set(prev)
      isTicked ? next.delete(key) : next.add(key)
      return next
    })
    if (isTicked) await uncheckShoppingItem(userId, key)
    else          await checkShoppingItem(userId, key)
  }, [checked, userId])

  const clearAll = useCallback(async () => {
    setChecked(new Set())
    await clearShoppingChecks(userId)
  }, [userId])

  const isChecked    = (name) => checked.has(name.toLowerCase().trim())
  const checkedCount = need.filter(i => isChecked(i.name)).length

  return { need, have, loading, toggle, clearAll, isChecked, checkedCount }
}
