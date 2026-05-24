import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFridge } from '../../hooks/useFridge'
import { findRecipesByIngredients, getRecipeDetails } from '../../lib/spoonacular'
import Button from '../ui/Button'
import { ChevronLeft, Clock, Users, Minus } from 'lucide-react'

export default function RecipesPage({ user }) {
  const { items } = useFridge(user.id)
  const [recipes, setRecipes]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError]       = useState('')
  const navigate = useNavigate()

  const ingredientNames = items.map(i => i.name)

  const search = async () => {
    if (ingredientNames.length < 2) return
    setLoading(true)
    setError('')
    setSelected(null)
    setDetail(null)
    try {
      const results = await findRecipesByIngredients(ingredientNames)
      setRecipes(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ingredientNames.length >= 2) search()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openRecipe = async (recipe) => {
    setSelected(recipe)
    setDetail(null)
    setDetailLoading(true)
    try {
      const d = await getRecipeDetails(recipe.id)
      setDetail(d)
    } catch { /* show what we have */ }
    finally { setDetailLoading(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            {selected ? selected.title : 'Recipe matches'}
          </h1>
          {!selected && (
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
              Based on {ingredientNames.length} ingredients in your fridge
            </p>
          )}
        </div>

        {selected ? (
          <Button variant="secondary" onClick={() => { setSelected(null); setDetail(null) }}>
            <ChevronLeft size={15} /> Back to results
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/fridge')}>
              <ChevronLeft size={15} /> Fridge
            </Button>
            <Button onClick={search} loading={loading}>
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 mb-6 text-sm"
             style={{ background: '#FEF2F0', color: 'var(--red-soft)' }}>
          {error}
        </div>
      )}

      {/* Too few ingredients */}
      {ingredientNames.length < 2 && (
        <div className="text-center py-24 fade-in">
          <div className="text-5xl mb-4">🍽️</div>
          <h2 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Add at least 2 ingredients
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Head back to your fridge and log what you have.
          </p>
          <Button onClick={() => navigate('/fridge')}>Go to my fridge</Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse"
                 style={{ background: 'var(--cream-dark)', animationDelay: `${i * 80}ms` }}>
              <div className="h-44" style={{ background: 'var(--border)' }} />
              <div className="p-4 space-y-2">
                <div className="h-4 rounded" style={{ background: 'var(--border)', width: '75%' }} />
                <div className="h-3 rounded" style={{ background: 'var(--border)', width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe grid */}
      {!loading && !selected && recipes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
          {recipes.map(recipe => {
            const matchPct = Math.round(
              (recipe.usedIngredientCount / (recipe.usedIngredientCount + recipe.missedIngredientCount)) * 100
            )
            return (
              <button
                key={recipe.id}
                onClick={() => openRecipe(recipe)}
                className="text-left rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[.99]"
                style={{ background: 'white', borderColor: 'var(--border)' }}
              >
                {recipe.image && (
                  <div className="h-44 overflow-hidden bg-gray-100">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-sm font-medium leading-snug mb-3" style={{ color: 'var(--ink)' }}>
                    {recipe.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: matchPct >= 70 ? 'var(--green-light)' : 'var(--amber-light)',
                              color: matchPct >= 70 ? 'var(--green)' : 'var(--amber)',
                            }}>
                        {matchPct}% match
                      </span>
                    </div>
                    {recipe.missedIngredientCount > 0 && (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                        <Minus size={11} /> {recipe.missedIngredientCount} missing
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Recipe detail */}
      {selected && (
        <div className="fade-in">
          {selected.image && (
            <div className="rounded-2xl overflow-hidden mb-6 h-64 sm:h-80">
              <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
            </div>
          )}

          {detailLoading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-5 rounded animate-pulse" style={{ background: 'var(--cream-dark)', width: `${80 - i * 10}%` }} />
              ))}
            </div>
          )}

          {detail && !detailLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Meta + ingredients */}
              <div className="space-y-6">
                {/* Stats */}
                <div className="flex gap-4">
                  {detail.readyInMinutes && (
                    <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--ink-muted)' }}>
                      <Clock size={14} /> {detail.readyInMinutes} min
                    </div>
                  )}
                  {detail.servings && (
                    <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--ink-muted)' }}>
                      <Users size={14} /> {detail.servings} servings
                    </div>
                  )}
                </div>

                {/* Ingredients */}
                <div>
                  <h2 className="text-lg mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Ingredients
                  </h2>
                  <ul className="space-y-2">
                    {detail.extendedIngredients?.map((ing, i) => {
                      const inFridge = ingredientNames.some(n =>
                        ing.name.toLowerCase().includes(n.toLowerCase()) ||
                        n.toLowerCase().includes(ing.name.toLowerCase())
                      )
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 flex-shrink-0 text-xs">{inFridge ? '✅' : '🛒'}</span>
                          <span style={{ color: inFridge ? 'var(--ink)' : 'var(--ink-muted)' }}>
                            {ing.original}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>

              {/* Instructions */}
              <div className="lg:col-span-2">
                <h2 className="text-lg mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Instructions
                </h2>
                {detail.analyzedInstructions?.[0]?.steps?.length > 0 ? (
                  <ol className="space-y-4">
                    {detail.analyzedInstructions[0].steps.map(step => (
                      <li key={step.number} className="flex gap-4">
                        <span
                          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white mt-0.5"
                          style={{ background: 'var(--green)' }}
                        >
                          {step.number}
                        </span>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                          {step.step}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                    Full instructions available at the source. Open the recipe on Spoonacular for details.
                  </p>
                )}

                {detail.sourceUrl && (
                  <a
                    href={detail.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-6 text-sm"
                    style={{ color: 'var(--green)' }}
                  >
                    View full recipe →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
