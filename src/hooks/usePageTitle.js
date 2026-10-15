import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES = {
  '/fridge':   'Fridge',
  '/recipes':  'Recipes',
  '/saved':    'Saved',
  '/schedule': 'Planner',
  '/history':  'History',
  '/profile':  'Profile',
}

/** Sets the browser tab title from the current route. */
export function usePageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const t = TITLES[pathname]
    document.title = t ? `${t} · Forage` : 'Forage'
  }, [pathname])
}
