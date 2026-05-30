import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getCookHistory,
  addCookHistory,
  deleteCookHistory,
  updateCookHistoryEntry,
} from '../lib/supabase'

export function useCookHistory(userId) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    getCookHistory(userId)
      .then(({ data, error }) => { if (!error) setHistory(data ?? []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const logCook = useCallback(async (recipe, extra = {}) => {
    const { data, error } = await addCookHistory(userId, recipe, extra)
    if (error) throw new Error(error.message)
    setHistory(prev => [data, ...prev])
    return data
  }, [userId])

  const removeEntry = useCallback(async (id) => {
    const { error } = await deleteCookHistory(id)
    if (error) throw new Error(error.message)
    setHistory(prev => prev.filter(h => h.id !== id))
  }, [])

  const updateEntry = useCallback(async (id, updates) => {
    const { data, error } = await updateCookHistoryEntry(id, updates)
    if (error) throw new Error(error.message)
    setHistory(prev => prev.map(h => h.id === id ? data : h))
    return data
  }, [])

  const cookCount = useCallback(
    (recipeId) => history.filter(h => h.recipe_id === String(recipeId)).length,
    [history]
  )

  /** Weekly calorie total — sums calories_per_serving for entries in the last 7 days */
  const weeklyCalories = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000
    return history
      .filter(h => new Date(h.cooked_at).getTime() >= cutoff && h.calories_per_serving)
      .reduce((sum, h) => sum + Number(h.calories_per_serving), 0)
  }, [history])

  /** Unique meal types that have been logged (for showing available filter tabs) */
  const loggedMealTypes = useMemo(() => {
    const types = new Set(history.map(h => h.meal_type).filter(Boolean))
    return [...types]
  }, [history])

  return { history, loading, logCook, removeEntry, updateEntry, cookCount, weeklyCalories, loggedMealTypes }
}
