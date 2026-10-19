import { useState, useEffect, useCallback, useMemo } from 'react'
import { getMealPlan, getMealPlanRange, addMealPlanSlot, deleteMealPlanSlot } from '../lib/supabase'

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

function toISO(d) {
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

/** ISO date `days` days after the given ISO date (local calendar). */
export function shiftWeek(iso, days) {
  const d = parseLocalDate(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

const shortDate = (d) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

/** "Tue 21 Oct" for a planned slot (week start + day index). */
export function plannedDate(weekStart, slotDay) {
  return shortDate(parseLocalDate(shiftWeek(weekStart, slotDay)))
}

/** "27 Oct" style label for a Monday ISO date. */
export function dayMonth(iso) {
  return parseLocalDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** "this week", "next week", "in 3 weeks" (offset is weeks from the current one). */
export function weekPhrase(offset) {
  return offset === 0 ? 'this week' : offset === 1 ? 'next week' : `in ${offset} weeks`
}

export const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const SLOT_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

/**
 * Everything planned from the current week through the next `weeks` weeks,
 * for the shopping list. `reload` refetches after something is scheduled.
 */
export function usePlannedMeals(userId, weeks = 2) {
  const [slots, setSlots]     = useState([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    const from = getMondayOf()
    const to   = shiftWeek(from, (weeks - 1) * 7)
    getMealPlanRange(userId, from, to).then(({ data, error }) => {
      if (cancelled) return
      if (!error) setSlots(data ?? [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId, weeks, version])

  const reload = useCallback(() => setVersion(v => v + 1), [])

  return { slots, loading, reload }
}

/**
 * `weekOffset` = how many weeks from the current one to show (0 = this week).
 */
export function useMealPlan(userId, weekOffset = 0) {
  const weekStart = useMemo(() => shiftWeek(getMondayOf(), weekOffset * 7), [weekOffset])

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

  // `extraWeeks` adds to a week other than the one being viewed (0 = same).
  const addSlot = useCallback(async (slotDay, slotType, recipe, extraWeeks = 0) => {
    const target = shiftWeek(weekStart, extraWeeks * 7)
    const { data, error } = await addMealPlanSlot(userId, target, slotDay, slotType, recipe)
    if (error) throw new Error(error.message)
    if (extraWeeks === 0) setSlots(prev => [...prev, data])
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
