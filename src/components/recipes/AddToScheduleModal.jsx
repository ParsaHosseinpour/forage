import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { DAY_NAMES, SLOT_TYPES, getMondayOf, shiftWeek, dayMonth } from '../../hooks/useMealPlan'
import Button from '../ui/Button'
import { SlotIcon } from '../ui/glyphs'
import { useDialog } from '../../hooks/useDialog'


export default function AddToScheduleModal({ recipe, onClose, onAdd }) {
  const dialogRef = useDialog(onClose)
  const [week, setWeek]            = useState(0)   // weeks from now: 0 = this week
  const [selectedDay,  setDay]  = useState(null)
  const [selectedSlot, setSlot] = useState(null)
  const [loading, setLoading]   = useState(false)

  const handleAdd = async () => {
    if (selectedDay == null || !selectedSlot) return
    setLoading(true)
    try { await onAdd(selectedDay, selectedSlot, week) }
    finally { setLoading(false) }
  }

  // Determine today's day index (0=Mon … 6=Sun) for highlighting
  const todayIdx = (() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })()

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Add to meal planner"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(43,33,24,0.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-[14px] overflow-hidden slide-up"
           style={{ background: 'var(--bg)', border: '2.5px solid var(--ink)', boxShadow: '0 6px 0 var(--ink)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
              Add to schedule
            </h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-muted)', maxWidth: 220 }}>
              {recipe.title}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--bg-sunk)] transition-colors">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Week: any week up to 12 ahead */}
          <div className="flex items-center gap-2" role="group" aria-label="Week">
            <button type="button" onClick={() => setWeek(w => Math.max(0, w - 1))} disabled={week === 0}
                    aria-label="Earlier week"
                    className="w-9 h-9 grid place-items-center rounded-full border-[1.5px] disabled:opacity-35"
                    style={{ borderColor: 'var(--ink)', background: 'var(--surface)' }}>
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 text-center" aria-live="polite">
              <p className="text-[16px] font-bold leading-tight">
                {week === 0 ? 'This week' : week === 1 ? 'Next week' : `Week of ${dayMonth(shiftWeek(getMondayOf(), week * 7))}`}
              </p>
              <p className="text-[13px]" style={{ color: 'var(--ink-muted)' }}>
                {dayMonth(shiftWeek(getMondayOf(), week * 7))} to {dayMonth(shiftWeek(getMondayOf(), week * 7 + 6))}
              </p>
            </div>
            <button type="button" onClick={() => setWeek(w => Math.min(11, w + 1))} disabled={week === 11}
                    aria-label="Later week"
                    className="w-9 h-9 grid place-items-center rounded-full border-[1.5px] disabled:opacity-35"
                    style={{ borderColor: 'var(--ink)', background: 'var(--surface)' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day picker */}
          <div>
            <p className="text-[13px] font-medium mb-2"
               style={{ color: 'var(--ink-muted)' }}>
              Day
            </p>
            <div className="grid grid-cols-7 gap-1">
              {DAY_NAMES.map((name, idx) => {
                const isToday  = week === 0 && idx === todayIdx
                const selected = selectedDay === idx
                return (
                  <button
                    key={idx}
                    onClick={() => setDay(idx)}
                    className="py-2 rounded-full border-[1.5px] text-[13px] transition-colors"
                    aria-pressed={selected}
                    style={{
                      background:  selected ? 'var(--saffron)' : isToday ? 'var(--saffron-tint)' : 'var(--surface)',
                      borderColor: 'var(--ink)',
                      color:       selected || isToday ? 'var(--ink)' : 'var(--ink-muted)',
                      fontWeight:  selected ? 700 : 600,
                    }}
                  >
                    {name.slice(0, 2)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slot type picker */}
          <div>
            <p className="text-[13px] font-medium mb-2"
               style={{ color: 'var(--ink-muted)' }}>
              Meal slot
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_TYPES.map(slot => {
                const selected = selectedSlot === slot
                return (
                  <button
                    key={slot}
                    onClick={() => setSlot(slot)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-full border-[1.5px] text-sm capitalize transition-colors"
                    aria-pressed={selected}
                    style={{
                      background:  selected ? 'var(--saffron)' : 'var(--surface)',
                      borderColor: 'var(--ink)',
                      color:       selected ? 'var(--ink)'     : 'var(--ink-muted)',
                      fontWeight:  selected ? 700 : 600,
                    }}
                  >
                    <SlotIcon slot={slot} size={15} /> {slot}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Confirm */}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={loading}
              disabled={selectedDay == null || !selectedSlot}
              onClick={handleAdd}
            >
              Add to planner
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
