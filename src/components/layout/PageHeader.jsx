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
      <div className={`${width} mx-auto px-5 pt-5 pb-5 sm:pt-8 sm:pb-7 flex items-end justify-between gap-6`}>
        <div className="min-w-0">
          <h1 className="text-[2.1rem] sm:text-6xl">{title}</h1>
          {(subtitle || actions) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2 sm:mt-3">
              {subtitle && <p className="text-[15px] sm:text-[17px]">{subtitle}</p>}
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
        </div>
        {art && (
          <div
            className="hidden sm:grid flex-shrink-0 place-items-center w-24 h-24 rounded-full"
            style={{ background: '#fff', border: '2.5px solid var(--ink)', transform: 'rotate(6deg)' }}
            aria-hidden="true"
          >
            <Produce name={art} size={66} />
          </div>
        )}
      </div>
    </div>,
    slot,
  )
}
