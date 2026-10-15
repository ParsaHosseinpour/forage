import { useState, useMemo } from 'react'
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import Button from '../ui/Button'
import { buildDeductionPlan, formatQty } from '../../lib/cookUtils'
import { useDialog } from '../../hooks/useDialog'

/**
 * CookItModal
 *
 * Handles three deduction states per ingredient:
 *   canCompute + !isEstimated → exact unit conversion, editable input
 *   canCompute +  isEstimated → cross-dimensional estimate (e.g. count↔weight),
 *                               shown with amber "~" badge and typical-weight note
 *   !canCompute               → unresolvable mismatch, shown with warning;
 *                               user can still manually enter a deduction amount
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
  const dialogRef = useDialog(onClose)
  const [loading, setLoading] = useState(false)

  const ingredients = recipeDetail?.extendedIngredients ?? []

  // Scale recipe quantities by the current servings multiplier
  const scaledIngredients = useMemo(() =>
    ingredients.map(ing =>
      ing.amount == null ? ing : { ...ing, amount: ing.amount * servingsMultiplier }
    ),
  [ingredients, servingsMultiplier])

  const basePlan = buildDeductionPlan(scaledIngredients, fridgeItems, pantryStaples)

  // Per-row quantity overrides (string for input compatibility)
  const [overrides, setOverrides] = useState(() =>
    Object.fromEntries(
      basePlan.map((item, i) => [
        i,
        item.canCompute && item.deductedQty != null
          ? String(parseFloat(item.deductedQty.toFixed(3)))
          : '',
      ])
    )
  )

  const setOverride = (idx, val) =>
    setOverrides(prev => ({ ...prev, [idx]: val }))

  // Recompute remaining live as user edits
  const computedPlan = basePlan.map((item, i) => {
    if (!item.canCompute) {
      // User might have typed a manual override even for canCompute:false items
      const custom = parseFloat(overrides[i])
      if (!isNaN(custom) && custom > 0) {
        const remaining = (item.fridgeItem.quantity ?? 0) - custom
        return {
          ...item,
          deductedQty: custom,
          remaining,
          willDelete:  remaining <= 0,
          canCompute:  true,   // treat as computable once user fills it in
          isEstimated: true,
          typicalNote: 'manual override',
        }
      }
      return item
    }
    const custom = parseFloat(overrides[i])
    if (isNaN(custom) || custom === item.deductedQty) return item
    const remaining = (item.fridgeItem.quantity ?? 0) - custom
    return { ...item, deductedQty: custom, remaining, willDelete: remaining <= 0 }
  })

  const hasEstimates = computedPlan.some(p => p.canCompute && p.isEstimated)

  const handleConfirm = async () => {
    setLoading(true)
    try { await onConfirm(computedPlan) }
    finally { setLoading(false) }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Cook this recipe"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(43,29,58,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden slide-up"
        style={{
          background: 'white', borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-md)', maxHeight: '90dvh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-xl" style={{ fontFamily: 'var(--font-display)' }}>
              I Cooked This!
            </h2>
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-muted)', maxWidth: 280 }}>
              {recipe.title}
              {servingsMultiplier !== 1 && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs"
                      style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>
                  ×{servingsMultiplier % 1 === 0 ? servingsMultiplier : servingsMultiplier.toFixed(1)} servings
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-sunk)] transition-colors ml-4 flex-shrink-0">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        {/* Instruction */}
        {computedPlan.length > 0 && (
          <p className="px-6 pb-3 text-xs flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>
            Edit any quantity before confirming. Pantry staples are excluded.
          </p>
        )}

        {/* Estimate disclaimer */}
        {hasEstimates && (
          <div className="mx-6 mb-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs flex-shrink-0"
               style={{ background: 'var(--carrot-tint)', color: 'var(--carrot)' }}>
            <Info size={13} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>~Estimated</strong> rows use a typical weight-per-piece (e.g. ~200g per chicken breast).
              Adjust the amount if your portion differs.
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {computedPlan.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--fresh)' }} />
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                All ingredients are pantry staples or not in your fridge — nothing to deduct. Enjoy!
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {computedPlan.map((item, i) => {
                const { fridgeItem, recipeQty, remaining, willDelete, canCompute,
                        isEstimated, typicalNote } = item

                const borderColor = willDelete   ? 'var(--danger-soft)'
                                  : isEstimated  ? 'var(--carrot-soft)'
                                  :                'var(--border)'
                const bgColor     = willDelete   ? 'var(--danger-tint)'
                                  : isEstimated  ? 'var(--carrot-tint)'
                                  :                'var(--bg)'

                return (
                  <li key={i} className="rounded-xl border p-3"
                      style={{ borderColor, background: bgColor }}>

                    {/* Row header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {fridgeItem.name}
                        </p>
                        {isEstimated && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                                style={{ background: 'var(--carrot)', color: 'white' }}>
                            ~
                          </span>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                            style={{
                              background: willDelete ? 'var(--danger-tint)'              : 'var(--carrot-tint)',
                              color:      willDelete ? 'var(--danger)'      : 'var(--carrot)',
                            }}>
                        {willDelete ? 'Remove' : 'Reduce'}
                      </span>
                    </div>

                    {/* Editable deduction row */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Use</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={overrides[i]}
                          onChange={e => setOverride(i, e.target.value)}
                          placeholder={canCompute ? '0' : 'enter amount'}
                          className="w-20 text-sm text-center border rounded-lg px-2 py-1"
                          style={{
                            borderColor: 'var(--border)',
                            background:  'white',
                            outline:     isEstimated ? '1px solid var(--carrot)' : 'none',
                          }}
                        />
                        <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                          {fridgeItem.unit || ''}
                        </span>
                      </div>

                      {/* Right side: remaining preview or mismatch note */}
                      <div className="text-xs text-right flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>
                        {canCompute ? (
                          <>
                            {formatQty(fridgeItem.quantity, fridgeItem.unit)} →{' '}
                            {willDelete
                              ? <span style={{ color: 'var(--danger)' }}>gone</span>
                              : <span style={{ color: 'var(--carrot)' }}>
                                  {formatQty(remaining, fridgeItem.unit)} left
                                </span>}
                          </>
                        ) : (
                          <span className="flex items-center gap-1"
                                style={{ color: 'var(--carrot)' }}>
                            <AlertTriangle size={11} />
                            enter manually
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Estimate note */}
                    {typicalNote && typicalNote !== 'manual override' && (
                      <p className="text-xs mt-1.5" style={{ color: 'var(--carrot)' }}>
                        Estimate: {typicalNote}
                        {recipeQty.amount && (
                          <span> · recipe asks for {formatQty(recipeQty.amount, recipeQty.unit)}</span>
                        )}
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
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={handleConfirm}>
            Confirm and update fridge
          </Button>
        </div>
      </div>
    </div>
  )
}
