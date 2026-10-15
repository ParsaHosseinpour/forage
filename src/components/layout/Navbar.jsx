import { NavLink, useNavigate } from 'react-router-dom'
import { Refrigerator, UtensilsCrossed, Bookmark, CalendarDays, History, LogOut, Sprout } from 'lucide-react'
import { signOut } from '../../lib/supabase'

const LINKS = [
  { label: 'Fridge',  path: '/fridge',   Icon: Refrigerator    },
  { label: 'Recipes', path: '/recipes',  Icon: UtensilsCrossed },
  { label: 'Saved',   path: '/saved',    Icon: Bookmark        },
  { label: 'Planner', path: '/schedule', Icon: CalendarDays    },
  { label: 'History', path: '/history',  Icon: History         },
]

function Wordmark({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5" aria-label="Forage home">
      <span
        className="w-8 h-8 rounded-[10px] flex items-center justify-center"
        style={{ background: 'var(--brand)' }}
      >
        <Sprout size={17} strokeWidth={2.25} style={{ color: 'var(--saffron)' }} />
      </span>
      <span
        className="text-[22px] font-extrabold"
        style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', fontVariationSettings: "'wdth' 85" }}
      >
        forage
      </span>
    </button>
  )
}

export default function Navbar({ user }) {
  const navigate = useNavigate()

  return (
    <>
      {/* ── Desktop: left rail ─────────────────────────────────────── */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col px-4 py-6 border-r z-40"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="px-2 mb-8">
          <Wordmark onClick={() => navigate('/fridge')} />
        </div>

        <nav className="flex flex-col gap-1" aria-label="Main">
          {LINKS.map(({ label, path, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className="relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-[10px] text-[15px] transition-colors"
              style={({ isActive }) => ({
                color:      isActive ? 'var(--brand)'      : 'var(--ink-muted)',
                background: isActive ? 'var(--brand-tint)' : 'transparent',
                fontWeight: isActive ? 650 : 500,
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                    style={{ background: isActive ? 'var(--saffron)' : 'transparent' }}
                  />
                  <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="px-2 text-xs truncate mb-2" style={{ color: 'var(--ink-muted)' }} title={user.email}>
            {user.email}
          </p>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm transition-colors hover:bg-[var(--bg-sunk)]"
            style={{ color: 'var(--ink-muted)', fontWeight: 500 }}
          >
            <LogOut size={16} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile: slim top bar ───────────────────────────────────── */}
      <header
        className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Wordmark onClick={() => navigate('/fridge')} />
        <button
          onClick={() => signOut()}
          className="p-2 rounded-[10px]"
          style={{ color: 'var(--ink-muted)' }}
          aria-label="Sign out"
        >
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </header>

      {/* ── Mobile: bottom tab bar ─────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Main"
      >
        {LINKS.map(({ label, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className="relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px]"
            style={({ isActive }) => ({
              color:      isActive ? 'var(--brand)' : 'var(--ink-muted)',
              fontWeight: isActive ? 650 : 500,
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="absolute top-0 h-[3px] w-8 rounded-b-full"
                  style={{ background: isActive ? 'var(--saffron)' : 'transparent' }}
                />
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
