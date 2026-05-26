import { useState, useEffect, useCallback } from 'react'
import { getPantryStaples, setPantryStaples } from '../lib/supabase'

/** Ingredients most kitchens always have — shown as toggleable chips */
export const DEFAULT_STAPLES = [
  'salt',
  'black pepper',
  'olive oil',
  'vegetable oil',
  'butter',
  'water',
  'sugar',
  'flour',
  'garlic',
  'onion',
  'eggs',
  'milk',
  'soy sauce',
  'vinegar',
  'lemon juice',
  'baking powder',
]

export function usePantry(userId) {
  const [staples, setStaples] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    getPantryStaples(userId)
      .then(setStaples)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const toggle = useCallback(async (name) => {
    setStaples(prev => {
      const next = prev.includes(name)
        ? prev.filter(s => s !== name)
        : [...prev, name]
      setPantryStaples(userId, next).catch(console.error)
      return next
    })
  }, [userId])

  const isActive = useCallback((name) => staples.includes(name), [staples])

  return { staples, loading, toggle, isActive }
}
