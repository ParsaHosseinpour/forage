import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vgwtbfnccxiaplhhhzqd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3RiZm5jY3hpYXBsaGhoenFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjU0MjUsImV4cCI6MjA5NTE0MTQyNX0.KGm4cf_vkbgCQO1w0jJw46_XIKCUwNE37rsWC3ePSBI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Auth helpers ────────────────────────────────────────────────────────────

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () =>
  supabase.auth.signOut()

export const getSession = () =>
  supabase.auth.getSession()

// ─── Fridge helpers ──────────────────────────────────────────────────────────

export const getFridgeItems = (userId) =>
  supabase
    .from('fridge_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

export const addFridgeItem = (item) =>
  supabase
    .from('fridge_items')
    .insert([item])
    .select()
    .single()

export const deleteFridgeItem = (id) =>
  supabase
    .from('fridge_items')
    .delete()
    .eq('id', id)

export const updateFridgeItem = (id, updates) =>
  supabase
    .from('fridge_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

// ─── Recipe cache helpers ────────────────────────────────────────────────────

export const getCachedRecipes = async (ingredientsHash) => {
  const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('recipe_cache')
    .select('recipes_json')
    .eq('ingredients_hash', ingredientsHash)
    .gt('cached_at', ONE_HOUR_AGO)
    .single()
  if (error || !data) return null
  return data.recipes_json
}

export const setCachedRecipes = (ingredientsHash, recipesJson) =>
  supabase
    .from('recipe_cache')
    .upsert(
      { ingredients_hash: ingredientsHash, recipes_json: recipesJson, cached_at: new Date().toISOString() },
      { onConflict: 'ingredients_hash' }
    )
