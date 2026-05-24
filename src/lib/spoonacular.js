import { getCachedRecipes, setCachedRecipes } from './supabase'

const API_KEY = '1d4f4572a79c493a8dcce3fb8f8abfbc'
const BASE = 'https://api.spoonacular.com'

// Deterministic hash so same ingredient set always hits the same cache row
const hashIngredients = (ingredients) =>
  [...ingredients].sort().join(',').toLowerCase()

/**
 * Find recipes based on fridge contents.
 * Checks Supabase cache first; only calls Spoonacular on a cache miss.
 */
export const findRecipesByIngredients = async (ingredients, number = 12) => {
  const hash = hashIngredients(ingredients)

  // 1. Try cache
  const cached = await getCachedRecipes(hash)
  if (cached) {
    console.info('[Forage] Cache hit ✓')
    return cached
  }

  console.info('[Forage] Cache miss — calling Spoonacular')

  // 2. Hit Spoonacular
  const params = new URLSearchParams({
    apiKey: API_KEY,
    ingredients: ingredients.join(','),
    number,
    ranking: 2,        // 2 = minimize missing ingredients
    ignorePantry: true,
  })

  const res = await fetch(`${BASE}/recipes/findByIngredients?${params}`)
  if (!res.ok) throw new Error(`Spoonacular error: ${res.status}`)
  const recipes = await res.json()

  // 3. Write to cache (fire-and-forget; don't block UI)
  setCachedRecipes(hash, recipes).catch(console.error)

  return recipes
}

/**
 * Fetch full recipe details: steps, nutrition, time.
 */
export const getRecipeDetails = async (id) => {
  const params = new URLSearchParams({
    apiKey: API_KEY,
    includeNutrition: false,
  })
  const res = await fetch(`${BASE}/recipes/${id}/information?${params}`)
  if (!res.ok) throw new Error(`Spoonacular error: ${res.status}`)
  return res.json()
}
