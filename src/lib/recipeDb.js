/**
 * Forage — Local Recipe Database (Supabase-only)
 *
 * Client-side normalization mirrors the Postgres normalize_ingredient() function
 * so match percentages are consistent between the DB query and the UI display.
 */

import { supabase } from './supabase'

// ─── Ingredient normalization ─────────────────────────────────────────────────

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
  if (n.length >= 4 && n.endsWith('s') && !n.endsWith('ss')) {
    n = n.slice(0, -1)
  }
  return n.trim()
}

/**
 * Word-boundary ingredient match — mirrors ingredient_matches() Postgres function.
 *
 * Guards against false positives like:
 *   'cream'  matching 'ice cream'   (different food)
 *   'soy'    matching 'soy sauce'   (too vague)
 *   'pepper' matching 'bell pepper' (different vegetable)
 *
 * Safe matches (intended):
 *   'egg'           ↔ 'large egg', 'eggs'
 *   'basil'         ↔ 'fresh basil'
 *   'chicken'       ↔ 'chicken breast', 'chicken thighs'
 *   'garlic'        ↔ 'garlic cloves'
 */
export function ingredientMatches(a, b) {
  const f = normalizeIngredient(a)
  const r = normalizeIngredient(b)
  if (!f || !r) return false
  if (f === r)  return true

  // Word-boundary containment using padded strings
  const fPad = ` ${f} `
  const rPad = ` ${r} `
  const rContainsF = rPad.includes(` ${f} `)
  const fContainsR = fPad.includes(` ${r} `)

  if (!rContainsF && !fContainsR) return false

  const longer  = f.length >= r.length ? f : r
  const shorter = f.length <  r.length ? f : r

  // Compound foods where the component word must NOT match the compound.
  // e.g. 'cream' alone should not cover 'ice cream' or 'sour cream'.
  // Culinary subtypes ('heavy cream', 'double cream') are fine — they get
  // normalised by adjective stripping anyway.
  const COMPOUND_EXACT = new Set([
    'ice cream', 'sour cream', 'whipped cream',
    'peanut butter', 'almond butter', 'cashew butter',
    'coconut milk', 'coconut cream', 'coconut oil',
    'almond milk', 'oat milk', 'rice milk', 'soy milk',
    'sweet potato',
  ])
  if (COMPOUND_EXACT.has(longer)) {
    // Shorter must be a true prefix of the longer compound
    return longer.startsWith(shorter + ' ') || longer === shorter
  }

  // For short tokens (≤ 4 chars), word-boundary is already sufficient
  // guards against 'pea' matching 'peanut', 'oil' matching 'coil', etc.
  return true
}

/** True if any fridge ingredient matches the given name */
export function fridgeContains(ingredientName, fridgeIngredients) {
  return fridgeIngredients.some(f => ingredientMatches(f, ingredientName))
}

// ─── Count ────────────────────────────────────────────────────────────────────

export const countRecipesInDb = async () => {
  try {
    const { count, error } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
    if (error) return 0
    return count ?? 0
  } catch { return 0 }
}

// ─── Search ───────────────────────────────────────────────────────────────────

export const findRecipesInDb = async (ingredients, filters = {}, limit = 20) => {
  const { data, error } = await supabase.rpc('search_by_ingredients', {
    p_ingredients: ingredients.map(i => normalizeIngredient(i.trim())).filter(Boolean),
    p_limit:       limit * 2, // fetch extra so we can quality-filter client-side
    p_diet:        filters.diet    ? filters.diet.toLowerCase() : null,
    p_max_time:    filters.maxTime ? parseInt(filters.maxTime)  : null,
  })

  if (error) throw new Error(`DB search failed: ${error.message}`)

  // Transform first (computes client-side match counts), then quality-filter, then sort.
  const allRecipes = (data ?? []).map(row => dbRowToRecipe(row, ingredients))

  // Exclude quality_score=0 recipes (no instructions AND few ingredients)
  // unless they still have a high match — in that case, show them but at the end.
  const goodRecipes  = allRecipes.filter(r => (r._qualityScore ?? 1) >= 1)
  const poorRecipes  = allRecipes.filter(r => (r._qualityScore ?? 1) === 0)

  const sorted = [
    ...goodRecipes.sort((a, b) => _clientSortFn(a, b, filters.sort)),
    ...poorRecipes.sort((a, b) => _clientSortFn(a, b, filters.sort)),
  ]

  return sorted.slice(0, limit)
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export const getRecipeFromDb = async (id) => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return dbRowToRecipe({ ...data, used_count: 0, miss_count: 0 }, [])
  } catch { return null }
}

// ─── Shape transformer ────────────────────────────────────────────────────────

export function dbRowToRecipe(row, searchIngredients = []) {
  const extendedIngredients = (row.ingredient_lines ?? []).map(line => {
    const parsed   = _parseLine(line)
    const inFridge = fridgeContains(parsed.name, searchIngredients)
    return { ...parsed, original: line, _inFridge: inFridge }
  })

  const usedIngs   = extendedIngredients.filter(i => i._inFridge)
  const missedIngs = extendedIngredients.filter(i => !i._inFridge)

  return {
    id:    row.id,
    _dbId: row.id,

    title:          row.title,
    image:          row.image_url  || null,
    readyInMinutes: row.cook_time  || null,
    servings:       row.servings   || 4,
    sourceUrl:      row.source_url || null,
    diets:          row.tags       ?? [],
    cuisine:        row.cuisine    || null,

    usedIngredientCount:   usedIngs.length,
    missedIngredientCount: missedIngs.length,
    usedIngredients:       usedIngs,
    missedIngredients:     missedIngs,
    extendedIngredients,

    analyzedInstructions: _parseInstructions(row.instructions),

    _qualityScore: row.quality_score ?? 1,
    _source: 'db',
  }
}

/**
 * Recompute match for a recipe snapshot against the CURRENT fridge contents.
 * Call this on SavedPage / HistoryPage to avoid showing stale match percentages
 * from when the recipe was originally saved.
 */
export function refreshRecipeMatch(recipe, currentFridgeIngredients) {
  if (!recipe || !currentFridgeIngredients?.length) return recipe
  const ings = recipe.extendedIngredients ?? []
  if (!ings.length) return recipe

  const refreshed = ings.map(ing => ({
    ...ing,
    _inFridge: fridgeContains(ing.name || '', currentFridgeIngredients),
  }))
  const used   = refreshed.filter(i => i._inFridge)
  const missed = refreshed.filter(i => !i._inFridge)

  return {
    ...recipe,
    extendedIngredients:   refreshed,
    usedIngredients:       used,
    missedIngredients:     missed,
    usedIngredientCount:   used.length,
    missedIngredientCount: missed.length,
  }
}

// ─── Line parser ──────────────────────────────────────────────────────────────

const UNIT_RE = /^([\d½¼¾⅓⅔⅛.\/\s]+)\s*(kg|g|ml|l|L|oz|lb|cups?|tbsps?|tsps?|tsp|pieces?|bunches?|cloves?|slices?|cans?|handfuls?|pinch(?:es)?|fl\s*oz)\b\s*/i
const NOISE_PREFIX = /^(of|the|a|an|some|into|for|with|about)\s+/gi

function _parseLine(line) {
  if (!line) return { amount: null, unit: '', name: '' }

  const raw = line.trim()
  const m   = raw.match(UNIT_RE)

  if (m) {
    let rawNum = m[1].trim().replace(/\s/g, '')
    const FRACS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125 }
    for (const [f, v] of Object.entries(FRACS)) {
      if (rawNum.includes(f)) { rawNum = String((parseFloat(rawNum) || 0) + v); break }
    }
    const amount = rawNum.includes('/')
      ? rawNum.split('/').reduce((a, b) => Number(a) / Number(b))
      : parseFloat(rawNum)
    const unit = m[2].replace(/s$/, '').toLowerCase()
    let name = raw.slice(m[0].length)
    let prev
    do { prev = name; name = name.replace(NOISE_PREFIX, '') } while (name !== prev)
    return { amount: isNaN(amount) ? null : amount, unit, name: name.trim() || raw }
  }

  const numOnly = raw.match(/^([\d.]+)\s+(.+)/)
  if (numOnly) {
    return { amount: parseFloat(numOnly[1]) || null, unit: '', name: numOnly[2].trim() }
  }

  return { amount: null, unit: '', name: raw }
}

// ─── Instruction parser ───────────────────────────────────────────────────────

function _parseInstructions(text) {
  if (!text || text.trim().length < 50) return []

  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

  // Strategy 1: numbered steps  (1. ... or 1) ...)
  const numbered = clean.match(/(?:^|\n)\s*\d+[.)]\s+[^\n]+/g)
  if (numbered && numbered.length >= 2) {
    return [{ steps: numbered.map((s, i) => ({
      number: i + 1,
      step:   s.replace(/^\s*\d+[.)]\s*/, '').trim(),
      equipment: [],
    })).filter(s => s.step.length > 15) }]
  }

  // Strategy 2: "STEP N" style headers (TheMealDB)
  const stepHeader = clean.split(/\n\s*(?:STEP|Step)\s+\d+\s*\n/)
  if (stepHeader.length >= 2) {
    const steps = stepHeader
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .map((s, i) => ({ number: i + 1, step: s.replace(/\n+/g, ' '), equipment: [] }))
    if (steps.length >= 2) return [{ steps }]
  }

  // Strategy 3: paragraph split on double newline
  const paras = clean
    .split(/\n\n+/)
    .map(s => s.replace(/\n/g, ' ').trim())
    .filter(s => s.length > 25)
  if (paras.length >= 2) {
    return [{ steps: paras.map((s, i) => ({ number: i + 1, step: s, equipment: [] })) }]
  }

  // Strategy 4: sentence split (last resort)
  const sentences = clean.split(/\.\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25)
  if (sentences.length >= 2) {
    return [{ steps: sentences.map((s, i) => ({
      number: i + 1,
      step:   s.endsWith('.') ? s : s + '.',
      equipment: [],
    }))}]
  }

  // Fallback: entire text as one step
  if (clean.length > 80) {
    return [{ steps: [{ number: 1, step: clean.replace(/\n+/g, ' '), equipment: [] }] }]
  }

  return []
}

// ─── Sort (runs on transformed recipes using client-side counts) ──────────────

function _clientSortFn(a, b, sort) {
  const aUsed   = a.usedIngredientCount   ?? 0
  const bUsed   = b.usedIngredientCount   ?? 0
  const aMissed = a.missedIngredientCount ?? 0
  const bMissed = b.missedIngredientCount ?? 0
  const aTotal  = aUsed + aMissed
  const bTotal  = bUsed + bMissed

  if (sort === 'time') {
    return (a.readyInMinutes ?? 999) - (b.readyInMinutes ?? 999)
  }
  if (sort === 'max-used-ingredients') {
    return bUsed - aUsed || aMissed - bMissed
  }
  if (sort === 'min-missing-ingredients') {
    return aMissed - bMissed || bUsed - aUsed
  }

  // Default: combined score that rewards both high coverage AND high completeness.
  // Score = (used_count * 3) - (missed_count * 1)
  // This ensures a recipe using 8 of 9 fridge items beats a 1-of-1 perfect-ratio recipe.
  // Within the same score, prefer the recipe with fewest missing items.
  const aScore = (aUsed * 3) - aMissed
  const bScore = (bUsed * 3) - bMissed
  if (bScore !== aScore) return bScore - aScore
  return aMissed - bMissed || bUsed - aUsed
}
