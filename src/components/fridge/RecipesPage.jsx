import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { useFridge } from '../../hooks/useFridge'
import { useSavedRecipes } from '../../hooks/useSavedRecipes'
import { usePantry } from '../../hooks/usePantry'
import { useToast } from '../ui/Toast'
import { findRecipes } from '../../lib/spoonacular'
import RecipeCard, { RecipeCardSkeleton } from '../recipes/RecipeCard'
import RecipeDetail from '../recipes/RecipeDetail'
import FilterBar from '../recipes/FilterBar'
import Button from '../ui/Button'

const DEFAULT_FILTERS = {
  diet:    '',
  maxTime: '',
  sort:    'min-missing-ingredients',
}

export default function RecipesPage({ user }) {
  const { items, loading: fridgeLoading }    = useFridge(user.id)
  const { isSaved, toggle: toggleSave }      = useSavedRecipes(user.id)
  const { staples, isActive: isPantry }      = usePantry(user.id)
  const navigate = useNavigate()
  const toast    = useToast()

  const [recipes, setRecipes]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [selected, setSelected] = useState(null)
  const [filters, setFilters]   = useState(DEFAULT_FILTERS)
  const [isDemo, setIsDemo]     = useState(false)

  // Fridge items + pantry staples merged for the API call
  const fridgeNames  = items.map(i => i.name)
  const allIngredients = [...new Set([...fridgeNames, ...staples])]

  const handleSave = useCallback(async (recipe) => {
    const wasSaved = isSaved(recipe.id)
    await toggleSave(recipe)
    toast({
      type:    wasSaved ? 'info' : 'success',
      message: wasSaved
        ? `Removed "${recipe.title}" from saved recipes.`
        : `Saved! Missing ingredients added to your shopping list.`,
      duration: 4000,
    })
  }, [isSaved, toggleSave, toast])

  const search = useCallback(async (activeFilters, ingredients) => {
    const ing = ingredients ?? allIngredients
    if (ing.length < 2) return
    setLoading(true)
    setError('')
    setSelected(null)
    try {
      const { recipes: results, fromMock } = await findRecipes(ing, activeFilters)
      setRecipes(results)
      setIsDemo(fromMock)
      if (fromMock) {
        toast({
          type:    'warning',
          message: 'Daily API limit reached — showing sample recipes so you can keep testing the UX.',
          duration: 8000,
          action: {
            label:   'Learn more',
            onClick: () => window.open('https://spoonacular.com/food-api/pricing', '_blank'),
          },
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIngredients.join(',')])

  useEffect(() => {
    if (!fridgeLoading && allIngredients.length >= 2) {
      search(DEFAULT_FILTERS, allIngredients)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fridgeLoading])

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters)
    search(newFilters)
  }

  const tooFewIngredients = !fridgeLoading && allIngredients.length < 2

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">

      {/* Demo mode banner */}
      {isDemo && !loading && (
        <div className="flex items-start gap-3 rounded-2xl border px-5 py-4 mb-6 fade-in"
             style={{ background: 'var(--amber-light)', borderColor: '#F5D9B8' }}>
          <span className="text-lg leading-none mt-0.5">🧪</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--amber)' }}>
              Showing sample recipes
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#A0622A' }}>
              The Spoonacular daily quota is exhausted. Filters, detail view, saving, and
              shopping list all work with demo data. Add a fresh API key in your{' '}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer"
                 className="underline underline-offset-2">Vercel env vars</a>{' '}
              to restore live data.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      {!selected && (
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                Recipe matches
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

          {/* Ingredient chips — fridge items + pantry staples shown separately */}
          {allIngredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {fridgeNames.map(name => (
                <span key={name}
                      className="text-xs px-3 py-1 rounded-full border"
                      style={{ background: 'white', borderColor: 'var(--border)', color: 'var(--ink)' }}>
                  {name}
                </span>
              ))}
              {staples.map(name => (
                <span key={`pantry-${name}`}
                      className="text-xs px-3 py-1 rounded-full border"
                      style={{
                        background:  'var(--amber-light)',
                        borderColor: '#F5D9B8',
                        color:       'var(--amber)',
                      }}>
                  🫙 {name}
                </span>
              ))}
            </div>
          )}

          {!tooFewIngredients && (
            <FilterBar
              filters={filters}
              onChange={handleFiltersChange}
              resultCount={loading ? null : recipes.length}
              loading={loading}
            />
          )}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl p-4 mb-6 text-sm fade-in"
             style={{ background: '#FEF2F0', color: 'var(--red-soft)' }}>
          <strong>Something went wrong:</strong> {error}
        </div>
      )}

      {/* Too few ingredients */}
      {tooFewIngredients && (
        <div className="text-center py-24 fade-in">
          <div className="text-5xl mb-4">🧅</div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Add at least 2 ingredients
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Head back to your fridge and log what you have — or activate pantry staples.
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
          onBack={() => setSelected(null)}
          isSaved={isSaved(selected.id)}
          onSave={() => handleSave(selected)}
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
          <div className="text-5xl mb-4">🤷</div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            No recipes found
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Try loosening the filters or adding more ingredients.
          </p>
          <Button variant="secondary" onClick={() => handleFiltersChange(DEFAULT_FILTERS)}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  )
}
