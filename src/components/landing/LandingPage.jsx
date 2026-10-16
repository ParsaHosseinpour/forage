import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Produce from '../ui/Produce'

/* ── Demo data. Local only: nothing here touches the backend. ─────────── */
const FRIDGE = ['Eggs', 'Tomatoes', 'Onion', 'Feta', 'Spinach', 'Rice', 'Chicken', 'Yogurt', 'Lemon', 'Lentils', 'Garlic']
const START  = ['Eggs', 'Tomatoes', 'Feta', 'Rice', 'Spinach']
const TILT   = [-5, 3, -2, 5, -4, 2, 4, -3, 5, -2, 3]

const RECIPES = [
  { name: 'Shakshuka with feta',        mins: 25, needs: ['Eggs', 'Tomatoes', 'Onion', 'Feta', 'Garlic'] },
  { name: 'Spinach and feta rice bowl', mins: 20, needs: ['Rice', 'Spinach', 'Feta', 'Onion', 'Lemon'] },
  { name: 'Lemon lentil soup',          mins: 35, needs: ['Lentils', 'Onion', 'Garlic', 'Tomatoes', 'Lemon'] },
  { name: 'Yogurt chicken with rice',   mins: 45, needs: ['Chicken', 'Yogurt', 'Rice', 'Lemon', 'Garlic'] },
]

const TEETH = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10' viewBox='0 0 16 10'%3E%3Cpath d='M0 0 L8 8.5 L16 0 Z' fill='white'/%3E%3Cpath d='M0 0 L8 8.5 L16 0' fill='none' stroke='%232B2118' stroke-width='2.5' stroke-linejoin='round'/%3E%3C/svg%3E")`

function Wordmark({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Forage home">
      <Produce name="Tomatoes" size={32} />
      <span className="text-[30px] leading-none" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: light ? '#fff' : 'var(--ink)' }}>
        forage
      </span>
    </Link>
  )
}

/** Same printed, pressable look as the app's buttons. */
function CtaLink({ to, children, tone = 'primary', className = '' }) {
  const tones = {
    primary: { background: 'var(--brand)',   color: '#fff' },
    butter:  { background: 'var(--butter)',  color: 'var(--ink)' },
    paper:   { background: '#fff',           color: 'var(--ink)' },
  }
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center font-bold rounded-full border-2 px-7 py-3 text-[17px] transition-[transform,box-shadow] duration-100 active:translate-y-[2px] ${className}`}
      style={{ ...tones[tone], borderColor: 'var(--ink)', boxShadow: '0 3px 0 var(--ink)' }}
    >
      {children}
    </Link>
  )
}

/* ── The hero: tap ingredient stickers, watch the recipe slip re-rank ─── */
function Sticker({ name, on, tilt, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className="group flex flex-col items-center gap-1.5 focus-visible:outline-offset-4"
    >
      <span
        className="grid place-items-center w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-full transition-all duration-150 group-active:scale-95"
        style={{
          background: on ? '#fff' : 'transparent',
          border: on ? '2.5px solid var(--ink)' : '2px dashed rgba(43,33,24,0.5)',
          transform: on ? `rotate(${tilt}deg)` : 'rotate(0deg)',
          filter: on ? 'none' : 'grayscale(1)',
          opacity: on ? 1 : 0.55,
          boxShadow: on ? '0 3px 0 var(--ink)' : 'none',
        }}
      >
        <Produce name={name} size={54} />
      </span>
      <span className="text-[13px] font-bold">{name}</span>
    </button>
  )
}

function Hero() {
  const [have, setHave] = useState(() => new Set(START))
  const toggle = (n) => setHave(prev => { const x = new Set(prev); x.has(n) ? x.delete(n) : x.add(n); return x })

  const ranked = useMemo(() =>
    RECIPES.map((r, i) => ({ ...r, i, got: r.needs.filter(n => have.has(n)), missing: r.needs.filter(n => !have.has(n)) }))
      .sort((a, b) => b.got.length - a.got.length || a.i - b.i),
  [have])

  return (
    <section style={{ background: 'var(--butter)', borderBottom: '2.5px solid var(--ink)' }} aria-labelledby="hero-title">
      <header className="max-w-6xl mx-auto px-5 h-[76px] flex items-center justify-between">
        <Wordmark />
        <nav className="flex items-center gap-3" aria-label="Account">
          <Link to="/login" className="px-3 py-2 text-[16px] font-bold underline-offset-4 hover:underline whitespace-nowrap">Sign in</Link>
          <CtaLink to="/login?mode=signup" className="hidden sm:inline-flex !px-5 !py-2 !text-[15px] whitespace-nowrap">Start your fridge</CtaLink>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-5 pt-6 pb-20 lg:pt-10 lg:pb-24 grid lg:grid-cols-[1fr_1.08fr] gap-12 lg:gap-14 items-start">
        <div className="lg:pt-6">
          <h1 id="hero-title" style={{ fontSize: 'clamp(3.6rem, 9vw, 7.4rem)', lineHeight: 0.94, letterSpacing: '-0.025em' }}>
            What’s in your fridge?
          </h1>
          <p className="mt-7 text-[20px] max-w-md" style={{ lineHeight: 1.45 }}>
            Tap what you have. Forage shows what you can cook tonight, and what is missing from everything else.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <CtaLink to="/login?mode=signup" tone="primary">Start your fridge</CtaLink>
            <Link to="/login" className="text-[17px] font-bold underline underline-offset-4">I already have an account</Link>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-4 gap-y-5 gap-x-1 sm:gap-x-3 mb-10" role="group" aria-label="Ingredients in the fridge">
            {FRIDGE.map((n, i) => (
              <Sticker key={n} name={n} on={have.has(n)} tilt={TILT[i]} onToggle={() => toggle(n)} />
            ))}
          </div>

          {/* The recipe slip */}
          <div className="relative" style={{ filter: 'drop-shadow(0 6px 0 rgba(43,33,24,0.18))' }}>
            <div className="px-5 sm:px-6 pt-5 pb-3" style={{ background: '#fff', border: '2.5px solid var(--ink)', borderBottom: 0, borderRadius: '10px 10px 0 0' }}>
              <h2 className="text-[26px] mb-1">You could make</h2>
              <ul aria-live="polite">
                {ranked.map((r, idx) => (
                  <li key={r.name} className="py-3.5" style={{ borderTop: idx ? '1px solid var(--border)' : '1px solid transparent' }}>
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <p className="text-[17px] font-bold">{r.name}</p>
                      <span className="text-sm flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>{r.mins} min</span>
                    </div>
                    <div className="flex gap-[3px]" role="img" aria-label={`${r.got.length} of ${r.needs.length} ingredients in your fridge`}>
                      {r.needs.map((n, i) => (
                        <span key={n} className="meter-seg h-2.5 flex-1 rounded-[3px] transition-colors duration-150"
                              style={{
                                '--i': i,
                                background: have.has(n) ? 'var(--fresh)' : 'transparent',
                                boxShadow:  have.has(n) ? 'inset 0 0 0 1.5px var(--ink)' : 'inset 0 0 0 1.5px var(--carrot-soft)',
                              }} />
                      ))}
                    </div>
                    <p className="text-sm mt-1.5" style={{ color: r.missing.length ? 'var(--ink-muted)' : 'var(--fresh)', fontWeight: r.missing.length ? 500 : 700 }}>
                      {r.missing.length === 0
                        ? 'Everything is in your fridge'
                        : `${r.got.length} of ${r.needs.length} in your fridge. Need ${r.missing.join(', ').toLowerCase()}.`}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div aria-hidden="true" style={{ height: 10, backgroundImage: TEETH, backgroundRepeat: 'repeat-x', backgroundSize: '16px 10px' }} />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Tomato: the meter, explained once, at a size you can read ────────── */
function MeterExplainer() {
  const parts = [
    { n: 'Eggs', have: true }, { n: 'Tomatoes', have: true }, { n: 'Feta', have: true },
    { n: 'Onion', have: false }, { n: 'Garlic', have: false },
  ]
  return (
    <section style={{ background: 'var(--tomato)', color: '#fff', borderBottom: '2.5px solid var(--ink)' }} aria-labelledby="meter-title">
      <div className="max-w-6xl mx-auto px-5 py-20 lg:py-28 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
        <div>
          <h2 id="meter-title" style={{ fontSize: 'clamp(2.6rem, 5.6vw, 4.6rem)', lineHeight: 1 }}>
            Every recipe shows what you are missing.
          </h2>
          <p className="mt-6 text-[20px] max-w-md" style={{ lineHeight: 1.5 }}>
            One segment for each ingredient. Filled means it is already in your fridge. Outlined means it goes on the list.
          </p>
        </div>

        <div className="rounded-[14px] p-6 sm:p-8" style={{ background: 'var(--bg)', color: 'var(--ink)', border: '2.5px solid var(--ink)', boxShadow: '0 6px 0 var(--ink)', transform: 'rotate(1.2deg)' }}>
          <h3 className="text-[30px] mb-5">Shakshuka with feta</h3>
          <div className="flex gap-1.5 mb-3" role="img" aria-label="3 of 5 ingredients in your fridge">
            {parts.map(p => (
              <span key={p.n} className="h-6 flex-1 rounded-[4px]"
                    style={{ background: p.have ? 'var(--fresh)' : 'transparent', boxShadow: p.have ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 2px var(--carrot-soft)' }} />
            ))}
          </div>
          <div className="flex gap-1.5 text-[13px] sm:text-sm font-bold">
            {parts.map(p => (
              <span key={p.n} className="flex-1 text-center" style={{ color: p.have ? 'var(--fresh)' : 'var(--carrot)' }}>{p.n}</span>
            ))}
          </div>
          <p className="mt-6 text-[17px]">
            3 of 5 in your fridge. <strong>Buy onion and garlic</strong> and it is dinner.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── Spinach: the rest of the loop, as one paragraph ─────────────────── */
function Loop() {
  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--spinach)', color: '#fff', borderBottom: '2.5px solid var(--ink)' }} aria-labelledby="loop-title">
      <div className="max-w-6xl mx-auto px-5 py-20 lg:py-28 grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-20">
        <h2 id="loop-title" style={{ fontSize: 'clamp(2.6rem, 5.6vw, 4.6rem)', lineHeight: 1 }}>
          Cook it. The fridge keeps up.
        </h2>
        <div className="text-[21px] max-w-lg space-y-5" style={{ lineHeight: 1.55 }}>
          <p>
            Mark a recipe as cooked and Forage takes the ingredients out of your fridge, so the list stays honest.
          </p>
          <p>
            Put meals on a weekly plan, this week or next. Whatever you are missing lands in one shopping list,
            grouped by recipe. Your history remembers what you made and how it went.
          </p>
        </div>
      </div>
      <Produce name="Spinach" size={150} className="absolute right-8 bottom-8 hidden lg:block" style={{ transform: 'rotate(-14deg)' }} />
    </section>
  )
}

const EXTRAS = [
  ['Smart paste', 'Paste a messy shopping list. Quantities, units and categories are picked out for you.'],
  ['Pantry staples', 'Tell Forage about the salt, oil and spices you always have, once.'],
  ['Filters', 'Vegetarian, vegan, gluten-free, dairy-free, keto or paleo. Cap the cooking time, scale the servings.'],
  ['Weekly planner', 'Breakfast to snacks, seven days at a time. Cook straight from the plan.'],
  ['Shopping list', 'Ticked off as you go, with what you already have left out.'],
  ['Cook history', 'Rate what you made and cook your favourites again.'],
]

function Extras() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-20 lg:py-24 grid lg:grid-cols-[1fr_1.9fr] gap-10 lg:gap-20" aria-labelledby="extras-title">
      <h2 id="extras-title" style={{ fontSize: 'clamp(2.2rem, 4.4vw, 3.4rem)', lineHeight: 1.02 }}>Also in the kitchen</h2>
      <dl className="grid sm:grid-cols-2 gap-x-12">
        {EXTRAS.map(([t, d]) => (
          <div key={t} className="py-5" style={{ borderTop: '2px solid var(--ink)' }}>
            <dt className="text-[22px] mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>{t}</dt>
            <dd className="text-[16px]" style={{ color: 'var(--ink-muted)', lineHeight: 1.55 }}>{d}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Closing() {
  return (
    <section style={{ background: 'var(--butter)', borderTop: '2.5px solid var(--ink)' }} aria-labelledby="close-title">
      <div className="max-w-6xl mx-auto px-5 py-20 lg:py-24 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <h2 id="close-title" style={{ fontSize: 'clamp(3rem, 7vw, 5.6rem)', lineHeight: 0.96 }}>Open the fridge.</h2>
        <CtaLink to="/login?mode=signup" tone="primary" className="self-start md:self-auto">Start your fridge</CtaLink>
      </div>
    </section>
  )
}

export default function LandingPage() {
  useEffect(() => { document.title = 'Forage: cook what is already in your fridge' }, [])
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <main>
        <Hero />
        <MeterExplainer />
        <Loop />
        <Extras />
        <Closing />
      </main>
      <footer style={{ background: 'var(--ink)', color: '#fff' }}>
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-4">
          <Wordmark light />
          <Link to="/login" className="text-[15px] font-bold underline underline-offset-4">Sign in</Link>
        </div>
      </footer>
    </div>
  )
}
