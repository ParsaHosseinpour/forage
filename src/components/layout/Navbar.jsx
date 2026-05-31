import { signOut } from '../../lib/supabase'
import Button from '../ui/Button'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar({ user }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const links = [
    { label: 'My Fridge', path: '/fridge'  },
    { label: 'Recipes',   path: '/recipes' },
    { label: 'Saved',     path: '/saved'   },
    { label: 'Planner',   path: '/schedule' },
    { label: 'History',   path: '/history' },
  ]

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        background:     'rgba(250,248,243,0.92)',
        borderColor:    'var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">

        {/* Logo */}
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

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150"
              style={{
                color:      pathname === path ? 'var(--green)'      : 'var(--ink-muted)',
                background: pathname === path ? 'var(--green-light)': 'transparent',
                fontWeight: pathname === path ? 500                  : 400,
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* User + sign out */}
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
