import { useState, useEffect } from 'react'
import { X, Clock, Users, ExternalLink, CheckCircle2, ShoppingCart, Loader2 } from 'lucide-react'
import { getRecipeDetails } from '../../lib/recipeEngine'
import { getMissingTier } from '../../lib/recipeUtils'

// Fraction formatter (same logic as RecipeDetail)
const FRACTIONS = [
  [3, 4, '3/4'], [2, 3, '2/3'], [1, 2, '1/2'],
  [1, 3, '1/3'], [1, 4, '1/4'], [1, 8, '1/8'],
]
const DISCRETE = new Set(['piece','pieces','','egg','eggs','slice','slices','clove','cloves','bunch','bunches','can','cans'])

function toFraction(n) {
  if (!n || n === 0) return '0'
  const whole = Math.floor(n)
  const rem   = n - whole
  if (rem < 0.05) return String(whole)
  for (const [num, den, label] of FRACTIONS) {
    if (Math.abs(rem - num / den) < 0.08) return whole > 0 ? `${whole} ${label}` : label
  }
  return parseFloat(n.toFixed(1)).toString()
}

function fmtQty(amount, unit) {
  if (amount == null) return ''
  const u = (unit || '').toLowerCase()
  const isDiscrete = DISCRETE.has(u)
  const v = isDiscrete ? Math.max(1, amount) : amount
  if (u && !isDiscrete) return `${toFraction(v)} ${u}`
  return toFraction(v)
}

export default function RecipePreviewModal({ recipe: recipeSnap, fridgeIngredients = [], onClose }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    // If the snapshot already has full ingredient detail (DB recipe), use it directly
    const hasDetail = recipeSnap._source === 'db' && recipeSnap.extendedIngredients?.length > 0
    const fetch = hasDetail
      ? Promise.resolve({ detail: recipeSnap })
      : getRecipeDetails(recipeSnap.id)

    fetch
      .then(({ detail: d }) => setDetail(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [recipeSnap.id])

  const fridgeSet = new Set(fridgeIngredients.map(n => n.toLowerCase()))
  const inFridge  = (name = '') => [...fridgeSet].some(f => f.includes(name.toLowerCase()) || name.toLowerCase().includes(f))

  const steps = detail?.analyzedInstructions?.[0]?.steps ?? []
  const servings = detail?.servings || recipeSnap.servings || 4

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(43,29,58,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border overflow-hidden slide-up"
        style={{
          background:    'white',
          borderColor:   'var(--border)',
          boxShadow:     'var(--shadow-md)',
          maxHeight:     '90dvh',
          display:       'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-5 pb-4 flex-shrink-0">
          {recipeSnap.image && (
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                 style={{ background: 'var(--bg-sunk)' }}>
              <img src={recipeSnap.image} alt={recipeSnap.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {recipeSnap.title}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
              {recipeSnap.readyInMinutes && (
                <span className="flex items-center gap-1"><Clock size={11} /> {recipeSnap.readyInMinutes} min</span>
              )}
              <span className="flex items-center gap-1"><Users size={11} /> {servings} servings</span>
              {detail?.sourceUrl && (
                <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 ml-auto hover:text-[var(--brand)]">
                  Source <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12" style={{ color: 'var(--ink-muted)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading recipe…</span>
            </div>
          )}
          {error && (
            <p className="text-sm py-4" style={{ color: 'var(--danger)' }}>
              Couldn't load details — {error}
            </p>
          )}
          {!loading && detail && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

              {/* Ingredients */}
              <aside className="md:col-span-2">
                <h3 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                  Ingredients
                </h3>
                <ul className="space-y-1.5">
                  {(detail.extendedIngredients ?? []).map((ing, i) => {
                    const have = inFridge(ing.name)
                    const tier = getMissingTier(ing.name || '')
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {have
                          ? <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--fresh)' }} />
                          : <ShoppingCart size={13} className="mt-0.5 flex-shrink-0"
                                          style={{ color: tier === 'core' ? 'var(--danger)' : 'var(--carrot)' }} />}
                        <span style={{ color: have ? 'var(--ink)' : 'var(--ink-muted)' }}>
                          {ing.amount != null && (
                            <strong style={{ color: 'var(--ink)', marginRight: 3 }}>
                              {fmtQty(ing.amount, ing.unit)}
                            </strong>
                          )}
                          {ing.name}
                          {!have && tier === 'core' && (
                            <span className="ml-1.5 text-xs px-1 py-0.5 rounded"
                                  style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
                              essential
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </aside>

              {/* Instructions */}
              <section className="md:col-span-3">
                <h3 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                  Instructions
                </h3>
                {steps.length > 0 ? (
                  <ol className="space-y-4">
                    {steps.map(step => (
                      <li key={step.number} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white mt-0.5"
                              style={{ background: 'var(--brand)' }}>
                          {step.number}
                        </span>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                          {step.step}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                    {detail.sourceUrl
                      ? <>Full instructions at <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer"
                              className="underline" style={{ color: 'var(--brand)' }}>the source</a>.</>
                      : 'No instructions available for this recipe.'}
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
