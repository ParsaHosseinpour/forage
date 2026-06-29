/**
 * Forage — Local Recipe Database (Supabase-only)
 *
 * Client-side normalization mirrors the Postgres normalize_ingredient() function
 * so match percentages are consistent between the DB query and the UI display.
 */

import { supabase } from './supabase'
import { normalizeIngredient } from './ingredientNormalize'
import { weightedMatchPct } from './recipeUtils'

// Re-exported so any existing `import { normalizeIngredient } from './recipeDb'`
// keeps working unchanged.
export { normalizeIngredient }

// ─── Ingredient normalization ─────────────────────────────────────────────────

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
    // Not passing p_max_time to the RPC — the DB's cook_time column is
    // always null (TheMealDB doesn't supply it), so the SQL-side filter
    // has nothing real to compare against and is effectively a no-op.
    // The time filter is applied below instead, against the estimated
    // readyInMinutes computed in dbRowToRecipe — the same number shown
    // on the card and used by the "Quickest" sort, so filter/sort/display
    // all agree.
  })

  if (error) throw new Error(`DB search failed: ${error.message}`)

  // Transform first (computes client-side match counts + time estimate).
  let allRecipes = (data ?? []).map(row => dbRowToRecipe(row, ingredients))

  // Apply the time filter here, client-side, using the same estimated value.
  if (filters.maxTime) {
    const maxMinutes = parseInt(filters.maxTime)
    allRecipes = allRecipes.filter(r => (r.readyInMinutes ?? 999) <= maxMinutes)
  }

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
  const instructions = _parseInstructions(row.instructions)

  return {
    id:    row.id,
    _dbId: row.id,

    title:          row.title,
    image:          row.image_url  || null,
    // TheMealDB (our seed source) doesn't provide cook time, so row.cook_time
    // is always null today. Without a real number, the Time filter has
    // nothing to compare against and "Quickest" sort can't tell recipes
    // apart. Fall back to a rough estimate from the instruction step count
    // so both features have real, differentiated data to work with.
    readyInMinutes: row.cook_time || _estimateCookTime(instructions),
    servings:       row.servings   || 4,
    sourceUrl:      row.source_url || null,
    diets:          row.tags       ?? [],
    cuisine:        row.cuisine    || null,

    usedIngredientCount:   usedIngs.length,
    missedIngredientCount: missedIngs.length,
    usedIngredients:       usedIngs,
    missedIngredients:     missedIngs,
    extendedIngredients,

    analyzedInstructions: instructions,

    _qualityScore: row.quality_score ?? 1,
    _source: 'db',
  }
}

/**
 * Rough cook-time estimate used only when the DB has no real cook_time
 * (currently always, since TheMealDB doesn't supply it). ~5 min per
 * instruction step plus a 10 min base, clamped to a sane range and
 * rounded to the nearest 5 minutes for a cleaner display number.
 */
function _estimateCookTime(instructions) {
  const steps = instructions?.[0]?.steps?.length ?? 0
  if (steps === 0) return null
  const raw = 10 + steps * 5
  const clamped = Math.min(90, Math.max(10, raw))
  return Math.round(clamped / 5) * 5
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

// ─── Sort (runs on transformed recipes, primary key = weighted match %) ───────
//
// FIX: the displayed match % on each card (RecipeCard.jsx) comes from
// weightedMatchPct() — tier-weighted (core ×5, supporting ×2, minor ×0.5).
// This sort previously used only raw used/missed COUNTS, completely
// independent of that weighting. A recipe could show a higher % on its
// card than the recipe above it in the list, because the order and the
// number were computed by two unrelated formulas.
//
// Fix: every sort mode now uses the SAME weightedMatchPct() as the primary
// sort key, so the list order and the displayed percentage always agree.
// Each mode's original signal (fewest missing, most used, quickest) is kept
// as the tiebreaker for recipes that land on the exact same percentage.

// ─── Sort ──────────────────────────────────────────────────────────────────────
//
// v1 bug: sort used only raw used/missed COUNTS, completely independent of
// the tier-weighted match % shown on each card — list order and the
// displayed number could flatly disagree.
//
// v2 bug: making weighted match % the primary key for EVERY mode fixed that,
// but collapsed "Fewest missing", "Most matching", and "Popular" into nearly
// identical orderings — clicking between them stopped visibly changing
// anything, which looked just as broken from the other direction.
//
// v3: each named mode keeps its OWN distinct primary signal (so the buttons
// are visibly different again), with weighted match % as the tiebreaker
// everywhere. "Popular" has no real data behind it (our recipe DB has no
// popularity signal) — repurposed as the genuine "best match %" option,
// since that's the single most useful generic ranking we have.

function _clientSortFn(a, b, sort) {
  const aPct = weightedMatchPct(a.usedIngredients, a.missedIngredients) ?? 0
  const bPct = weightedMatchPct(b.usedIngredients, b.missedIngredients) ?? 0

  const aUsed   = a.usedIngredientCount   ?? 0
  const bUsed   = b.usedIngredientCount   ?? 0
  const aMissed = a.missedIngredientCount ?? 0
  const bMissed = b.missedIngredientCount ?? 0

  if (sort === 'max-used-ingredients') {
    // "Most matching" — most ingredients you already have, first.
    if (bUsed !== aUsed) return bUsed - aUsed
    return bPct - aPct
  }

  if (sort === 'min-missing-ingredients') {
    // "Fewest missing" — closest to complete by absolute count, first.
    if (aMissed !== bMissed) return aMissed - bMissed
    return bPct - aPct
  }

  if (sort === 'time') {
    // "Quickest" — shortest estimated cook time, first.
    const aTime = a.readyInMinutes ?? 999
    const bTime = b.readyInMinutes ?? 999
    if (aTime !== bTime) return aTime - bTime
    return bPct - aPct
  }

  // "Popular" (repurposed: best weighted match %, first).
  if (bPct !== aPct) return bPct - aPct
  return aMissed - bMissed || bUsed - aUsed
}
