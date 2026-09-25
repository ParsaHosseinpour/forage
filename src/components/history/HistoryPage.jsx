import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronLeft, UtensilsCrossed, Flame, RotateCcw } from 'lucide-react'
import { useCookHistory } from '../../hooks/useCookHistory'
import RecipePreviewModal from '../recipes/RecipePreviewModal'
import Button from '../ui/Button'

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_TYPES = [
  { key: 'all',       label: 'All'       },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch'     },
  { key: 'dinner',    label: 'Dinner'    },
  { key: 'snack',     label: 'Snack'     },
]

const MOOD_OPTIONS = [
  { value: 5, emoji: '😋', label: 'Delicious'  },
  { value: 4, emoji: '👍', label: 'Good'        },
  { value: 3, emoji: '😐', label: 'Okay'        },
  { value: 2, emoji: '🌶️', label: 'Too spicy'  },
  { value: 1, emoji: '⏳', label: 'Too long'    },
]

const SORT_OPTIONS = [
  { key: 'recent',  label: 'Most recent'  },
  { key: 'oldest',  label: 'Oldest first' },
  { key: 'rating',  label: 'Highest rated'},
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByDate(entries) {
  const groups = {}
  for (const e of entries) {
    const key = new Date(e.cooked_at).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    ;(groups[key] = groups[key] || []).push(e)
  }
  return groups
}

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function daysAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7)  return `${d} days ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

function moodEmoji(rating) {
  return MOOD_OPTIONS.find(m => m.value === rating)?.emoji ?? null
}

// ── Meal type selector ────────────────────────────────────────────────────────

function MealTypePicker({ value, onChange }) {
  const types = [
    { key: 'breakfast', emoji: '🌅' },
    { key: 'lunch',     emoji: '☀️'  },
    { key: 'dinner',    emoji: '🌙' },
    { key: 'snack',     emoji: '🍎' },
  ]
  return (
    <div className="flex gap-1.5 flex-wrap">
      {types.map(({ key, emoji }) => (
        <button
          key={key}
          onClick={() => onChange(value === key ? null : key)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border capitalize transition-all"
          style={{
            background:  value === key ? 'var(--amber-light)' : 'var(--cream)',
            borderColor: value === key ? 'var(--amber)'       : 'var(--border)',
            color:       value === key ? 'var(--amber)'       : 'var(--ink-muted)',
            fontWeight:  value === key ? 500                  : 400,
          }}
        >
          {emoji} {key}
        </button>
      ))}
    </div>
  )
}

// ── Mood / rating picker ──────────────────────────────────────────────────────

function MoodPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {MOOD_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          title={opt.label}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all"
          style={{
            background:  value === opt.value ? 'var(--cream-dark)' : 'transparent',
            transform:   value === opt.value ? 'scale(1.15)'       : 'scale(1)',
            border:      `1px solid ${value === opt.value ? 'var(--border)' : 'transparent'}`,
          }}
        >
          {opt.emoji}
        </button>
      ))}
    </div>
  )
}

// ── Weekly stats widget ───────────────────────────────────────────────────────

function WeeklyStats({ weeklyCalories, weekCount }) {
  if (weekCount === 0) return null
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border mb-8"
         style={{ background: 'var(--green-light)', borderColor: 'var(--green-mid)' }}>
      <Flame size={22} style={{ color: 'var(--green)', flexShrink: 0 }} />
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--green)' }}>
          This week
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
          {weekCount} meal{weekCount !== 1 ? 's' : ''} cooked
          {weeklyCalories > 0 && (
            <> · <strong style={{ color: 'var(--ink)' }}>{Math.round(weeklyCalories).toLocaleString()} cal</strong> logged</>
          )}
        </p>
      </div>
    </div>
  )
}

// ── History entry card ────────────────────────────────────────────────────────

function HistoryCard({ entry, cookCount, onRemove, onRatingChange, onMealTypeChange, onCookAgain, onPreview }) {
  const recipe   = entry.recipe_json ?? {}
  const count    = cookCount(entry.recipe_id)
  const [pendingMealType, setPendingMealType] = useState(entry.meal_type ?? null)

  const handleMealType = (val) => {
    setPendingMealType(val)
    onMealTypeChange(entry.id, val)
  }

  const handleRating = (val) => {
    onRatingChange(entry.id, val)
  }

  return (
    <div className="rounded-2xl border overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
         style={{ background: 'white', borderColor: 'var(--border)' }}
         onClick={(e) => { if (!e.defaultPrevented) onPreview(entry) }}>

      {/* Top row: image + title + actions */}
      <div className="flex items-start gap-4 p-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden"
             style={{ background: 'var(--cream-dark)' }}>
          {recipe.image
            ? <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
            {recipe.title ?? 'Unknown recipe'}
          </p>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              {timeStr(entry.cooked_at)}
            </span>
            {entry.rating && (
              <span className="text-sm">{moodEmoji(entry.rating)}</span>
            )}
            {count > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
                {count}× cooked
              </span>
            )}
            {entry.calories_per_serving && (
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                · {Math.round(entry.calories_per_serving)} cal
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.preventDefault(); onCookAgain(recipe) }}
            title="Cook again"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-all"
            style={{
              background:  'var(--green-light)',
              borderColor: 'var(--green-mid)',
              color:       'var(--green)',
              fontWeight:  500,
            }}
          >
            <RotateCcw size={12} /> Cook again
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onRemove(entry.id) }}
            className="p-1.5 rounded-lg transition-colors ml-1"
            style={{ color: 'var(--ink-muted)' }}
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Bottom row: mood picker + meal type */}
      <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-1 border-t flex-wrap gap-y-2"
           style={{ borderColor: 'var(--border)' }}>
        <MoodPicker
          value={entry.rating ?? null}
          onChange={handleRating}
        />
        <MealTypePicker
          value={pendingMealType}
          onChange={handleMealType}
        />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HistoryPage({ user }) {
  const navigate = useNavigate()
  const {
    history, loading,
    logCook, removeEntry, updateEntry,
    cookCount, weeklyCalories, loggedMealTypes,
  } = useCookHistory(user.id)

  const [mealFilter, setMealFilter] = useState('all')
  const [sortKey, setSortKey]       = useState('recent')
  const [previewEntry, setPreviewEntry] = useState(null)

  // Weekly meal count (regardless of filter)
  const weekCutoff = Date.now() - 7 * 24 * 3600 * 1000
  const weekCount  = history.filter(h => new Date(h.cooked_at).getTime() >= weekCutoff).length

  // Filtered + sorted list
  const displayed = useMemo(() => {
    let list = mealFilter === 'all'
      ? history
      : history.filter(h => h.meal_type === mealFilter)

    if (sortKey === 'oldest') list = [...list].reverse()
    else if (sortKey === 'rating') {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    }
    return list
  }, [history, mealFilter, sortKey])

  const grouped  = groupByDate(displayed)
  const dateKeys = Object.keys(grouped)

  const handleRatingChange = async (id, rating) => {
    try { await updateEntry(id, { rating }) } catch { /* silent */ }
  }

  const handleMealTypeChange = async (id, meal_type) => {
    try { await updateEntry(id, { meal_type }) } catch { /* silent */ }
  }

  const handleCookAgain = (recipe) => {
    // Navigate to /recipes and pass recipe in location state
    navigate('/recipes', { state: { cookAgain: recipe } })
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Cook history
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            {history.length > 0
              ? `${history.length} meal${history.length !== 1 ? 's' : ''} cooked total`
              : 'Your cooking journal'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/recipes')}>
          <ChevronLeft size={15} /> Recipes
        </Button>
      </div>

      {/* Weekly stats */}
      <WeeklyStats weeklyCalories={weeklyCalories} weekCount={weekCount} />

      {/* Filter + sort toolbar */}
      {history.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Meal type filter pills */}
          <div className="flex gap-1 flex-wrap">
            {MEAL_TYPES.map(({ key, label }) => {
              const active = mealFilter === key
              const hasEntries = key === 'all' || history.some(h => h.meal_type === key)
              if (!hasEntries) return null
              return (
                <button
                  key={key}
                  onClick={() => setMealFilter(key)}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                  style={{
                    background:  active ? 'var(--ink)'      : 'white',
                    color:       active ? 'white'           : 'var(--ink-muted)',
                    borderColor: active ? 'var(--ink)'      : 'var(--border)',
                    fontWeight:  active ? 500               : 400,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex-1" />

          {/* Sort */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            className="text-xs border rounded-lg px-2.5 py-1.5"
            style={{
              borderColor: 'var(--border)',
              color:       'var(--ink)',
              background:  'white',
            }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse"
                 style={{ background: 'var(--cream-dark)', animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && history.length === 0 && (
        <div className="text-center py-24 fade-in">
          <div className="text-5xl mb-4">🍳</div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            No meals logged yet
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Open a recipe and tap "I Cooked This" — it'll appear in your journal.
          </p>
          <Button onClick={() => navigate('/recipes')}>Find a recipe</Button>
        </div>
      )}

      {/* No results for current filter */}
      {!loading && history.length > 0 && displayed.length === 0 && (
        <div className="text-center py-16 fade-in">
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            No {mealFilter} entries yet. Log a meal and tag it!
          </p>
          <button className="text-xs mt-3 underline" style={{ color: 'var(--ink-muted)' }}
                  onClick={() => setMealFilter('all')}>
            Show all
          </button>
        </div>
      )}

      {/* Timeline */}
      {!loading && dateKeys.length > 0 && (
        <div className="space-y-10 fade-in">
          {dateKeys.map(dateLabel => {
            const entries = grouped[dateLabel]
            return (
              <section key={dateLabel}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[13px] font-medium"
                        style={{ color: 'var(--ink-muted)' }}>
                    {dateLabel}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--cream-dark)', color: 'var(--ink-muted)' }}>
                    {daysAgo(entries[0].cooked_at)}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>

                <div className="space-y-3">
                  {entries.map(entry => (
                    <HistoryCard
                      key={entry.id}
                      entry={entry}
                      cookCount={cookCount}
                      onRemove={removeEntry}
                      onRatingChange={handleRatingChange}
                      onMealTypeChange={handleMealTypeChange}
                      onCookAgain={handleCookAgain}
                      onPreview={setPreviewEntry}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          <div className="text-center pt-4 pb-8">
            <UtensilsCrossed size={20} className="mx-auto mb-2" style={{ color: 'var(--border)' }} />
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              {history.length} meal{history.length !== 1 ? 's' : ''} cooked · keep going!
            </p>
          </div>
        </div>
      )}

      {/* Recipe preview modal — must be here in page scope where previewEntry exists */}
      {previewEntry && (
        <RecipePreviewModal
          entry={previewEntry}
          onClose={() => setPreviewEntry(null)}
        />
      )}
    </div>
  )
}
