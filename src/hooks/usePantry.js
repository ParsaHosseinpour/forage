import { useState, useEffect, useCallback } from 'react'
import { getPantryStaples, setPantryStaples } from '../lib/supabase'

export const DEFAULT_STAPLES = [
  'salt', 'black pepper', 'olive oil', 'vegetable oil', 'butter',
  'water', 'sugar', 'flour', 'garlic', 'onion', 'eggs', 'milk',
  'soy sauce', 'vinegar', 'lemon juice', 'baking powder',
]

// Always coerce DB response to a plain array — guards against null,
// undefined, or unexpected Supabase response shapes.
const toArray = (val) => (Array.isArray(val) ? val : [])

export function usePantry(userId) {
  const [staples, setStaples] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    getPantryStaples(userId)
      .then(data => setStaples(toArray(data)))   // never pipes null into state
      .catch(() => setStaples([]))               // DB error → safe empty array
      .finally(() => setLoading(false))
  }, [userId])

  const toggle = useCallback((name) => {
    setStaples(prev => {
      // Defensive coercion: if prev is somehow null/undefined, treat as []
      const current = toArray(prev)
      const next = current.includes(name)
        ? current.filter(s => s !== name)
        : [...current, name]
      // Wrap in Promise.resolve so .catch is guaranteed (Supabase builder ≠ native Promise)
      Promise.resolve(setPantryStaples(userId, next)).catch(console.error)
      return next
    })
  }, [userId])

  // Safe guard: never calls .includes on a non-array
  const isActive = useCallback(
    (name) => toArray(staples).includes(name),
    [staples]
  )

  return { staples: toArray(staples), loading, toggle, isActive }
}
