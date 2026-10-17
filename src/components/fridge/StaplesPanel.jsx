import { Check } from 'lucide-react'
import { DEFAULT_STAPLES } from '../../hooks/usePantry'

/** Pantry staples as a tab: toggle what you always have on hand. */
export default function StaplesPanel({ isActive, onToggle, loading, query = '' }) {
  const list = DEFAULT_STAPLES.filter(s => s.includes(query.trim().toLowerCase()))
  return (
    <div className="fade-in">
      <p className="text-[15px] max-w-xl mb-5" style={{ color: 'var(--ink-muted)' }}>
        Things you always have. Forage counts these when it matches recipes, so you never have to log salt or oil.
      </p>
      {list.length === 0 ? (
        <p style={{ color: 'var(--ink-muted)' }}>No staples match.</p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {list.map(staple => {
            const active = isActive(staple)
            return (
              <button
                key={staple}
                onClick={() => onToggle(staple)}
                disabled={loading}
                aria-pressed={active}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[15px] border-[1.5px] capitalize transition-colors duration-100"
                style={{
                  background:  active ? 'var(--fresh-tint)' : 'var(--surface)',
                  borderColor: 'var(--ink)',
                  color:       active ? 'var(--fresh)'      : 'var(--ink-muted)',
                  fontWeight:  active ? 700 : 500,
                }}
              >
                {active && <Check size={15} strokeWidth={2.75} />}{staple}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
