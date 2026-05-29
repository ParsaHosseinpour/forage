/**
 * Forage — Smart Ingredient Parser
 *
 * Parses natural language ingredient strings into structured objects.
 *
 * Handles:
 *   "500g chicken"          → { name: "chicken",   quantity: 500, unit: "g" }
 *   "2 tomatoes"            → { name: "tomatoes",  quantity: 2,   unit: "" }
 *   "1.5 kg beef mince"     → { name: "beef mince",quantity: 1.5, unit: "kg" }
 *   "1 cup olive oil"       → { name: "olive oil", quantity: 1,   unit: "cup" }
 *   "handful basil"         → { name: "basil",     quantity: 1,   unit: "handful" }
 *   "3 cloves garlic"       → { name: "garlic",    quantity: 3,   unit: "clove" }
 *   "a pinch of salt"       → { name: "salt",      quantity: 1,   unit: "pinch" }
 *   "eggs"                  → { name: "eggs",      quantity: null, unit: "" }
 *   "2 cans chopped tomato" → { name: "chopped tomato", quantity: 2, unit: "can" }
 *
 * Bulk parse: splits on commas, newlines, or semicolons.
 */

// Recognised units — order matters: longer aliases before shorter ones
const UNIT_MAP = {
  // Weight
  'kilogram':   'kg', 'kilograms': 'kg', 'kg': 'kg',
  'gram':       'g',  'grams':     'g',  'gr': 'g', 'g': 'g',
  'ounce':      'oz', 'ounces':    'oz', 'oz': 'oz',
  'pound':      'lb', 'pounds':    'lb', 'lb': 'lb', 'lbs': 'lb',
  // Volume
  'litre':      'L',  'litres':  'L',  'liter': 'L', 'liters': 'L', 'l': 'L',
  'millilitre': 'ml', 'millilitres': 'ml', 'milliliter': 'ml', 'ml': 'ml',
  'cup':        'cup',  'cups': 'cup',
  'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'tbsp': 'tbsp', 'tbs': 'tbsp',
  'teaspoon':   'tsp',  'teaspoons': 'tsp',    'tsp':  'tsp',   'ts': 'tsp',
  'fluid ounce':'fl oz','fluid ounces': 'fl oz', 'fl oz': 'fl oz',
  // Count
  'piece':   'piece', 'pieces': 'piece',
  'bunch':   'bunch', 'bunches': 'bunch',
  'clove':   'clove', 'cloves': 'clove',
  'slice':   'slice', 'slices': 'slice',
  'can':     'can',   'cans': 'can', 'tin': 'can', 'tins': 'can',
  'jar':     'jar',   'jars': 'jar',
  'bag':     'bag',   'bags': 'bag',
  'head':    'head',  'heads': 'head',
  'stalk':   'stalk', 'stalks': 'stalk',
  'sprig':   'sprig', 'sprigs': 'sprig',
  'handful': 'handful', 'handfuls': 'handful',
  'pinch':   'pinch',   'pinches': 'pinch',
  'dash':    'dash',    'dashes': 'dash',
  'drop':    'drop',    'drops': 'drop',
  'sheet':   'sheet',   'sheets': 'sheet',
  'rasher':  'rasher',  'rashers': 'rasher',
  'fillet':  'fillet',  'fillets': 'fillet',
}

// Sorted by length descending so "tablespoon" matches before "table"
const UNIT_KEYS = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length)

// Fraction characters → decimal
const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667, '⅛': 0.125 }

// Articles and noise words to strip from ingredient names
const NOISE = /^(of|the|a|an|some|fresh|dried|frozen|organic|large|small|medium|big|ripe|raw|cooked|minced|chopped|diced|sliced|grated|crushed)\s+/gi

function normaliseNum(s) {
  // Handle fraction chars
  for (const [frac, val] of Object.entries(FRACTIONS)) {
    s = s.replace(frac, String(val))
  }
  // Handle "1½" or "1 ½" → 1.5
  s = s.replace(/(\d+)\s*(½|¼|¾|⅓|⅔|⅛)/g, (_, n, f) => String(Number(n) + FRACTIONS[f]))
  // Handle "1/2" style
  s = s.replace(/(\d+)\/(\d+)/g, (_, n, d) => String(Number(n) / Number(d)))
  return s
}

/**
 * Parse a single ingredient string.
 * @param {string} raw
 * @returns {{ name: string, quantity: number|null, unit: string, original: string }}
 */
export function parseIngredient(raw) {
  let s = normaliseNum(raw.trim())
  const original = raw.trim()
  let quantity = null
  let unit = ''

  // Strip leading "a pinch of" / "a handful of"
  s = s.replace(/^a\s+/i, '')

  // Extract leading number (incl. decimals)
  const numMatch = s.match(/^([\d.]+)\s*/)
  if (numMatch) {
    quantity = parseFloat(numMatch[1])
    s = s.slice(numMatch[0].length).trim()
  }

  // Extract unit from the start of what's left
  const lc = s.toLowerCase()
  for (const key of UNIT_KEYS) {
    if (lc.startsWith(key) && (lc.length === key.length || /[\s,.]/.test(lc[key.length]))) {
      unit = UNIT_MAP[key]
      s = s.slice(key.length).trim()
      break
    }
  }

  // Strip noise adjectives from the start of the ingredient name
  let name = s.replace(NOISE, '').trim()

  // Capitalise first letter
  name = name.charAt(0).toUpperCase() + name.slice(1)

  // If nothing parsed as a name, use the whole raw string
  if (!name) name = original

  return { name, quantity, unit, original }
}

/**
 * Parse a bulk input string (comma/newline/semicolon separated) into an array.
 * Filters out blank lines.
 * @param {string} text
 * @returns {Array<{ name, quantity, unit, original }>}
 */
export function parseBulkIngredients(text) {
  return text
    .split(/[,\n;]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(parseIngredient)
    .filter(item => item.name.length > 0)
}

/**
 * Auto-detect the likely category of an ingredient name.
 * Returns one of the CATEGORIES values.
 */
export function detectCategory(name) {
  const n = name.toLowerCase()

  if (/chicken|beef|pork|lamb|turkey|salmon|tuna|shrimp|prawn|bacon|ham|sausage|mince|steak|fillet|duck|veal|cod|tofu|tempeh/.test(n))
    return 'protein'

  if (/milk|cheese|butter|cream|yogurt|yoghurt|egg|parmesan|mozzarella|feta|cheddar|ricotta/.test(n))
    return 'dairy'

  if (/pasta|rice|bread|flour|oat|noodle|quinoa|couscous|tortilla|cracker|cereal|barley|bulgur|rye/.test(n))
    return 'grains'

  if (/frozen|ice cream|peas/.test(n))
    return 'frozen'

  if (/salt|pepper|oil|vinegar|soy|sauce|spice|herb|sugar|honey|syrup|stock|broth|extract|baking|yeast|mustard|ketchup|mayo|paste|powder|seasoning/.test(n))
    return 'pantry'

  return 'produce'
}
