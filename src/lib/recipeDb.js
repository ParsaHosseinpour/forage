/**
 * Forage — Local Recipe Database (Supabase-only)
 *
 * All recipe search, filter, and detail queries go directly to our
 * own Supabase `recipes` table. Zero external API calls.
 */

import { supabase } from './supabase'

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

/**
 * Find recipes by ingredient overlap.
 * Calls the search_by_ingredients Postgres RPC (GIN-indexed array overlap).
 *
 * Returns Forage-shaped recipe objects (no external API shape dependency).
 */
export const findRecipesInDb = async (ingredients, filters = {}, limit = 20) => {
  const { data, error } = await supabase.rpc('search_by_ingredients', {
    p_ingredients: ingredients.map(i => i.toLowerCase().trim()),
    p_limit:       limit,
    p_diet:        filters.diet    ? filters.diet.toLowerCase() : null,
    p_max_time:    filters.maxTime ? parseInt(filters.maxTime)  : null,
  })

  if (error) throw new Error(`DB search failed: ${error.message}`)

  return (data ?? [])
    .sort((a, b) => _sortFn(a, b, filters.sort))
    .map(row => dbRowToRecipe(row, ingredients))
}

// ─── Detail ───────────────────────────────────────────────────────────────────

/**
 * Fetch a single recipe by its Supabase ID.
 * Returns null if not found.
 */
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

/**
 * Transform a `recipes` DB row into a Forage recipe object.
 * Produces extendedIngredients with parsed amount/unit/name so
 * the servings scaler and Cook It deductions work correctly.
 */
export function dbRowToRecipe(row, searchIngredients = []) {
  const fridgeSet = new Set(searchIngredients.map(n => n.toLowerCase()))

  const extendedIngredients = (row.ingredient_lines ?? []).map(line => {
    const parsed = _parseLine(line)
    const inFridge = [...fridgeSet].some(f =>
      parsed.name.toLowerCase().includes(f) || f.includes(parsed.name.toLowerCase())
    )
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

    usedIngredientCount:   row.used_count ?? usedIngs.length,
    missedIngredientCount: row.miss_count ?? missedIngs.length,
    usedIngredients:   usedIngs,
    missedIngredients: missedIngs,
    extendedIngredients,

    analyzedInstructions: _parseInstructions(row.instructions),

    _source: 'db',
  }
}

// ─── Line parser ──────────────────────────────────────────────────────────────

const UNIT_RE = /^([\d½¼¾⅓⅔⅛.\/\s]+)\s*(kg|g|ml|l|L|oz|lb|cups?|tbsps?|tsps?|tsp|pieces?|bunches?|cloves?|slices?|cans?|handfuls?|pinch(?:es)?|fl\s*oz)\b\s*/i

/**
 * Parse "200g chicken breast" → { amount: 200, unit: 'g', name: 'chicken breast' }
 * Returns { amount: null, unit: '', name: original } when no quantity found.
 */
function _parseLine(line) {
  if (!line) return { amount: null, unit: '', name: '' }

  const raw = line.trim()
  const m   = raw.match(UNIT_RE)

  if (m) {
    const rawNum = m[1].trim().replace(/\s/g, '')
    let amount = rawNum.includes('/')
      ? rawNum.split('/').reduce((a, b) => Number(a) / Number(b))
      : parseFloat(rawNum)

    // Handle fraction chars
    const FRACS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125 }
    for (const [f, v] of Object.entries(FRACS)) {
      if (rawNum.includes(f)) amount = (parseFloat(rawNum) || 0) + v
    }

    const unit = m[2].replace(/s$/, '').toLowerCase()
      .replace('cup', 'cup').replace('tbsp', 'tbsp').replace('tsp', 'tsp')

    const name = raw.slice(m[0].length).replace(/^(of\s+|the\s+|some\s+)/i, '').trim()
    return { amount: isNaN(amount) ? null : amount, unit, name: name || raw }
  }

  // Numeric prefix without a known unit (e.g. "2 eggs")
  const numOnly = raw.match(/^([\d.]+)\s+(.+)/)
  if (numOnly) {
    return { amount: parseFloat(numOnly[1]) || null, unit: '', name: numOnly[2].trim() }
  }

  return { amount: null, unit: '', name: raw }
}

// ─── Instruction parser ───────────────────────────────────────────────────────

function _parseInstructions(text) {
  if (!text) return []

  const numbered = text.match(/\d+[\.)]\s+[^\n]+/g)
  if (numbered && numbered.length >= 3) {
    return [{ steps: numbered.map((s, i) => ({
      number: i + 1,
      step:   s.replace(/^\d+[\.)]\s*/, '').trim(),
      equipment: [],
    }))}]
  }

  const paras = text.split(/\r?\n+/).map(s => s.trim()).filter(s => s.length > 20)
  if (paras.length > 0) {
    return [{ steps: paras.map((s, i) => ({ number: i + 1, step: s, equipment: [] })) }]
  }
  return []
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

function _sortFn(a, b, sort) {
  if (sort === 'time')                 return (a.cook_time   ?? 999) - (b.cook_time   ?? 999)
  if (sort === 'max-used-ingredients') return (b.used_count  ?? 0)   - (a.used_count  ?? 0)
  const d = (a.miss_count ?? 0) - (b.miss_count ?? 0)
  return d !== 0 ? d : (b.used_count ?? 0) - (a.used_count ?? 0)
}
