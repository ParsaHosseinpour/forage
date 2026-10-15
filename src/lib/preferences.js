// Per-user preferences, stored in Supabase auth user_metadata so they need no
// extra table and are available on `user` everywhere in the app.

export const DIETS = [
  { value: '',            label: 'All recipes' },
  { value: 'vegetarian',  label: 'Vegetarian' },
  { value: 'vegan',       label: 'Vegan' },
  { value: 'gluten free', label: 'Gluten-free' },
  { value: 'dairy free',  label: 'Dairy-free' },
  { value: 'ketogenic',   label: 'Keto' },
  { value: 'paleo',       label: 'Paleo' },
]

export const SERVING_CHOICES = [
  { value: null, label: 'No default' },
  { value: 1,    label: '1 person'   },
  { value: 2,    label: '2 people'   },
  { value: 4,    label: '4 people'   },
  { value: 6,    label: '6+ family'  },
]

export function getPrefs(user) {
  const m = user?.user_metadata ?? {}
  return {
    displayName:     m.display_name ?? '',
    defaultServings: m.default_servings ?? null,
    defaultDiet:     m.default_diet ?? '',
  }
}

/** Name to show in the UI: display name, else the part of the email before @. */
export function shownName(user) {
  const { displayName } = getPrefs(user)
  return displayName.trim() || (user?.email ?? '').split('@')[0]
}
