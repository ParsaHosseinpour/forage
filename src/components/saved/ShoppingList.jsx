import { useState, useMemo } from 'react'
import { Check, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, ShoppingBasket, PartyPopper } from 'lucide-react'
import Button from '../ui/Button'
import BuyIngredientsButton from '../ui/BuyIngredientsButton'
import { getOrderableItems } from '../../lib/affiliateLinks'
import { IconTile } from '../ui/glyphs'

// ── Single ingredient row ─────────────────────────────────────────────────────

function IngRow({ ing, isChecked, onToggle, showingFridgeItems }) {
  const key     = ing.name.toLowerCase()
  const ticked  = isChecked(ing.name)
  const inFridge = ing._inFridge

  // When showingFridgeItems is false, fridge items are hidden entirely
  if (inFridge && !showingFridgeItems) return null

  return (
    <li
      onClick={() => !inFridge && onToggle(ing.name)}
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-150"
      style={{
        cursor:     inFridge ? 'default' : 'pointer',
        background: inFridge ? 'var(--brand-tint)'
                  : ticked   ? 'var(--bg-sunk)'
                  :             'white',
        border:    '1px solid var(--border)',
        opacity:   (ticked && !inFridge) ? 0.55 : 1,
      }}
    >
      {/* Checkbox */}
      <div
        className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all"
        style={{
          background:  inFridge ? 'var(--fresh)'
                     : ticked   ? 'var(--ink-muted)'
                     :             'white',
          borderColor: inFridge ? 'var(--fresh)'
                     : ticked   ? 'var(--ink-muted)'
                     :             'var(--border)',
        }}
      >
        {(ticked || inFridge) && <Check size={10} strokeWidth={3} style={{ color: 'white' }} />}
      </div>

      {/* Text */}
      <span
        className="text-sm flex-1 min-w-0 truncate"
        style={{
          color:          inFridge ? 'var(--fresh)'
                        : ticked   ? 'var(--ink-muted)'
                        :             'var(--ink)',
          textDecoration: ticked && !inFridge ? 'line-through' : 'none',
          fontWeight:     inFridge ? 500 : 400,
        }}
      >
        {ing.original || ing.name}
      </span>

      {/* "In fridge" badge */}
      {inFridge && (
        <span className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded"
              style={{ background: 'var(--fresh-soft)', color: 'var(--fresh)' }}>
          In fridge
        </span>
      )}
    </li>
  )
}

// ── Per-recipe section ────────────────────────────────────────────────────────

function RecipeSection({ title, ingredients, isChecked, onToggle, showingFridgeItems }) {
  const [collapsed, setCollapsed] = useState(false)

  const visibleCount = ingredients.filter(i => !i._inFridge || showingFridgeItems).length
  const needCount    = ingredients.filter(i => !i._inFridge).length
  const haveCount    = ingredients.filter(i =>  i._inFridge).length
  const allTicked    = needCount > 0 && ingredients.filter(i => !i._inFridge).every(i => isChecked(i.name))

  if (visibleCount === 0 && !showingFridgeItems) return null

  return (
    <section className="rounded-2xl border overflow-hidden"
             style={{ background: 'white', borderColor: 'var(--border)' }}>

      {/* Section header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: allTicked ? 'var(--brand-tint)' : 'white' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {allTicked && <Check size={14} style={{ color: 'var(--fresh)', flexShrink: 0 }} />}
          <span className="text-sm font-medium truncate" style={{ color: allTicked ? 'var(--brand)' : 'var(--ink)' }}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {needCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-sunk)', color: 'var(--ink-muted)' }}>
              {needCount} needed
            </span>
          )}
          {haveCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>
              {haveCount} in fridge
            </span>
          )}
          {collapsed
            ? <ChevronDown size={15} style={{ color: 'var(--ink-muted)' }} />
            : <ChevronUp   size={15} style={{ color: 'var(--ink-muted)' }} />}
        </div>
      </button>

      {/* Ingredient list */}
      {!collapsed && (
        <ul className="px-3 pb-3 space-y-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="pt-2" />
          {ingredients.map((ing, i) => (
            <IngRow key={`${ing.name}-${i}`} ing={ing}
                    isChecked={isChecked} onToggle={onToggle}
                    showingFridgeItems={showingFridgeItems} />
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ShoppingList({
  byRecipe,
  need = [], have = [],
  isChecked, onToggle, onClearAll, checkedCount, loading,
}) {
  const [showFridgeItems, setShowFridgeItems] = useState(false)

  // Items that are visible, not checked off, not already in fridge
  const orderableItems = useMemo(
    () => getOrderableItems(need, isChecked),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [need, isChecked]
  )

  const totalNeed   = need.length
  const totalHave   = have.length
  const allTicked   = totalNeed > 0 && checkedCount === totalNeed

  if (loading) {
    return (
      <div className="space-y-3 mt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse"
               style={{ background: 'var(--bg-sunk)', animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    )
  }

  if (!byRecipe || byRecipe.size === 0) {
    return (
      <div className="text-center py-16 fade-in">
        <IconTile Icon={ShoppingBasket} />
        <h3 className="text-xl mb-2">Your list is empty</h3>
        <p className="text-[15px]" style={{ color: 'var(--ink-muted)' }}>
          Save a recipe and its ingredients show up here, grouped by dish.
        </p>
      </div>
    )
  }

  if (allTicked) {
    return (
      <div className="text-center py-16 fade-in">
        <IconTile Icon={PartyPopper} tone="fresh" />
        <h3 className="text-xl mb-2">You have everything</h3>
        <p className="text-[15px] mb-6" style={{ color: 'var(--ink-muted)' }}>
          All {totalNeed} item{totalNeed !== 1 ? 's' : ''} checked off. Time to cook.
        </p>
        <Button variant="secondary" onClick={onClearAll}>
          <Trash2 size={14} /> Clear list
        </Button>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-6">

      {/* Summary bar + toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            {totalNeed - checkedCount}
          </span>
          {' '}item{totalNeed - checkedCount !== 1 ? 's' : ''} to buy
          {totalHave > 0 && (
            <span> · <span style={{ color: 'var(--brand)' }}>{totalHave} already in fridge</span></span>
          )}
        </p>

        <div className="flex items-center gap-4">
          {/* Fridge-items toggle */}
          {totalHave > 0 && (
            <button
              onClick={() => setShowFridgeItems(v => !v)}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: showFridgeItems ? 'var(--brand)' : 'var(--ink-muted)' }}
            >
              {showFridgeItems
                ? <><EyeOff size={13} /> Hide fridge items</>
                : <><Eye    size={13} /> Show items I already have</>}
            </button>
          )}
          {checkedCount > 0 && (
            <button onClick={onClearAll} className="text-xs transition-colors"
                    style={{ color: 'var(--ink-muted)' }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Per-recipe sections */}
      <div className="space-y-3">
        {[...byRecipe.entries()].map(([title, ingredients]) => (
          <RecipeSection
            key={title}
            title={title}
            ingredients={ingredients}
            isChecked={isChecked}
            onToggle={onToggle}
            showingFridgeItems={showFridgeItems}
          />
        ))}
      </div>

      {/* Affiliate buy banner — only shown when there are unchecked, non-fridge items */}
      {orderableItems.length > 0 && (
        <BuyIngredientsButton
          ingredients={orderableItems}
          variant="banner"
        />
      )}

    </div>
  )
}
