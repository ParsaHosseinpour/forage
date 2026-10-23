import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, UtensilsCrossed, ShoppingCart, ChevronLeft, ChevronRight, ChefHat } from 'lucide-react'
import { useMealPlan, DAY_NAMES, SLOT_TYPES, parseLocalDate, shiftWeek, dayMonth } from '../../hooks/useMealPlan'
import { getMealPlan, addMealPlanSlots } from '../../lib/supabase'
import { useFridge } from '../../hooks/useFridge'
import { usePantry } from '../../hooks/usePantry'
import { useCookHistory } from '../../hooks/useCookHistory'
import { useToast } from '../ui/Toast'
import { buildDeductionPlan } from '../../lib/cookUtils'
import Button from '../ui/Button'
import { IconTile, SlotIcon } from '../ui/glyphs'
import { useDeferredDelete } from '../../hooks/useDeferredDelete'
import PageHeader from '../layout/PageHeader'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import OfflineNotice from '../ui/OfflineNotice'

// ── Design tokens ─────────────────────────────────────────────────────────────

const SLOT_CONFIG = {
  breakfast: { label: 'Breakfast', bg: 'var(--saffron-tint)', ring: 'var(--saffron)',    text: 'var(--saffron-ink)' },
  lunch:     { label: 'Lunch',     bg: 'var(--fresh-tint)',   ring: 'var(--fresh-soft)', text: 'var(--fresh)'       },
  dinner:    { label: 'Dinner',    bg: '#FBE3DE',             ring: '#F2A79C',           text: '#A8281A'            },
  snack:     { label: 'Snack',     bg: 'var(--carrot-tint)',  ring: 'var(--carrot-soft)', text: 'var(--carrot)'     },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDayDate(weekStart, dayIdx) {
  const d = parseLocalDate(weekStart)
  d.setDate(d.getDate() + dayIdx)
  return d
}

function formatDayDate(weekStart, dayIdx) {
  const d = getDayDate(weekStart, dayIdx)
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function getTodayIdx(weekStart) {
  const today = new Date().toDateString()
  for (let i = 0; i < 7; i++) {
    if (getDayDate(weekStart, i).toDateString() === today) return i
  }
  return -1
}

function totalSlots(grid) {
  return Object.values(grid).reduce((sum, day) =>
    sum + Object.values(day).reduce((s, items) => s + items.length, 0), 0)
}

// ── Slot chip — a single scheduled recipe ─────────────────────────────────────

function SlotChip({ slot, onRemove, onCookNow, cooking, slotCfg }) {
  const recipe = slot.recipe_json ?? {}
  const busy   = cooking === slot.id

  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background:  'white',
        boxShadow:   '0 1px 4px rgba(43,29,58,0.07), 0 0 0 1px rgba(43,29,58,0.05)',
      }}
    >
      {/* Colour accent strip */}
      <div className="h-0.5 w-full" style={{ background: slotCfg.ring }} />

      <div className="flex items-start gap-2 px-2.5 pt-2 pb-2">
        {recipe.image && (
          <img src={recipe.image} alt=""
               className="flex-shrink-0 w-8 h-8 rounded-lg object-cover mt-0.5"
               style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-snug line-clamp-2"
             style={{ color: 'var(--ink)' }}>
            {recipe.title ?? 'Recipe'}
          </p>
          {recipe.readyInMinutes && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)', fontSize: '0.65rem' }}>
              {recipe.readyInMinutes} min
            </p>
          )}
        </div>
      </div>

      {/* Hover action bar */}
      <div
        className="flex gap-1 px-2 pb-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150"
        style={{ transform: 'translateY(2px)' }}
      >
        <button
          onClick={() => onCookNow(slot)}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}
          title="Cook Now — deducts fridge"
        >
          {busy
            ? <span className="spinner" style={{ width: 10, height: 10 }} />
            : <><UtensilsCrossed size={10} /> Cook</>}
        </button>
        <button
          onClick={() => onRemove(slot.id)}
          className="p-1 rounded-lg transition-colors"
          style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}
          title="Remove"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Day column — desktop ──────────────────────────────────────────────────────

function DayColumn({ dayIdx, weekStart, todayIdx, grid, onCookNow, onRemove, cooking }) {
  const isNow     = dayIdx === todayIdx
  const dateLabel = formatDayDate(weekStart, dayIdx)
  const daySlots  = grid[dayIdx] ?? {}

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
      style={{
        background:  isNow ? 'white' : 'var(--bg)',
        boxShadow:   isNow
          ? '0 0 0 2px var(--brand), 0 4px 16px rgba(91,42,134,0.12)'
          : '0 1px 3px rgba(43,29,58,0.05)',
      }}
    >
      {/* Day header */}
      <div
        className="text-center py-2.5 px-2"
        style={{
          background: isNow ? 'var(--brand)' : 'transparent',
          borderBottom: isNow ? 'none' : '1px solid var(--border)',
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide"
           style={{ color: isNow ? 'white' : 'var(--ink-muted)', fontSize: '0.65rem' }}>
          {DAY_NAMES[dayIdx].slice(0, 3)}
        </p>
        <p className="text-sm font-medium mt-0.5"
           style={{ color: isNow ? 'rgba(255,255,255,0.85)' : 'var(--ink)', fontSize: '0.75rem' }}>
          {dateLabel}
        </p>
        {isNow && (
          <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.6rem' }}>
            Today
          </span>
        )}
      </div>

      {/* Slots */}
      <div className="flex-1 p-1.5 space-y-1.5">
        {SLOT_TYPES.map(slotType => {
          const cfg   = SLOT_CONFIG[slotType]
          const items = daySlots[slotType] ?? []
          return (
            <div key={slotType}
                 className="rounded-[10px] p-1.5 space-y-1.5"
                 style={items.length
                   ? { background: cfg.bg }
                   : { border: '1px dashed var(--border)' }}>
              <p className="flex items-center justify-center gap-1"
                 style={{ color: items.length ? cfg.text : 'var(--ink-muted)', fontSize: '0.72rem', fontWeight: 600 }}>
                <SlotIcon slot={slotType} size={12} /> {cfg.label}
              </p>
              {items.map(slot => (
                <SlotChip key={slot.id} slot={slot} slotCfg={cfg}
                          onRemove={onRemove} onCookNow={onCookNow} cooking={cooking} />
              ))}
              {items.length === 0 && (
                <div className="py-1" aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Mobile day view — one day at a time with tab strip ────────────────────────

function MobileDayView({ selectedDay, weekStart, todayIdx, grid, onCookNow, onRemove, cooking }) {
  const daySlots = grid[selectedDay] ?? {}

  return (
    <div className="space-y-3">
      {SLOT_TYPES.map(slotType => {
        const cfg   = SLOT_CONFIG[slotType]
        const items = daySlots[slotType] ?? []
        return (
          <section key={slotType}
                   className="rounded-[14px] overflow-hidden"
                   style={{ background: cfg.bg }}>
            {/* Slot header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b"
                 style={{ borderColor: `color-mix(in srgb, ${cfg.ring} 45%, transparent)` }}>
              <SlotIcon slot={slotType} size={18} style={{ color: cfg.text }} />
              <p className="text-sm font-medium" style={{ color: cfg.text }}>{cfg.label}</p>
              {items.length > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `color-mix(in srgb, ${cfg.ring} 45%, transparent)`, color: cfg.text }}>
                  {items.length}
                </span>
              )}
            </div>

            <div className="p-3 space-y-2">
              {items.map(slot => {
                const recipe = slot.recipe_json ?? {}
                const busy   = cooking === slot.id
                return (
                  <div key={slot.id}
                       className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5"
                       style={{ boxShadow: '0 1px 3px rgba(43,29,58,0.07)' }}>
                    {recipe.image && (
                      <img src={recipe.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                        {recipe.title}
                      </p>
                      {recipe.readyInMinutes && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                          {recipe.readyInMinutes} min
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onCookNow(slot)}
                        disabled={busy}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}
                      >
                        {busy ? <span className="spinner" style={{ width: 10, height: 10 }} /> : <ChefHat size={14} strokeWidth={2} />}
                      </button>
                      <button
                        onClick={() => onRemove(slot.id)}
                        className="p-1.5 rounded-lg"
                        style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {items.length === 0 && (
                <p className="text-sm text-center py-3" style={{ color: cfg.ring }}>
                  Nothing planned — add a recipe
                </p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SchedulePage({ user }) {
  const online = useOnlineStatus()
  const navigate   = useNavigate()
  const toast      = useToast()
  const [weekOffset, setWeekOffset] = useState(0)
  const { slots: allSlots, grid: rawGrid, weekStart, removeSlot, loading } = useMealPlan(user.id, weekOffset)
  const { pending, request: requestRemove } = useDeferredDelete(removeSlot)

  // Hide meals that are waiting out their Undo window.
  const grid = useMemo(() => {
    const g = {}
    for (const d of Object.keys(rawGrid)) {
      g[d] = {}
      for (const t of Object.keys(rawGrid[d])) g[d][t] = rawGrid[d][t].filter(x => !pending.has(x.id))
    }
    return g
  }, [rawGrid, pending])

  // Copy this week's meals into the week after it, skipping any already there.
  const [copying, setCopying] = useState(false)
  const copyForward = async () => {
    setCopying(true)
    try {
      const target = shiftWeek(weekStart, 7)
      const { data: existing } = await getMealPlan(user.id, target)
      const has = new Set((existing ?? []).map(x => `${x.slot_day}|${x.slot_type}|${x.recipe_id}`))
      const rows = allSlots
        .filter(x => !pending.has(x.id) && !has.has(`${x.slot_day}|${x.slot_type}|${x.recipe_id}`))
        .map(x => ({ user_id: user.id, week_start: target, slot_day: x.slot_day, slot_type: x.slot_type, recipe_json: x.recipe_json, recipe_id: x.recipe_id }))
      if (rows.length === 0) {
        toast({ type: 'info', message: 'Next week already has these meals.', duration: 3500 })
      } else {
        const { error } = await addMealPlanSlots(rows)
        if (error) throw new Error(error.message)
        toast({
          type: 'success',
          message: `Copied ${rows.length} meal${rows.length !== 1 ? 's' : ''} to the week of ${dayMonth(target)}.`,
          duration: 6000,
          action: { label: 'View', onClick: () => setWeekOffset(o => o + 1) },
        })
      }
    } catch {
      toast({ type: 'error', message: 'Could not copy the week. Please try again.' })
    } finally {
      setCopying(false)
    }
  }

  const removeWithUndo = (id) => {
    const slot = allSlots.find(x => x.id === id)
    requestRemove(id, slot?.recipe_json?.title ?? 'Meal')
  }
  const { items: fridgeItems, remove: fridgeRemove, update: fridgeUpdate } = useFridge(user.id)
  const { staples }   = usePantry(user.id)
  const { logCook }   = useCookHistory(user.id)

  const [cooking, setCooking]         = useState(null)
  const [mobileDay, setMobileDay]     = useState(() => {
    // Default to today, or Monday if today is not in this week
    const today = new Date().getDay()
    const idx   = today === 0 ? 6 : today - 1   // 0=Mon…6=Sun
    return idx
  })

  const todayIdx    = useMemo(() => getTodayIdx(weekStart), [weekStart])
  const slotCount   = useMemo(() => totalSlots(grid), [grid])

  const weekLabel = useMemo(() => {
    const monday = parseLocalDate(weekStart)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    const opts = { month: 'short', day: 'numeric' }
    return `${monday.toLocaleDateString('en-GB', opts)} – ${sunday.toLocaleDateString('en-GB', opts)}`
  }, [weekStart])

  const handleCookNow = async (slot) => {
    const recipe = slot.recipe_json ?? {}
    const ings   = recipe.extendedIngredients ?? []
    const plan   = buildDeductionPlan(ings, fridgeItems, staples)

    setCooking(slot.id)
    try {
      for (const item of plan) {
        if (item.willDelete)      await fridgeRemove(item.fridgeItem.id)
        else if (item.canCompute) await fridgeUpdate(item.fridgeItem.id, {
          quantity: Math.round(item.remaining * 100) / 100,
        })
      }
      try { await logCook(recipe, { meal_type: slot.slot_type }) } catch { /* non-fatal */ }
      await removeSlot(slot.id)
      toast({ type: 'success', message: `${recipe.title} cooked. Fridge updated.`, duration: 4000 })
    } catch (err) {
      toast({ type: 'error', message: `Cook failed: ${err.message}`, duration: 5000 })
    } finally {
      setCooking(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-8">

      <PageHeader
        width="max-w-6xl"
        title="Meal planner"
        art="Eggs"
        subtitle={`${weekLabel}${slotCount > 0 ? `, ${slotCount} meal${slotCount !== 1 ? 's' : ''} planned` : ''}`}
        actions={<>
          <div className="flex items-center gap-1" role="group" aria-label="Choose week">
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week">
              <ChevronLeft size={14} />
            </Button>
            <Button variant="secondary" size="sm" disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>
              This week
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week">
              <ChevronRight size={14} />
            </Button>
          </div>
          <Button variant="secondary" size="sm" loading={copying} disabled={slotCount === 0} onClick={copyForward}>
            Copy to next week
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/saved')}>
            <ShoppingCart size={13} /> Shopping list
          </Button>
        </>}
      />

      <p className="text-[15px] mb-6 max-w-2xl" style={{ color: 'var(--ink-muted)' }}>
        Add meals from any recipe with <strong>Add to schedule</strong>. <strong>Cook</strong> logs the meal
        and updates your fridge. Planned meals feed your shopping list, this week and up to four weeks ahead.
      </p>

      {/* ── Loading ── */}
      {loading && (
        <div className="hidden sm:grid grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-72 rounded-2xl animate-pulse"
                 style={{ background: 'var(--bg-sunk)', animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* ── Desktop 7-column grid ── */}
          <div className="hidden sm:grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, dayIdx) => (
              <DayColumn
                key={dayIdx}
                dayIdx={dayIdx}
                weekStart={weekStart}
                todayIdx={todayIdx}
                grid={grid}
                onCookNow={handleCookNow}
                onRemove={removeWithUndo}
                cooking={cooking}
              />
            ))}
          </div>

          {/* ── Mobile: day-picker tab strip + single day view ── */}
          <div className="sm:hidden">
            {/* Horizontal scrolling day tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 no-scrollbar">
              {[...Array(7)].map((_, dayIdx) => {
                const isNow      = dayIdx === todayIdx
                const isSelected = dayIdx === mobileDay
                const dateLabel  = formatDayDate(weekStart, dayIdx)
                const daySlots   = grid[dayIdx] ?? {}
                const hasItems   = SLOT_TYPES.some(t => (daySlots[t] ?? []).length > 0)

                return (
                  <button
                    key={dayIdx}
                    onClick={() => setMobileDay(dayIdx)}
                    className="flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-2xl transition-all duration-150"
                    style={{
                      minWidth: 60,
                      background:  isSelected ? 'var(--brand)'
                                 : isNow      ? 'var(--brand-tint)'
                                 :              'white',
                      boxShadow:   isSelected ? '0 2px 8px rgba(91,42,134,0.25)'
                                 :              '0 1px 3px rgba(43,29,58,0.07)',
                      border: `1px solid ${isSelected ? 'var(--brand)' : isNow ? 'var(--brand-soft)' : 'var(--border)'}`,
                    }}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide"
                          style={{
                            color: isSelected ? 'white'
                                 : isNow      ? 'var(--brand)'
                                 :              'var(--ink-muted)',
                            fontSize: '0.6rem',
                          }}>
                      {DAY_NAMES[dayIdx].slice(0, 3)}
                    </span>
                    <span className="text-sm font-bold mt-0.5"
                          style={{
                            color: isSelected ? 'white'
                                 : isNow      ? 'var(--brand)'
                                 :              'var(--ink)',
                          }}>
                      {formatDayDate(weekStart, dayIdx).split(' ')[1]}
                    </span>
                    {hasItems && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full"
                            style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--brand)' }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected day content */}
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                {DAY_NAMES[mobileDay]}
                {mobileDay === todayIdx && (
                  <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--brand)', color: 'white' }}>
                    Today
                  </span>
                )}
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setMobileDay(d => Math.max(0, d - 1))}
                  disabled={mobileDay === 0}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: mobileDay === 0 ? 'var(--border)' : 'var(--ink-muted)', background: 'white' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setMobileDay(d => Math.min(6, d + 1))}
                  disabled={mobileDay === 6}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: mobileDay === 6 ? 'var(--border)' : 'var(--ink-muted)', background: 'white' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <MobileDayView
              selectedDay={mobileDay}
              weekStart={weekStart}
              todayIdx={todayIdx}
              grid={grid}
              onCookNow={handleCookNow}
              onRemove={removeWithUndo}
              cooking={cooking}
            />
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && slotCount === 0 && !online && <OfflineNotice what="meal plan" />}
      {!loading && slotCount === 0 && online && (
        <div className="text-center py-16 fade-in">
          <IconTile art="Eggs" />
          <h2 className="text-2xl mb-2">Nothing planned yet</h2>
          <p className="text-[15px] mb-6" style={{ color: 'var(--ink-muted)' }}>
            Open a recipe and tap <strong>Add to schedule</strong> to plan your week.
          </p>
          <Button onClick={() => navigate('/recipes')}>Browse recipes</Button>
        </div>
      )}
    </div>
  )
}
