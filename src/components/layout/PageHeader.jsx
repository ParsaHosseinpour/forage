import { createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import Produce from '../ui/Produce'

/** The layout provides a slot element; pages render their header into it. */
export const HeaderSlotContext = createContext(null)

/**
 * Full-bleed colour band at the top of a page. Rendered through a portal so a
 * page can declare its header where its own logic lives, while the band still
 * spans the whole window.
 */
export default function PageHeader({ title, subtitle, art, actions, width = 'max-w-5xl' }) {
  const slot = useContext(HeaderSlotContext)
  if (!slot) return null

  return createPortal(
    <div style={{ background: 'var(--hue)', color: 'var(--hue-ink)', borderBottom: '2.5px solid var(--ink)' }}>
      <div className={`${width} mx-auto px-5 pt-8 pb-7 sm:pt-10 sm:pb-9 flex items-end justify-between gap-6`}>
        <div className="min-w-0">
          <h1 className="text-[2.5rem] sm:text-6xl mb-2">{title}</h1>
          {subtitle && <p className="text-[17px]">{subtitle}</p>}
          {actions && <div className="flex flex-wrap items-center gap-2 mt-5">{actions}</div>}
        </div>
        {art && (
          <div
            className="hidden sm:grid flex-shrink-0 place-items-center w-28 h-28 rounded-full"
            style={{ background: '#fff', border: '2.5px solid var(--ink)', transform: 'rotate(6deg)' }}
            aria-hidden="true"
          >
            <Produce name={art} size={78} />
          </div>
        )}
      </div>
    </div>,
    slot,
  )
}
