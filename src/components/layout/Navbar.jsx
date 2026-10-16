import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Refrigerator, UtensilsCrossed, Bookmark, CalendarDays, History, LogOut } from 'lucide-react'
import { signOut } from '../../lib/supabase'
import { shownName } from '../../lib/preferences'
import { HUES } from '../../lib/hues'
import Produce from '../ui/Produce'

const LINKS = [
  { label: 'Fridge',  path: '/fridge',   Icon: Refrigerator    },
  { label: 'Recipes', path: '/recipes',  Icon: UtensilsCrossed },
  { label: 'Saved',   path: '/saved',    Icon: Bookmark        },
  { label: 'Planner', path: '/schedule', Icon: CalendarDays    },
  { label: 'History', path: '/history',  Icon: History         },
]

function Wordmark() {
  return (
    <Link to="/fridge" className="flex items-center gap-2" aria-label="Forage home">
      <Produce name="Tomatoes" size={30} />
      <span className="text-[28px] leading-none" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
        forage
      </span>
    </Link>
  )
}

function Avatar({ user, size = 34 }) {
  const initial = (shownName(user)[0] ?? '?').toUpperCase()
  return (
    <span
      className="inline-grid place-items-center rounded-full font-bold flex-shrink-0"
      style={{ width: size, height: size, background: 'var(--hue)', color: 'var(--hue-ink)', border: '2px solid var(--ink)', fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  )
}

export default function Navbar({ user }) {
  const navigate = useNavigate()

  return (
    <>
      {/* ── Desktop masthead ───────────────────────────────────────── */}
      <header className="hidden md:block sticky top-0 z-40 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-5 h-[68px] flex items-center gap-10">
          <Wordmark />

          <nav className="flex items-stretch h-full" aria-label="Main">
            {LINKS.map(({ label, path }) => (
              <NavLink
                key={path}
                to={path}
                className="relative flex items-center px-4 text-[16px] transition-colors"
                style={({ isActive }) => ({
                  color:      isActive ? 'var(--ink)' : 'var(--ink-muted)',
                  fontWeight: isActive ? 700 : 600,
                })}
              >
                {({ isActive }) => (
                  <>
                    {label}
                    <span
                      className="absolute left-3 right-3 bottom-0 h-[5px] rounded-t-[3px]"
                      style={{ background: isActive ? HUES[path].hue : 'transparent', boxShadow: isActive ? 'inset 0 0 0 1.5px var(--ink)' : 'none' }}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <Link to="/profile" className="flex items-center gap-2.5 group" aria-label="Profile and settings">
              <Avatar user={user} />
              <span className="text-[15px] font-semibold group-hover:underline underline-offset-4">{shownName(user)}</span>
            </Link>
            <button onClick={() => signOut()} className="text-[15px] font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--ink-muted)' }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile: slim top bar ───────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <Wordmark />
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/profile')} aria-label="Profile and settings" className="p-1"><Avatar user={user} size={34} /></button>
          <button onClick={() => signOut()} className="p-2 rounded-[10px]" style={{ color: 'var(--ink-muted)' }} aria-label="Sign out">
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* ── Mobile: bottom tab bar ─────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t-2"
        style={{ background: 'var(--bg)', borderColor: 'var(--ink)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Main"
      >
        {LINKS.map(({ label, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className="relative flex flex-col items-center gap-0.5 pt-3 pb-2 text-[11px]"
            style={({ isActive }) => ({ color: isActive ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: isActive ? 700 : 600 })}
          >
            {({ isActive }) => (
              <>
                <span className="absolute -top-[2px] h-[5px] w-10 rounded-b-[3px]" style={{ background: isActive ? HUES[path].hue : 'transparent', boxShadow: isActive ? 'inset 0 0 0 1.5px var(--ink)' : 'none' }} />
                <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
