import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Makes a modal behave like one: Escape closes it, background scroll is
 * locked, focus moves inside and Tab stays inside, and focus returns to
 * whatever opened it. Attach the returned ref to the dialog's root element.
 */
export function useDialog(onClose) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const root = ref.current
    const opener = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog (first field, else the dialog itself).
    const first = root?.querySelector('input, select, textarea') ?? root?.querySelector(FOCUSABLE)
    if (first) first.focus()
    else root?.setAttribute('tabindex', '-1'), root?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !root) return
      const nodes = [...root.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null)
      if (nodes.length === 0) return
      const a = nodes[0], z = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === a)      { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  return ref
}
