/**
 * Forage — Affiliate Link Engine (v2)
 *
 * IMPORTANT FIX vs v1:
 * v1 joined ALL missing ingredients into a single search query
 * ("chicken breast garlic onion") and sent that as one literal search term.
 * Grocery platforms search for an exact product matching that whole phrase,
 * which almost never exists — so the search returned nothing.
 *
 * v2 builds ONE URL PER INGREDIENT. Each ingredient gets its own clean
 * search link on each platform. This is how every real grocery-affiliate
 * site does it (you can't deep-link a multi-item cart without the
 * platform's approved Shoppable/Partner API, which requires a backend
 * and merchant approval).
 *
 * Architecture:
 *   - Pure functions, no React dependency.
 *   - PLATFORMS defines how to build a ONE-ITEM search URL per provider.
 *   - Enabled platforms + affiliate IDs are read from Vite env vars.
 *
 * Configure in Vercel → Project → Settings → Environment Variables:
 *   VITE_AFFILIATE_PLATFORMS    = "instacart,amazon"   (comma list, order = display order)
 *   VITE_INSTACART_AFFILIATE_ID = your_instacart_partner_id
 *   VITE_AMAZON_AFFILIATE_TAG   = your_amazon_associates_tag
 *   VITE_WALMART_AFFILIATE_ID   = your_walmart_id
 *
 * If unset, defaults to ["instacart", "amazon"] with no tracking ID
 * (still fully functional search links, just unattributed).
 */

// ── Platform definitions ───────────────────────────────────────────────────────
// Each buildUrl() takes ONE ingredient name and returns ONE URL.

const PLATFORMS = {
  instacart: {
    key:   'instacart',
    name:  'Instacart',
    logo:  '🛒',
    color: '#43B02A',
    buildUrl(ingredientName, affiliateId) {
      const params = new URLSearchParams({
        utm_source:   affiliateId || 'forage_app',
        utm_medium:   'affiliate',
        utm_campaign: 'missing_ingredient',
      })
      // Instacart's public store search — single term, no login required
      return `https://www.instacart.com/store/search_v3/term?term=${encodeURIComponent(ingredientName)}&${params}`
    },
  },

  amazon: {
    key:   'amazon',
    name:  'Amazon',
    logo:  '📦',
    color: '#FF9900',
    buildUrl(ingredientName, affiliateTag) {
      const params = new URLSearchParams({
        k: ingredientName,
        i: 'grocery', // narrow to grocery department so results are relevant
      })
      const base = `https://www.amazon.com/s?${params}`
      // Associates tag must be a bare, unencoded query param
      return affiliateTag ? `${base}&tag=${encodeURIComponent(affiliateTag)}` : base
    },
  },

  walmart: {
    key:   'walmart',
    name:  'Walmart',
    logo:  '🏪',
    color: '#0071CE',
    buildUrl(ingredientName, affiliateId) {
      const params = new URLSearchParams({ q: ingredientName })
      if (affiliateId) params.set('affiliateId', affiliateId)
      return `https://www.walmart.com/search?${params}`
    },
  },

  google_shopping: {
    key:   'google_shopping',
    name:  'Google Shopping',
    logo:  '🔍',
    color: '#4285F4',
    buildUrl(ingredientName, _affiliateId) {
      const params = new URLSearchParams({ q: ingredientName, tbm: 'shop' })
      return `https://www.google.com/search?${params}`
    },
  },
}

// ── Config (env vars, with sane defaults) ──────────────────────────────────────

const ENABLED_KEYS = (import.meta.env.VITE_AFFILIATE_PLATFORMS || 'instacart,amazon')
  .split(',')
  .map(s => s.trim())
  .filter(k => PLATFORMS[k])

const AFFILIATE_IDS = {
  instacart: import.meta.env.VITE_INSTACART_AFFILIATE_ID || '',
  amazon:    import.meta.env.VITE_AMAZON_AFFILIATE_TAG    || '',
  walmart:   import.meta.env.VITE_WALMART_AFFILIATE_ID    || '',
  google_shopping: '',
}

/** Ordered list of active platform configs (at least one, falls back to Instacart) */
export const enabledPlatforms =
  (ENABLED_KEYS.length ? ENABLED_KEYS : ['instacart']).map(k => PLATFORMS[k])

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Build a single search URL for ONE ingredient on ONE platform.
 * @param {string} platformKey — 'instacart' | 'amazon' | 'walmart' | 'google_shopping'
 * @param {string} ingredientName
 * @returns {string|null}
 */
export function buildItemUrl(platformKey, ingredientName) {
  const name = (ingredientName || '').trim()
  if (!name) return null
  const platform = PLATFORMS[platformKey]
  if (!platform) return null
  return platform.buildUrl(name, AFFILIATE_IDS[platformKey])
}

/**
 * Build per-ingredient link sets across all enabled platforms.
 *
 * @param {string[]} ingredientNames
 * @returns {Array<{ name: string, links: Array<{ platform: object, url: string }> }>}
 */
export function buildItemLinks(ingredientNames) {
  return ingredientNames
    .map(n => (n || '').trim())
    .filter(Boolean)
    .map(name => ({
      name,
      links: enabledPlatforms.map(platform => ({
        platform,
        url: platform.buildUrl(name, AFFILIATE_IDS[platform.key]),
      })),
    }))
}

/**
 * Compute the "actionable missing" items from a ShoppingList `need` array.
 * Items that are not already in the fridge and not checked off.
 *
 * @param {object[]} needItems — from useShoppingList().need
 * @param {Function} isChecked — (name: string) => boolean
 * @returns {string[]} ingredient names to order
 */
export function getOrderableItems(needItems, isChecked) {
  return needItems
    .filter(item => !item._inFridge && !isChecked(item.name))
    .map(item => item.name)
}
