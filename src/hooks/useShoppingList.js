import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getShoppingChecks,
  checkShoppingItem,
  uncheckShoppingItem,
  clearShoppingChecks,
} from '../lib/supabase'

/**
 * Shopping list derived from ALL saved recipe + scheduled recipe ingredients.
 * No pre-filtering at insertion — smart hiding is purely client-side.
 *
 * BUG 3 FIX: pantryStaples (user's active staples) are treated identically to
 * fridge items — they're marked _inFridge:true and hidden by default in the view.
 */
export function useShoppingList(userId, savedRecipes, fridgeItems = [], pantryStaples = [], scheduledRecipes = []) {
  const [checked, setChecked] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    getShoppingChecks(userId).then(set => {
      setChecked(set)
      setLoading(false)
    })
  }, [userId])

  // Normalised fridge name set (actual fridge rows)
  const fridgeNameSet = useMemo(
    () => new Set(fridgeItems.map(i => i.name.toLowerCase().trim())),
    [fridgeItems]
  )

  // BUG 3: Normalised pantry staple set — these are always treated as "have it"
  const pantrySet = useMemo(
    () => new Set(pantryStaples.map(s => s.toLowerCase().trim())),
    [pantryStaples]
  )

  const inFridge = useCallback((ingName) => {
    const n = (ingName || '').toLowerCase().trim()
    // Match fridge items
    const matchesFridge = [...fridgeNameSet].some(f => f.includes(n) || n.includes(f))
    if (matchesFridge) return true
    // BUG 3: Match pantry staples
    return [...pantrySet].some(p => p.includes(n) || n.includes(p))
  }, [fridgeNameSet, pantrySet])

  /**
   * byRecipe: all ingredients grouped by recipe title.
   * Includes both saved recipes and scheduled recipes (prefixed with "Scheduled: ").
   * Each entry carries _inFridge so the view can filter/style.
   */
  const byRecipe = useMemo(() => {
    const map = new Map()

    const processRecipes = (recipes, prefix = '') => {
      for (const row of recipes) {
        const recipe = row.recipe_json ?? row
        const title  = `${prefix}${recipe.title ?? 'Unknown recipe'}`
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
    }

    processRecipes(savedRecipes)
    processRecipes(scheduledRecipes, 'Scheduled: ')
    return map
  }, [savedRecipes, scheduledRecipes, inFridge])

  /** Deduplicated need / have across all recipes — for badge counts */
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
