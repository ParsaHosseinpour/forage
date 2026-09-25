import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Search, Sprout } from 'lucide-react'
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

  const categoryLabel = Object.fromEntries(
    CATEGORIES.map(c => [c.value, c.label])
  )

  const isEmpty = items.length === 0
  // CTA needs at least 2 ingredients — pantry staples count toward this
  const totalIngredients = items.length + staples.length
  const canFindRecipes = totalIngredients >= 2

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            My Fridge
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            {items.length === 0
              ? 'Add ingredients to get started'
              : `${items.length} ingredient${items.length !== 1 ? 's' : ''} logged`}
            {staples.length > 0 && ` + ${staples.length} pantry staple${staples.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canFindRecipes && (
            <Button
              variant="secondary"
              onClick={() => navigate('/recipes')}
              className="flex items-center gap-1.5"
            >
              <Search size={15} />
              Find recipes
            </Button>
          )}
          <Button onClick={() => setShowForm(v => !v)}>
            <Plus size={16} />
            Add ingredient
          </Button>
        </div>
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
              className="h-14 rounded-xl animate-pulse"
              style={{ background: 'var(--cream-dark)', animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && !showForm && (
        <div className="text-center py-16 fade-in">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--green-light)' }}
          >
            <Sprout size={26} style={{ color: 'var(--green)' }} strokeWidth={1.75} />
          </div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Your fridge is empty
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Log what you have and we'll find recipes that use it up.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Add your first ingredient
          </Button>
        </div>
      )}

      {/* Ingredient list grouped by category */}
      {!loading && !isEmpty && (
        <div className="space-y-8 mb-8 fade-in">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat}>
              <h2 className="text-[13px] font-medium mb-3"
                  style={{ color: 'var(--ink-muted)' }}>
                {categoryLabel[cat]}
              </h2>
              <div className="space-y-2">
                {catItems.map(item => (
                  <IngredientCard
                    key={item.id}
                    item={item}
                    onDelete={remove}
                    onUpdate={update}
                  />
                ))}
              </div>
            </section>
          ))}
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

      {/* Sticky CTA */}
      {canFindRecipes && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 slide-up">
          <button
            onClick={() => navigate('/recipes')}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-transform hover:scale-105 active:scale-100"
            style={{
              background:  'var(--green)',
              boxShadow:   '0 8px 32px rgba(58,99,73,0.35)',
              whiteSpace:  'nowrap',
            }}
          >
            <Search size={16} />
            Find recipes with {totalIngredients} ingredient{totalIngredients !== 1 ? 's' : ''}
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
