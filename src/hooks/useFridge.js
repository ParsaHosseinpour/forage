import { useState, useEffect, useCallback } from 'react'
import {
  getFridgeItems,
  addFridgeItem,
  deleteFridgeItem,
  updateFridgeItem,
} from '../lib/supabase'
import { sanitiseUnit, mergeQuantity, toBaseUnit } from '../lib/unitNorm'

export function useFridge(userId) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await getFridgeItems(userId)
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  /**
   * Smart add — before inserting, check if an item with the same name
   * (case-insensitive) already exists and try to merge quantities.
   *
   * Also sanitises the unit against the ingredient's physical domain
   * so "1L chicken" becomes "1 chicken" (unit stripped).
   */
  const add = async ({ name, quantity, unit, category }) => {
    const cleanName = name.trim()

    // ── 1. Unit sanitisation ──────────────────────────────────────────────
    const cleanUnit = sanitiseUnit(cleanName, unit)

    // ── 2. Normalise quantity to base metric before storage ───────────────
    let storeQty  = quantity || null
    let storeUnit = cleanUnit || null

    if (quantity && cleanUnit) {
      const { amount: baseAmt, unit: baseU } = toBaseUnit(Number(quantity), cleanUnit)
      storeQty  = baseAmt
      storeUnit = baseU
    }

    // ── 3. Check for existing item with same normalised name ──────────────
    const existing = items.find(
      i => i.name.toLowerCase() === cleanName.toLowerCase()
    )

    if (existing && storeQty !== null) {
      const merged = mergeQuantity(
        { quantity: existing.quantity, unit: existing.unit || '' },
        { quantity: storeQty,          unit: storeUnit || '' },
      )

      if (merged !== null) {
        // Merge: update existing row instead of inserting
        const { data, error } = await updateFridgeItem(existing.id, merged)
        if (error) throw new Error(error.message)
        setItems(prev => prev.map(i => i.id === existing.id ? data : i))
        return data
      }
      // If null: incompatible units → fall through to create a new row
    }

    // ── 4. Normal insert ──────────────────────────────────────────────────
    const { data, error } = await addFridgeItem({
      user_id:  userId,
      name:     cleanName,
      quantity: storeQty,
      unit:     storeUnit,
      category: category || 'other',
    })
    if (error) throw new Error(error.message)
    setItems(prev => [data, ...prev])
    return data
  }

  const remove = async (id) => {
    const { error } = await deleteFridgeItem(id)
    if (error) throw new Error(error.message)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const update = async (id, updates) => {
    const { data, error } = await updateFridgeItem(id, updates)
    if (error) throw new Error(error.message)
    setItems(prev => prev.map(i => i.id === id ? data : i))
    return data
  }

  return { items, loading, error, add, remove, update, reload: load }
}
