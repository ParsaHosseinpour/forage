import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronLeft, UtensilsCrossed } from 'lucide-react'
import { useCookHistory } from '../../hooks/useCookHistory'
import Button from '../ui/Button'

// Group history entries by calendar date
function groupByDate(entries) {
  const groups = {}
  for (const entry of entries) {
    const d = new Date(entry.cooked_at)
    const key = d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(entry)
  }
  return groups
}

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function daysAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`
}

export default function HistoryPage({ user }) {
  const navigate = useNavigate()
  const { history, loading, removeEntry, cookCount } = useCookHistory(user.id)

  const grouped = groupByDate(history)
  const dateKeys = Object.keys(grouped)

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Cook history
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            {history.length > 0
              ? `${history.length} meal${history.length !== 1 ? 's' : ''} cooked`
              : 'Your cooking journal'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/recipes')}>
          <ChevronLeft size={15} /> Recipes
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse"
                 style={{ background: 'var(--cream-dark)', animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && history.length === 0 && (
        <div className="text-center py-24 fade-in">
          <div className="text-5xl mb-4">🍳</div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            No meals logged yet
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Open a recipe and tap "I Cooked This" — it will appear here as part of your
            cooking journal.
          </p>
          <Button onClick={() => navigate('/recipes')}>
            Find a recipe
          </Button>
        </div>
      )}

      {/* Timeline */}
      {!loading && dateKeys.length > 0 && (
        <div className="space-y-10 fade-in">
          {dateKeys.map(dateLabel => {
            const entries = grouped[dateLabel]
            return (
              <section key={dateLabel}>

                {/* Date heading */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-medium uppercase tracking-widest"
                        style={{ color: 'var(--ink-muted)' }}>
                    {dateLabel}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--cream-dark)', color: 'var(--ink-muted)' }}>
                    {daysAgo(entries[0].cooked_at)}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>

                {/* Entries for this date */}
                <div className="space-y-3">
                  {entries.map(entry => {
                    const recipe = entry.recipe_json ?? {}
                    const count  = cookCount(entry.recipe_id)
                    return (
                      <div
                        key={entry.id}
                        className="group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-150"
                        style={{
                          background:  'white',
                          borderColor: 'var(--border)',
                          boxShadow:   'var(--shadow)',
                        }}
                      >
                        {/* Recipe image or icon */}
                        <div
                          className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden"
                          style={{ background: 'var(--cream-dark)' }}
                        >
                          {recipe.image
                            ? <img src={recipe.image} alt={recipe.title}
                                   className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">
                                🍽️
                              </div>
                          }
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                            {recipe.title ?? 'Unknown recipe'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                              {timeStr(entry.cooked_at)}
                            </span>
                            {count > 1 && (
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
                                Cooked {count}× total
                              </span>
                            )}
                            {recipe.readyInMinutes && (
                              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                                · {recipe.readyInMinutes} min recipe
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete entry */}
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--ink-muted)' }}
                          title="Remove from history"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {/* Motivational footer */}
          <div className="text-center pt-4 pb-8">
            <UtensilsCrossed size={20} className="mx-auto mb-2" style={{ color: 'var(--border)' }} />
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              {history.length} meal{history.length !== 1 ? 's' : ''} cooked ·{' '}
              keep going!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
