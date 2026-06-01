/**
 * Forage — Affiliate Link Engine
 *
 * Builds affiliate/referral tracking URLs for online grocery platforms.
 *
 * Architecture:
 *   - Pure functions, no side effects, no React dependency.
 *   - Each PLATFORM entry defines how to turn an ingredient list into a URL.
 *   - The active platform + affiliate ID are read from Vite env vars so
 *     Parsa can swap them from the Vercel dashboard with no code changes.
 *
 * To configure:
 *   Add to Vercel environment variables:
 *     VITE_AFFILIATE_PLATFORM  = "instacart" | "amazon_fresh" | "walmart"
 *     VITE_AFFILIATE_ID        = your_affiliate_or_partner_id
 *
 * How each platform works:
 *   Instacart   — deeplink to /store/search?q=<ingredient>&utm_source=<id>
 *   Amazon Fresh — /fresh/s?k=<ingredients>&tag=<affiliate_id>
 *   Walmart Grocery — /search?q=<ingredient>&affiliateId=<id>
 *
 * For multi-ingredient carts that deep-link directly into a pre-filled
 * cart (Instacart's "shoppable" API requires merchant approval), the
 * fallback is a search page for the first ingredient plus the full list
 * as a query note — this keeps zero backend required.
 */

// ── Platform definitions ───────────────────────────────────────────────────────

const PLATFORMS = {
  instacart: {
    name:    'Instacart',
    logo:    '🛒',
    color:   '#43B02A',
    /**
     * Instacart deep search link.
     * One URL per ingredient is ideal but we generate one aggregated search
     * for the first 3 items (most important) to keep the link short and
     * shareable. utm_source carries the partner ID for attribution.
     */
    buildUrl(ingredients, affiliateId) {
      if (!ingredients.length) return null
      // Take up to the first 3 items for the search query
      const query = ingredients.slice(0, 3).join(' ')
      const params = new URLSearchParams({
        q:          query,
        utm_source: affiliateId || 'forage_app',
        utm_medium: 'affiliate',
        utm_campaign: 'missing_ingredients',
      })
      return `https://www.instacart.com/store/s?${params}`
    },
  },

  amazon_fresh: {
    name:  'Amazon Fresh',
    logo:  '📦',
    color: '#FF9900',
    buildUrl(ingredients, affiliateId) {
      if (!ingredients.length) return null
      const query = ingredients.join(' ')
      const params = new URLSearchParams({ k: query })
      // Amazon Associates tag appended separately (must be bare, no encoding)
      const base = `https://www.amazon.com/s?${params}`
      return affiliateId ? `${base}&tag=${encodeURIComponent(affiliateId)}` : base
    },
  },

  walmart: {
    name:  'Walmart Grocery',
    logo:  '🏪',
    color: '#0071CE',
    buildUrl(ingredients, affiliateId) {
      if (!ingredients.length) return null
      const query = ingredients.join(' ')
      const params = new URLSearchParams({ q: query })
      if (affiliateId) params.set('affiliateId', affiliateId)
      return `https://www.walmart.com/search?${params}`
    },
  },

  // Generic fallback — Google Shopping search, no affiliate tracking
  google_shopping: {
    name:  'Google Shopping',
    logo:  '🔍',
    color: '#4285F4',
    buildUrl(ingredients, _affiliateId) {
      if (!ingredients.length) return null
      const query = ingredients.join(' ')
      const params = new URLSearchParams({ q: query, tbm: 'shop' })
      return `https://www.google.com/search?${params}`
    },
  },
}

// ── Config (read from env vars) ────────────────────────────────────────────────

const ACTIVE_PLATFORM_KEY = import.meta.env.VITE_AFFILIATE_PLATFORM || 'instacart'
const AFFILIATE_ID        = import.meta.env.VITE_AFFILIATE_ID        || 'forage_app'

export const activePlatform =
  PLATFORMS[ACTIVE_PLATFORM_KEY] ?? PLATFORMS.instacart

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Build the affiliate URL for a list of ingredient name strings.
 *
 * @param {string[]} ingredientNames — plain names, e.g. ['chicken breast', 'garlic']
 * @returns {string | null}          — full URL or null if list is empty
 */
export function buildAffiliateUrl(ingredientNames) {
  const cleaned = ingredientNames
    .map(n => n.trim())
    .filter(Boolean)

  if (!cleaned.length) return null

  return activePlatform.buildUrl(cleaned, AFFILIATE_ID)
}

/**
 * Compute the "actionable missing" items from a ShoppingList `need` array.
 * These are items that:
 *   1. Are not already in the fridge  (_inFridge !== true)
 *   2. Have not been checked off      (isChecked(name) === false)
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
