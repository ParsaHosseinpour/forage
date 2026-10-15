import { Clock, Users, UtensilsCrossed } from 'lucide-react'
import SaveButton from './SaveButton'

const MAX_SEGMENTS = 12

/**
 * IngredientMeter — one segment per ingredient. Green = in your fridge,
 * carrot outline = still to buy. Replaces the old "72% match" pill with the
 * actual shape of the shopping gap.
 */
function IngredientMeter({ used, missed }) {
  const total = used + missed
  if (total === 0) return null

  // Long ingredient lists are scaled down so segments stay legible.
  const segs   = Math.min(total, MAX_SEGMENTS)
  const filled = total <= MAX_SEGMENTS ? used : Math.round((used / total) * MAX_SEGMENTS)

  const label = missed === 0
    ? 'Everything is in your fridge'
    : `${used} of ${total} in your fridge`

  return (
    <div className="min-w-0 flex-1">
      <div
        className="flex gap-[3px]"
        role="img"
        aria-label={label}
      >
        {Array.from({ length: segs }, (_, i) => (
          <span
            key={i}
            className="meter-seg h-2 flex-1 rounded-[2px]"
            style={{
              '--i': i,
              background:  i < filled ? 'var(--fresh)' : 'transparent',
              boxShadow:   i < filled ? 'none' : 'inset 0 0 0 1.5px var(--carrot-soft)',
            }}
          />
        ))}
      </div>
      <p className="text-[13px] mt-1.5 tabular-nums" style={{ color: missed === 0 ? 'var(--fresh)' : 'var(--ink-muted)', fontWeight: missed === 0 ? 600 : 500 }}>
        {label}
      </p>
    </div>
  )
}

export function RecipeCardSkeleton() {
  return (
    <div className="rounded-[14px] border overflow-hidden"
         style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="h-44 animate-pulse" style={{ background: 'var(--bg-sunk)' }} />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-sunk)', width: '80%' }} />
        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-sunk)', width: '55%' }} />
        <div className="h-2 rounded animate-pulse mt-4" style={{ background: 'var(--bg-sunk)' }} />
      </div>
    </div>
  )
}

/**
 * RecipeCard — two separate interactive regions so the save button is never
 * nested inside another <button> (invalid HTML, breaks on mobile).
 */
export default function RecipeCard({ recipe, onClick, isSaved = false, onSave }) {
  const used   = recipe.usedIngredientCount   ?? recipe.usedIngredients?.length   ?? 0
  const missed = recipe.missedIngredientCount ?? recipe.missedIngredients?.length ?? 0

  return (
    <div
      className="group rounded-[14px] border overflow-hidden transition-colors duration-150 hover:border-[var(--brand)]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => onClick(recipe)}
        className="block w-full text-left"
        aria-label={`View recipe: ${recipe.title}`}
      >
        {/* Image */}
        <div className="h-44 overflow-hidden relative" style={{ background: 'var(--bg-sunk)' }}>
          {recipe.image
            ? <img
                src={recipe.image}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            : <div className="w-full h-full flex items-center justify-center">
                <UtensilsCrossed size={28} strokeWidth={1.5} style={{ color: 'var(--ink-muted)', opacity: 0.5 }} />
              </div>
          }

          {recipe.diets?.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
              {recipe.diets.slice(0, 2).map(d => (
                <span
                  key={d}
                  className="text-xs px-2 py-0.5 rounded-[6px] font-semibold capitalize"
                  style={{ background: 'var(--surface)', color: 'var(--ink)' }}
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="px-4 pt-3.5 pb-3">
          <h3
            className="text-[17px] leading-snug mb-1.5 line-clamp-2"
            style={{ fontWeight: 650, fontVariationSettings: "'wdth' 96" }}
          >
            {recipe.title}
          </h3>
          <div className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--ink-muted)' }}>
            {recipe.readyInMinutes && (
              <span className="flex items-center gap-1">
                <Clock size={13} strokeWidth={1.75} /> {recipe.readyInMinutes} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users size={13} strokeWidth={1.75} /> {recipe.servings}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Footer: meter + save (plain div, not a button) */}
      <div className="flex items-center gap-4 px-4 pb-4">
        <IngredientMeter used={used} missed={missed} />
        {onSave && (
          <SaveButton
            saved={isSaved}
            onClick={onSave}
            size="sm"
            aria-label={isSaved ? 'Remove from saved' : 'Save recipe'}
          />
        )}
      </div>
    </div>
  )
}
