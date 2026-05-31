import { useState, useEffect, useCallback, useMemo } from 'react'
import { getMealPlan, addMealPlanSlot, deleteMealPlanSlot } from '../lib/supabase'

/**
 * ISO date string (YYYY-MM-DD) for Monday of the week containing `date`.
 * Uses LOCAL calendar date to avoid UTC-offset timezone bugs.
 */
export function getMondayOf(date = new Date()) {
  const d   = new Date(date)
  const day = d.getDay()                // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day // how many days back to Monday
  d.setDate(d.getDate() + diff)
  // Format as YYYY-MM-DD using LOCAL date parts (not UTC)
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Parse a YYYY-MM-DD string into a local Date object (avoids UTC-midnight offset) */
export function parseLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const SLOT_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

export function useMealPlan(userId) {
  // Compute once per mount — weekStart is stable for the lifetime of the session
  const weekStart = useMemo(() => getMondayOf(), [])

  const [slots,   setSlots]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await getMealPlan(userId, weekStart)
    if (!error) setSlots(data ?? [])
    setLoading(false)
  }, [userId, weekStart])

  useEffect(() => { load() }, [load])

  const addSlot = useCallback(async (slotDay, slotType, recipe) => {
    const { data, error } = await addMealPlanSlot(userId, weekStart, slotDay, slotType, recipe)
    if (error) throw new Error(error.message)
    setSlots(prev => [...prev, data])
    return data
  }, [userId, weekStart])

  const removeSlot = useCallback(async (id) => {
    const { error } = await deleteMealPlanSlot(id)
    if (error) throw new Error(error.message)
    setSlots(prev => prev.filter(s => s.id !== id))
  }, [])

  // Grid: { [dayIdx 0-6]: { [slotType]: MealPlanRow[] } }
  const grid = useMemo(() => {
    const g = {}
    for (let d = 0; d < 7; d++) {
      g[d] = {}
      for (const t of SLOT_TYPES) {
        g[d][t] = slots.filter(s => s.slot_day === d && s.slot_type === t)
      }
    }
    return g
  }, [slots])

  return { slots, grid, loading, weekStart, addSlot, removeSlot, reload: load }
}
