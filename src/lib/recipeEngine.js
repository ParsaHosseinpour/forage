/**
 * Forage Recipe Engine — DB-only, zero external API calls.
 *
 * All recipe search and detail resolution goes through our own
 * Supabase `recipes` table. Spoonacular is gone.
 */

import { findRecipesInDb, getRecipeFromDb } from './recipeDb'

/**
 * Find recipes matching fridge ingredients.
 *
 * @returns {{ recipes: Recipe[], fromDb: true }}
 */
export async function findRecipes(ingredients, filters = {}, limit = 20) {
  const recipes = await findRecipesInDb(ingredients, filters, limit)
  return { recipes, fromDb: true, fromMock: false }
}

/**
 * Get full recipe detail by ID.
 *
 * @returns {{ detail: Recipe, fromDb: true }}
 */
export async function getRecipeDetails(id) {
  // Already embedded in the search result — if caller passes a full recipe
  // object, wrap it directly to avoid a redundant round-trip.
  const detail = await getRecipeFromDb(Number(id))
  return { detail: detail ?? null, fromDb: true, fromMock: false }
}
