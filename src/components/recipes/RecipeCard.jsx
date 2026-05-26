import { Clock, Users, ShoppingCart } from 'lucide-react'
import SaveButton from './SaveButton'

function MatchBadge({ used, missed }) {
  const total = used + missed
  if (total === 0) return null
  const pct = Math.round((used / total) * 100)

  const style =
    pct >= 80 ? { bg: 'var(--green-light)', color: 'var(--green)'    } :
    pct >= 50 ? { bg: 'var(--amber-light)', color: 'var(--amber)'    } :
                { bg: '#FEF2F0',            color: 'var(--red-soft)' }

  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
      style={{ background: style.bg, color: style.color }}
    >
      {pct}% match
    </span>
  )
}

export function RecipeCardSkeleton() {
  return (
    <div className="rounded-2xl border overflow-hidden"
         style={{ background: 'white', borderColor: 'var(--border)' }}>
      <div className="h-44 animate-pulse" style={{ background: 'var(--cream-dark)' }} />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded-lg animate-pulse"
             style={{ background: 'var(--cream-dark)', width: '80%' }} />
        <div className="h-3 rounded-lg animate-pulse"
             style={{ background: 'var(--cream-dark)', width: '55%' }} />
        <div className="flex items-center justify-between pt-1">
          <div className="h-6 w-20 rounded-full animate-pulse"
               style={{ background: 'var(--cream-dark)' }} />
          <div className="h-8 w-8 rounded-full animate-pulse"
               style={{ background: 'var(--cream-dark)' }} />
        </div>
      </div>
    </div>
  )
}

/**
 * RecipeCard — split into two separate interactive regions so the heart
 * button is NEVER nested inside a <button> (invalid HTML, breaks mobile).
 *
 * Structure:
 *   <div card>
 *     <button  ← clickable: opens recipe detail
 *       image + title + meta
 *     </button>
 *     <div footer>           ← NOT a button
 *       match badge  |  ♥ SaveButton   ← always visible, clear tap target
 *     </div>
 *   </div>
 */
export default function RecipeCard({ recipe, onClick, isSaved = false, onSave }) {
  const used   = recipe.usedIngredientCount   ?? recipe.usedIngredients?.length   ?? 0
  const missed = recipe.missedIngredientCount ?? recipe.missedIngredients?.length ?? 0

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
      style={{ background: 'white', borderColor: 'var(--border)' }}
    >
      {/* ── Clickable region: image + content ─────────────────────── */}
      <button
        onClick={() => onClick(recipe)}
        className="block w-full text-left group"
        aria-label={`View recipe: ${recipe.title}`}
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

          {/* Diet badges — top-left */}
          {recipe.diets?.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {recipe.diets.slice(0, 2).map(d => (
                <span
                  key={d}
                  className="text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.88)', color: 'var(--green)' }}
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="px-4 pt-4 pb-3">
          <h3
            className="text-sm font-medium leading-snug mb-2 line-clamp-2"
            style={{ color: 'var(--ink)' }}
          >
            {recipe.title}
          </h3>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--ink-muted)' }}>
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
            {missed > 0 && (
              <span className="flex items-center gap-1">
                <ShoppingCart size={11} /> {missed} to buy
              </span>
            )}
          </div>
        </div>
      </button>

      {/* ── Footer: match badge + heart ─────────────────────────────
           This is a plain <div>, NOT a <button>, so SaveButton is a
           top-level interactive element with a full 34×34 px tap target.
           Always visible — no hover gate, no opacity toggle.          ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <MatchBadge used={used} missed={missed} />

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
