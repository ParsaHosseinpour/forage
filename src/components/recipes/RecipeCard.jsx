import { Clock, Users, ShoppingCart } from 'lucide-react'
import SaveButton from './SaveButton'

function MatchBadge({ used, missed }) {
  const total = used + missed
  if (total === 0) return null
  const pct = Math.round((used / total) * 100)

  const style =
    pct >= 80 ? { bg: 'var(--green-light)',   color: 'var(--green)' } :
    pct >= 50 ? { bg: 'var(--amber-light)',   color: 'var(--amber)' } :
                { bg: '#FEF2F0',              color: 'var(--red-soft)' }

  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: style.bg, color: style.color }}>
      {pct}% match
    </span>
  )
}

// Skeleton card shown while loading
export function RecipeCardSkeleton() {
  return (
    <div className="rounded-2xl border overflow-hidden"
         style={{ background: 'white', borderColor: 'var(--border)' }}>
      <div className="h-44 animate-pulse" style={{ background: 'var(--cream-dark)' }} />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded-lg animate-pulse" style={{ background: 'var(--cream-dark)', width: '80%' }} />
        <div className="h-3 rounded-lg animate-pulse" style={{ background: 'var(--cream-dark)', width: '55%' }} />
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: 'var(--cream-dark)' }} />
          <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'var(--cream-dark)' }} />
        </div>
      </div>
    </div>
  )
}

export default function RecipeCard({ recipe, onClick, isSaved = false, onSave }) {
  const used   = recipe.usedIngredientCount   ?? recipe.usedIngredients?.length   ?? 0
  const missed = recipe.missedIngredientCount ?? recipe.missedIngredients?.length ?? 0

  return (
    <button
      onClick={() => onClick(recipe)}
      className="group text-left rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 active:scale-[.99] focus-visible:ring-2"
      style={{
        background:  'white',
        borderColor: 'var(--border)',
        '--tw-ring-color': 'var(--green)',
      }}
    >
      {/* Image */}
      <div className="h-44 overflow-hidden relative"
           style={{ background: 'var(--cream-dark)' }}>
        {recipe.image
          ? <img
              src={recipe.image}
              alt={recipe.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        }

        {/* Diet badges over image */}
        {recipe.diets?.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {recipe.diets.slice(0, 2).map(d => (
              <span key={d}
                    className="text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.88)', color: 'var(--green)' }}>
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Save button */}
        {onSave && (
          <div className="absolute top-2 right-2">
            <SaveButton saved={isSaved} onClick={onSave} size="sm" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-sm font-medium leading-snug mb-3 line-clamp-2"
            style={{ color: 'var(--ink)' }}>
          {recipe.title}
        </h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
          {recipe.readyInMinutes && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> {recipe.readyInMinutes} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users size={11} /> {recipe.servings}
            </span>
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center justify-between">
          <MatchBadge used={used} missed={missed} />
          {missed > 0 && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
              <ShoppingCart size={11} /> {missed} to buy
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
