import { signOut } from '../../lib/supabase'
import Button from '../ui/Button'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSavedRecipes } from '../../hooks/useSavedRecipes'

export default function Navbar({ user }) {
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const { saved }    = useSavedRecipes(user.id)

  const links = [
    { label: 'My Fridge', path: '/fridge',  badge: null },
    { label: 'Recipes',   path: '/recipes', badge: null },
    { label: 'Saved',     path: '/saved',   badge: saved.length || null },
  ]

  return (
    <header className="sticky top-0 z-40 border-b"
            style={{
              background: 'rgba(250,248,243,0.92)',
              borderColor: 'var(--border)',
              backdropFilter: 'blur(12px)',
            }}>
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">

        <button onClick={() => navigate('/fridge')} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
               style={{ background: 'var(--green)' }}>
            🌿
          </div>
          <span className="font-semibold tracking-tight"
                style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem' }}>
            Forage
          </span>
        </button>

        <nav className="flex items-center gap-1">
          {links.map(({ label, path, badge }) => {
            const active = pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="relative px-3 py-1.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  color:      active ? 'var(--green)'       : 'var(--ink-muted)',
                  background: active ? 'var(--green-light)' : 'transparent',
                  fontWeight: active ? 500                  : 400,
                }}
              >
                {label}
                {badge && (
                  <span className="absolute -top-1 -right-1 text-xs w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--green)', color: 'white', fontSize: 10 }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-xs hidden sm:block" style={{ color: 'var(--ink-muted)' }}>
            {user.email}
          </span>
          <Button variant="secondary" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>

      </div>
    </header>
  )
}
