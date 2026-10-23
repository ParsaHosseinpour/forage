import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { useFridge } from '../../hooks/useFridge'
import { usePantry, DEFAULT_STAPLES } from '../../hooks/usePantry'
import FridgeIndex from './FridgeIndex'
import IngredientSheet from './IngredientSheet'
import AddIngredientForm from './AddIngredientForm'
import Button from '../ui/Button'
import { Input } from '../ui/Input'
import { useDeferredDelete } from '../../hooks/useDeferredDelete'
import PageHeader from '../layout/PageHeader'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import OfflineNotice from '../ui/OfflineNotice'

export default function FridgePage({ user }) {
  const { items, loading, error, add, remove, update, reload } = useFridge(user.id)
  const online = useOnlineStatus()
  const { staples, isActive, toggle, loading: pantryLoading } = usePantry(user.id)
  const [showForm, setShowForm] = useState(false)
  const [prefill, setPrefill]   = useState('')
  const [query, setQuery]       = useState('')
  const [editing, setEditing]   = useState(null)
  const { pending, request: requestRemove } = useDeferredDelete(remove)
  const navigate = useNavigate()

  const visible = useMemo(() => items.filter(i => !pending.has(i.id)), [items, pending])
  const isEmpty = visible.length === 0
  const loadFailed = !loading && isEmpty && (!online || Boolean(error))
  const totalIngredients = visible.length + staples.length
  const canFindRecipes = totalIngredients >= 2

  const q = query.trim().toLowerCase()
  const matchCount = q
    ? visible.filter(i => i.name.toLowerCase().includes(q)).length + DEFAULT_STAPLES.filter(s => s.includes(q)).length
    : 0

  const openAdd = (name = '') => { setPrefill(name); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const subtitle = loadFailed
    ? 'Can’t load right now.'
    : isEmpty
    ? 'Nothing logged yet.'
    : `${visible.length} ingredient${visible.length !== 1 ? 's' : ''}${staples.length > 0 ? `, ${staples.length} staple${staples.length !== 1 ? 's' : ''}` : ''}`

  return (
    <div className="max-w-5xl mx-auto px-5 pb-20">

      <PageHeader
        title="Fridge"
        subtitle={subtitle}
        actions={<>
          <Button onClick={() => (showForm ? setShowForm(false) : openAdd())}>
            <Plus size={16} strokeWidth={2.25} />
            Add ingredient
          </Button>
          <Button variant="secondary" disabled={!canFindRecipes} onClick={() => navigate('/recipes')}>
            Find recipes
          </Button>
        </>}
      />

      {showForm && (
        <div className="pt-6">
          <AddIngredientForm key={prefill} onAdd={add} onClose={() => setShowForm(false)} initialName={prefill} />
        </div>
      )}

      {!loading && !isEmpty && (
        <div className="pt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="relative w-full sm:w-80">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-muted)' }} />
            <Input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your fridge"
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
          {q && (
            <p className="text-[15px]" role="status" style={{ color: 'var(--ink-muted)' }}>
              {matchCount === 0
                ? <>Nothing matches “{query.trim()}”.</>
                : <>{matchCount} match{matchCount !== 1 ? 'es' : ''}</>}
            </p>
          )}
          {q && matchCount === 0 && (
            <Button variant="secondary" size="sm" onClick={() => openAdd(query.trim())}>
              <Plus size={14} /> Add “{query.trim()}”
            </Button>
          )}
        </div>
      )}

      <div className="pt-6">
        {loading && (
          <div aria-hidden="true" className="space-y-3 pt-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-6 rounded animate-pulse" style={{ background: 'var(--bg-sunk)', width: `${88 - (i % 4) * 14}%`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        )}

        {loadFailed && <OfflineNotice what="fridge" onRetry={reload} />}

        {!loading && isEmpty && !showForm && !loadFailed && (
          <div className="pb-8">
            <h2 className="text-3xl mb-2">Your fridge is empty</h2>
            <p className="text-[16px] mb-5 max-w-md" style={{ color: 'var(--ink-muted)' }}>
              Add what you have and Forage finds recipes that use it up. Things you always have, like salt and oil, you can switch on below.
            </p>
            <Button onClick={() => openAdd()}>
              <Plus size={16} />
              Add your first ingredient
            </Button>
          </div>
        )}

        {!loading && !loadFailed && (
          <FridgeIndex
            items={visible}
            query={query}
            onOpen={setEditing}
            isActive={isActive}
            onToggle={toggle}
            loadingStaples={pantryLoading}
          />
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
    </div>
  )
}
