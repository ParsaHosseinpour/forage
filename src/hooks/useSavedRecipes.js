import { useState, useEffect, useCallback } from 'react'
import {
  getSavedRecipes,
  saveRecipe,
  unsaveRecipe,
  getSavedIds,
} from '../lib/supabase'

export function useSavedRecipes(userId) {
  const [saved, setSaved]       = useState([])       // full recipe rows
  const [savedIds, setSavedIds] = useState(new Set()) // quick lookup set
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [{ data: rows }, ids] = await Promise.all([
      getSavedRecipes(userId),
      getSavedIds(userId),
    ])
    setSaved(rows ?? [])
    setSavedIds(ids)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const toggle = async (recipe) => {
    const id = recipe.id
    const alreadySaved = savedIds.has(id)

    // Optimistic update
    if (alreadySaved) {
      setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s })
      setSaved(prev => prev.filter(r => r.recipe_id !== id))
      await unsaveRecipe(userId, id)
    } else {
      setSavedIds(prev => new Set([...prev, id]))
      const newRow = { recipe_id: id, recipe_json: recipe, saved_at: new Date().toISOString() }
      setSaved(prev => [newRow, ...prev])
      await saveRecipe(userId, id, recipe)
    }
  }

  const isSaved = (recipeId) => savedIds.has(recipeId)

  return { saved, savedIds, loading, toggle, isSaved, reload: load }
}
