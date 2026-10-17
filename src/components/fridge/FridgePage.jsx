import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { useFridge } from '../../hooks/useFridge'
import { usePantry } from '../../hooks/usePantry'
import IngredientTile from './IngredientTile'
import IngredientSheet from './IngredientSheet'
import StaplesPanel from './StaplesPanel'
import AddIngredientForm from './AddIngredientForm'
import { CATEGORIES } from '../../lib/fridgeConstants'
import Button from '../ui/Button'
import { Input } from '../ui/Input'
import { useDeferredDelete } from '../../hooks/useDeferredDelete'
import PageHeader from '../layout/PageHeader'
import Produce from '../ui/Produce'
import { CATEGORY_ART } from '../../lib/produceMap'
import { IconTile } from '../ui/glyphs'

const categoryOrder = CATEGORIES.map(c => c.value)

/** A filter chip: small illustration, label, count. */
function FilterChip({ active, onClick, art, label, count }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1.5 pl-2 pr-3.5 py-1.5 rounded-full border-[1.5px] text-[14px] whitespace-nowrap flex-shrink-0 transition-colors duration-100"
      style={{
        background:  active ? 'var(--saffron)' : 'var(--surface)',
        borderColor: 'var(--ink)',
        color:       active ? 'var(--ink)'     : 'var(--ink-muted)',
        fontWeight:  active ? 700 : 600,
      }}
    >
      {art ? <Produce name={art} size={22} /> : <span className="w-1.5" />}
      {label}
      <span className="tabular-nums text-[13px]" style={{ opacity: 0.75 }}>{count}</span>
    </button>
  )
}

export default function FridgePage({ user }) {
  const { items, loading, add, remove, update } = useFridge(user.id)
  const { staples, isActive, toggle, loading: pantryLoading } = usePantry(user.id)
  const [showForm, setShowForm]   = useState(false)
  const [prefill, setPrefill]     = useState('')
  const [query, setQuery]         = useState('')
  const [cat, setCat]             = useState('all')        // 'all' | category | 'staples'
  const [editing, setEditing]     = useState(null)
  const { pending, request: requestRemove } = useDeferredDelete(remove)
  const navigate = useNavigate()

  const visible = useMemo(() => items.filter(i => !pending.has(i.id)), [items, pending])

  const counts = useMemo(() => {
    const c = {}
    for (const i of visible) c[i.category] = (c[i.category] ?? 0) + 1
    return c
  }, [visible])

  const q = query.trim().toLowerCase()
  const shown = useMemo(() => {
    return visible
      .filter(i => cat === 'all' || i.category === cat)
      .filter(i => !q || i.name.toLowerCase().includes(q))
      .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name))
  }, [visible, cat, q])

  const isEmpty = visible.length === 0
  const totalIngredients = visible.length + staples.length
  const canFindRecipes = totalIngredients >= 2
  const showStaples = cat === 'staples'

  // If the chosen category empties out (e.g. last item removed), fall back to All.
  const activeCat = (cat === 'all' || cat === 'staples' || counts[cat]) ? cat : 'all'

  const openAdd = (name = '') => { setPrefill(name); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="max-w-5xl mx-auto px-5 pt-0 pb-28">

      <PageHeader
        title="Fridge"
        art="Fridge"
        subtitle={isEmpty
          ? 'Nothing logged yet.'
          : `${visible.length} ingredient${visible.length !== 1 ? 's' : ''}${staples.length > 0 ? `, ${staples.length} pantry staple${staples.length !== 1 ? 's' : ''}` : ''}`}
        actions={
          <Button onClick={() => (showForm ? setShowForm(false) : openAdd())}>
            <Plus size={16} strokeWidth={2.25} />
            Add ingredient
          </Button>
        }
      />

      {showForm && (
        <div className="pt-6">
          <AddIngredientForm key={prefill} onAdd={add} onClose={() => setShowForm(false)} initialName={prefill} />
        </div>
      )}

      {/* Sticky toolbar: always reachable, however long the fridge gets */}
      {!loading && !isEmpty && (
        <div className="sticky top-14 md:top-[68px] z-30 -mx-5 px-5 py-2.5 md:py-3 border-b flex flex-col md:flex-row md:items-center gap-2 md:gap-3"
             style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <div className="relative md:order-2 md:w-64 flex-shrink-0">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-muted)' }} />
            <Input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your fridge"
              aria-label="Search your fridge"
              className="!pl-10 !pr-10 !py-1.5 md:!py-2 !rounded-full !text-[16px]"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-full hover:bg-[var(--bg-sunk)]">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible md:order-1 md:flex-1" role="group" aria-label="Filter by category">
            <FilterChip active={activeCat === 'all'} onClick={() => setCat('all')} label="All" count={visible.length} />
            {categoryOrder.filter(c => counts[c]).map(c => (
              <FilterChip key={c} active={activeCat === c} onClick={() => setCat(c)} art={CATEGORY_ART[c]}
                          label={CATEGORIES.find(x => x.value === c).label} count={counts[c]} />
            ))}
            <FilterChip active={activeCat === 'staples'} onClick={() => setCat('staples')} art="Lentils" label="Staples" count={staples.length} />
          </div>
        </div>
      )}

      <div className="pt-4 sm:pt-6">
        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 pt-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-[118px] rounded-[12px] animate-pulse" style={{ background: 'var(--bg-sunk)', animationDelay: `${i * 40}ms` }} />
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
            <Button onClick={() => openAdd()}>
              <Plus size={16} />
              Add your first ingredient
            </Button>
          </div>
        )}

        {/* Staples tab */}
        {!loading && !isEmpty && showStaples && (
          <StaplesPanel isActive={isActive} onToggle={toggle} loading={pantryLoading} query={query} />
        )}

        {/* Ingredient grid */}
        {!loading && !isEmpty && !showStaples && (
          shown.length > 0 ? (
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 fade-in" aria-live="polite">
              {shown.map(item => <IngredientTile key={item.id} item={item} onOpen={setEditing} />)}
            </div>
          ) : (
            <div className="text-center py-14 fade-in">
              <p className="text-[18px] mb-4">
                {q ? <>No ingredient matches “{query.trim()}”.</> : 'Nothing in this category.'}
              </p>
              {q && <Button variant="secondary" onClick={() => openAdd(query.trim())}><Plus size={15} /> Add “{query.trim()}”</Button>}
            </div>
          )
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

      {/* Sticky CTA */}
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
