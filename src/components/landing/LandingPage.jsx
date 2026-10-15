import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sprout, ArrowRight, ClipboardPaste, SlidersHorizontal, CalendarDays,
  ShoppingBasket, BookOpen, Refrigerator,
} from 'lucide-react'

/* ── Live demo data (local only — nothing here touches the backend) ───── */
const FRIDGE = ['Eggs', 'Tomatoes', 'Onion', 'Feta', 'Spinach', 'Rice', 'Chicken', 'Yogurt', 'Lemon', 'Lentils', 'Garlic']
const START  = ['Eggs', 'Tomatoes', 'Feta', 'Rice', 'Spinach']

const RECIPES = [
  { name: 'Shakshuka with feta',        mins: 25, needs: ['Eggs', 'Tomatoes', 'Onion', 'Feta', 'Garlic'] },
  { name: 'Spinach and feta rice bowl', mins: 20, needs: ['Rice', 'Spinach', 'Feta', 'Onion', 'Lemon'] },
  { name: 'Lemon lentil soup',          mins: 35, needs: ['Lentils', 'Onion', 'Garlic', 'Tomatoes', 'Lemon'] },
  { name: 'Yogurt chicken with rice',   mins: 45, needs: ['Chicken', 'Yogurt', 'Rice', 'Lemon', 'Garlic'] },
]

function Wordmark({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Forage home">
      <span className="w-8 h-8 rounded-[10px] flex items-center justify-center"
            style={{ background: light ? 'var(--saffron)' : 'var(--brand)' }}>
        <Sprout size={17} strokeWidth={2.25} style={{ color: light ? 'var(--ink)' : 'var(--saffron)' }} />
      </span>
      <span className="text-[22px] font-extrabold"
            style={{ letterSpacing: '-0.03em', fontVariationSettings: "'wdth' 85", color: light ? 'white' : 'var(--ink)' }}>
        forage
      </span>
    </Link>
  )
}

function CtaLink({ to, children, variant = 'primary', className = '' }) {
  const styles = {
    primary: { background: 'var(--brand)',   color: 'white',          borderColor: 'var(--brand)' },
    accent:  { background: 'var(--saffron)', color: 'var(--ink)',     borderColor: 'var(--saffron)' },
    outline: { background: 'transparent',    color: 'var(--ink)',     borderColor: 'var(--border)' },
  }
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] border px-6 py-3 text-base transition-colors hover:brightness-95 ${className}`}
      style={styles[variant]}
    >
      {children}
    </Link>
  )
}

/* ── The interactive demo: tap what is in the fridge, watch meters move ── */
function Demo() {
  const [have, setHave] = useState(() => new Set(START))
  const toggle = (name) => setHave(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  const ranked = useMemo(() =>
    RECIPES
      .map((r, i) => ({ ...r, i, got: r.needs.filter(n => have.has(n)), missing: r.needs.filter(n => !have.has(n)) }))
      .sort((a, b) => b.got.length - a.got.length || a.i - b.i),
  [have])

  return (
    <div className="rounded-[14px] border p-5 sm:p-6"
         style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Refrigerator size={17} strokeWidth={1.75} style={{ color: 'var(--ink-muted)' }} />
        <h2 className="text-lg" style={{ fontVariationSettings: "'wdth' 100" }}>What is in your fridge?</h2>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>Tap ingredients on and off. This is a live preview.</p>

      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Ingredients in the fridge">
        {FRIDGE.map(name => {
          const on = have.has(name)
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              aria-pressed={on}
              className="px-3 py-1.5 rounded-[8px] text-sm border transition-colors"
              style={{
                background:  on ? 'var(--fresh-tint)' : 'var(--surface)',
                borderColor: on ? 'var(--fresh-soft)' : 'var(--border)',
                color:       on ? 'var(--fresh)'      : 'var(--ink-muted)',
                fontWeight:  on ? 650 : 500,
              }}
            >
              {name}
            </button>
          )
        })}
      </div>

      <ul className="divide-y" aria-live="polite" style={{ borderColor: 'var(--border)' }}>
        {ranked.map(r => (
          <li key={r.name} className="py-3.5" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="font-semibold" style={{ fontVariationSettings: "'wdth' 96" }}>{r.name}</p>
              <span className="text-[13px] flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>{r.mins} min</span>
            </div>
            <div className="flex gap-[3px]" role="img" aria-label={`${r.got.length} of ${r.needs.length} ingredients in your fridge`}>
              {r.needs.map((n, i) => (
                <span key={n} className="meter-seg h-2 flex-1 rounded-[2px] transition-colors duration-150"
                      style={{
                        '--i': i,
                        background: have.has(n) ? 'var(--fresh)' : 'transparent',
                        boxShadow:  have.has(n) ? 'none' : 'inset 0 0 0 1.5px var(--carrot-soft)',
                      }} />
              ))}
            </div>
            <p className="text-[13px] mt-1.5" style={{ color: r.missing.length ? 'var(--ink-muted)' : 'var(--fresh)', fontWeight: r.missing.length ? 500 : 600 }}>
              {r.missing.length === 0
                ? 'Everything is in your fridge'
                : `${r.got.length} of ${r.needs.length} in your fridge. Need ${r.missing.join(', ').toLowerCase()}.`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

const STEPS = [
  { title: 'Log what you have',
    body: 'Type ingredients one by one, or paste a whole shopping list and let Forage sort it. Mark pantry staples once and they are always counted.' },
  { title: 'See what you can make',
    body: 'Every recipe shows a bar with one segment per ingredient: green if you have it, outlined if you do not. Filter by diet and time, and scale the servings.' },
  { title: 'Cook, plan, shop the gap',
    body: 'Cook a recipe and your fridge updates. Put meals on a weekly plan, and the missing ingredients collect into one shopping list.' },
]

const FEATURES = [
  { Icon: ClipboardPaste,    title: 'Smart paste',     body: 'Paste a messy list. Quantities, units and categories are picked out for you.' },
  { Icon: SlidersHorizontal, title: 'Filters that matter', body: 'Vegetarian, vegan, gluten-free, dairy-free, keto or paleo. Cap the cooking time.' },
  { Icon: CalendarDays,      title: 'Weekly planner',  body: 'Plan breakfast to snacks for this week or the next, and cook straight from the plan.' },
  { Icon: ShoppingBasket,    title: 'Shopping list',   body: 'Grouped by recipe, with what you already have ticked off.' },
  { Icon: BookOpen,          title: 'Cook history',    body: 'A journal of what you made, with ratings, so you can cook your favourites again.' },
  { Icon: Refrigerator,      title: 'A fridge that keeps up', body: 'Cooking subtracts what you used, so the list stays honest.' },
]

export default function LandingPage() {
  useEffect(() => { document.title = 'Forage · Cook what is already in your fridge' }, [])

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)' }}>

      {/* Top bar */}
      <header className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Wordmark />
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link to="/login" className="px-3 py-2 text-[15px] font-semibold rounded-[10px] hover:bg-[var(--bg-sunk)]"
                style={{ color: 'var(--ink)' }}>
            Sign in
          </Link>
          <CtaLink to="/login?mode=signup" className="!px-4 !py-2 !text-[15px]">Get started</CtaLink>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 pt-10 pb-16 lg:pt-16 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center"
                 aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title" className="mb-6"
                style={{ fontSize: 'clamp(2.9rem, 6.4vw, 5rem)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.022em', fontVariationSettings: "'wdth' 92" }}>
              Cook what is already in your fridge.
            </h1>
            <p className="text-lg max-w-xl mb-8" style={{ color: 'var(--ink-muted)', lineHeight: 1.55 }}>
              Tell Forage what you have. It shows the recipes you can make right now, the ones that are
              one ingredient away, and exactly what to buy for the rest.
            </p>
            <div className="flex flex-wrap gap-3">
              <CtaLink to="/login?mode=signup">Get started <ArrowRight size={18} strokeWidth={2.25} /></CtaLink>
              <CtaLink to="/login" variant="outline">Sign in</CtaLink>
            </div>
          </div>

          <Demo />
        </section>

        {/* How it works */}
        <section className="border-t" style={{ borderColor: 'var(--border)' }} aria-labelledby="how-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-24 grid lg:grid-cols-[1fr_1.7fr] gap-10 lg:gap-16">
            <h2 id="how-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800 }}>How it works</h2>
            <ol>
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[3.25rem_1fr] gap-4 py-7 border-t first:border-t-0 first:pt-0"
                    style={{ borderColor: 'var(--border)' }}>
                  <span className="text-5xl font-extrabold tabular-nums leading-none"
                        style={{ color: 'var(--brand)', fontVariationSettings: "'wdth' 80", letterSpacing: '-0.04em' }}>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-2xl mb-2" style={{ fontVariationSettings: "'wdth' 94" }}>{s.title}</h3>
                    <p className="text-[17px] max-w-xl" style={{ color: 'var(--ink-muted)', lineHeight: 1.55 }}>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} className="border-y" aria-labelledby="feat-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-24 grid lg:grid-cols-[1fr_1.7fr] gap-10 lg:gap-16">
            <h2 id="feat-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800 }}>
              Everything around the fridge
            </h2>
            <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-9">
              {FEATURES.map(({ Icon, title, body }) => (
                <div key={title}>
                  <dt className="flex items-center gap-2.5 text-lg font-semibold mb-1.5" style={{ fontVariationSettings: "'wdth' 96" }}>
                    <Icon size={19} strokeWidth={1.75} style={{ color: 'var(--brand)' }} />
                    {title}
                  </dt>
                  <dd style={{ color: 'var(--ink-muted)', lineHeight: 1.55 }}>{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Closing call to action */}
        <section style={{ background: 'var(--brand)', color: 'white' }} aria-labelledby="cta-title">
          <div className="max-w-6xl mx-auto px-5 py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <h2 id="cta-title" className="max-w-xl" style={{ fontSize: 'clamp(2rem, 4.2vw, 3.2rem)', fontWeight: 800, lineHeight: 1.05 }}>
              Start with what is in your fridge tonight.
            </h2>
            <CtaLink to="/login?mode=signup" variant="accent" className="self-start md:self-auto">
              Get started <ArrowRight size={18} strokeWidth={2.25} />
            </CtaLink>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-4">
        <Wordmark />
        <Link to="/login" className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>Sign in</Link>
      </footer>
    </div>
  )
}
