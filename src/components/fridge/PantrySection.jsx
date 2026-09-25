import { useState } from 'react'
import { ChevronDown, ChevronUp, Flame, Package } from 'lucide-react'
import { DEFAULT_STAPLES } from '../../hooks/usePantry'

export default function PantrySection({ isActive, onToggle, loading }) {
  const [open, setOpen] = useState(false)
  const activeCount = DEFAULT_STAPLES.filter(s => isActive(s)).length

  return (
    <section
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'white', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--amber-light)' }}>
            <Package size={15} style={{ color: 'var(--amber)' }} strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
              Pantry staples
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              {activeCount > 0
                ? `${activeCount} ingredient${activeCount !== 1 ? 's' : ''} always assumed in your kitchen`
                : 'Mark ingredients you always have on hand'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {activeCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
              {activeCount} active
            </span>
          )}
          {open
            ? <ChevronUp  size={16} style={{ color: 'var(--ink-muted)' }} />
            : <ChevronDown size={16} style={{ color: 'var(--ink-muted)' }} />}
        </div>
      </button>

      {/* Chip grid */}
      {open && (
        <div className="px-5 pb-5 pt-1 border-t fade-in" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Active staples are silently merged with your fridge when finding recipes —
            you won't be penalised for not listing them individually.
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_STAPLES.map(staple => {
              const active = isActive(staple)
              return (
                <button
                  key={staple}
                  onClick={() => onToggle(staple)}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-full text-sm border transition-all duration-150 capitalize"
                  style={{
                    background:  active ? 'var(--amber-light)' : 'var(--cream)',
                    borderColor: active ? 'var(--amber)'       : 'var(--border)',
                    color:       active ? 'var(--amber)'       : 'var(--ink-muted)',
                    fontWeight:  active ? 500                  : 400,
                  }}
                >
                  {active && '✓ '}{staple}
                </button>
              )
            })}
          </div>
          {activeCount === DEFAULT_STAPLES.length && (
            <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--green)' }}>
              <Flame size={12} /> Full pantry — recipe matching will be very generous!
            </p>
          )}
        </div>
      )}
    </section>
  )
}
