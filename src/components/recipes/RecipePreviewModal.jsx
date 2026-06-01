import { useState, useEffect } from 'react'
import { X, Clock, Users, CheckCircle2, ShoppingCart, Loader2 } from 'lucide-react'
import { getRecipeDetails } from '../../lib/recipeEngine'
import BuyIngredientsButton from '../ui/BuyIngredientsButton'

// ── Fraction formatter (same logic as RecipeDetail/ServingsScaler) ────────────

function toFraction(n) {
  if (n == null || isNaN(n)) return ''
  if (Number.isInteger(n)) return String(n)
  const frac = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.333: '⅓', 0.667: '⅔', 0.125: '⅛' }
  const whole = Math.floor(n)
  const dec   = parseFloat((n - whole).toFixed(3))
  const f     = frac[dec]
  if (!f) return parseFloat(n.toFixed(1)).toString()
  return whole > 0 ? `${whole}${f}` : f
}

function scaledDisplay(ing, multiplier) {
  if (ing.amount == null) return ing.name
  const scaled = ing.amount * multiplier

  // Discrete items (no unit or 'piece') round up to at least 1
  const discrete = !ing.unit || ing.unit === 'piece'
  const display  = discrete ? Math.max(1, Math.ceil(scaled)) : scaled
  const qty      = toFraction(display)
  const unit     = ing.unit && ing.unit !== 'piece' ? ` ${ing.unit}` : ''
  return `${qty}${unit} ${ing.name}`.trim()
}

export default function RecipePreviewModal({ entry, onClose }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)

  const recipe = entry.recipe_json ?? {}

  useEffect(() => {
    const alreadyFull = recipe._source === 'db' && recipe.extendedIngredients?.length > 0
    const p = alreadyFull
      ? Promise.resolve({ detail: recipe })
      : getRecipeDetails(recipe.id)
    p
      .then(({ detail: d }) => setDetail(d ?? recipe))
      .catch(() => setDetail(recipe))
      .finally(() => setLoading(false))
  }, [recipe.id])

  const defaultServings = detail?.servings || recipe.servings || 4
  const multiplier      = defaultServings > 0 ? defaultServings / defaultServings : 1

  const nutrition = detail?.nutrition?.nutrients ?? []
  const calories  = nutrition.find(n => n.name === 'Calories')
  const protein   = nutrition.find(n => n.name === 'Protein')
  const carbs     = nutrition.find(n => n.name === 'Carbohydrates')
  const fat       = nutrition.find(n => n.name === 'Fat')

  const steps = detail?.analyzedInstructions?.[0]?.steps ?? []
  const ings  = detail?.extendedIngredients ?? recipe.extendedIngredients ?? []

  // Names of ingredients the user doesn't appear to have (no fridge context here, show all)
  const missingNames = ings
    .filter(i => !(i._inFridge))
    .map(i => (i.name || '').trim())
    .filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(28,28,26,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border overflow-hidden slide-up"
        style={{
          background:   'white',
          borderColor:  'var(--border)',
          boxShadow:    'var(--shadow-md)',
          maxHeight:    '92dvh',
          display:      'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b flex-shrink-0"
             style={{ borderColor: 'var(--border)' }}>
          <div className="min-w-0 pr-4">
            <h2 className="text-xl leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              {recipe.title}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
              {recipe.readyInMinutes && (
                <span className="flex items-center gap-1"><Clock size={11} /> {recipe.readyInMinutes} min</span>
              )}
              {defaultServings && (
                <span className="flex items-center gap-1"><Users size={11} /> {defaultServings} servings</span>
              )}
            </div>
          </div>
          <button onClick={onClose}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3"
                 style={{ color: 'var(--ink-muted)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading recipe…</span>
            </div>
          )}

          {!loading && detail && (
            <div className="p-6 space-y-6">

              {/* Hero image */}
              {(recipe.image || detail.image) && (
                <div className="rounded-xl overflow-hidden h-44"
                     style={{ background: 'var(--cream-dark)' }}>
                  <img src={recipe.image || detail.image} alt={recipe.title}
                       className="w-full h-full object-cover" />
                </div>
              )}

              {/* Nutrition strip */}
              {calories && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {[
                    { label: 'Calories', value: Math.round(calories.amount) },
                    protein && { label: 'Protein', value: `${Math.round(protein.amount)}g` },
                    carbs   && { label: 'Carbs',   value: `${Math.round(carbs.amount)}g`   },
                    fat     && { label: 'Fat',     value: `${Math.round(fat.amount)}g`     },
                  ].filter(Boolean).map(({ label, value }) => (
                    <div key={label} className="text-center px-3 py-2 rounded-xl flex-shrink-0"
                         style={{ background: 'var(--cream-dark)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Two-column grid on wider screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Ingredients */}
                {ings.length > 0 && (
                  <div>
                    <h3 className="text-base mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Ingredients
                    </h3>
                    <ul className="space-y-1.5">
                      {ings.map((ing, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-xs mt-0.5 flex-shrink-0"
                                style={{ color: 'var(--green)' }}>•</span>
                          <span style={{ color: 'var(--ink)' }}>
                            {scaledDisplay(ing, multiplier)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {missingNames.length > 0 && (
                      <div className="mt-4">
                        <BuyIngredientsButton
                          ingredients={missingNames}
                          variant="compact"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Instructions */}
                {steps.length > 0 && (
                  <div>
                    <h3 className="text-base mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Instructions
                    </h3>
                    <ol className="space-y-3">
                      {steps.map(step => (
                        <li key={step.number} className="flex gap-3">
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white"
                            style={{ background: 'var(--green)', marginTop: 2 }}
                          >
                            {step.number}
                          </span>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                            {step.step}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Fallback when no instructions in DB */}
                {steps.length === 0 && ings.length === 0 && (
                  <div className="sm:col-span-2 text-center py-8">
                    <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                      Full details are on the original recipe page.
                    </p>
                    {detail.sourceUrl && (
                      <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer"
                         className="text-sm mt-2 inline-block underline"
                         style={{ color: 'var(--green)' }}>
                        View recipe →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
