import { createClient } from '@supabase/supabase-js'

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig'

// When the project is not configured, main.jsx shows a setup screen instead of
// the app, so this placeholder client is never used. It only keeps the import
// from throwing before that screen can render.
export const supabase = createClient(
  SUPABASE_URL      || 'http://localhost',
  SUPABASE_ANON_KEY || 'not-configured',
)

// ─── Auth helpers ────────────────────────────────────────────────────────────

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () =>
  supabase.auth.signOut()

export const getSession = () =>
  supabase.auth.getSession()

/** Send a password-reset email. Supabase redirects the user to redirectTo
 *  with a recovery token in the URL hash once they click the email link. */
export const requestPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

/** Set a new password — only works while a recovery session is active
 *  (i.e. right after the user clicks the reset-password email link). */
export const updatePassword = (newPassword) =>
  supabase.auth.updateUser({ password: newPassword })

/** Resend the signup confirmation email (e.g. if the first one expired). */
export const resendConfirmationEmail = (email) =>
  supabase.auth.resend({
    type:  'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/fridge` },
  })

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

// ─── Saved recipes helpers ───────────────────────────────────────────────────

export const getSavedRecipes = (userId) =>
  supabase
    .from('saved_recipes')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })

export const saveRecipe = (userId, recipeId, recipeJson) =>
  supabase
    .from('saved_recipes')
    .upsert(
      { user_id: userId, recipe_id: recipeId, recipe_json: recipeJson },
      { onConflict: 'user_id,recipe_id' }
    )
    .select()
    .single()

export const unsaveRecipe = (userId, recipeId) =>
  supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_id', recipeId)

export const getSavedIds = async (userId) => {
  const { data } = await supabase
    .from('saved_recipes')
    .select('recipe_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.recipe_id))
}

// ─── Shopping checks helpers ─────────────────────────────────────────────────

export const getShoppingChecks = async (userId) => {
  const { data } = await supabase
    .from('shopping_checks')
    .select('ingredient_name')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.ingredient_name))
}

export const checkShoppingItem = (userId, ingredientName) =>
  supabase
    .from('shopping_checks')
    .upsert({ user_id: userId, ingredient_name: ingredientName })

export const uncheckShoppingItem = (userId, ingredientName) =>
  supabase
    .from('shopping_checks')
    .delete()
    .eq('user_id', userId)
    .eq('ingredient_name', ingredientName)

export const clearShoppingChecks = (userId) =>
  supabase
    .from('shopping_checks')
    .delete()
    .eq('user_id', userId)

// ─── Pantry staples helpers ───────────────────────────────────────────────────

export const getPantryStaples = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('pantry_staples')
    .eq('id', userId)
    .single()
  if (error || !data) return []
  return data.pantry_staples ?? []
}

export const setPantryStaples = (userId, staples) =>
  supabase
    .from('profiles')
    .update({ pantry_staples: staples })
    .eq('id', userId)

// ─── Cook history helpers ─────────────────────────────────────────────────────

export const getCookHistory = (userId) =>
  supabase
    .from('cook_history')
    .select('*')
    .eq('user_id', userId)
    .order('cooked_at', { ascending: false })

export const addCookHistory = (userId, recipe, extra = {}) =>
  supabase
    .from('cook_history')
    .insert([{
      user_id:              userId,
      recipe_id:            String(recipe.id),
      recipe_json:          recipe,
      meal_type:            extra.meal_type            ?? null,
      calories_per_serving: extra.calories_per_serving ?? null,
    }])
    .select()
    .single()

export const updateCookHistoryEntry = (id, updates) =>
  supabase
    .from('cook_history')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

export const deleteCookHistory = (id) =>
  supabase
    .from('cook_history')
    .delete()
    .eq('id', id)

// ─── Meal plan helpers (Step 14) ─────────────────────────────────────────────

/** Get all slots for the current week (Monday-based) */
export const getMealPlan = (userId, weekStart) =>
  supabase
    .from('meal_plan')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('slot_day')

/** All slots from `fromWeek` to `toWeek` inclusive (both Monday ISO dates). */
export const getMealPlanRange = (userId, fromWeek, toWeek) =>
  supabase
    .from('meal_plan')
    .select('*')
    .eq('user_id', userId)
    .gte('week_start', fromWeek)
    .lte('week_start', toWeek)
    .order('week_start')
    .order('slot_day')

/** Insert several slots at once (used by "copy week"). */
export const addMealPlanSlots = (rows) =>
  supabase.from('meal_plan').insert(rows).select()

export const addMealPlanSlot = (userId, weekStart, slotDay, slotType, recipe) =>
  supabase
    .from('meal_plan')
    .insert([{
      user_id:     userId,
      week_start:  weekStart,
      slot_day:    slotDay,
      slot_type:   slotType,
      recipe_json: recipe,
      recipe_id:   String(recipe.id),
    }])
    .select()
    .single()

export const deleteMealPlanSlot = (id) =>
  supabase
    .from('meal_plan')
    .delete()
    .eq('id', id)

// ─── Account helpers ──────────────────────────────────────────────────────────

/** Merge fields into the user's metadata (display name, recipe defaults). */
export const updateUserMeta = (data) =>
  supabase.auth.updateUser({ data })

/**
 * Permanently delete the signed-in user's account and all their data.
 * Calls a SECURITY DEFINER SQL function (see supabase_step21_delete_account.sql)
 * because the browser client is not allowed to delete auth users directly.
 * Every user table cascades from auth.users, so this removes everything.
 */
export const deleteMyAccount = async () => {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) return { error }
  // The server-side session is gone with the user; just clear it locally.
  await supabase.auth.signOut({ scope: 'local' })
  return { error: null }
}
