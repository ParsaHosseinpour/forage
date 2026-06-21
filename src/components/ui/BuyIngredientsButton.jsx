import { useState } from 'react'
import { ShoppingBag, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { buildItemLinks, enabledPlatforms } from '../../lib/affiliateLinks'

/**
 * BuyIngredientsButton (v2)
 *
 * Fix: previously this built ONE search query out of ALL ingredients joined
 * together ("chicken breast garlic onion"), which platforms treat as one
 * literal phrase and almost never return results for. Now every ingredient
 * gets its OWN clean one-item search link, on every enabled platform
 * (Instacart + Amazon by default — configurable via env vars).
 *
 * Props:
 *   ingredients  {string[]}  — plain ingredient names to order
 *   variant      'banner' | 'inline' | 'compact'
 *     banner  — full card: platform logos + expandable per-item link list
 *     inline  — compact card with platform pills (RecipeDetail)
 *     compact — small expandable list (RecipePreviewModal)
 *   className    extra classes
 */
export default function BuyIngredientsButton({
  ingredients = [],
  variant = 'inline',
  className = '',
}) {
  const [expanded, setExpanded] = useState(variant !== 'banner')

  const itemLinks = buildItemLinks(ingredients)
  if (itemLinks.length === 0) return null

  const openLink = (url) => window.open(url, '_blank', 'noopener,noreferrer')
  const count = itemLinks.length

  // ── Shared: per-ingredient row with one button per platform ────────────────
  const ItemRow = ({ item, size = 'sm' }) => (
    <div
      className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg"
      style={{ background: 'white', border: '1px solid var(--border)' }}
    >
      <span
        className="truncate"
        style={{
          color: 'var(--ink)',
          fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
        }}
      >
        {item.name}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {item.links.map(({ platform, url }) => (
          <button
            key={platform.key}
            onClick={() => openLink(url)}
            title={`Search "${item.name}" on ${platform.name}`}
            className="flex items-center justify-center rounded-md transition-transform active:scale-90"
            style={{
              width:      size === 'sm' ? 22 : 26,
              height:     size === 'sm' ? 22 : 26,
              background: `${platform.color}15`,
              fontSize:   size === 'sm' ? '0.7rem' : '0.8rem',
            }}
          >
            {platform.logo}
          </button>
        ))}
      </div>
    </div>
  )

  // ── Banner variant (ShoppingList bottom) ───────────────────────────────────
  if (variant === 'banner') {
    return (
      <div
        className={`rounded-2xl p-5 ${className}`}
        style={{
          background: '#F0FDF4',
          border:     '1px solid #BBF7D0',
          boxShadow:  '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header row */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-3 text-left"
        >
          <span className="text-2xl flex-shrink-0">🛒</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Order missing ingredients online
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              {count} item{count !== 1 ? 's' : ''} · click an item below to search it on{' '}
              {enabledPlatforms.map(p => p.name).join(' or ')}
              {' '}— we may earn a small commission, at no extra cost to you.
            </p>
          </div>
          {expanded
            ? <ChevronUp size={16} style={{ color: 'var(--ink-muted)' }} />
            : <ChevronDown size={16} style={{ color: 'var(--ink-muted)' }} />}
        </button>

        {/* Platform legend */}
        {expanded && (
          <>
            <div className="flex items-center gap-3 mt-4 mb-2 px-0.5">
              {enabledPlatforms.map(p => (
                <span key={p.key} className="flex items-center gap-1.5 text-xs"
                      style={{ color: p.color, fontWeight: 600 }}>
                  <span>{p.logo}</span> {p.name}
                </span>
              ))}
            </div>

            {/* Per-ingredient link list */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {itemLinks.map(item => (
                <ItemRow key={item.name} item={item} size="md" />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Inline variant (RecipeDetail) ──────────────────────────────────────────
  if (variant === 'inline') {
    return (
      <div className={`rounded-xl p-3 ${className}`}
           style={{ background: 'var(--cream-dark)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag size={13} style={{ color: 'var(--ink-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
            Buy {count} missing item{count !== 1 ? 's' : ''}
          </span>
          <span className="text-xs ml-auto" style={{ color: 'var(--ink-muted)' }}>
            {enabledPlatforms.map(p => p.logo).join(' ')}
          </span>
        </div>
        <div className="space-y-1.5">
          {itemLinks.map(item => (
            <ItemRow key={item.name} item={item} size="sm" />
          ))}
        </div>
      </div>
    )
  }

  // ── Compact variant (RecipePreviewModal) ────────────────────────────────────
  return (
    <div className={className}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{ background: 'var(--cream-dark)', color: 'var(--ink)' }}
      >
        <ShoppingBag size={12} />
        Buy {count} item{count !== 1 ? 's' : ''}
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {expanded && (
        <div className="space-y-1 mt-2">
          {itemLinks.map(item => (
            <ItemRow key={item.name} item={item} size="sm" />
          ))}
        </div>
      )}
    </div>
  )
}
