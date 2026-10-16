import { useState, useEffect } from 'react'
import { Clock, ChevronLeft, ExternalLink, ShoppingCart, CheckCircle2, Loader2, UtensilsCrossed, CalendarPlus, ChefHat } from 'lucide-react'
import { getRecipeDetails } from '../../lib/recipeEngine'
import { ingredientMatches } from '../../lib/recipeDb'
import { getMissingTier } from '../../lib/recipeUtils'
import { displayQty } from '../../lib/unitNorm'
import Button from '../ui/Button'
import SaveButton from './SaveButton'
import CookItModal from './CookItModal'
import ServingsScaler from './ServingsScaler'
import BuyIngredientsButton from '../ui/BuyIngredientsButton'
import AddToScheduleModal from './AddToScheduleModal'

function NutrientPill({ label, value }) {
  return (
    <div className="text-center px-4 py-2 rounded-[10px] border-[1.5px]" style={{ borderColor: 'var(--ink)', background: 'var(--surface)' }}>
      <p className="text-[20px] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>{label}</p>
    </div>
  )
}

// Discrete count units — always round UP to 1 minimum (never "0.3 eggs")
const DISCRETE_UNITS = new Set(['piece', 'pieces', '', 'egg', 'eggs', 'slice', 'slices',
  'clove', 'cloves', 'bunch', 'bunches', 'can', 'cans', 'rasher', 'rashers'])

const FRACTIONS = [
  [1, 1, '1'], [3, 4, '3/4'], [2, 3, '2/3'],
  [1, 2, '1/2'], [1, 3, '1/3'], [1, 4, '1/4'], [1, 8, '1/8'],
]

function toFraction(n) {
  if (n === 0) return '0'
  const whole = Math.floor(n)
  const rem   = n - whole
  if (rem < 0.05) return whole > 0 ? String(whole) : ''
  for (const [num, den, label] of FRACTIONS) {
    if (Math.abs(rem - num / den) < 0.08) {
      return whole > 0 ? `${whole} ${label}` : label
    }
  }
  return parseFloat(n.toFixed(1)).toString()
}

/** Scale an ingredient's display quantity by `multiplier`, return formatted string */
function scaledQty(ing, multiplier) {
  if (ing.amount == null) return ''
  const unit   = (ing.unit || '').toLowerCase()
  const scaled = ing.amount * multiplier

  // Discrete units: never go below 1
  const isDiscrete = DISCRETE_UNITS.has(unit)
  const display    = isDiscrete ? Math.max(1, scaled) : scaled

  if (unit && !isDiscrete) return displayQty(display, unit)
  return toFraction(display)
}

export default function RecipeDetail({
  recipe,
  fridgeIngredients,
  fridgeItems = [],
  pantryStaples = [],
  globalServings = null,
  onBack,
  isSaved = false,
  onSave,
  onCook,
  onSchedule,
}) {
  const [detail, setDetail]                 = useState(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [showCookModal, setShowCookModal]   = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [servings, setServings]             = useState(null)  // null = uninitialized

  useEffect(() => {
    setLoading(true)
    setError('')
    setServings(null)

    // If recipe already has full detail (DB source with extendedIngredients), skip round-trip
    const hasDetail = recipe._source === 'db' && recipe.extendedIngredients?.length > 0
    const fetch = hasDetail
      ? Promise.resolve({ detail: recipe, fromDb: true })
      : getRecipeDetails(recipe.id)

    fetch
      .then(({ detail: d }) => {
        setDetail(d)
        setServings(d?.servings || recipe.servings || 4)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [recipe.id])

  const defaultServings  = detail?.servings || recipe.servings || 4
  const currentServings  = globalServings ?? servings ?? defaultServings
  const multiplier       = defaultServings > 0 ? currentServings / defaultServings : 1

  const fridgeNames = fridgeIngredients.map(n => n.toLowerCase())
  const inFridge = (ingName = '') =>
    fridgeNames.some(f => ingredientMatches(f, ingName))

  const steps     = detail?.analyzedInstructions?.[0]?.steps ?? []
  const nutrition = detail?.nutrition?.nutrients ?? []
  const calories  = nutrition.find(n => n.name === 'Calories')
  const protein   = nutrition.find(n => n.name === 'Protein')
  const carbs     = nutrition.find(n => n.name === 'Carbohydrates')
  const fat       = nutrition.find(n => n.name === 'Fat')

  return (
    <div className="fade-in">

      {/* Back */}
      <button onClick={onBack}
              className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
              style={{ color: 'var(--ink-muted)' }}>
        <ChevronLeft size={16} /> Back to results
      </button>

      {/* Hero image */}
      {(recipe.image || detail?.image) && (
        <div className="rounded-[10px] overflow-hidden mb-8"
             style={{ height: 'clamp(180px, 26vw, 320px)', background: 'var(--bg-sunk)', border: '2.5px solid var(--ink)' }}>
          <img src={detail?.image || recipe.image} alt={recipe.title}
               className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title + actions */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-4xl sm:text-5xl leading-[1.05]">
            {recipe.title}
          </h1>
          <div className="flex flex-wrap items-center justify-end gap-2.5 flex-shrink-0 mt-1">
            {onSave && <SaveButton saved={isSaved} onClick={onSave} size="lg" />}
            {onCook && detail && (
              <Button variant="primary" size="sm" onClick={() => setShowCookModal(true)}>
                <UtensilsCrossed size={15} /> I cooked this
              </Button>
            )}
            {onSchedule && (
              <Button variant="secondary" size="sm" onClick={() => setShowScheduleModal(true)}>
                <CalendarPlus size={15} /> Add to schedule
              </Button>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>
          {(recipe.readyInMinutes || detail?.readyInMinutes) && (
            <span className="flex items-center gap-1.5">
              <Clock size={15} /> {recipe.readyInMinutes || detail.readyInMinutes} min
            </span>
          )}
          {detail?.sourceUrl && (
            <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 ml-auto hover:text-[var(--brand)] transition-colors">
              Source <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Servings scaler — shown once detail loads */}
        {detail && (
          <ServingsScaler
            servings={currentServings}
            defaultServings={defaultServings}
            onChange={setServings}
          />
        )}

        {/* Diet tags */}
        {(recipe.diets ?? detail?.diets ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {(recipe.diets ?? detail.diets).map(d => (
              <span key={d} className="text-xs px-3 py-1 rounded-full font-bold capitalize"
                    style={{ background: 'var(--saffron)', color: 'var(--ink)', border: '1.5px solid var(--ink)' }}>
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Nutrition strip */}
      {calories && (
        <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
          <NutrientPill label="Calories" value={Math.round(calories.amount * multiplier)} />
          {protein && <NutrientPill label="Protein" value={`${Math.round(protein.amount * multiplier)}g`} />}
          {carbs   && <NutrientPill label="Carbs"   value={`${Math.round(carbs.amount * multiplier)}g`} />}
          {fat     && <NutrientPill label="Fat"     value={`${Math.round(fat.amount * multiplier)}g`} />}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center" style={{ color: 'var(--ink-muted)' }}>
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading recipe…</span>
        </div>
      )}

      {error && (
        <p className="text-sm py-4" style={{ color: 'var(--danger)' }}>
          Couldn't load details — {error}
        </p>
      )}

      {/* Two-column body */}
      {!loading && detail && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Ingredients */}
          <aside className="lg:col-span-2">
            <h2 className="text-xl mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Ingredients
            </h2>
            {multiplier !== 1 && (
              <p className="text-xs mb-4" style={{ color: 'var(--brand)' }}>
                Scaled for {currentServings} servings
              </p>
            )}
            {(() => {
              const all  = detail.extendedIngredients ?? []
              const have = all.filter(i => inFridge(i.name))
              const need = all.filter(i => !inFridge(i.name))
              return (
                <div className="space-y-5">
                  {have.length > 0 && (
                    <div>
                      <p className="text-[13px] font-medium mb-2"
                         style={{ color: 'var(--fresh)' }}>
                        In your fridge ({have.length})
                      </p>
                      <ul className="space-y-2">
                        {have.map((ing, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0"
                                          style={{ color: 'var(--fresh)' }} />
                            <span style={{ color: 'var(--ink)' }}>
                              {scaledQty(ing, multiplier)
                                ? <><strong>{scaledQty(ing, multiplier)}</strong>{' '}</>
                                : ''}
                              {ing.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {need.length > 0 && (
                    <div>
                      <p className="text-[13px] font-medium mb-2"
                         style={{ color: 'var(--carrot)' }}>
                        Need to buy ({need.length})
                      </p>
                      <ul className="space-y-2">
                        {need
                          .map(ing => ({ ...ing, _tier: getMissingTier(ing.name || ing.original) }))
                          .sort((a, b) => ({ core: 0, supporting: 1, minor: 2 }[a._tier] - { core: 0, supporting: 1, minor: 2 }[b._tier]))
                          .map((ing, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ShoppingCart size={14} className="mt-0.5 flex-shrink-0"
                                            style={{ color: ing._tier === 'core' ? 'var(--danger)' : 'var(--carrot)' }} />
                              <span style={{ color: 'var(--ink-muted)' }}>
                                {scaledQty(ing, multiplier)
                                  ? <><strong style={{ color: 'var(--ink)' }}>{scaledQty(ing, multiplier)}</strong>{' '}</>
                                  : ''}
                                {ing.name}
                                {ing._tier === 'core' && (
                                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded"
                                        style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
                                    essential
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                      </ul>
                      {/* Affiliate buy button for missing items */}
                      <div className="mt-4">
                        <BuyIngredientsButton
                          ingredients={need.map(i => i.name)}
                          variant="inline"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </aside>

          {/* Instructions */}
          <section className="lg:col-span-3">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Instructions
            </h2>
            {steps.length > 0 ? (
              <ol className="space-y-5">
                {steps.map(step => (
                  <li key={step.number} className="flex gap-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
                          style={{ background: 'var(--brand)', marginTop: 2 }}>
                      {step.number}
                    </span>
                    <div>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                        {step.step}
                      </p>
                      {step.equipment?.length > 0 && (
                        <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: 'var(--ink-muted)' }}>
                          <ChefHat size={12} strokeWidth={1.75} /> {step.equipment.map(e => e.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                <p className="mb-3">Full instructions available at the source.</p>
                {detail.sourceUrl && (
                  <Button variant="secondary" onClick={() => window.open(detail.sourceUrl, '_blank')}>
                    <ExternalLink size={14} /> View source
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Add to Schedule modal */}
      {showScheduleModal && (
        <AddToScheduleModal
          recipe={detail ?? recipe}
          onClose={() => setShowScheduleModal(false)}
          onAdd={async (dayIdx, slotType, weekOffset) => {
            await onSchedule?.(dayIdx, slotType, detail ?? recipe, weekOffset)
            setShowScheduleModal(false)
          }}
        />
      )}

      {/* Cook It modal */}
      {showCookModal && detail && (
        <CookItModal
          recipe={recipe}
          recipeDetail={detail}
          fridgeItems={fridgeItems}
          pantryStaples={pantryStaples}
          servingsMultiplier={multiplier}
          onClose={() => setShowCookModal(false)}
          onConfirm={async (plan) => {
            await onCook?.(plan)
            setShowCookModal(false)
          }}
        />
      )}
    </div>
  )
}
