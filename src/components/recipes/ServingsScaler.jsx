import { Minus, Plus } from 'lucide-react'

export default function ServingsScaler({ servings, onChange, defaultServings }) {
  const multiplier = defaultServings > 0 ? servings / defaultServings : 1

  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] font-medium"
            style={{ color: 'var(--ink-muted)' }}>
        Servings
      </span>

      <div className="flex items-center gap-2 rounded-full border-[1.5px] px-1.5 py-1"
           style={{ background: 'white', borderColor: 'var(--ink)' }}>

        <button
          onClick={() => onChange(Math.max(1, servings - 1))}
          disabled={servings <= 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: servings <= 1 ? 'transparent' : 'var(--bg-sunk)',
            color:      servings <= 1 ? 'var(--border)' : 'var(--ink)',
          }}
          aria-label="Fewer servings"
        >
          <Minus size={13} />
        </button>

        <span className="text-sm font-semibold min-w-[2rem] text-center"
              style={{ color: 'var(--ink)' }}>
          {servings}
        </span>

        <button
          onClick={() => onChange(Math.min(50, servings + 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ background: 'var(--bg-sunk)', color: 'var(--ink)' }}
          aria-label="More servings"
        >
          <Plus size={13} />
        </button>
      </div>

      {multiplier !== 1 && (
        <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>
          {multiplier > 1 ? `×${multiplier.toFixed(1)}` : `×${multiplier.toFixed(2)}`}
        </span>
      )}
    </div>
  )
}
