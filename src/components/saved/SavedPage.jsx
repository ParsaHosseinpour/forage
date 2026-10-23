import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, ShoppingCart, ChevronLeft, ChefHat } from 'lucide-react'
import { useSavedRecipes } from '../../hooks/useSavedRecipes'
import { useShoppingList } from '../../hooks/useShoppingList'
import { useFridge } from '../../hooks/useFridge'
import { usePantry } from '../../hooks/usePantry'
import { useCookHistory } from '../../hooks/useCookHistory'
import { useToast } from '../ui/Toast'
import { refreshRecipeMatch } from '../../lib/recipeDb'
import { useMealPlan, usePlannedMeals, weekPhrase } from '../../hooks/useMealPlan'
import RecipeCard, { RecipeCardSkeleton } from '../recipes/RecipeCard'
import RecipeDetail from '../recipes/RecipeDetail'
import CookItModal from '../recipes/CookItModal'
import ShoppingList from './ShoppingList'
import Button from '../ui/Button'
import { IconTile } from '../ui/glyphs'
import { useBackToClose } from '../../hooks/useBackToClose'
import PageHeader from '../layout/PageHeader'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import OfflineNotice from '../ui/OfflineNotice'

const TABS = [
  { key: 'recipes',  label: 'Saved recipes',  Icon: Bookmark     },
  { key: 'shopping', label: 'Shopping list',   Icon: ShoppingCart },
]

export default function SavedPage({ user }) {
  const online = useOnlineStatus()
  const navigate = useNavigate()
  const toast    = useToast()

  const [tab, setTab]                   = useState('recipes')
  const [selected, setSelected]         = useState(null)
  useBackToClose(!!selected, () => setSelected(null))
  const [cookModalRecipe, setCookModal] = useState(null) // recipe being cooked from card

  const { items: fridgeItems, remove: fridgeRemove, update: fridgeUpdate } = useFridge(user.id)
  const { staples }                            = usePantry(user.id)
  const { saved, loading, toggle, isSaved }    = useSavedRecipes(user.id)
  const { logCook }                            = useCookHistory(user.id)
  const [weeks, setWeeks]                       = useState(2)   // planned weeks the shopping list covers
  const { addSlot }                            = useMealPlan(user.id)
  const { slots: plannedSlots, reload: reloadPlanned } = usePlannedMeals(user.id, weeks)
  const { byRecipe, need, have, isChecked, toggle: checkToggle,
          clearAll, checkedCount, loading: listLoading } = useShoppingList(user.id, saved, fridgeItems, staples, plannedSlots)

  const fridgeNames = fridgeItems.map(i => i.name)

  const handleSchedule = async (dayIdx, slotType, recipe, weekOffset = 0) => {
    await addSlot(dayIdx, slotType, recipe, weekOffset)
    await reloadPlanned()
    toast({ type: 'success', message: weekOffset ? `Added to ${weekPhrase(weekOffset)}.` : 'Added to schedule.', duration: 3000 })
  }

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
    toast({ type: 'success', message: 'Fridge updated. Enjoy your meal.', duration: 4000 })
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
          <PageHeader
            title={tab === 'recipes' ? 'Saved recipes' : 'Shopping list'}
            art={tab === 'recipes' ? 'Lemon' : 'Lentils'}
            subtitle={tab === 'recipes'
              ? `${saved.length} recipe${saved.length !== 1 ? 's' : ''} saved`
              : `${need.length - checkedCount} item${need.length - checkedCount !== 1 ? 's' : ''} to pick up`}
            actions={
              <Button variant="secondary" onClick={() => navigate('/recipes')}>
                <ChevronLeft size={15} /> Recipes
              </Button>
            }
          />

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 w-fit" role="tablist">
            {TABS.map(({ key, label, Icon }) => {
              const active = tab === key
              const badge  = key === 'shopping' && need.length > 0 && !listLoading
                ? need.length - checkedCount : null
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border-[1.5px] text-[15px] transition-colors duration-100"
                  role="tab" aria-selected={active}
                  style={{
                    background:  active ? 'var(--saffron)' : 'var(--surface)',
                    borderColor: 'var(--ink)',
                    color:       active ? 'var(--ink)'     : 'var(--ink-muted)',
                    fontWeight:  active ? 700 : 600,
                  }}
                >
                  <Icon size={14} />
                  {label}
                  {badge != null && badge > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--ink)', color: 'white', minWidth: 18, textAlign: 'center' }}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {[...Array(3)].map((_, i) => <RecipeCardSkeleton key={i} />)}
            </div>
          )}

          {!loading && saved.length === 0 && !online && <OfflineNotice what="saved recipes" />}
          {!loading && saved.length === 0 && online && (
            <div className="text-center py-24 fade-in">
              <IconTile art="Lemon" />
              <h2 className="text-2xl mb-2">No saved recipes yet</h2>
              <p className="text-[15px] mb-6" style={{ color: 'var(--ink-muted)' }}>
                Tap the heart on any recipe to keep it here.
              </p>
              <Button onClick={() => navigate('/recipes')}>Browse recipes</Button>
            </div>
          )}

          {!loading && saved.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 fade-in">
              {saved.map(row => {
                const recipe = refreshRecipeMatch(
                  row.recipe_json ?? row,
                  // Include pantry staples so match % is consistent with RecipesPage
                  [...fridgeItems.map(i => i.name), ...staples]
                )
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
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-full border-2 text-sm font-bold transition-[transform,box-shadow] duration-100 shadow-[0_3px_0_var(--ink)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--ink)]"
                      style={{
                        background:  'var(--surface)',
                        borderColor: 'var(--ink)',
                        color:       'var(--ink)',
                      }}
                    >
                      <ChefHat size={15} strokeWidth={2} /> I cooked this
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
        <div className="flex flex-wrap items-center gap-2 mb-6" role="group" aria-label="Planned meals to include">
          <span className="text-[15px] font-bold mr-1">Planned meals:</span>
          {[[1, 'This week'], [2, 'Next 2 weeks'], [4, 'Next 4 weeks']].map(([n, label]) => (
            <button
              key={n}
              onClick={() => setWeeks(n)}
              aria-pressed={weeks === n}
              className="px-3.5 py-1.5 rounded-full text-sm border-[1.5px] transition-colors duration-100"
              style={{
                background:  weeks === n ? 'var(--saffron)' : 'var(--surface)',
                borderColor: 'var(--ink)',
                color:       weeks === n ? 'var(--ink)'     : 'var(--ink-muted)',
                fontWeight:  weeks === n ? 700 : 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === 'shopping' && !selected && (
        <ShoppingList
          byRecipe={byRecipe}
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
          onSchedule={handleSchedule}
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
