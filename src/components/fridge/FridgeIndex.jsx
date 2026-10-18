import { useState } from 'react'
import { Check } from 'lucide-react'
import { DEFAULT_STAPLES } from '../../hooks/usePantry'

/** Fresh things first, then the cupboard, then the freezer. */
const ORDER  = ['produce', 'dairy', 'protein', 'grains', 'pantry', 'frozen', 'other']
const LABELS = { produce: 'Produce', dairy: 'Dairy', protein: 'Protein', grains: 'Grains', pantry: 'Pantry', frozen: 'Frozen', other: 'Other' }

/**
 * One block of the index: the heading sits in a left gutter (and stays in view
 * on long lists), the entries run in columns on the right.
 */
function Section({ id, title, note, first, action, collapsed = false, children }) {
  return (
    <section
      aria-labelledby={`fridge-${id}`}
      className="grid md:grid-cols-[170px_1fr] gap-x-8 gap-y-2 py-5 sm:py-6"
      style={{ borderTop: first ? '2.5px solid var(--ink)' : '1px solid var(--border)' }}
    >
      <div className="md:sticky md:top-[88px] self-start flex items-baseline gap-3 md:block">
        <h2 id={`fridge-${id}`} className="text-[26px] leading-none">{title}</h2>
        <p className="text-[14px] md:mt-1.5 tabular-nums" style={{ color: 'var(--ink-muted)' }}>{note}</p>
        {action}
      </div>
      <ul className={`columns-2 lg:columns-3 gap-x-8 lg:gap-x-10 ${collapsed ? 'hidden md:block' : ''}`}>{children}</ul>
    </section>
  )
}

const rowClass = 'w-full min-h-[42px] sm:min-h-[38px] flex items-baseline gap-x-2 px-2 -mx-2 py-1.5 rounded-[6px] text-left transition-colors hover:bg-[var(--saffron-tint)]'

function ItemRow({ item, onOpen }) {
  const qty = [item.quantity, item.unit].filter(Boolean).join(' ')
  return (
    <li className="break-inside-avoid">
      <button onClick={() => onOpen(item)} className={`${rowClass} flex-wrap justify-between sm:flex-nowrap sm:justify-start`} aria-label={`${item.name}${qty ? `, ${qty}` : ''}. Edit or remove.`}>
        <span className="text-[16px] font-semibold min-w-0 [overflow-wrap:anywhere] leading-snug">{item.name}</span>
        {qty && (
          <>
            <span aria-hidden className="hidden sm:block flex-1 min-w-[10px] self-end mb-[6px] border-b-[1.5px] border-dotted" style={{ borderColor: 'var(--ink-muted)', opacity: 0.45 }} />
            <span className="text-[15px] tabular-nums flex-shrink-0" style={{ color: 'var(--ink-muted)' }}>{qty}</span>
          </>
        )}
      </button>
    </li>
  )
}

export default function FridgeIndex({ items, query, onOpen, isActive, onToggle, loadingStaples }) {
  const q = query.trim().toLowerCase()

  const groups = ORDER
    .map(cat => ({
      cat,
      list: items
        .filter(i => i.category === cat && (!q || i.name.toLowerCase().includes(q)))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter(g => g.list.length)

  const staples = DEFAULT_STAPLES.filter(s => !q || s.includes(q))
  const onCount = DEFAULT_STAPLES.filter(s => isActive(s)).length
  const [stapleOpen, setStapleOpen] = useState(false)
  const stapleCollapsed = !stapleOpen && !q            // phones only; always open from md up

  return (
    <div>
      {groups.map((g, i) => (
        <Section key={g.cat} id={g.cat} first={i === 0} title={LABELS[g.cat]}
                 note={`${g.list.length} item${g.list.length !== 1 ? 's' : ''}`}>
          {g.list.map(item => <ItemRow key={item.id} item={item} onOpen={onOpen} />)}
        </Section>
      ))}

      {staples.length > 0 && (
        <Section
          id="staples" first={groups.length === 0} title="Staples" note={`${onCount} of ${DEFAULT_STAPLES.length} on`}
          collapsed={stapleCollapsed}
          action={
            <button
              onClick={() => setStapleOpen(o => !o)}
              aria-expanded={!stapleCollapsed}
              className="md:hidden ml-auto text-[15px] font-bold underline underline-offset-4"
              style={{ color: 'var(--brand)' }}
            >
              {stapleCollapsed ? 'Show' : 'Hide'}
            </button>
          }
        >
          {staples.map(name => {
            const on = isActive(name)
            return (
              <li key={name} className="break-inside-avoid">
                <button
                  onClick={() => !loadingStaples && onToggle(name)}
                  aria-pressed={on}
                  aria-label={`${name}. ${on ? 'You always have it. Tap to switch off.' : 'Tap to switch on.'}`}
                  className={`${rowClass} items-center`}
                >
                  <span
                    aria-hidden
                    className="grid place-items-center w-[20px] h-[20px] rounded-[5px] flex-shrink-0"
                    style={{ border: '2px solid var(--ink)', background: on ? 'var(--fresh)' : 'var(--surface)' }}
                  >
                    {on && <Check size={14} strokeWidth={3.5} color="#fff" />}
                  </span>
                  <span className="text-[16px] capitalize" style={{ fontWeight: on ? 700 : 500, color: on ? 'var(--ink)' : 'var(--ink-muted)' }}>{name}</span>
                </button>
              </li>
            )
          })}
        </Section>
      )}
    </div>
  )
}
