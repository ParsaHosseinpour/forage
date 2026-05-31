import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronLeft, UtensilsCrossed, ShoppingCart } from 'lucide-react'
import { useMealPlan, DAY_NAMES, SLOT_TYPES, getMondayOf } from '../../hooks/useMealPlan'
import { useFridge } from '../../hooks/useFridge'
import { usePantry } from '../../hooks/usePantry'
import { useCookHistory } from '../../hooks/useCookHistory'
import { useToast } from '../ui/Toast'
import { buildDeductionPlan } from '../../lib/cookUtils'
import Button from '../ui/Button'

const SLOT_LABELS = {
  breakfast: '🌅 Breakfast',
  lunch:     '☀️  Lunch',
  dinner:    '🌙 Dinner',
  snack:     '🍎 Snack',
}

const SLOT_COLORS = {
  breakfast: { bg: '#FFF9ED', border: '#F5D9B8', color: 'var(--amber)' },
  lunch:     { bg: 'var(--green-light)', border: 'var(--green-mid)', color: 'var(--green)' },
  dinner:    { bg: '#EEF0F9', border: '#C7CDE8', color: '#4A52A0' },
  snack:     { bg: 'var(--cream-dark)', border: 'var(--border)', color: 'var(--ink-muted)' },
}

/** Compute the actual date for a day index relative to Monday of this week */
function dayDate(weekStart, dayIdx) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + dayIdx)
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

/** Whether a day index is today */
function isToday(weekStart, dayIdx) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + dayIdx)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

// ── Scheduled recipe chip ─────────────────────────────────────────────────────

function SlotChip({ slot, onRemove, onCookNow, cooking }) {
  const recipe = slot.recipe_json ?? {}
  return (
    <div className="group relative rounded-lg border px-2.5 py-2 text-xs flex items-start gap-2"
         style={{ background: 'white', borderColor: 'var(--border)' }}>

      {recipe.image && (
        <img src={recipe.image} alt={recipe.title}
             className="flex-shrink-0 w-7 h-7 rounded object-cover" />
      )}

      <div className="flex-1 min-w-0">
        <p className="truncate font-medium" style={{ color: 'var(--ink)', lineHeight: 1.3 }}>
          {recipe.title}
        </p>
        {recipe.readyInMinutes && (
          <p style={{ color: 'var(--ink-muted)' }}>{recipe.readyInMinutes} min</p>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onCookNow(slot)}
          disabled={cooking === slot.id}
          title="Cook Now"
          className="p-1 rounded-md transition-colors"
          style={{ background: 'var(--green-light)', color: 'var(--green)' }}
        >
          <UtensilsCrossed size={11} />
        </button>
        <button
          onClick={() => onRemove(slot.id)}
          title="Remove"
          className="p-1 rounded-md transition-colors"
          style={{ background: '#FEF2F0', color: 'var(--red-soft)' }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SchedulePage({ user }) {
  const navigate    = useNavigate()
  const toast       = useToast()
  const { grid, weekStart, addSlot, removeSlot, loading } = useMealPlan(user.id)
  const { items: fridgeItems, remove: fridgeRemove, update: fridgeUpdate } = useFridge(user.id)
  const { staples }  = usePantry(user.id)
  const { logCook }  = useCookHistory(user.id)

  const [cooking, setCooking] = useState(null)  // slot id being cooked

  const handleCookNow = async (slot) => {
    const recipe = slot.recipe_json ?? {}
    const ings   = recipe.extendedIngredients ?? []
    const plan   = buildDeductionPlan(ings, fridgeItems, staples)

    setCooking(slot.id)
    try {
      // 1. Deduct fridge
      for (const item of plan) {
        if (item.willDelete)      await fridgeRemove(item.fridgeItem.id)
        else if (item.canCompute) await fridgeUpdate(item.fridgeItem.id, {
          quantity: Math.round(item.remaining * 100) / 100,
        })
      }
      // 2. Log to history
      try { await logCook(recipe, { meal_type: slot.slot_type }) } catch { /* non-fatal */ }
      // 3. Remove from schedule
      await removeSlot(slot.id)
      toast({ type: 'success', message: `🍽️ ${recipe.title} cooked! Fridge updated.`, duration: 4000 })
    } catch (err) {
      toast({ type: 'error', message: `Cook failed: ${err.message}`, duration: 5000 })
    } finally {
      setCooking(null)
    }
  }

  const todayIdx = (() => {
    const today   = new Date().toDateString()
    const monday  = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      if (d.toDateString() === today) return i
    }
    return -1
  })()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Meal planner
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            Week of {new Date(weekStart).toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/saved')}>
            <ShoppingCart size={14} /> Shopping list
          </Button>
          <Button variant="ghost" onClick={() => navigate('/recipes')}>
            <ChevronLeft size={14} /> Recipes
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs mb-6 px-4 py-3 rounded-xl"
         style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
        💡 Open any recipe and click <strong>"Add to Schedule"</strong> to plan meals.
        Scheduled recipe ingredients automatically appear in your Shopping List under a "Scheduled:" heading.
        Hover a meal to reveal <strong>Cook Now</strong> (deducts fridge + logs to history).
      </p>

      {loading && (
        <div className="grid grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl animate-pulse"
                 style={{ background: 'var(--cream-dark)', animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Desktop 7-column grid */}
          <div className="hidden sm:grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, dayIdx) => {
              const isNow = dayIdx === todayIdx
              return (
                <div key={dayIdx}
                     className="rounded-2xl border overflow-hidden"
                     style={{
                       background:  isNow ? 'var(--green-light)' : 'white',
                       borderColor: isNow ? 'var(--green-mid)'   : 'var(--border)',
                     }}>

                  {/* Day header */}
                  <div className="px-2 py-2 text-center border-b"
                       style={{ borderColor: isNow ? 'var(--green-mid)' : 'var(--border)' }}>
                    <p className="text-xs font-medium"
                       style={{ color: isNow ? 'var(--green)' : 'var(--ink)' }}>
                      {DAY_NAMES[dayIdx].slice(0, 3)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {dayDate(weekStart, dayIdx)}
                    </p>
                  </div>

                  {/* Slots */}
                  <div className="p-1.5 space-y-1.5">
                    {SLOT_TYPES.map(slotType => {
                      const slotItems = grid[dayIdx]?.[slotType] ?? []
                      const colors    = SLOT_COLORS[slotType]
                      return (
                        <div key={slotType}>
                          <p className="text-xs px-1 pb-0.5"
                             style={{ color: colors.color, fontSize: '0.65rem' }}>
                            {SLOT_LABELS[slotType]}
                          </p>
                          <div className="space-y-1 min-h-[28px] rounded-lg p-1"
                               style={{ background: colors.bg, border: `1px dashed ${colors.border}` }}>
                            {slotItems.map(slot => (
                              <SlotChip
                                key={slot.id}
                                slot={slot}
                                onRemove={removeSlot}
                                onCookNow={handleCookNow}
                                cooking={cooking}
                              />
                            ))}
                            {slotItems.length === 0 && (
                              <p className="text-center py-1"
                                 style={{ color: colors.border, fontSize: '0.65rem' }}>
                                —
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile: vertical day list */}
          <div className="sm:hidden space-y-4">
            {[...Array(7)].map((_, dayIdx) => {
              const isNow   = dayIdx === todayIdx
              const hasSlots = SLOT_TYPES.some(t => (grid[dayIdx]?.[t] ?? []).length > 0)
              if (!isNow && !hasSlots) return null  // hide empty non-today days on mobile
              return (
                <div key={dayIdx} className="rounded-2xl border overflow-hidden"
                     style={{
                       background:  isNow ? 'var(--green-light)' : 'white',
                       borderColor: isNow ? 'var(--green-mid)'   : 'var(--border)',
                     }}>
                  <div className="px-4 py-3 border-b flex items-center gap-2"
                       style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm font-medium" style={{ color: isNow ? 'var(--green)' : 'var(--ink)' }}>
                      {isNow && '📍 '}{DAY_NAMES[dayIdx]}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {dayDate(weekStart, dayIdx)}
                    </span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    {SLOT_TYPES.map(slotType => {
                      const slotItems = grid[dayIdx]?.[slotType] ?? []
                      const colors    = SLOT_COLORS[slotType]
                      return (
                        <div key={slotType} className="rounded-lg p-2"
                             style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                          <p className="text-xs mb-1.5" style={{ color: colors.color, fontSize: '0.7rem' }}>
                            {SLOT_LABELS[slotType]}
                          </p>
                          <div className="space-y-1">
                            {slotItems.map(slot => (
                              <SlotChip key={slot.id} slot={slot}
                                        onRemove={removeSlot} onCookNow={handleCookNow} cooking={cooking} />
                            ))}
                            {slotItems.length === 0 && (
                              <p className="text-xs text-center py-0.5"
                                 style={{ color: colors.border }}>—</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
