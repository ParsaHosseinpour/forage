import { getCachedRecipes, setCachedRecipes } from './supabase'
import MOCK_RECIPES from './mockRecipes'

// ─── Config ──────────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY
const BASE    = 'https://api.spoonacular.com'

// ─── Cache key ───────────────────────────────────────────────────────────────

const buildHash = (ingredients, filters = {}) => {
  const base = [...ingredients].sort().join(',').toLowerCase()
  const filterStr = Object.entries(filters)
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|')
  return filterStr ? `${base}__${filterStr}` : base
}

// ─── Quota-exceeded error type ────────────────────────────────────────────────

export class QuotaError extends Error {
  constructor() {
    super('Daily API quota reached')
    this.name = 'QuotaError'
  }
}

// ─── Recipe search ───────────────────────────────────────────────────────────

/**
 * Find recipes by fridge ingredients with optional dietary filters.
 *
 * Returns: { recipes: Recipe[], fromMock: boolean }
 *
 * fromMock is true when the API quota is exhausted (HTTP 402) and we've
 * fallen back to the local mock dataset — the UI can show a quota banner.
 *
 * filters.diet    → 'vegetarian' | 'vegan' | 'gluten free' | 'dairy free' | 'ketogenic' | 'paleo'
 * filters.sort    → 'min-missing-ingredients' | 'max-used-ingredients' | 'popularity' | 'time'
 * filters.maxTime → number (minutes)
 */
export const findRecipes = async (ingredients, filters = {}, number = 12) => {
  const hash = buildHash(ingredients, filters)

  // 1. Cache check — serves real OR previously-cached mock results
  const cached = await getCachedRecipes(hash)
  if (cached) {
    console.info('[Forage] Cache hit ✓')
    // Distinguish cached mock vs cached real by a flag we store alongside
    const fromMock = Array.isArray(cached) && cached[0]?.id >= 9000
    return { recipes: cached, fromMock }
  }

  console.info('[Forage] Cache miss — calling Spoonacular')

  // 2. API call (if no key in env, skip straight to mock)
  if (!API_KEY) {
    console.warn('[Forage] VITE_SPOONACULAR_API_KEY not set — using mock data')
    return { recipes: _applyFilters(MOCK_RECIPES, filters), fromMock: true }
  }

  try {
    const params = new URLSearchParams({
      apiKey:               API_KEY,
      includeIngredients:   ingredients.join(','),
      number,
      addRecipeInformation: true,
      fillIngredients:      true,
      sort:                 filters.sort || 'min-missing-ingredients',
      ignorePantry:         true,
      instructionsRequired: true,
    })
    if (filters.diet)    params.set('diet', filters.diet)
    if (filters.maxTime) params.set('maxReadyTime', String(filters.maxTime))

    const res = await fetch(`${BASE}/recipes/complexSearch?${params}`)

    // 402 = quota exhausted → fall back gracefully
    if (res.status === 402) {
      console.warn('[Forage] Spoonacular quota exhausted — serving mock data')
      const mockResults = _applyFilters(MOCK_RECIPES, filters)
      Promise.resolve(setCachedRecipes(hash, mockResults)).catch(console.error)
      return { recipes: mockResults, fromMock: true }
    }

    if (!res.ok) throw new Error(`Spoonacular ${res.status}: ${res.statusText}`)

    const data    = await res.json()
    const recipes = data.results ?? []

    // Cache real results
    Promise.resolve(setCachedRecipes(hash, recipes)).catch(console.error)
    return { recipes, fromMock: false }

  } catch (err) {
    // Network errors → fall back to mock rather than crashing
    if (err.name !== 'QuotaError') {
      console.error('[Forage] Spoonacular fetch failed, using mock data:', err.message)
      return { recipes: _applyFilters(MOCK_RECIPES, filters), fromMock: true }
    }
    throw err
  }
}

// ─── Recipe detail ───────────────────────────────────────────────────────────

/**
 * Get full recipe details.
 *
 * Returns: { detail: RecipeDetail, fromMock: boolean }
 *
 * For mock recipe IDs (≥ 9000) we never hit the API — the mock data already
 * contains all the fields needed for the detail view.
 */
export const getRecipeDetails = async (id, mockRecipe = null) => {
  // Mock recipe — return embedded detail directly, no API call needed
  if (id >= 9000 || mockRecipe) {
    const detail = mockRecipe ?? MOCK_RECIPES.find(r => r.id === id)
    if (detail) return { detail, fromMock: true }
  }

  if (!API_KEY) {
    const fallback = MOCK_RECIPES[0]
    return { detail: fallback, fromMock: true }
  }

  try {
    const params = new URLSearchParams({ apiKey: API_KEY, includeNutrition: true })
    const res    = await fetch(`${BASE}/recipes/${id}/information?${params}`)

    if (res.status === 402) {
      console.warn('[Forage] Spoonacular quota (detail) — serving mock detail')
      const fallback = MOCK_RECIPES.find(r => r.id === id) ?? MOCK_RECIPES[0]
      return { detail: fallback, fromMock: true }
    }

    if (!res.ok) throw new Error(`Spoonacular ${res.status}`)
    const detail = await res.json()
    return { detail, fromMock: false }

  } catch (err) {
    console.error('[Forage] Recipe detail fetch failed, using mock:', err.message)
    const fallback = MOCK_RECIPES.find(r => r.id === id) ?? MOCK_RECIPES[0]
    return { detail: fallback, fromMock: true }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Apply diet + time filters to mock data so filters still "work" in demo mode */
function _applyFilters(recipes, filters = {}) {
  let result = [...recipes]
  if (filters.diet) {
    const d = filters.diet.toLowerCase()
    const filtered = result.filter(r => r.diets?.some(diet => diet.toLowerCase().includes(d)))
    if (filtered.length > 0) result = filtered  // graceful: if nothing matches, show all
  }
  if (filters.maxTime) {
    const max = Number(filters.maxTime)
    const filtered = result.filter(r => (r.readyInMinutes ?? 999) <= max)
    if (filtered.length > 0) result = filtered
  }
  if (filters.sort === 'time') {
    result.sort((a, b) => (a.readyInMinutes ?? 99) - (b.readyInMinutes ?? 99))
  } else if (filters.sort === 'max-used-ingredients') {
    result.sort((a, b) => b.usedIngredientCount - a.usedIngredientCount)
  } else {
    result.sort((a, b) => a.missedIngredientCount - b.missedIngredientCount)
  }
  return result
}
