import { useState, useMemo } from 'react'
import { X, Trash2, ArrowDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Button from '../ui/Button'
import { buildDeductionPlan, formatQty } from '../../lib/cookUtils'

/**
 * CookItModal — shows a deduction plan with:
 * 1. Servings-scaled recipe amounts (multiplier applied)
 * 2. Editable quantity inputs — user can tweak any amount before confirming
 * 3. Real-time remaining calculation as user edits
 */
export default function CookItModal({
  recipe,
  recipeDetail,
  fridgeItems,
  pantryStaples,
  servingsMultiplier = 1,
  onConfirm,
  onClose,
}) {
  const [loading, setLoading] = useState(false)

  const ingredients = recipeDetail?.extendedIngredients ?? []

  // Build plan with multiplier applied to recipe amounts
  const scaledIngredients = useMemo(() =>
    ingredients.map(ing => {
      if (ing.amount == null) return ing
      return { ...ing, amount: ing.amount * servingsMultiplier }
    }),
    [ingredients, servingsMultiplier]
  )

  const basePlan = buildDeductionPlan(scaledIngredients, fridgeItems, pantryStaples)

  // Allow per-row quantity overrides — stored as strings for input compatibility
  const [overrides, setOverrides] = useState(() =>
    Object.fromEntries(
      basePlan.map((item, i) => [
        i,
        item.deductedQty != null
          ? String(parseFloat(item.deductedQty.toFixed(3)))
          : '',
      ])
    )
  )

  const setOverride = (idx, val) =>
    setOverrides(prev => ({ ...prev, [idx]: val }))

  // Recompute remaining live as user edits
  const computedPlan = basePlan.map((item, i) => {
    if (!item.canCompute) return item
    const custom = parseFloat(overrides[i])
    if (isNaN(custom) || custom === item.deductedQty) return item
    const remaining  = (item.fridgeItem.quantity ?? 0) - custom
    return { ...item, deductedQty: custom, remaining, willDelete: remaining <= 0 }
  })

  const handleConfirm = async () => {
    setLoading(true)
    try { await onConfirm(computedPlan) }
    finally { setLoading(false) }
  }

  const deletes = computedPlan.filter(p => p.willDelete).length
  const reduces = computedPlan.filter(p => !p.willDelete && p.canCompute).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(28,28,26,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden slide-up"
        style={{
          background:   'white',
          borderColor:  'var(--border)',
          boxShadow:    'var(--shadow-md)',
          maxHeight:    '90dvh',
          display:      'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-xl" style={{ fontFamily: 'Playfair Display, serif' }}>
              I Cooked This!
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>
              {recipe.title}
              {servingsMultiplier !== 1 && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs"
                      style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
                  ×{servingsMultiplier.toFixed(servingsMultiplier % 1 === 0 ? 0 : 1)} servings
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-4 flex-shrink-0">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        {/* Subtitle */}
        {computedPlan.length > 0 && (
          <p className="px-6 pb-3 text-xs flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>
            Edit any quantity below before confirming. Changes are applied exactly as entered.
          </p>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {computedPlan.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--green)' }} />
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                All ingredients are pantry staples or not in your fridge — nothing to deduct.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {computedPlan.map((item, i) => {
                const { fridgeItem, recipeQty, remaining, willDelete, canCompute } = item
                return (
                  <li key={i}
                      className="rounded-xl border p-3"
                      style={{
                        borderColor: willDelete ? '#FECACA' : 'var(--border)',
                        background:  willDelete ? '#FEF2F0' : 'var(--cream)',
                      }}>

                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                        {fridgeItem.name}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: willDelete ? '#FEF2F0' : 'var(--amber-light)',
                              color:      willDelete ? 'var(--red-soft)' : 'var(--amber)',
                            }}>
                        {willDelete ? 'Remove' : 'Reduce'}
                      </span>
                    </div>

                    {canCompute ? (
                      <div className="flex items-center gap-2">
                        {/* Editable deduction amount */}
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Use</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={overrides[i]}
                            onChange={e => setOverride(i, e.target.value)}
                            className="w-20 text-sm text-center border rounded-lg px-2 py-1"
                            style={{ borderColor: 'var(--border)', background: 'white' }}
                          />
                          <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                            {fridgeItem.unit || ''}
                          </span>
                        </div>

                        {/* Remaining preview */}
                        <div className="text-xs text-right" style={{ color: 'var(--ink-muted)' }}>
                          {formatQty(fridgeItem.quantity, fridgeItem.unit)} →{' '}
                          {willDelete
                            ? <span style={{ color: 'var(--red-soft)' }}>gone</span>
                            : <span style={{ color: 'var(--amber)' }}>
                                {formatQty(remaining, fridgeItem.unit)} left
                              </span>
                          }
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                        {fridgeItem.quantity != null
                          ? <><AlertTriangle size={11} className="inline mr-1" style={{ color: 'var(--amber)' }} />
                              Unit mismatch — will remove entirely</>
                          : 'No quantity tracked — will remove from fridge'}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0"
             style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={loading} onClick={handleConfirm}>
            ✅ Confirm & Update Fridge
          </Button>
        </div>
      </div>
    </div>
  )
}
