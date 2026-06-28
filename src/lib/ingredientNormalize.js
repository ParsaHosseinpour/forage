/**
 * Forage — Ingredient name normalization
 *
 * Extracted into its own zero-dependency module so both recipeDb.js
 * (search/sort) and recipeUtils.js (weighted match %) can import it
 * without creating a circular import between the two.
 *
 * Mirrors the Postgres normalize_ingredient() function so match
 * percentages stay consistent between the DB query and the UI display.
 */

const LEADING_ADJECTIVES = /^\s*(fresh|dried|frozen|organic|raw|cooked|large|small|medium|big|ripe|whole|chopped|sliced|diced|minced|grated|crushed|ground|shredded|peeled|canned|tinned|boneless|skinless|lean|extra|fine|coarse|flat-leaf|flat leaf|roughly|finely|thinly|thickly|lightly|smoked|roasted|toasted|softened|melted|beaten|whisked)\s+/gi

export function normalizeIngredient(name) {
  if (!name) return ''
  let n = name.toLowerCase().trim()
  let prev
  do {
    prev = n
    n = n.replace(LEADING_ADJECTIVES, '')
  } while (n !== prev)
  n = n.replace(/tomatoes$/, 'tomato')
  n = n.replace(/potatoes$/, 'potato')
  n = n.replace(/berries$/,  'berry')
  // Simple plural: strip trailing s when stem ≥ 4 chars and not already ending in ss
  // >= 4 so 'eggs'(4) → 'egg', 'peas'(4) → 'pea', 'oils'(4) → 'oil'
  // Exclude '-us' endings — these are singular Latin-derived nouns, not
  // plurals (octopus, asparagus, couscous, hummus, citrus), so stripping
  // their trailing 's' produced a nonexistent word ('asparagu').
  if (n.length >= 4 && n.endsWith('s') && !n.endsWith('ss') && !n.endsWith('us')) {
    n = n.slice(0, -1)
  }
  return n.trim()
}
