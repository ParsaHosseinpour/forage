import { useState } from 'react'
import { ShoppingBag, ChevronDown, ChevronUp, Copy, Check, ShoppingCart } from 'lucide-react'
import { buildItemLinks, enabledPlatforms, copyIngredientName } from '../../lib/affiliateLinks'

/**
 * BuyIngredientsButton (v3)
 *
 * Each platform button now respects platform.deepLinkable:
 *   true  (Amazon, Walmart, Google Shopping) → click opens a pre-filled
 *         search for that exact ingredient, directly.
 *   false (Instacart, for now) → no reliable pre-filled search exists
 *         without Instacart's currently-closed Developer Platform API.
 *         Click copies the ingredient name to the clipboard AND opens
 *         Instacart's homepage, with a brief "Copied!" confirmation so
 *         the user can just paste it into Instacart's own search bar.
 *
 * Props:
 *   ingredients  {string[]}  — plain ingredient names to order
 *   variant      'banner' | 'inline' | 'compact'
 *   className    extra classes
 */
export default function BuyIngredientsButton({
  ingredients = [],
  variant = 'inline',
  className = '',
}) {
  const [expanded, setExpanded] = useState(variant !== 'banner')
  const [copiedKey, setCopiedKey] = useState(null) // `${itemName}-${platformKey}`

  const itemLinks = buildItemLinks(ingredients)
  if (itemLinks.length === 0) return null

  const count = itemLinks.length

  const handleClick = async (platform, url, itemName) => {
    if (platform.deepLinkable) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    // Non-deep-linkable: copy the name, show feedback, then open the
    // platform's safe homepage so the user can paste it into search.
    const ok = await copyIngredientName(itemName)
    if (ok) {
      const key = `${itemName}-${platform.key}`
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1800)
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ── Shared: per-ingredient row with one button per platform ────────────────
  const ItemRow = ({ item, size = 'sm' }) => (
    <div
      className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg"
      style={{ background: 'white', border: '1px solid var(--border)' }}
    >
      <span
        className="truncate"
        style={{ color: 'var(--ink)', fontSize: size === 'sm' ? '0.75rem' : '0.8125rem' }}
      >
        {item.name}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {item.links.map(({ platform, url }) => {
          const key      = `${item.name}-${platform.key}`
          const isCopied = copiedKey === key
          return (
            <button
              key={platform.key}
              onClick={() => handleClick(platform, url, item.name)}
              title={
                platform.deepLinkable
                  ? `Search "${item.name}" on ${platform.name}`
                  : `Copy "${item.name}" and open ${platform.name}`
              }
              className="flex items-center justify-center gap-1 rounded-md transition-transform active:scale-90"
              style={{
                width:      isCopied ? 'auto' : (size === 'sm' ? 22 : 26),
                height:     size === 'sm' ? 22 : 26,
                padding:    isCopied ? '0 6px' : 0,
                background: isCopied ? 'var(--brand-tint)' : `${platform.color}15`,
                fontSize:   size === 'sm' ? '0.7rem' : '0.8rem',
              }}
            >
              {isCopied
                ? <><Check size={11} style={{ color: 'var(--fresh)' }} />
                    <span style={{ color: 'var(--brand)', fontSize: '0.65rem' }}>Copied</span></>
                : <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: platform.color }} />}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Banner variant (ShoppingList bottom) ───────────────────────────────────
  if (variant === 'banner') {
    return (
      <div
        className={`rounded-2xl p-5 ${className}`}
        style={{ background: 'var(--fresh-tint)', border: '1px solid var(--fresh-soft)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-3 text-left">
          <ShoppingCart size={22} strokeWidth={1.75} className="flex-shrink-0" style={{ color: 'var(--fresh)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Order missing ingredients online
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              {count} item{count !== 1 ? 's' : ''} · Amazon searches open pre-filled · Instacart copies
              the name for you to paste — we may earn a small commission, at no extra cost to you.
            </p>
          </div>
          {expanded
            ? <ChevronUp size={16} style={{ color: 'var(--ink-muted)' }} />
            : <ChevronDown size={16} style={{ color: 'var(--ink-muted)' }} />}
        </button>

        {expanded && (
          <>
            <div className="flex items-center gap-3 mt-4 mb-2 px-0.5">
              {enabledPlatforms.map(p => (
                <span key={p.key} className="flex items-center gap-1.5 text-xs" style={{ color: p.color, fontWeight: 600 }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} /> {p.name}
                  {!p.deepLinkable && (
                    <Copy size={10} style={{ color: 'var(--ink-muted)' }} />
                  )}
                </span>
              ))}
            </div>
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
           style={{ background: 'var(--bg-sunk)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag size={13} style={{ color: 'var(--ink-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
            Buy {count} missing item{count !== 1 ? 's' : ''}
          </span>
          <span className="text-xs ml-auto" style={{ color: 'var(--ink-muted)' }}>
            {enabledPlatforms.map(p => <span key={p.key} className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: p.color }} />)}
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
        style={{ background: 'var(--bg-sunk)', color: 'var(--ink)' }}
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
