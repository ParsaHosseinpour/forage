import { Clock, Users } from 'lucide-react'
import SaveButton from './SaveButton'
import Produce, { produceKey } from '../ui/Produce'

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
            className="meter-seg h-2.5 flex-1 rounded-[3px]"
            style={{
              '--i': i,
              background:  i < filled ? 'var(--fresh)' : 'transparent',
              boxShadow:   i < filled ? 'inset 0 0 0 1.5px var(--ink)' : 'inset 0 0 0 1.5px var(--carrot-soft)',
            }}
          />
        ))}
      </div>
      <p className="text-sm mt-1.5 tabular-nums" style={{ color: missed === 0 ? 'var(--fresh)' : 'var(--ink-muted)', fontWeight: missed === 0 ? 600 : 500 }}>
        {label}
      </p>
    </div>
  )
}

export function RecipeCardSkeleton() {
  return (
    <div>
      <div className="aspect-[4/3] rounded-[10px] animate-pulse" style={{ background: 'var(--bg-sunk)' }} />
      <div className="pt-3.5 space-y-3">
        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-sunk)', width: '80%' }} />
        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-sunk)', width: '55%' }} />
        <div className="h-2 rounded animate-pulse mt-4" style={{ background: 'var(--bg-sunk)' }} />
      </div>
    </div>
  )
}

/**
 * RecipeCard — an editorial tile, not a box: framed photo, serif title,
 * the ingredient meter underneath. The photo and the title are separate
 * buttons so the save button is never nested inside another button.
 */
export default function RecipeCard({ recipe, onClick, isSaved = false, onSave }) {
  const used   = recipe.usedIngredientCount   ?? recipe.usedIngredients?.length   ?? 0
  const missed = recipe.missedIngredientCount ?? recipe.missedIngredients?.length ?? 0
  const open   = () => onClick(recipe)

  return (
    <article className="group">
      <div className="relative">
        <button onClick={open} className="block w-full text-left" aria-label={`View recipe: ${recipe.title}`} tabIndex={-1}>
          <div
            className="aspect-[4/3] overflow-hidden rounded-[10px] grid place-items-center"
            style={{ background: 'var(--bg-sunk)', border: '2px solid var(--ink)' }}
          >
            {recipe.image
              ? <img src={recipe.image} alt="" loading="lazy" className="w-full h-full object-cover" />
              : <Produce name={produceKey(recipe.title) ?? 'Tomatoes'} size={84} />}
          </div>
        </button>

        {recipe.diets?.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 pointer-events-none">
            {recipe.diets.slice(0, 2).map(d => (
              <span key={d} className="text-xs px-2.5 py-0.5 rounded-full font-bold capitalize"
                    style={{ background: 'var(--saffron)', color: 'var(--ink)', border: '1.5px solid var(--ink)' }}>
                {d}
              </span>
            ))}
          </div>
        )}

        {onSave && (
          <div className="absolute top-2.5 right-2.5">
            <SaveButton saved={isSaved} onClick={onSave} size="sm" />
          </div>
        )}
      </div>

      <button onClick={open} className="block w-full text-left mt-3.5">
        <h3 className="text-[22px] leading-[1.15] mb-1.5 line-clamp-2 group-hover:underline decoration-2 underline-offset-4">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--ink-muted)' }}>
          {recipe.readyInMinutes && (
            <span className="flex items-center gap-1.5"><Clock size={14} strokeWidth={1.75} /> {recipe.readyInMinutes} min</span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1.5"><Users size={14} strokeWidth={1.75} /> {recipe.servings}</span>
          )}
        </div>
      </button>

      <div className="mt-3">
        <IngredientMeter used={used} missed={missed} />
      </div>
    </article>
  )
}
