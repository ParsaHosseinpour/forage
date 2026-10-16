import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useFridge } from '../../hooks/useFridge'
import { usePantry } from '../../hooks/usePantry'
import IngredientCard from './IngredientCard'
import AddIngredientForm, { CATEGORIES } from './AddIngredientForm'
import PantrySection from './PantrySection'
import Button from '../ui/Button'
import { useDeferredDelete } from '../../hooks/useDeferredDelete'
import PageHeader from '../layout/PageHeader'
import Produce, { CATEGORY_ART } from '../ui/Produce'
import { IconTile } from '../ui/glyphs'

const categoryOrder = CATEGORIES.map(c => c.value)

export default function FridgePage({ user }) {
  const { items, loading, add, remove, update } = useFridge(user.id)
  const { staples, isActive, toggle, loading: pantryLoading } = usePantry(user.id)
  const [showForm, setShowForm] = useState(false)
  const { pending, request: requestRemove } = useDeferredDelete(remove)
  const visible = items.filter(i => !pending.has(i.id))
  const navigate = useNavigate()

  // Group items by category
  const grouped = categoryOrder.reduce((acc, cat) => {
    const catItems = visible.filter(i => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {})

  const categoryMeta = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

  const isEmpty = visible.length === 0
  // CTA needs at least 2 ingredients — pantry staples count toward this
  const totalIngredients = visible.length + staples.length
  const canFindRecipes = totalIngredients >= 2

  return (
    <div className="max-w-4xl mx-auto px-5 pt-8 pb-28">

      <PageHeader
        width="max-w-4xl"
        title="Fridge"
        art="Fridge"
        subtitle={visible.length === 0
          ? 'Nothing logged yet.'
          : `${visible.length} ingredient${visible.length !== 1 ? 's' : ''}${staples.length > 0 ? `, ${staples.length} pantry staple${staples.length !== 1 ? 's' : ''}` : ''}`}
        actions={
          <Button onClick={() => setShowForm(v => !v)}>
            <Plus size={16} strokeWidth={2.25} />
            Add ingredient
          </Button>
        }
      />

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
          <IconTile art="Fridge" />
          <h2 className="text-3xl mb-2">Your fridge is empty</h2>
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
            const { label } = categoryMeta[cat]
            return (
              <section key={cat} aria-labelledby={`shelf-${cat}`}>
                <h2
                  id={`shelf-${cat}`}
                  className="flex items-center gap-3 text-[26px] mb-3"
                >
                  <Produce name={CATEGORY_ART[cat]} size={34} />
                  {label}
                  <span className="text-base tabular-nums" style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-body)' }}>
                    {catItems.length}
                  </span>
                </h2>
                <div className="divide-y" style={{ borderTop: '2.5px solid var(--ink)', borderBottom: '1px solid var(--border)' }}>
                  {catItems.map(item => (
                    <div key={item.id} style={{ borderColor: 'var(--border)' }}>
                      <IngredientCard item={item} onDelete={(id) => requestRemove(id, item.name)} onUpdate={update} />
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
            className="px-6 py-3 rounded-full text-[16px] font-bold border-2 border-[var(--ink)] bg-[var(--saffron)] text-[var(--ink)] shadow-[0_3px_0_var(--ink)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--ink)] transition-[transform,box-shadow] duration-100 whitespace-nowrap"
          >
            Find recipes from {totalIngredients} ingredient{totalIngredients !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
