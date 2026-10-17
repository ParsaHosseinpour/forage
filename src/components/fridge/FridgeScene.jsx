import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Produce, { IngredientArt } from '../ui/Produce'
import { CATEGORY_ART } from '../../lib/produceMap'
import { DEFAULT_STAPLES } from '../../hooks/usePantry'

/** Shelves top to bottom. Frozen is the freezer, produce is the crisper drawer. */
const ORDER = ['frozen', 'dairy', 'protein', 'grains', 'pantry', 'other', 'produce']
const LABELS = { frozen: 'Frozen', dairy: 'Dairy', protein: 'Protein', grains: 'Grains', pantry: 'Pantry', other: 'Other', produce: 'Produce' }

// Stable pseudo-randomness so items look hand-placed but never jump on re-render.
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }
const tiltFor = (key) => ((hash(key) % 50) - 25) / 10          // -2.5deg .. 2.4deg
const sizeFor = (key) => 50 + (hash(key + 's') % 3) * 4         // 50, 54 or 58px

function Cell({ name, qty, tiltKey, state, onClick, label, dim, hit }) {
  return (
    <button
      className="shelf-cell"
      onClick={onClick}
      aria-label={label}
      aria-pressed={state === undefined ? undefined : state === 'on'}
      data-dim={dim ? 'true' : undefined}
      data-off={state === 'off' ? 'true' : undefined}
    >
      <span className="lift">
        {hit && <span aria-hidden className="absolute inset-[-5px] rounded-full" style={{ background: 'var(--butter)' }} />}
        <span className="relative block">
          <IngredientArt name={name} size={sizeFor(tiltKey)} />
        </span>
        {qty && <span className="qty-sticker">{qty}</span>}
      </span>
      <span className="tape" style={{ '--tilt': `${tiltFor(tiltKey)}deg` }}>{name}</span>
    </button>
  )
}

/** The first cell of a shelf: what lives here, and how many. */
function LabelCell({ art, label, count }) {
  return (
    <div className="shelf-cell shelf-label" style={{ cursor: 'default' }}>
      <Produce name={art} size={34} />
      <h2 className="text-[15px] sm:text-[17px] leading-tight mt-1" style={{ fontFamily: 'var(--font-display)' }}>{label}</h2>
      <span className="text-[12px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>{count}</span>
    </div>
  )
}

export function FridgeScene({ items, query, onOpen }) {
  const q = query.trim().toLowerCase()
  const byCat = ORDER.map(cat => ({ cat, list: items.filter(i => i.category === cat) })).filter(c => c.list.length)
  const renderShelf = ({ cat, list }) => (
    <section aria-label={`${LABELS[cat]}, ${list.length} items`} className="shelf">
      <LabelCell art={CATEGORY_ART[cat]} label={LABELS[cat]} count={list.length} />
      {list.map(item => {
        const qty = [item.quantity, item.unit].filter(Boolean).join(' ')
        const match = q && item.name.toLowerCase().includes(q)
        return (
          <Cell
            key={item.id}
            name={item.name}
            qty={qty}
            tiltKey={item.id}
            onClick={() => onOpen(item)}
            label={`${item.name}${qty ? `, ${qty}` : ''}. Edit or remove.`}
            dim={q && !match}
            hit={match}
          />
        )
      })}
    </section>
  )

  return (
    <div className="relative">
      {/* the handle */}
      <span aria-hidden className="hidden sm:block absolute -left-3.5 top-[22%] w-4 h-28 rounded-full"
            style={{ background: '#fff', border: '2.5px solid var(--ink)' }} />
      <div className="fridge-frame">
        {byCat.map((c, i) => {
          const isFreezer = c.cat === 'frozen'
          const isDrawer  = c.cat === 'produce'
          return (
            <div
              key={c.cat}
              style={{
                borderTop: i ? '3px solid var(--ink)' : 'none',
                background: isFreezer ? '#E4F1F7' : undefined,
                paddingTop: isDrawer ? 0 : 6,
              }}
            >
              {isDrawer ? (
                <div className="m-3 rounded-[18px] overflow-hidden" style={{ border: '3px solid var(--ink)', background: '#E3F2DC' }}>
                  <span aria-hidden className="block mx-auto mt-2 w-20 h-3.5 rounded-full" style={{ background: '#fff', border: '2.5px solid var(--ink)' }} />
                  <div className="pt-1">{renderShelf(c)}</div>
                </div>
              ) : renderShelf(c)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The door: pantry staples you always have. Tap to switch on or off. */
export function FridgeDoor({ isActive, onToggle, loading, query }) {
  const q = query.trim().toLowerCase()
  const on = DEFAULT_STAPLES.filter(s => isActive(s)).length
  const [open, setOpen] = useState(false)
  const doorMatches = q && DEFAULT_STAPLES.some(s => s.includes(q))
  const expanded = open || doorMatches
  return (
    <div className="fridge-frame">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={expanded}
        className="w-full text-left px-5 pt-4 pb-3 lg:pb-1 flex items-center justify-between gap-3 lg:cursor-default"
      >
        <span>
          <span className="block text-[24px] sm:text-[26px]" style={{ fontFamily: 'var(--font-display)' }}>On the door</span>
          <span className="block text-[14px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            Always have it? Tap to switch on. {on} of {DEFAULT_STAPLES.length} on.
          </span>
        </span>
        <ChevronDown size={22} className={`lg:hidden flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <section aria-label="Pantry staples" className={`shelf shelf-door ${expanded ? '' : 'hidden lg:flex'}`}>
        {DEFAULT_STAPLES.map(name => {
          const active = isActive(name)
          const match = q && name.includes(q)
          return (
            <Cell
              key={name}
              name={name}
              tiltKey={name}
              state={active ? 'on' : 'off'}
              onClick={() => !loading && onToggle(name)}
              label={`${name}. ${active ? 'Always have it. Tap to switch off.' : 'Not switched on. Tap to switch on.'}`}
              dim={q && !match}
              hit={match}
            />
          )
        })}
      </section>
    </div>
  )
}
