import { useState } from 'react'
import { X } from 'lucide-react'
import { DAY_NAMES, SLOT_TYPES } from '../../hooks/useMealPlan'
import Button from '../ui/Button'

const SLOT_EMOJIS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }

export default function AddToScheduleModal({ recipe, onClose, onAdd }) {
  const [selectedDay,  setDay]  = useState(null)
  const [selectedSlot, setSlot] = useState(null)
  const [loading, setLoading]   = useState(false)

  const handleAdd = async () => {
    if (selectedDay == null || !selectedSlot) return
    setLoading(true)
    try { await onAdd(selectedDay, selectedSlot) }
    finally { setLoading(false) }
  }

  // Determine today's day index (0=Mon … 6=Sun) for highlighting
  const todayIdx = (() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(28,28,26,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl border overflow-hidden slide-up"
           style={{ background: 'white', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
              Add to schedule
            </h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-muted)', maxWidth: 220 }}>
              {recipe.title}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Day picker */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-2"
               style={{ color: 'var(--ink-muted)' }}>
              Day
            </p>
            <div className="grid grid-cols-7 gap-1">
              {DAY_NAMES.map((name, idx) => {
                const isToday  = idx === todayIdx
                const selected = selectedDay === idx
                return (
                  <button
                    key={idx}
                    onClick={() => setDay(idx)}
                    className="py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background:  selected ? 'var(--green)'      : isToday ? 'var(--green-light)' : 'var(--cream)',
                      color:       selected ? 'white'             : isToday ? 'var(--green)'       : 'var(--ink-muted)',
                      borderBottom: isToday && !selected ? '2px solid var(--green)' : '2px solid transparent',
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
            <p className="text-xs font-medium uppercase tracking-widest mb-2"
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
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm capitalize transition-all"
                    style={{
                      background:  selected ? 'var(--green)'      : 'white',
                      borderColor: selected ? 'var(--green)'      : 'var(--border)',
                      color:       selected ? 'white'             : 'var(--ink)',
                      fontWeight:  selected ? 500                 : 400,
                    }}
                  >
                    <span>{SLOT_EMOJIS[slot]}</span> {slot}
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
