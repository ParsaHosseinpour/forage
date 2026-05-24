import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getShoppingChecks,
  checkShoppingItem,
  uncheckShoppingItem,
  clearShoppingChecks,
} from '../lib/supabase'

/**
 * Derives a deduplicated shopping list from saved recipes' missedIngredients.
 * Checked state is persisted to Supabase shopping_checks.
 */
export function useShoppingList(userId, savedRecipes) {
  const [checked, setChecked]   = useState(new Set())
  const [loading, setLoading]   = useState(true)

  // Load persisted checked state
  useEffect(() => {
    if (!userId) return
    getShoppingChecks(userId).then(set => {
      setChecked(set)
      setLoading(false)
    })
  }, [userId])

  // Derive the list — deduplicated by normalised ingredient name
  const items = useMemo(() => {
    const map = new Map() // normalisedName → { name, amount, unit, recipes[] }

    for (const row of savedRecipes) {
      const recipe      = row.recipe_json ?? row
      const recipeName  = recipe.title ?? 'Unknown recipe'
      const missed      = recipe.missedIngredients ?? []

      for (const ing of missed) {
        const key = ing.name.toLowerCase().trim()
        if (map.has(key)) {
          map.get(key).recipes.push(recipeName)
        } else {
          map.set(key, {
            name:    ing.name,
            amount:  ing.amount  ? `${ing.amount} ${ing.unit ?? ''}`.trim() : '',
            image:   ing.image   ?? null,
            recipes: [recipeName],
          })
        }
      }
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [savedRecipes])

  const toggle = useCallback(async (ingredientName) => {
    const normalised = ingredientName.toLowerCase().trim()
    const isChecked  = checked.has(normalised)

    // Optimistic
    setChecked(prev => {
      const next = new Set(prev)
      isChecked ? next.delete(normalised) : next.add(normalised)
      return next
    })

    if (isChecked) {
      await uncheckShoppingItem(userId, normalised)
    } else {
      await checkShoppingItem(userId, normalised)
    }
  }, [checked, userId])

  const clearAll = useCallback(async () => {
    setChecked(new Set())
    await clearShoppingChecks(userId)
  }, [userId])

  const isChecked   = (name) => checked.has(name.toLowerCase().trim())
  const checkedCount = items.filter(i => isChecked(i.name)).length

  return { items, loading, toggle, clearAll, isChecked, checkedCount }
}
