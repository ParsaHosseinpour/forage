import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, ShoppingCart, Trash2, ChevronLeft } from 'lucide-react'
import { useSavedRecipes } from '../../hooks/useSavedRecipes'
import { useShoppingList } from '../../hooks/useShoppingList'
import { useFridge } from '../../hooks/useFridge'
import RecipeCard, { RecipeCardSkeleton } from '../recipes/RecipeCard'
import RecipeDetail from '../recipes/RecipeDetail'
import ShoppingList from './ShoppingList'
import Button from '../ui/Button'

const TABS = [
  { key: 'recipes',  label: 'Saved recipes',  Icon: Bookmark      },
  { key: 'shopping', label: 'Shopping list',   Icon: ShoppingCart  },
]

export default function SavedPage({ user }) {
  const navigate  = useNavigate()
  const [tab, setTab]         = useState('recipes')
  const [selected, setSelected] = useState(null)

  const { items: fridgeItems }                    = useFridge(user.id)
  const { saved, loading, toggle, isSaved }       = useSavedRecipes(user.id)
  const { items, isChecked, toggle: checkToggle,
          clearAll, checkedCount, loading: listLoading } = useShoppingList(user.id, saved)

  const fridgeNames = fridgeItems.map(i => i.name)

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">

      {/* Page header — hidden when in recipe detail */}
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
                  : `${items.length - checkedCount} item${items.length - checkedCount !== 1 ? 's' : ''} to pick up`}
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/recipes')}>
              <ChevronLeft size={15} /> Recipes
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit"
               style={{ background: 'var(--cream-dark)' }}>
            {TABS.map(({ key, label, Icon }) => {
              const active = tab === key
              const badge  = key === 'shopping' && items.length > 0 && !listLoading
                ? items.length - checkedCount
                : null
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: active ? 'white'          : 'transparent',
                    color:      active ? 'var(--ink)'     : 'var(--ink-muted)',
                    fontWeight: active ? 500               : 400,
                    boxShadow:  active ? 'var(--shadow)'  : 'none',
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
          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => <RecipeCardSkeleton key={i} />)}
            </div>
          )}

          {/* Empty */}
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

          {/* Grid */}
          {!loading && saved.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 fade-in">
              {saved.map(row => {
                const recipe = row.recipe_json ?? row
                return (
                  <div key={row.recipe_id ?? recipe.id} className="relative">
                    <RecipeCard
                      recipe={recipe}
                      onClick={setSelected}
                      isSaved={true}
                      onSave={() => toggle(recipe)}
                    />
                    {/* Remove from saved */}
                    <button
                      onClick={() => toggle(recipe)}
                      className="absolute bottom-4 right-4 p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--red-soft)' }}
                      title="Remove from saved"
                    >
                      <Trash2 size={14} />
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
          items={items}
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
          onBack={() => setSelected(null)}
          isSaved={isSaved(selected.id)}
          onSave={() => toggle(selected)}
        />
      )}
    </div>
  )
}
