import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, RefreshCw, Users, Carrot, SearchX } from 'lucide-react'
import { useFridge } from '../../hooks/useFridge'
import { useSavedRecipes } from '../../hooks/useSavedRecipes'
import { usePantry } from '../../hooks/usePantry'
import { useCookHistory } from '../../hooks/useCookHistory'
import { useMealPlan } from '../../hooks/useMealPlan'
import { useToast } from '../ui/Toast'
import { findRecipes } from '../../lib/recipeEngine'
import RecipeCard, { RecipeCardSkeleton } from '../recipes/RecipeCard'
import RecipeDetail from '../recipes/RecipeDetail'
import FilterBar from '../recipes/FilterBar'
import Button from '../ui/Button'
import { IconTile } from '../ui/glyphs'
import { getPrefs } from '../../lib/preferences'
import { useBackToClose } from '../../hooks/useBackToClose'

// 'popularity' is the best-match-% sort mode (see recipeDb.js) — used as the
// default so the initial view's order always agrees with the % shown on
// each card. The other three named modes remain available and distinct
// for anyone who explicitly wants "fewest missing" or "most matching" etc.
const DEFAULT_FILTERS = { diet: '', maxTime: '', sort: 'popularity' }

const SERVING_OPTIONS = [
  { label: '1 Person',    value: 1 },
  { label: '2 People',    value: 2 },
  { label: '4 People',    value: 4 },
  { label: '6+ Family',   value: 6 },
]

function QuickServingSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold flex items-center gap-1.5" style={{ whiteSpace: 'nowrap' }}>
        <Users size={15} strokeWidth={1.75} style={{ color: 'var(--ink-muted)' }} />
        Servings
      </span>
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {SERVING_OPTIONS.map(opt => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(active ? null : opt.value)}
              className="px-3 py-1 rounded-[8px] text-[13px] border transition-colors duration-150 whitespace-nowrap"
              aria-pressed={active}
              style={{
                background:  active ? 'var(--brand-tint)' : 'var(--surface)',
                borderColor: active ? 'var(--brand-soft)' : 'var(--border)',
                color:       active ? 'var(--brand)'      : 'var(--ink-muted)',
                fontWeight:  active ? 600 : 500,
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function RecipesPage({ user }) {
  const fridgeHook                            = useFridge(user.id)
  const location                              = useLocation()
  const { items, loading: fridgeLoading }     = fridgeHook
  const { isSaved, toggle: toggleSave }       = useSavedRecipes(user.id)
  const { staples, loading: pantryLoading }   = usePantry(user.id)
  const { logCook }                           = useCookHistory(user.id)
  const { addSlot }                            = useMealPlan(user.id)
  const navigate = useNavigate()
  const toast    = useToast()

  const [recipes, setRecipes]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [selected, setSelected]       = useState(null)
  useBackToClose(!!selected, () => setSelected(null))
  const prefs        = getPrefs(user)
  const startFilters = { ...DEFAULT_FILTERS, diet: prefs.defaultDiet }
  const [filters, setFilters]         = useState(startFilters)
  // BUG 2: global serving override — null = use recipe's own default
  const [globalServings, setGlobalServings] = useState(prefs.defaultServings)

  const fridgeNames    = items.map(i => i.name)
  const allIngredients = [...new Set([...fridgeNames, ...staples])]

  // Chips: fridge items first, then pantry staples. Past a few extra, collapse.
  const CHIP_LIMIT = 8
  const [showAllChips, setShowAllChips] = useState(false)
  const chips = [
    ...fridgeNames.map(name => ({ name, kind: 'fridge' })),
    ...staples.filter(n => !fridgeNames.includes(n)).map(name => ({ name, kind: 'staple' })),
  ]
  const collapsible = chips.length > CHIP_LIMIT + 2
  const visibleChips = showAllChips || !collapsible ? chips : chips.slice(0, CHIP_LIMIT)
  const hiddenChipCount = chips.length - visibleChips.length

  // BUG 1 FIX: track whether we've already fired the initial search.
  // The old effect only depended on fridgeLoading, so when pantry arrived
  // async after fridge it didn't re-fire — ingredients were stale/incomplete.
  // Solution: fire search once both fridgeLoading AND pantryLoading are false.
  const hasSearched = useRef(false)

  const search = useCallback(async (activeFilters, ingredients) => {
    const ing = ingredients ?? allIngredients
    if (ing.length < 1) return
    setLoading(true)
    setError('')
    setSelected(null)
    try {
      const { recipes: results } = await findRecipes(ing, activeFilters)
      setRecipes(results)
      if (results.length === 0) {
        toast({
          type: 'info',
          message: 'No recipes matched. Try adding more ingredients or loosening filters.',
          duration: 5000,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [allIngredients.join(',')]) // eslint-disable-line

  // Initial search — waits for BOTH fridge AND pantry to finish loading
  useEffect(() => {
    if (fridgeLoading || pantryLoading) return         // still loading
    if (hasSearched.current) return                    // already fired
    if (allIngredients.length < 1) return              // nothing to search

    hasSearched.current = true
    search(startFilters, allIngredients)
  }) // intentionally no dep array — runs after every render until hasSearched fires

  // Cook Again — detect navigation state from HistoryPage
  useEffect(() => {
    const again = location.state?.cookAgain
    if (again) {
      setSelected(again)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters)
    search(newFilters)
  }

  const handleSave = useCallback(async (recipe) => {
    const wasSaved = isSaved(recipe.id)
    await toggleSave(recipe)
    toast({
      type:    wasSaved ? 'info' : 'success',
      message: wasSaved
        ? `Removed "${recipe.title}" from saved.`
        : 'Saved! Missing ingredients added to shopping list.',
      duration: 4000,
    })
  }, [isSaved, toggleSave, toast])

  const handleCook = useCallback(async (plan) => {
    for (const item of plan) {
      try {
        if (item.willDelete) await fridgeHook.remove(item.fridgeItem.id)
        else if (item.canCompute) await fridgeHook.update(item.fridgeItem.id, {
          quantity: Math.round(item.remaining * 100) / 100,
        })
      } catch (err) { console.error('Cook deduction:', err) }
    }
    try { await logCook(selected) } catch { /* non-fatal */ }
    toast({ type: 'success', message: 'Fridge updated. Enjoy your meal.', duration: 4000 })
  }, [fridgeHook, logCook, selected, toast])

  const handleSchedule = async (dayIdx, slotType, recipe, weekOffset = 0) => {
    await addSlot(dayIdx, slotType, recipe, weekOffset)
    toast({ type: 'success', message: `${recipe.title} added to ${slotType} on ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dayIdx]}${weekOffset ? ' next week' : ''}.`, duration: 4000 })
  }

  const tooFewIngredients = !fridgeLoading && !pantryLoading && allIngredients.length < 1

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">

      {/* Header */}
      {!selected && (
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl mb-1.5">
                Recipes
              </h1>
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                {fridgeNames.length} fridge item{fridgeNames.length !== 1 ? 's' : ''}
                {staples.length > 0 && ` + ${staples.length} pantry staple${staples.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate('/fridge')}>
                <ChevronLeft size={15} /> Fridge
              </Button>
              <Button variant="secondary" loading={loading} onClick={() => search(filters)}>
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>
          </div>

          {/* Ingredient chips — capped so a full fridge doesn't push recipes off screen */}
          {allIngredients.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {visibleChips.map(({ name, kind }) => (
                  <span key={`${kind}-${name}`} className="text-[13px] px-2.5 py-1 rounded-[6px] border"
                        style={kind === 'staple'
                          ? { background: 'var(--fresh-tint)', borderColor: 'var(--fresh-soft)', color: 'var(--fresh)' }
                          : { background: 'var(--surface)',    borderColor: 'var(--border)',     color: 'var(--ink)' }}>
                    {name}
                  </span>
                ))}
                {hiddenChipCount > 0 && (
                  <button
                    onClick={() => setShowAllChips(true)}
                    className="text-[13px] font-semibold px-2.5 py-1 rounded-[6px]"
                    style={{ color: 'var(--brand)' }}
                  >
                    +{hiddenChipCount} more
                  </button>
                )}
                {showAllChips && chips.length > CHIP_LIMIT + 2 && (
                  <button
                    onClick={() => setShowAllChips(false)}
                    className="text-[13px] font-semibold px-2.5 py-1 rounded-[6px]"
                    style={{ color: 'var(--brand)' }}
                  >
                    Show fewer
                  </button>
                )}
              </div>
            </div>
          )}

          {/* BUG 2: Quick serving selector */}
          {recipes.length > 0 && (
            <div className="mb-4">
              <QuickServingSelector value={globalServings} onChange={setGlobalServings} />
            </div>
          )}

          {!tooFewIngredients && (
            <FilterBar filters={filters} onChange={handleFiltersChange}
                       resultCount={loading ? null : recipes.length} loading={loading} />
          )}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl p-4 mb-6 text-sm fade-in"
             style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
          <strong>Search failed:</strong> {error}
        </div>
      )}

      {/* Too few ingredients */}
      {tooFewIngredients && (
        <div className="text-center py-24 fade-in">
          <IconTile Icon={Carrot} />
          <h2 className="text-2xl mb-2">Add an ingredient first</h2>
          <p className="text-[15px] mb-6" style={{ color: 'var(--ink-muted)' }}>
            Log what you have in your fridge and Forage finds matching recipes.
          </p>
          <Button onClick={() => navigate('/fridge')}>
            <ChevronLeft size={15} /> Go to my fridge
          </Button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 60}ms` }}>
              <RecipeCardSkeleton />
            </div>
          ))}
        </div>
      )}

      {/* Recipe detail */}
      {selected && !loading && (
        <RecipeDetail
          recipe={selected}
          fridgeIngredients={allIngredients}
          fridgeItems={items}
          pantryStaples={staples}
          globalServings={globalServings}
          onBack={() => setSelected(null)}
          isSaved={isSaved(selected.id)}
          onSave={() => handleSave(selected)}
          onCook={handleCook}
          onSchedule={handleSchedule}
        />
      )}

      {/* Recipe grid */}
      {!loading && !selected && recipes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 fade-in">
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={setSelected}
              isSaved={isSaved(recipe.id)}
              onSave={() => handleSave(recipe)}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && !selected && recipes.length === 0 && !tooFewIngredients && !error && (
        <div className="text-center py-24 fade-in">
          <IconTile Icon={SearchX} />
          <h2 className="text-2xl mb-2">No recipes match</h2>
          <p className="text-[15px] mb-6" style={{ color: 'var(--ink-muted)' }}>
            Clear a filter or add more ingredients to your fridge.
          </p>
          <Button variant="secondary" onClick={() => handleFiltersChange(DEFAULT_FILTERS)}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  )
}
