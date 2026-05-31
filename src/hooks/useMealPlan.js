import { useState, useEffect, useCallback } from 'react'
import { getMealPlan, addMealPlanSlot, deleteMealPlanSlot } from '../lib/supabase'

/** ISO date string for Monday of the week containing `date` */
export function getMondayOf(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()                     // 0=Sun, 1=Mon …
  const diff = day === 0 ? -6 : 1 - day      // shift to Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)        // "YYYY-MM-DD"
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const SLOT_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

export function useMealPlan(userId) {
  const weekStart = getMondayOf()

  const [slots, setSlots]   = useState([])  // raw DB rows
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

  /**
   * Organise slots into a grid: { [slotDay]: { [slotType]: MealPlanRow[] } }
   * A slot can contain multiple recipes (user might add 2 snacks etc.)
   */
  const grid = {}
  for (let d = 0; d < 7; d++) {
    grid[d] = {}
    for (const t of SLOT_TYPES) {
      grid[d][t] = slots.filter(s => s.slot_day === d && s.slot_type === t)
    }
  }

  return { slots, grid, loading, weekStart, addSlot, removeSlot, reload: load }
}
