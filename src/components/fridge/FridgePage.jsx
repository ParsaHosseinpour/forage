import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { useFridge } from '../../hooks/useFridge'
import { usePantry, DEFAULT_STAPLES } from '../../hooks/usePantry'
import { FridgeScene, FridgeDoor } from './FridgeScene'
import IngredientSheet from './IngredientSheet'
import AddIngredientForm from './AddIngredientForm'
import Button from '../ui/Button'
import { Input } from '../ui/Input'
import { useDeferredDelete } from '../../hooks/useDeferredDelete'
import PageHeader from '../layout/PageHeader'
import { IconTile } from '../ui/glyphs'

export default function FridgePage({ user }) {
  const { items, loading, add, remove, update } = useFridge(user.id)
  const { staples, isActive, toggle, loading: pantryLoading } = usePantry(user.id)
  const [showForm, setShowForm] = useState(false)
  const [prefill, setPrefill]   = useState('')
  const [query, setQuery]       = useState('')
  const [editing, setEditing]   = useState(null)
  const { pending, request: requestRemove } = useDeferredDelete(remove)
  const navigate = useNavigate()

  const visible = useMemo(() => items.filter(i => !pending.has(i.id)), [items, pending])
  const isEmpty = visible.length === 0
  const totalIngredients = visible.length + staples.length
  const canFindRecipes = totalIngredients >= 2

  const q = query.trim().toLowerCase()
  const matchCount = q
    ? visible.filter(i => i.name.toLowerCase().includes(q)).length + DEFAULT_STAPLES.filter(s => s.includes(q)).length
    : 0

  const openAdd = (name = '') => { setPrefill(name); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const subtitle = q
    ? `${matchCount} match${matchCount !== 1 ? 'es' : ''} for “${query.trim()}”`
    : isEmpty
      ? 'Nothing logged yet.'
      : `${visible.length} ingredient${visible.length !== 1 ? 's' : ''}${staples.length > 0 ? `, ${staples.length} staple${staples.length !== 1 ? 's' : ''} on the door` : ''}`

  return (
    <div className="max-w-5xl mx-auto px-5 pb-28">

      <PageHeader
        title="Fridge"
        subtitle={subtitle}
        actions={<>
          <Button onClick={() => (showForm ? setShowForm(false) : openAdd())}>
            <Plus size={16} strokeWidth={2.25} />
            Add ingredient
          </Button>
          {!loading && !isEmpty && (
            <div className="relative flex-1 min-w-[150px] sm:flex-none sm:w-60">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-muted)' }} />
              <Input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Find in the fridge"
                className="!pl-10 !pr-10 !py-2 !rounded-full"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear search"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--bg-sunk)]">
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </>}
      />

      {showForm && (
        <div className="pt-6">
          <AddIngredientForm key={prefill} onAdd={add} onClose={() => setShowForm(false)} initialName={prefill} />
        </div>
      )}

      {q && matchCount === 0 && (
        <p className="pt-6 text-[17px] flex flex-wrap items-center gap-x-4 gap-y-2" role="status">
          <span>Nothing in the fridge matches “{query.trim()}”.</span>
          <Button variant="secondary" size="sm" onClick={() => openAdd(query.trim())}><Plus size={14} /> Add “{query.trim()}”</Button>
        </p>
      )}

      <div className="pt-8 grid gap-6 lg:grid-cols-[1fr_272px] lg:items-start">
        {/* The fridge itself */}
        <div>
          {loading && (
            <div className="fridge-frame" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-[124px] animate-pulse" style={{ background: 'var(--bg-sunk)', borderTop: i ? '3px solid var(--ink)' : 'none', animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          )}

          {!loading && isEmpty && !showForm && (
            <div className="text-center py-14 fade-in">
              <IconTile art="Fridge" />
              <h2 className="text-3xl mb-2">Your fridge is empty</h2>
              <p className="text-[15px] mb-6 max-w-sm mx-auto" style={{ color: 'var(--ink-muted)' }}>
                Add what you have and Forage finds recipes that use it up. Salt, oil and the like go on the door.
              </p>
              <Button onClick={() => openAdd()}>
                <Plus size={16} />
                Add your first ingredient
              </Button>
            </div>
          )}

          {!loading && !isEmpty && <FridgeScene items={visible} query={query} onOpen={setEditing} />}
        </div>

        {/* The door */}
        {!loading && (
          <FridgeDoor isActive={isActive} onToggle={toggle} loading={pantryLoading} query={query} />
        )}
      </div>

      {editing && (
        <IngredientSheet
          item={editing}
          onClose={() => setEditing(null)}
          onSave={update}
          onRemove={(item) => { setEditing(null); requestRemove(item.id, item.name) }}
        />
      )}

      {canFindRecipes && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 fade-in">
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
