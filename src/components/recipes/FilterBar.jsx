import { DIETS } from '../../lib/preferences'

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
        <p className="text-sm font-semibold mb-2.5">Diet</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap">
          {DIETS.map(({ value, label }) => {
            const active = filters.diet === value
            return (
              <button
                key={value}
                onClick={() => set('diet')(value)}
                className="px-3.5 py-1.5 rounded-full text-sm border-[1.5px] transition-colors duration-100 whitespace-nowrap flex-shrink-0"
                aria-pressed={active}
                style={{
                  background:   active ? 'var(--saffron)' : 'var(--surface)',
                  color:        'var(--ink)',
                  borderColor:  'var(--ink)',
                  fontWeight:   active ? 600            : 500,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time + Sort row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">

        {/* Max cook time */}
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <span className="text-sm font-semibold">
            Time
          </span>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {TIME_OPTIONS.map(({ value, label }) => {
              const active = filters.maxTime === value
              return (
                <button
                  key={value}
                  onClick={() => set('maxTime')(value)}
                  className="px-3 py-1 rounded-full text-[13px] border-[1.5px] transition-colors duration-100 whitespace-nowrap flex-shrink-0"
                  style={{
                    background:  active ? 'var(--saffron)' : 'var(--surface)',
                    color:       active ? 'var(--ink)'        : 'var(--ink-muted)',
                    borderColor: 'var(--ink)',
                    fontWeight:  active ? 600 : 500,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="hidden sm:block w-px h-4" style={{ background: 'var(--border)' }} />

        {/* Sort */}
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <span className="text-sm font-semibold">
            Sort
          </span>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {SORTS.map(({ value, label }) => {
              const active = (filters.sort || 'min-missing-ingredients') === value
              return (
                <button
                  key={value}
                  onClick={() => set('sort')(value)}
                  className="px-3 py-1 rounded-full text-[13px] border-[1.5px] transition-colors duration-100 whitespace-nowrap flex-shrink-0"
                  style={{
                    background:  active ? 'var(--saffron)' : 'var(--surface)',
                    color:       active ? 'var(--ink)'        : 'var(--ink-muted)',
                    borderColor: 'var(--ink)',
                    fontWeight:  active ? 600 : 500,
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
          <span className="ml-auto text-sm tabular-nums" style={{ color: 'var(--ink-muted)' }}>
            {resultCount} recipe{resultCount !== 1 ? 's' : ''} found
          </span>
        )}
      </div>
    </div>
  )
}
