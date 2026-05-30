import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getShoppingChecks,
  checkShoppingItem,
  uncheckShoppingItem,
  clearShoppingChecks,
} from '../lib/supabase'

/**
 * Shopping list derived from ALL saved recipe ingredients.
 *
 * The hook stores EVERYTHING — no pre-filtering at insertion time.
 * The component layer applies the smart hiding (fridge comparison) client-side.
 *
 * Exports:
 *   byRecipe   — Map<recipeTitle, IngredientEntry[]>  (all ings, grouped by recipe)
 *   need       — IngredientEntry[] (not in fridge, deduplicated)
 *   have       — IngredientEntry[] (already in fridge, deduplicated)
 *   isChecked  — (name: string) => boolean
 *   toggle     — (name: string) => void (persists to Supabase)
 *   clearAll   — () => void
 *   checkedCount — number of 'need' items ticked off
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

  // Normalised fridge name set for client-side cross-check
  const fridgeNameSet = useMemo(
    () => new Set(fridgeItems.map(i => i.name.toLowerCase().trim())),
    [fridgeItems]
  )

  const inFridge = useCallback((ingName) => {
    const n = (ingName || '').toLowerCase().trim()
    return [...fridgeNameSet].some(f => f.includes(n) || n.includes(f))
  }, [fridgeNameSet])

  /**
   * byRecipe: all ingredients grouped by recipe title.
   * Each entry also carries { _inFridge } so the view can filter/style.
   * No deduplication here — the full list for each recipe is preserved.
   */
  const byRecipe = useMemo(() => {
    const map = new Map()          // title → IngredientEntry[]
    for (const row of savedRecipes) {
      const recipe = row.recipe_json ?? row
      const title  = recipe.title ?? 'Unknown recipe'
      const allIngs = recipe.extendedIngredients?.length
        ? recipe.extendedIngredients
        : recipe.missedIngredients ?? []

      const entries = allIngs
        .map(ing => ({
          name:      (ing.name || '').trim(),
          original:  ing.original || ing.name || '',
          amount:    ing.amount ?? null,
          unit:      ing.unit   ?? '',
          _inFridge: inFridge(ing.name || ''),
          _recipeId: recipe.id,
        }))
        .filter(e => e.name)

      if (entries.length > 0) map.set(title, entries)
    }
    return map
  }, [savedRecipes, inFridge])

  /**
   * Deduplicated need / have lists across all recipes.
   * Used for the summary badge count.
   */
  const { need, have } = useMemo(() => {
    const needMap = new Map()
    const haveMap = new Map()
    for (const [recipeName, ings] of byRecipe) {
      for (const ing of ings) {
        const key    = ing.name.toLowerCase()
        const target = ing._inFridge ? haveMap : needMap
        if (target.has(key)) {
          target.get(key).recipes.push(recipeName)
        } else {
          target.set(key, { ...ing, recipes: [recipeName] })
        }
      }
    }
    return {
      need: [...needMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      have: [...haveMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [byRecipe])

  const toggle = useCallback(async (ingredientName) => {
    const key = ingredientName.toLowerCase().trim()
    const isTicked = checked.has(key)
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

  const isChecked    = (name) => checked.has((name || '').toLowerCase().trim())
  const checkedCount = need.filter(i => isChecked(i.name)).length

  return { byRecipe, need, have, loading, toggle, clearAll, isChecked, checkedCount }
}
