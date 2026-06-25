/**
 * Forage — Affiliate Link Engine (v3)
 *
 * v2 → v3 FIX: Instacart 403 (CloudFront block)
 * ───────────────────────────────────────────────
 * v2 linked to `/store/search_v3/term` — this is Instacart's INTERNAL
 * data-fetching API endpoint (the same one their own app's JS calls behind
 * the scenes via fetch()), not a real page meant for direct browser
 * navigation. Hitting it directly via window.open (no referrer, no cookies,
 * no session) gets correctly flagged and blocked by their CloudFront bot
 * protection — that's the 403 CloudFront error.
 *
 * The ONLY reliable, supported way to deep-link a working multi-item
 * Instacart shopping list is their Developer Platform (IDP) API — a
 * real server-to-server integration requiring an approved API key.
 * As of this writing, Instacart is NOT accepting new developer
 * applications for that program, so it isn't available to wire up yet.
 *
 * Until that changes, Instacart links here go to their public homepage
 * (guaranteed not to 403 — it's just the root domain) along with a
 * one-click "copy ingredient name" affordance so the user can paste it
 * straight into Instacart's own search bar. Amazon is unaffected — its
 * link uses Amazon's real, public, documented search page and continues
 * to deep-link directly to pre-filled results.
 *
 * Architecture:
 *   - Pure functions, no React dependency.
 *   - Each platform declares `deepLinkable: true/false`.
 *       true  → buildUrl() returns a working pre-filled search URL
 *       false → buildUrl() returns a safe static destination; the UI
 *               should offer a "copy ingredient name" affordance instead
 *   - Enabled platforms + affiliate IDs read from Vite env vars.
 *
 * Configure in Vercel → Project → Settings → Environment Variables:
 *   VITE_AFFILIATE_PLATFORMS    = "instacart,amazon"   (comma list, order = display order)
 *   VITE_AMAZON_AFFILIATE_TAG   = your_amazon_associates_tag
 *   VITE_WALMART_AFFILIATE_ID   = your_walmart_id
 *
 * If unset, defaults to ["instacart", "amazon"].
 */

// ── Platform definitions ───────────────────────────────────────────────────────

const PLATFORMS = {
  instacart: {
    key:   'instacart',
    name:  'Instacart',
    logo:  '🛒',
    color: '#43B02A',
    // No reliable public deep-link exists without an approved IDP API key
    // (applications currently closed). Link to the safe, always-working
    // homepage instead of guessing at internal routes that 403.
    deepLinkable: false,
    buildUrl(_ingredientName, _affiliateId) {
      return 'https://www.instacart.com/'
    },
  },

  amazon: {
    key:   'amazon',
    name:  'Amazon',
    logo:  '📦',
    color: '#FF9900',
    // Amazon's real, public, documented search page — safe to deep-link.
    deepLinkable: true,
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
    deepLinkable: true,
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
    deepLinkable: true,
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
  instacart: '', // no tracking param until a real deep-link integration exists
  amazon:    import.meta.env.VITE_AMAZON_AFFILIATE_TAG  || '',
  walmart:   import.meta.env.VITE_WALMART_AFFILIATE_ID  || '',
  google_shopping: '',
}

/** Ordered list of active platform configs (at least one, falls back to Instacart) */
export const enabledPlatforms =
  (ENABLED_KEYS.length ? ENABLED_KEYS : ['instacart']).map(k => PLATFORMS[k])

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Build a single URL for ONE ingredient on ONE platform.
 * For non-deep-linkable platforms (currently Instacart) this is a static
 * safe destination, not a pre-filled search — pair with copyIngredientName().
 *
 * @param {string} platformKey
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
 * Copy an ingredient name to the clipboard — used as the fallback
 * interaction for platforms that aren't deep-linkable (Instacart).
 * @param {string} text
 * @returns {Promise<boolean>} true on success
 */
export async function copyIngredientName(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
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
