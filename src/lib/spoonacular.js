import { getCachedRecipes, setCachedRecipes } from './supabase'
import { countRecipesInDb, findRecipesInDb, getRecipeFromDb } from './recipeDb'
import MOCK_RECIPES from './mockRecipes'

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

// ─── DB recipe count cache (avoid re-checking on every call) ─────────────────
let _dbCount = null
let _dbCountChecked = false
const getDbCount = async () => {
  if (_dbCountChecked) return _dbCount
  _dbCount = await countRecipesInDb()
  _dbCountChecked = true
  return _dbCount
}

// ─── Main search ─────────────────────────────────────────────────────────────

/**
 * Find recipes by fridge ingredients.
 *
 * Priority chain:
 *   1. Own Supabase recipes table  (unlimited — use this once seeded)
 *   2. Supabase recipe_cache       (Spoonacular results cached up to 1 hr)
 *   3. Spoonacular API             (150/day free; degrades gracefully on 402)
 *   4. Mock data                   (always works; shown with amber banner)
 *
 * Returns: { recipes: Recipe[], fromMock: boolean, fromDb: boolean }
 */
export const findRecipes = async (ingredients, filters = {}, number = 12) => {

  // ── 1. Own DB (unlimited) ──────────────────────────────────────────────────
  const dbCount = await getDbCount()
  if (dbCount > 0) {
    try {
      const recipes = await findRecipesInDb(ingredients, filters, number)
      if (recipes.length > 0) {
        return { recipes, fromDb: true, fromMock: false }
      }
      // DB has recipes but none matched — fall through to Spoonacular for coverage
    } catch (err) {
      console.warn('[Forage] DB search failed, falling back:', err.message)
    }
  }

  // ── 2. Spoonacular cache ───────────────────────────────────────────────────
  const hash = buildHash(ingredients, filters)
  const cached = await getCachedRecipes(hash)
  if (cached) {
    const fromMock = Array.isArray(cached) && cached[0]?.id >= 9000
    return { recipes: cached, fromDb: false, fromMock }
  }

  // ── 3. Spoonacular API ─────────────────────────────────────────────────────
  if (!API_KEY) {
    return { recipes: _applyFilters(MOCK_RECIPES, filters), fromDb: false, fromMock: true }
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

    if (res.status === 402) {
      const mock = _applyFilters(MOCK_RECIPES, filters)
      Promise.resolve(setCachedRecipes(hash, mock)).catch(console.error)
      return { recipes: mock, fromDb: false, fromMock: true }
    }

    if (!res.ok) throw new Error(`Spoonacular ${res.status}`)

    const data    = await res.json()
    const recipes = data.results ?? []
    Promise.resolve(setCachedRecipes(hash, recipes)).catch(console.error)
    return { recipes, fromDb: false, fromMock: false }

  } catch (err) {
    console.error('[Forage] Spoonacular error, using mock:', err.message)
    return { recipes: _applyFilters(MOCK_RECIPES, filters), fromDb: false, fromMock: true }
  }
}

// ─── Detail ───────────────────────────────────────────────────────────────────

/**
 * Get full recipe details.
 * Returns: { detail: RecipeDetail, fromMock: boolean }
 */
export const getRecipeDetails = async (id, mockRecipe = null) => {
  // Mock IDs
  if (id >= 9000 || mockRecipe) {
    const detail = mockRecipe ?? MOCK_RECIPES.find(r => r.id === id)
    if (detail) return { detail, fromMock: true }
  }

  // DB recipes — already have full data from the RPC, but fetch for completeness
  if (id < 9000) {
    const dbDetail = await getRecipeFromDb(id)
    if (dbDetail) return { detail: dbDetail, fromMock: false }
  }

  // Spoonacular
  if (!API_KEY) {
    return { detail: MOCK_RECIPES[0], fromMock: true }
  }

  try {
    const params = new URLSearchParams({ apiKey: API_KEY, includeNutrition: true })
    const res    = await fetch(`${BASE}/recipes/${id}/information?${params}`)

    if (res.status === 402) {
      const fallback = MOCK_RECIPES.find(r => r.id === id) ?? MOCK_RECIPES[0]
      return { detail: fallback, fromMock: true }
    }

    if (!res.ok) throw new Error(`Spoonacular ${res.status}`)
    return { detail: await res.json(), fromMock: false }

  } catch (err) {
    console.error('[Forage] Detail fetch failed:', err.message)
    const fallback = MOCK_RECIPES.find(r => r.id === id) ?? MOCK_RECIPES[0]
    return { detail: fallback, fromMock: true }
  }
}

// ─── Filter helper ────────────────────────────────────────────────────────────

function _applyFilters(recipes, filters = {}) {
  let result = [...recipes]
  if (filters.diet) {
    const d = filters.diet.toLowerCase()
    const filtered = result.filter(r => r.diets?.some(t => t.toLowerCase().includes(d)))
    if (filtered.length > 0) result = filtered
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
