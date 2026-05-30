import { useState, useEffect, useCallback } from 'react'
import { getCookHistory, addCookHistory, deleteCookHistory } from '../lib/supabase'

export function useCookHistory(userId) {
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    getCookHistory(userId)
      .then(({ data, error }) => {
        if (!error) setHistory(data ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const logCook = useCallback(async (recipe) => {
    const { data, error } = await addCookHistory(userId, recipe)
    if (error) throw new Error(error.message)
    setHistory(prev => [data, ...prev])
    return data
  }, [userId])

  const removeEntry = useCallback(async (id) => {
    const { error } = await deleteCookHistory(id)
    if (error) throw new Error(error.message)
    setHistory(prev => prev.filter(h => h.id !== id))
  }, [])

  // How many times a recipe has been cooked
  const cookCount = useCallback((recipeId) =>
    history.filter(h => h.recipe_id === String(recipeId)).length,
    [history]
  )

  return { history, loading, logCook, removeEntry, cookCount }
}
