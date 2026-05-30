import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, ShoppingCart, Trash2, ChevronLeft } from 'lucide-react'
import { useSavedRecipes } from '../../hooks/useSavedRecipes'
import { useShoppingList } from '../../hooks/useShoppingList'
import { useFridge } from '../../hooks/useFridge'
import { usePantry } from '../../hooks/usePantry'
import { useCookHistory } from '../../hooks/useCookHistory'
import { useToast } from '../ui/Toast'
import RecipeCard, { RecipeCardSkeleton } from '../recipes/RecipeCard'
import RecipeDetail from '../recipes/RecipeDetail'
import CookItModal from '../recipes/CookItModal'
import ShoppingList from './ShoppingList'
import Button from '../ui/Button'

const TABS = [
  { key: 'recipes',  label: 'Saved recipes',  Icon: Bookmark     },
  { key: 'shopping', label: 'Shopping list',   Icon: ShoppingCart },
]

export default function SavedPage({ user }) {
  const navigate = useNavigate()
  const toast    = useToast()

  const [tab, setTab]                   = useState('recipes')
  const [selected, setSelected]         = useState(null)
  const [cookModalRecipe, setCookModal] = useState(null) // recipe being cooked from card

  const { items: fridgeItems, remove: fridgeRemove, update: fridgeUpdate } = useFridge(user.id)
  const { staples }                            = usePantry(user.id)
  const { saved, loading, toggle, isSaved }    = useSavedRecipes(user.id)
  const { logCook }                            = useCookHistory(user.id)
  const { need, have, isChecked, toggle: checkToggle,
          clearAll, checkedCount, loading: listLoading } = useShoppingList(user.id, saved, fridgeItems)

  const fridgeNames = fridgeItems.map(i => i.name)

  // ── Cook It — runs from both the modal (card) and the detail page ──────────
  const executeCook = async (recipe, plan) => {
    // 1. Apply fridge deductions
    for (const item of plan) {
      try {
        if (item.willDelete) await fridgeRemove(item.fridgeItem.id)
        else if (item.canCompute) await fridgeUpdate(item.fridgeItem.id, { quantity: Math.round(item.remaining * 100) / 100 })
      } catch (err) {
        console.error('Cook deduction error:', err)
      }
    }
    // 2. Log to history
    try { await logCook(recipe) } catch { /* non-fatal */ }
    toast({ type: 'success', message: '🍽️ Fridge updated! Enjoy your meal.', duration: 4000 })
  }

  const handleCardCook = (recipe) => setCookModal(recipe)

  const handleDetailCook = async (plan) => {
    await executeCook(selected, plan)
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">

      {/* Header — hidden in detail view */}
      {!selected && (
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                {tab === 'recipes' ? 'Saved recipes' : 'Shopping list'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                {tab === 'recipes'
                  ? `${saved.length} recipe${saved.length !== 1 ? 's' : ''} saved`
                  : `${need.length - checkedCount} item${need.length - checkedCount !== 1 ? 's' : ''} to pick up`}
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/recipes')}>
              <ChevronLeft size={15} /> Recipes
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--cream-dark)' }}>
            {TABS.map(({ key, label, Icon }) => {
              const active = tab === key
              const badge  = key === 'shopping' && need.length > 0 && !listLoading
                ? need.length - checkedCount : null
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: active ? 'white'         : 'transparent',
                    color:      active ? 'var(--ink)'    : 'var(--ink-muted)',
                    fontWeight: active ? 500              : 400,
                    boxShadow:  active ? 'var(--shadow)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  {label}
                  {badge != null && badge > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--green)', color: 'white', minWidth: 18, textAlign: 'center' }}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── RECIPES TAB ── */}
      {tab === 'recipes' && !selected && (
        <>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => <RecipeCardSkeleton key={i} />)}
            </div>
          )}

          {!loading && saved.length === 0 && (
            <div className="text-center py-24 fade-in">
              <div className="text-5xl mb-4">🤍</div>
              <h2 className="text-xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                No saved recipes yet
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
                Hit the heart on any recipe to save it here.
              </p>
              <Button onClick={() => navigate('/recipes')}>Browse recipes</Button>
            </div>
          )}

          {!loading && saved.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 fade-in">
              {saved.map(row => {
                const recipe = row.recipe_json ?? row
                return (
                  <div key={row.recipe_id ?? recipe.id} className="flex flex-col gap-2">
                    <RecipeCard
                      recipe={recipe}
                      onClick={setSelected}
                      isSaved={true}
                      onSave={() => toggle(recipe)}
                    />
                    {/* Cook It — available directly from the card */}
                    <button
                      onClick={() => handleCardCook(recipe)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all duration-150"
                      style={{
                        background:  'var(--green-light)',
                        borderColor: 'var(--green-mid)',
                        color:       'var(--green)',
                      }}
                    >
                      🍽️ I Cooked This
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── SHOPPING LIST TAB ── */}
      {tab === 'shopping' && !selected && (
        <ShoppingList
          need={need}
          have={have}
          isChecked={isChecked}
          onToggle={checkToggle}
          onClearAll={clearAll}
          checkedCount={checkedCount}
          loading={listLoading}
        />
      )}

      {/* ── RECIPE DETAIL ── */}
      {selected && (
        <RecipeDetail
          recipe={selected}
          fridgeIngredients={fridgeNames}
          fridgeItems={fridgeItems}
          pantryStaples={staples}
          onBack={() => setSelected(null)}
          isSaved={isSaved(selected.id)}
          onSave={() => toggle(selected)}
          onCook={handleDetailCook}
        />
      )}

      {/* Cook It modal — triggered from recipe card */}
      {cookModalRecipe && (
        <CookItModal
          recipe={cookModalRecipe}
          recipeDetail={cookModalRecipe}
          fridgeItems={fridgeItems}
          pantryStaples={staples}
          onClose={() => setCookModal(null)}
          onConfirm={async (plan) => {
            await executeCook(cookModalRecipe, plan)
            setCookModal(null)
          }}
        />
      )}
    </div>
  )
}
