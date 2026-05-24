import { getCachedRecipes, setCachedRecipes } from './supabase'

const API_KEY = '1d4f4572a79c493a8dcce3fb8f8abfbc'
const BASE    = 'https://api.spoonacular.com'

// Cache key includes ingredients + active filters
const buildHash = (ingredients, filters = {}) => {
  const base = [...ingredients].sort().join(',').toLowerCase()
  const filterStr = Object.entries(filters)
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|')
  return filterStr ? `${base}__${filterStr}` : base
}

/**
 * Find recipes by fridge ingredients with optional dietary filters.
 * Uses complexSearch so diet filtering + ingredient matching work together.
 * Cache-first: only hits Spoonacular on a miss.
 *
 * filters.diet    → 'vegetarian' | 'vegan' | 'gluten free' | 'dairy free' | 'ketogenic' | 'paleo'
 * filters.sort    → 'min-missing-ingredients' (default) | 'max-used-ingredients' | 'popularity' | 'time'
 * filters.maxTime → number (minutes)
 */
export const findRecipes = async (ingredients, filters = {}, number = 12) => {
  const hash = buildHash(ingredients, filters)

  // 1. Cache check
  const cached = await getCachedRecipes(hash)
  if (cached) {
    console.info('[Forage] Cache hit ✓')
    return cached
  }
  console.info('[Forage] Cache miss — calling Spoonacular')

  // 2. complexSearch: supports diet + ingredient matching + rich response in one call
  const params = new URLSearchParams({
    apiKey:               API_KEY,
    includeIngredients:   ingredients.join(','),
    number,
    addRecipeInformation: true,  // readyInMinutes, servings, diets — no second call needed
    fillIngredients:      true,  // usedIngredients + missedIngredients arrays
    sort:                 filters.sort || 'min-missing-ingredients',
    ignorePantry:         true,
    instructionsRequired: true,
  })

  if (filters.diet)    params.set('diet', filters.diet)
  if (filters.maxTime) params.set('maxReadyTime', String(filters.maxTime))

  const res = await fetch(`${BASE}/recipes/complexSearch?${params}`)
  if (!res.ok) throw new Error(`Spoonacular ${res.status}: ${res.statusText}`)

  const data    = await res.json()
  const recipes = data.results ?? []

  // 3. Cache write — wrapped in Promise.resolve so .catch is guaranteed on the Supabase builder
  Promise.resolve(setCachedRecipes(hash, recipes)).catch(console.error)

  return recipes
}

/**
 * Full recipe detail with analysed step-by-step instructions.
 * Only called when user opens a recipe card (not on the list view).
 */
export const getRecipeDetails = async (id) => {
  const params = new URLSearchParams({ apiKey: API_KEY, includeNutrition: false })
  const res    = await fetch(`${BASE}/recipes/${id}/information?${params}`)
  if (!res.ok) throw new Error(`Spoonacular ${res.status}`)
  return res.json()
}
