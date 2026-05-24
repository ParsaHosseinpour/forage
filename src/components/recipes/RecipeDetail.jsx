import { useState, useEffect } from 'react'
import { Clock, Users, ChevronLeft, ExternalLink, ShoppingCart, CheckCircle2, Loader2 } from 'lucide-react'
import { getRecipeDetails } from '../../lib/spoonacular'
import Button from '../ui/Button'
import SaveButton from './SaveButton'

function NutrientPill({ label, value }) {
  return (
    <div className="text-center px-3 py-2 rounded-xl" style={{ background: 'var(--cream-dark)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>{label}</p>
    </div>
  )
}

export default function RecipeDetail({ recipe, fridgeIngredients, onBack, isSaved = false, onSave }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    // Pass full recipe for mock IDs (>=9000) so no second API call fires
    getRecipeDetails(recipe.id, recipe.id >= 9000 ? recipe : null)
      .then(({ detail }) => setDetail(detail))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [recipe.id])

  const fridgeNames = fridgeIngredients.map(n => n.toLowerCase())
  const inFridge = (ingName) =>
    fridgeNames.some(f => f.includes(ingName.toLowerCase()) || ingName.toLowerCase().includes(f))

  const steps = detail?.analyzedInstructions?.[0]?.steps ?? []
  const nutrition = detail?.nutrition?.nutrients ?? []
  const calories  = nutrition.find(n => n.name === 'Calories')
  const protein   = nutrition.find(n => n.name === 'Protein')
  const carbs     = nutrition.find(n => n.name === 'Carbohydrates')
  const fat       = nutrition.find(n => n.name === 'Fat')

  return (
    <div className="fade-in">

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'var(--ink-muted)' }}
      >
        <ChevronLeft size={16} /> Back to results
      </button>

      {/* Hero image */}
      {(recipe.image || detail?.image) && (
        <div className="rounded-2xl overflow-hidden mb-8"
             style={{ height: 'clamp(200px, 35vw, 360px)', background: 'var(--cream-dark)' }}>
          <img
            src={detail?.image || recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title + meta */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl sm:text-4xl leading-tight"
              style={{ fontFamily: 'Playfair Display, serif' }}>
            {recipe.title}
          </h1>
          {onSave && (
            <SaveButton saved={isSaved} onClick={onSave} size="lg" className="flex-shrink-0 mt-1" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--ink-muted)' }}>
          {(recipe.readyInMinutes || detail?.readyInMinutes) && (
            <span className="flex items-center gap-1.5">
              <Clock size={15} />
              {recipe.readyInMinutes || detail.readyInMinutes} min
            </span>
          )}
          {(recipe.servings || detail?.servings) && (
            <span className="flex items-center gap-1.5">
              <Users size={15} />
              {recipe.servings || detail.servings} servings
            </span>
          )}
          {detail?.sourceUrl && (
            <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 ml-auto transition-colors hover:text-[var(--green)]">
              Full recipe <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Diet tags */}
        {(recipe.diets ?? detail?.diets ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {(recipe.diets ?? detail.diets).map(d => (
              <span key={d} className="text-xs px-3 py-1 rounded-full"
                    style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Nutrition strip */}
      {calories && (
        <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
          {calories && <NutrientPill label="Calories" value={Math.round(calories.amount)} />}
          {protein  && <NutrientPill label="Protein"  value={`${Math.round(protein.amount)}g`} />}
          {carbs    && <NutrientPill label="Carbs"    value={`${Math.round(carbs.amount)}g`} />}
          {fat      && <NutrientPill label="Fat"      value={`${Math.round(fat.amount)}g`} />}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center" style={{ color: 'var(--ink-muted)' }}>
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading recipe details…</span>
        </div>
      )}

      {error && (
        <p className="text-sm py-4" style={{ color: 'var(--red-soft)' }}>
          Couldn't load full details — {error}
        </p>
      )}

      {/* Two-column body */}
      {!loading && detail && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* ── Ingredients ── */}
          <aside className="lg:col-span-2">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Ingredients
            </h2>

            {/* Have / Need split */}
            {(() => {
              const all   = detail.extendedIngredients ?? []
              const have  = all.filter(i => inFridge(i.name))
              const need  = all.filter(i => !inFridge(i.name))
              return (
                <div className="space-y-5">
                  {have.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest mb-2"
                         style={{ color: 'var(--green)' }}>
                        ✅ In your fridge ({have.length})
                      </p>
                      <ul className="space-y-2">
                        {have.map((ing, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0"
                                          style={{ color: 'var(--green)' }} />
                            <span style={{ color: 'var(--ink)' }}>{ing.original}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {need.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest mb-2"
                         style={{ color: 'var(--amber)' }}>
                        🛒 Need to buy ({need.length})
                      </p>
                      <ul className="space-y-2">
                        {need.map((ing, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ShoppingCart size={14} className="mt-0.5 flex-shrink-0"
                                          style={{ color: 'var(--amber)' }} />
                            <span style={{ color: 'var(--ink-muted)' }}>{ing.original}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()}
          </aside>

          {/* ── Instructions ── */}
          <section className="lg:col-span-3">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Instructions
            </h2>

            {steps.length > 0 ? (
              <ol className="space-y-5">
                {steps.map(step => (
                  <li key={step.number} className="flex gap-4">
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ background: 'var(--green)', marginTop: 2 }}
                    >
                      {step.number}
                    </span>
                    <div>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                        {step.step}
                      </p>
                      {/* Equipment used in this step */}
                      {step.equipment?.length > 0 && (
                        <p className="text-xs mt-1.5" style={{ color: 'var(--ink-muted)' }}>
                          🍳 {step.equipment.map(e => e.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                <p className="mb-3">Full step-by-step instructions are on the original recipe page.</p>
                {detail.sourceUrl && (
                  <Button
                    variant="secondary"
                    onClick={() => window.open(detail.sourceUrl, '_blank')}
                  >
                    <ExternalLink size={14} /> View full recipe
                  </Button>
                )}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  )
}
