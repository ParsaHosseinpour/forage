const DIETS = [
  { value: '',            label: 'All recipes' },
  { value: 'vegetarian',  label: '🌿 Vegetarian' },
  { value: 'vegan',       label: '🥦 Vegan' },
  { value: 'gluten free', label: '🌾 Gluten-free' },
  { value: 'dairy free',  label: '🧀 Dairy-free' },
  { value: 'ketogenic',   label: '🥑 Keto' },
  { value: 'paleo',       label: '🍖 Paleo' },
]

const TIME_OPTIONS = [
  { value: '',   label: 'Any time' },
  { value: '15', label: '≤ 15 min' },
  { value: '30', label: '≤ 30 min' },
  { value: '60', label: '≤ 1 hour' },
]

const SORTS = [
  { value: 'min-missing-ingredients', label: 'Fewest missing' },
  { value: 'max-used-ingredients',    label: 'Most matching'  },
  { value: 'popularity',              label: 'Best match'     },
  { value: 'time',                    label: 'Quickest'       },
]

export default function FilterBar({ filters, onChange, resultCount, loading }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value })

  return (
    <div className="space-y-4 mb-8">

      {/* Diet pills */}
      <div>
        <p className="text-[13px] font-medium mb-2.5"
           style={{ color: 'var(--ink-muted)' }}>
          Dietary preference
        </p>
        <div className="flex flex-wrap gap-2">
          {DIETS.map(({ value, label }) => {
            const active = filters.diet === value
            return (
              <button
                key={value}
                onClick={() => set('diet')(value)}
                className="px-3.5 py-1.5 rounded-full text-sm border transition-all duration-150"
                style={{
                  background:   active ? 'var(--green)'       : 'white',
                  color:        active ? 'white'              : 'var(--ink)',
                  borderColor:  active ? 'var(--green)'       : 'var(--border)',
                  fontWeight:   active ? 500                  : 400,
                  transform:    active ? 'scale(1.03)'        : 'scale(1)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time + Sort row */}
      <div className="flex flex-wrap items-center gap-4">

        {/* Max cook time */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: 'var(--ink-muted)' }}>
            Time
          </span>
          <div className="flex gap-1">
            {TIME_OPTIONS.map(({ value, label }) => {
              const active = filters.maxTime === value
              return (
                <button
                  key={value}
                  onClick={() => set('maxTime')(value)}
                  className="px-3 py-1 rounded-lg text-xs border transition-all duration-150"
                  style={{
                    background:  active ? 'var(--amber-light)' : 'white',
                    color:       active ? 'var(--amber)'       : 'var(--ink-muted)',
                    borderColor: active ? 'var(--amber)'       : 'var(--border)',
                    fontWeight:  active ? 500 : 400,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="w-px h-4" style={{ background: 'var(--border)' }} />

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: 'var(--ink-muted)' }}>
            Sort
          </span>
          <div className="flex gap-1">
            {SORTS.map(({ value, label }) => {
              const active = (filters.sort || 'min-missing-ingredients') === value
              return (
                <button
                  key={value}
                  onClick={() => set('sort')(value)}
                  className="px-3 py-1 rounded-lg text-xs border transition-all duration-150"
                  style={{
                    background:  active ? 'var(--cream-dark)' : 'white',
                    color:       active ? 'var(--ink)'        : 'var(--ink-muted)',
                    borderColor: active ? 'var(--ink-muted)'  : 'var(--border)',
                    fontWeight:  active ? 500 : 400,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Result count */}
        {!loading && resultCount !== null && (
          <span className="ml-auto text-xs" style={{ color: 'var(--ink-muted)' }}>
            {resultCount} recipe{resultCount !== 1 ? 's' : ''} found
          </span>
        )}
      </div>
    </div>
  )
}
