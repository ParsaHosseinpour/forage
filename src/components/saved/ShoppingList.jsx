import { ShoppingCart, Check, Trash2, CheckCircle2 } from 'lucide-react'
import Button from '../ui/Button'

function IngRow({ item, isChecked, onToggle, inFridgeSection }) {
  const checked = isChecked(item.name)
  return (
    <li
      onClick={() => !inFridgeSection && onToggle(item.name)}
      className="flex items-start gap-3 py-3 px-4 rounded-xl transition-all duration-150"
      style={{
        background:  inFridgeSection ? 'var(--green-light)'
                   : checked         ? 'var(--cream-dark)'
                   :                   'white',
        cursor:      inFridgeSection ? 'default' : 'pointer',
        opacity:     checked ? 0.6 : 1,
        border:      '1px solid var(--border)',
      }}
    >
      {/* Checkbox / check */}
      <div
        className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-all"
        style={{
          background:  inFridgeSection ? 'var(--green)'
                     : checked         ? 'var(--ink-muted)'
                     :                   'white',
          borderColor: inFridgeSection ? 'var(--green)'
                     : checked         ? 'var(--ink-muted)'
                     :                   'var(--border)',
        }}
      >
        {(checked || inFridgeSection) && (
          <Check size={10} strokeWidth={3} style={{ color: 'white' }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-snug"
          style={{
            color:          inFridgeSection ? 'var(--green)'
                          : checked         ? 'var(--ink-muted)'
                          :                   'var(--ink)',
            textDecoration: checked && !inFridgeSection ? 'line-through' : 'none',
            fontWeight:     inFridgeSection ? 500 : 400,
          }}
        >
          {item.original || item.name}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-muted)' }}>
          {item.recipes.join(', ')}
        </p>
      </div>
    </li>
  )
}

export default function ShoppingList({
  need = [], have = [],
  isChecked, onToggle, onClearAll, checkedCount, loading,
}) {
  const totalItems = need.length

  if (loading) {
    return (
      <div className="space-y-3 mt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse"
               style={{ background: 'var(--cream-dark)', animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    )
  }

  if (totalItems === 0 && have.length === 0) {
    return (
      <div className="text-center py-16 fade-in">
        <div className="text-5xl mb-4">🛒</div>
        <h3 className="text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Your list is empty
        </h3>
        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          Save recipes and their ingredients will appear here, split into what you need
          to buy and what you already have.
        </p>
      </div>
    )
  }

  if (checkedCount === totalItems && totalItems > 0) {
    return (
      <div className="text-center py-16 fade-in">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          You've got everything!
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
          All {totalItems} ingredient{totalItems !== 1 ? 's' : ''} checked off. Time to cook.
        </p>
        <Button variant="secondary" onClick={onClearAll}>
          <Trash2 size={14} /> Clear list
        </Button>
      </div>
    )
  }

  const pending = need.filter(i => !isChecked(i.name))
  const ticked  = need.filter(i =>  isChecked(i.name))

  return (
    <div className="fade-in space-y-8">

      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            {totalItems - checkedCount}
          </span>
          {' '}of {totalItems} still needed
          {have.length > 0 && (
            <span> · <span style={{ color: 'var(--green)' }}>{have.length} already in fridge</span></span>
          )}
        </p>
        {checkedCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs transition-colors"
            style={{ color: 'var(--ink-muted)' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Need to buy */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--ink-muted)' }}>
            🛒 Need to buy ({pending.length})
          </h2>
          <ul className="space-y-2">
            {pending.map(item => (
              <IngRow key={item.name} item={item}
                      isChecked={isChecked} onToggle={onToggle}
                      inFridgeSection={false} />
            ))}
          </ul>
        </section>
      )}

      {/* Ticked off */}
      {ticked.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--ink-muted)' }}>
            ✅ Got it ({ticked.length})
          </h2>
          <ul className="space-y-2">
            {ticked.map(item => (
              <IngRow key={item.name} item={item}
                      isChecked={isChecked} onToggle={onToggle}
                      inFridgeSection={false} />
            ))}
          </ul>
        </section>
      )}

      {/* Already in fridge */}
      {have.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--green)' }}>
            ✅ Already in your fridge ({have.length})
          </h2>
          <ul className="space-y-2">
            {have.map(item => (
              <IngRow key={item.name} item={item}
                      isChecked={isChecked} onToggle={onToggle}
                      inFridgeSection={true} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
