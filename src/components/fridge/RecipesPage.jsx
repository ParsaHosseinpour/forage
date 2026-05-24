import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { useFridge } from '../../hooks/useFridge'
import { useSavedRecipes } from '../../hooks/useSavedRecipes'
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
  const { items, loading: fridgeLoading } = useFridge(user.id)
  const { isSaved, toggle: toggleSave }   = useSavedRecipes(user.id)
  const navigate = useNavigate()

  const [recipes, setRecipes]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [selected, setSelected] = useState(null)
  const [filters, setFilters]   = useState(DEFAULT_FILTERS)

  const ingredientNames = items.map(i => i.name)

  const search = useCallback(async (activeFilters) => {
    if (ingredientNames.length < 2) return
    setLoading(true)
    setError('')
    setSelected(null)
    try {
      const results = await findRecipes(ingredientNames, activeFilters)
      setRecipes(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientNames.join(',')])

  useEffect(() => {
    if (!fridgeLoading && ingredientNames.length >= 2) {
      search(DEFAULT_FILTERS)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fridgeLoading])

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters)
    search(newFilters)
  }

  const tooFew = !fridgeLoading && ingredientNames.length < 2

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">

      {!selected && (
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                Recipe matches
              </h1>
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                {ingredientNames.length} ingredient{ingredientNames.length !== 1 ? 's' : ''} from your fridge
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

          {/* Ingredient chips */}
          {ingredientNames.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {ingredientNames.map(name => (
                <span key={name} className="text-xs px-3 py-1 rounded-full border"
                      style={{ background: 'white', borderColor: 'var(--border)', color: 'var(--ink)' }}>
                  {name}
                </span>
              ))}
            </div>
          )}

          {!tooFew && (
            <FilterBar
              filters={filters}
              onChange={handleFiltersChange}
              resultCount={loading ? null : recipes.length}
              loading={loading}
            />
          )}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl p-4 mb-6 text-sm fade-in"
             style={{ background: '#FEF2F0', color: 'var(--red-soft)' }}>
          <strong>Something went wrong:</strong> {error}
        </div>
      )}

      {tooFew && (
        <div className="text-center py-24 fade-in">
          <div className="text-5xl mb-4">🧅</div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Add at least 2 ingredients
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Head back to your fridge and log what you have.
          </p>
          <Button onClick={() => navigate('/fridge')}>
            <ChevronLeft size={15} /> Go to my fridge
          </Button>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 60}ms` }}>
              <RecipeCardSkeleton />
            </div>
          ))}
        </div>
      )}

      {selected && !loading && (
        <RecipeDetail
          recipe={selected}
          fridgeIngredients={ingredientNames}
          onBack={() => setSelected(null)}
          isSaved={isSaved(selected.id)}
          onSave={() => toggleSave(selected)}
        />
      )}

      {!loading && !selected && recipes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 fade-in">
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={setSelected}
              isSaved={isSaved(recipe.id)}
              onSave={() => toggleSave(recipe)}
            />
          ))}
        </div>
      )}

      {!loading && !selected && recipes.length === 0 && !tooFew && !error && (
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
