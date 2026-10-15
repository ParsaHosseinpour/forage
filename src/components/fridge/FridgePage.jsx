import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Refrigerator } from 'lucide-react'
import { useFridge } from '../../hooks/useFridge'
import { usePantry } from '../../hooks/usePantry'
import IngredientCard from './IngredientCard'
import AddIngredientForm, { CATEGORIES } from './AddIngredientForm'
import PantrySection from './PantrySection'
import Button from '../ui/Button'

const categoryOrder = CATEGORIES.map(c => c.value)

export default function FridgePage({ user }) {
  const { items, loading, add, remove, update } = useFridge(user.id)
  const { staples, isActive, toggle, loading: pantryLoading } = usePantry(user.id)
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  // Group items by category
  const grouped = categoryOrder.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {})

  const categoryMeta = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

  const isEmpty = items.length === 0
  // CTA needs at least 2 ingredients — pantry staples count toward this
  const totalIngredients = items.length + staples.length
  const canFindRecipes = totalIngredients >= 2

  return (
    <div className="max-w-4xl mx-auto px-5 pt-10 pb-28">

      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl mb-1.5">Fridge</h1>
          <p className="text-[15px]" style={{ color: 'var(--ink-muted)' }}>
            {items.length === 0
              ? 'Nothing logged yet.'
              : `${items.length} ingredient${items.length !== 1 ? 's' : ''}`}
            {staples.length > 0 && `, ${staples.length} pantry staple${staples.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus size={16} strokeWidth={2.25} />
          Add ingredient
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6">
          <AddIngredientForm onAdd={add} onClose={() => setShowForm(false)} />
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-[10px] animate-pulse"
              style={{ background: 'var(--bg-sunk)', animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && !showForm && (
        <div className="text-center py-16 fade-in">
          <div
            className="w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--brand-tint)' }}
          >
            <Refrigerator size={26} style={{ color: 'var(--brand)' }} strokeWidth={1.75} />
          </div>
          <h2 className="text-2xl mb-2">Your fridge is empty</h2>
          <p className="text-[15px] mb-6 max-w-sm mx-auto" style={{ color: 'var(--ink-muted)' }}>
            Add what you have and Forage finds recipes that use it up.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Add your first ingredient
          </Button>
        </div>
      )}

      {/* One shelf per category */}
      {!loading && !isEmpty && (
        <div className="space-y-7 mb-10 fade-in">
          {Object.entries(grouped).map(([cat, catItems]) => {
            const { label, Icon } = categoryMeta[cat]
            return (
              <section key={cat} aria-labelledby={`shelf-${cat}`}>
                <h2
                  id={`shelf-${cat}`}
                  className="flex items-center gap-2 text-base mb-2.5"
                  style={{ fontVariationSettings: "'wdth' 100" }}
                >
                  <Icon size={17} strokeWidth={1.75} style={{ color: 'var(--ink-muted)' }} />
                  {label}
                  <span className="text-sm font-normal tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                    {catItems.length}
                  </span>
                </h2>
                <div
                  className="rounded-[14px] border overflow-hidden divide-y"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', '--tw-divide-opacity': 1 }}
                >
                  {catItems.map(item => (
                    <div key={item.id} style={{ borderColor: 'var(--border)' }}>
                      <IngredientCard item={item} onDelete={remove} onUpdate={update} />
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Pantry staples — always shown below fridge items */}
      {!loading && (
        <PantrySection
          isActive={isActive}
          onToggle={toggle}
          loading={pantryLoading}
        />
      )}

      {/* Sticky CTA — the one saffron button in the app */}
      {canFindRecipes && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 md:left-[calc(50%+7.5rem)] -translate-x-1/2 z-30 fade-in">
          <button
            onClick={() => navigate('/recipes')}
            className="flex items-center gap-2.5 pl-5 pr-4 py-3 rounded-[12px] text-[15px] font-semibold transition-colors hover:brightness-95"
            style={{
              background: 'var(--saffron)',
              color:      'var(--ink)',
              boxShadow:  'var(--shadow-md)',
              whiteSpace: 'nowrap',
            }}
          >
            Find recipes from {totalIngredients} ingredient{totalIngredients !== 1 ? 's' : ''}
            <ChevronRight size={18} strokeWidth={2.25} />
          </button>
        </div>
      )}
    </div>
  )
}
