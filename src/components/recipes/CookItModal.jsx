import { useState } from 'react'
import { X, Trash2, ArrowDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Button from '../ui/Button'
import { buildDeductionPlan, formatQty } from '../../lib/cookUtils'

function DeductionRow({ item }) {
  const { fridgeItem, recipeQty, deductedQty, remaining, willDelete, canCompute } = item

  return (
    <li className="flex items-start gap-3 py-3 border-b last:border-b-0"
        style={{ borderColor: 'var(--border)' }}>
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {willDelete
          ? <Trash2 size={15} style={{ color: 'var(--red-soft)' }} />
          : <ArrowDown size={15} style={{ color: 'var(--amber)' }} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {fridgeItem.name}
        </p>

        {canCompute ? (
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            {formatQty(fridgeItem.quantity, fridgeItem.unit)} in fridge
            {' → '}
            {willDelete
              ? <span style={{ color: 'var(--red-soft)' }}>remove entirely</span>
              : <span style={{ color: 'var(--amber)' }}>
                  {formatQty(remaining, fridgeItem.unit)} remaining
                </span>}
            {' '}
            <span className="opacity-60">
              (using {formatQty(recipeQty.amount, recipeQty.unit)})
            </span>
          </p>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            {fridgeItem.quantity != null
              ? <>
                  <AlertTriangle size={11} className="inline mr-1" style={{ color: 'var(--amber)' }} />
                  Can't convert units ({fridgeItem.unit || 'no unit'} ↔ {recipeQty.unit || 'no unit'}) — will remove entirely
                </>
              : 'No quantity tracked — will remove from fridge'}
          </p>
        )}
      </div>

      {/* Badge */}
      <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full mt-0.5"
            style={{
              background: willDelete ? '#FEF2F0' : 'var(--amber-light)',
              color:      willDelete ? 'var(--red-soft)' : 'var(--amber)',
            }}>
        {willDelete ? 'Remove' : 'Reduce'}
      </span>
    </li>
  )
}

export default function CookItModal({
  recipe,
  recipeDetail,
  fridgeItems,
  pantryStaples,
  onConfirm,
  onClose,
}) {
  const [loading, setLoading] = useState(false)

  const ingredients = recipeDetail?.extendedIngredients ?? []
  const plan = buildDeductionPlan(ingredients, fridgeItems, pantryStaples)

  const deletes  = plan.filter(p => p.willDelete)
  const reduces  = plan.filter(p => !p.willDelete && p.canCompute)
  const skipped  = plan.filter(p => !p.canCompute && !p.willDelete)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(plan)
    } finally {
      setLoading(false)
    }
  }

  return (
    // Backdrop
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
          flexDirection:'column',
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
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-4 flex-shrink-0">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {plan.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--green)' }} />
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                All ingredients for this recipe are pantry staples or not in your fridge — nothing to deduct. Great cooking!
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
                Here's what will be deducted from your fridge. Pantry staples are excluded.
              </p>

              <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {plan.map((item, i) => (
                  <DeductionRow key={i} item={item} />
                ))}
              </ul>

              {skipped.length > 0 && (
                <p className="text-xs mt-3 py-2 px-3 rounded-lg"
                   style={{ background: 'var(--cream-dark)', color: 'var(--ink-muted)' }}>
                  <AlertTriangle size={11} className="inline mr-1" style={{ color: 'var(--amber)' }} />
                  {skipped.length} ingredient{skipped.length !== 1 ? 's have' : ' has'} incompatible units and won't be automatically reduced. Update them manually in your fridge.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0"
             style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={loading}
            onClick={handleConfirm}
          >
            ✅ Confirm & Update Fridge
          </Button>
        </div>
      </div>
    </div>
  )
}
