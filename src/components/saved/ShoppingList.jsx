import { ShoppingCart, Check, Trash2, PackageCheck } from 'lucide-react'
import Button from '../ui/Button'

export default function ShoppingList({ items, isChecked, onToggle, onClearAll, checkedCount, loading }) {

  if (loading) {
    return (
      <div className="space-y-3 mt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl animate-pulse"
               style={{ background: 'var(--cream-dark)', animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 fade-in">
        <div className="text-5xl mb-4">🛒</div>
        <h3 className="text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Your list is empty
        </h3>
        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          Save recipes and their missing ingredients will appear here automatically.
        </p>
      </div>
    )
  }

  // All checked — done state
  if (checkedCount === items.length) {
    return (
      <div className="text-center py-16 fade-in">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          You've got everything!
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
          All {items.length} ingredient{items.length !== 1 ? 's' : ''} checked off.
          Time to cook.
        </p>
        <Button variant="secondary" onClick={onClearAll}>
          <Trash2 size={14} /> Clear list
        </Button>
      </div>
    )
  }

  const pending = items.filter(i => !isChecked(i.name))
  const done    = items.filter(i => isChecked(i.name))

  return (
    <div className="fade-in">

      {/* Summary bar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            {items.length - checkedCount}
          </span> item{items.length - checkedCount !== 1 ? 's' : ''} remaining
          {checkedCount > 0 && ` · ${checkedCount} checked`}
        </p>
        {checkedCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'var(--ink-muted)' }}
          >
            <Trash2 size={11} /> Clear checked
          </button>
        )}
      </div>

      {/* Pending items */}
      <ul className="space-y-2 mb-6">
        {pending.map(item => (
          <ShoppingItem key={item.name} item={item} checked={false} onToggle={onToggle} />
        ))}
      </ul>

      {/* Done items — visually muted */}
      {done.length > 0 && (
        <>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
             style={{ color: 'var(--ink-muted)' }}>
            In cart ({done.length})
          </p>
          <ul className="space-y-2">
            {done.map(item => (
              <ShoppingItem key={item.name} item={item} checked={true} onToggle={onToggle} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ShoppingItem({ item, checked, onToggle }) {
  return (
    <li>
      <button
        onClick={() => onToggle(item.name)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150"
        style={{
          background:   checked ? 'var(--cream-dark)'  : 'white',
          borderColor:  checked ? 'var(--border)'      : 'var(--border)',
          opacity:      checked ? 0.65                 : 1,
        }}
      >
        {/* Checkbox */}
        <div
          className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150"
          style={{
            borderColor: checked ? 'var(--green)' : 'var(--border)',
            background:  checked ? 'var(--green)' : 'white',
          }}
        >
          {checked && <Check size={11} color="white" strokeWidth={3} />}
        </div>

        {/* Name + amount */}
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-medium"
            style={{
              color:          'var(--ink)',
              textDecoration: checked ? 'line-through' : 'none',
            }}
          >
            {item.name}
          </span>
          {item.amount && (
            <span className="text-xs ml-2" style={{ color: 'var(--ink-muted)' }}>
              {item.amount}
            </span>
          )}
        </div>

        {/* Which recipes need this */}
        <div className="hidden sm:flex gap-1 flex-wrap justify-end max-w-[200px]">
          {item.recipes.slice(0, 2).map(r => (
            <span
              key={r}
              className="text-xs px-2 py-0.5 rounded-full truncate max-w-[120px]"
              style={{ background: 'var(--cream-dark)', color: 'var(--ink-muted)' }}
              title={r}
            >
              {r.length > 18 ? r.slice(0, 17) + '…' : r}
            </span>
          ))}
          {item.recipes.length > 2 && (
            <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--cream-dark)', color: 'var(--ink-muted)' }}>
              +{item.recipes.length - 2}
            </span>
          )}
        </div>
      </button>
    </li>
  )
}
