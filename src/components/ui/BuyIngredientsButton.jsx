import { ShoppingBag, ExternalLink } from 'lucide-react'
import { buildAffiliateUrl, activePlatform } from '../../lib/affiliateLinks'

/**
 * BuyIngredientsButton
 *
 * A self-contained affiliate CTA button. Accepts a list of ingredient
 * name strings, builds the affiliate URL, and opens it in a new tab.
 *
 * Props:
 *   ingredients  {string[]}  — plain ingredient names to order
 *   variant      'banner' | 'inline' | 'compact'
 *     banner  — full-width card with description (ShoppingList bottom)
 *     inline  — medium pill button (RecipeDetail missing-items section)
 *     compact — small icon+text (RecipePreviewModal)
 *   label        optional override text
 *   className    extra classes
 */
export default function BuyIngredientsButton({
  ingredients = [],
  variant = 'inline',
  label,
  className = '',
}) {
  const url = buildAffiliateUrl(ingredients)

  // Nothing to buy → render nothing (don't show a broken button)
  if (!url || ingredients.length === 0) return null

  const { name, logo, color } = activePlatform
  const count = ingredients.length

  const handleClick = () => {
    // rel="noopener noreferrer" is mandatory for security on target="_blank"
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ── Banner variant (ShoppingList bottom) ───────────────────────────────────
  if (variant === 'banner') {
    return (
      <div
        className={`rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${className}`}
        style={{
          background:   '#F0FDF4',
          border:       `1px solid #BBF7D0`,
          boxShadow:    '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Left: icon + copy */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0 mt-0.5">🛒</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Order missing ingredients online
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              {count} item{count !== 1 ? 's' : ''} ready to search on{' '}
              <span style={{ color, fontWeight: 500 }}>{name}</span>
              {' '}— we earn a small commission at no extra cost to you.
            </p>
          </div>
        </div>

        {/* CTA button */}
        <button
          onClick={handleClick}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[.98]"
          style={{
            background: color,
            color:      'white',
            boxShadow:  `0 2px 8px ${color}40`,
          }}
        >
          <ShoppingBag size={15} />
          {label || `Order on ${name}`}
          <ExternalLink size={12} style={{ opacity: 0.7 }} />
        </button>
      </div>
    )
  }

  // ── Inline variant (RecipeDetail) ──────────────────────────────────────────
  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[.98] ${className}`}
        style={{
          background: `${color}15`,
          border:     `1px solid ${color}40`,
          color:      color,
        }}
      >
        <ShoppingBag size={15} />
        {label || `Buy ${count} missing item${count !== 1 ? 's' : ''} on ${name}`}
        <ExternalLink size={12} style={{ opacity: 0.6 }} />
      </button>
    )
  }

  // ── Compact variant (RecipePreviewModal) ────────────────────────────────────
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-[.98] ${className}`}
      style={{
        background: `${color}12`,
        border:     `1px solid ${color}35`,
        color:      color,
      }}
    >
      <ShoppingBag size={12} />
      {label || `Order ${count} item${count !== 1 ? 's' : ''}`}
      <ExternalLink size={10} style={{ opacity: 0.6 }} />
    </button>
  )
}
