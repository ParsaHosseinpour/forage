/**
 * DB-native recipe search via our own Supabase `recipes` table.
 *
 * After running `scripts/seed-mealdb.js`, all searches route here —
 * no external API, no rate limits, no quota.
 *
 * Returns rows in the same shape as the Spoonacular complexSearch response
 * so the rest of the app (RecipeCard, RecipeDetail, saved recipes) needs
 * zero changes.
 */

import { supabase } from './supabase'

// ─── Count ───────────────────────────────────────────────────────────────────

/** Returns the number of recipes in the DB. 0 = not seeded yet. */
export const countRecipesInDb = async () => {
  try {
    const { count, error } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Search recipes by ingredient overlap using our PostgreSQL RPC function.
 *
 * @param {string[]} ingredients  — list of ingredient names
 * @param {object}   filters      — { diet, maxTime, sort }
 * @param {number}   limit
 * @returns {object[]} Spoonacular-shaped recipe objects
 */
export const findRecipesInDb = async (ingredients, filters = {}, limit = 12) => {
  const { data, error } = await supabase.rpc('search_by_ingredients', {
    p_ingredients: ingredients.map(i => i.toLowerCase().trim()),
    p_limit:       limit,
    p_diet:        filters.diet    ? filters.diet.toLowerCase() : null,
    p_max_time:    filters.maxTime ? parseInt(filters.maxTime)  : null,
  })

  if (error) throw new Error(`DB search failed: ${error.message}`)

  return (data ?? [])
    .sort((a, b) => _sortFn(a, b, filters.sort))
    .map(dbRowToRecipe)
}

// ─── Detail ───────────────────────────────────────────────────────────────────

/**
 * Fetch a single recipe from the DB by ID.
 * Returns null if not found (caller should fall back to Spoonacular).
 */
export const getRecipeFromDb = async (id) => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return dbRowToRecipe({ ...data, used_count: 0, miss_count: 0 })
  } catch {
    return null
  }
}

// ─── Shape transformer ────────────────────────────────────────────────────────

/**
 * Transform a `recipes` table row (with used_count / miss_count from RPC)
 * into the Spoonacular complexSearch response shape used throughout the app.
 */
function dbRowToRecipe(row) {
  const instructions = parseInstructions(row.instructions)

  return {
    // IDs — use the bigint DB id directly (won't clash with mock IDs ≥ 9000
    // because Postgres bigint identity starts at 1)
    id:    row.id,
    _dbId: row.id,

    title:          row.title,
    image:          row.image_url  || null,
    readyInMinutes: row.cook_time  || null,
    servings:       row.servings   || null,
    sourceUrl:      row.source_url || null,
    diets:          row.tags       ?? [],
    cuisine:        row.cuisine    || null,

    // Match stats from the RPC aggregates
    usedIngredientCount:   row.used_count ?? 0,
    missedIngredientCount: row.miss_count ?? 0,

    // Rich ingredient arrays expected by RecipeDetail's "have / need" split
    usedIngredients:   [],  // populated post-search if needed
    missedIngredients: [],

    // Full ingredient list for the detail view
    extendedIngredients: (row.ingredient_lines ?? []).map(line => ({
      name:     line.replace(/^[\d\s½¼¾⅓⅔.]+\s*(?:g|kg|ml|l|oz|lb|cup|tbsp|tsp|piece|bunch|clove|slice|can|handful|pinch)?\s*/i, '').split(',')[0].trim(),
      original: line,
    })),

    // Step-by-step instructions parsed from free text
    analyzedInstructions: instructions.length > 0
      ? [{ steps: instructions }]
      : [],

    _source: 'db',
  }
}

/** Split instruction text into numbered step objects */
function parseInstructions(text) {
  if (!text) return []

  // Try splitting on existing numbered steps first (1. Step text\n2. Step text)
  const numbered = text.match(/\d+\.\s+[^\n]+/g)
  if (numbered && numbered.length >= 3) {
    return numbered.map((s, i) => ({
      number:    i + 1,
      step:      s.replace(/^\d+\.\s*/, '').trim(),
      equipment: [],
    }))
  }

  // Fall back to paragraph/sentence splitting
  return text
    .split(/\r?\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .map((s, i) => ({ number: i + 1, step: s, equipment: [] }))
}

// ─── Sort helper ──────────────────────────────────────────────────────────────

function _sortFn(a, b, sort) {
  if (sort === 'time') {
    return (a.cook_time ?? 999) - (b.cook_time ?? 999)
  }
  if (sort === 'max-used-ingredients') {
    return (b.used_count ?? 0) - (a.used_count ?? 0)
  }
  // Default: min-missing-ingredients
  const missDiff = (a.miss_count ?? 0) - (b.miss_count ?? 0)
  if (missDiff !== 0) return missDiff
  return (b.used_count ?? 0) - (a.used_count ?? 0)
}
