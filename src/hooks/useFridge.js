import { useState, useEffect, useCallback } from 'react'
import {
  getFridgeItems,
  addFridgeItem,
  deleteFridgeItem,
  updateFridgeItem,
} from '../lib/supabase'

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

  const add = async ({ name, quantity, unit, category }) => {
    const { data, error } = await addFridgeItem({
      user_id: userId,
      name: name.trim(),
      quantity: quantity || null,
      unit: unit || null,
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
