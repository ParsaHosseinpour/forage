import { useState, useRef, useCallback } from 'react'
import { useToast } from '../components/ui/Toast'

/**
 * Remove-with-undo. The item disappears immediately (its id goes into
 * `pending` — filter on it), a toast offers Undo, and the real delete only
 * runs once the delay passes. If the tab closes first, nothing is lost.
 */
export function useDeferredDelete(commit, delay = 6000) {
  const toast = useToast()
  const [pending, setPending] = useState(() => new Set())
  const timers = useRef({})

  const settle = useCallback((id) => {
    setPending(p => { const n = new Set(p); n.delete(id); return n })
  }, [])

  const request = useCallback((id, label) => {
    setPending(p => new Set(p).add(id))
    timers.current[id] = setTimeout(async () => {
      try { await commit(id) }
      catch {
        toast({ type: 'error', message: `Could not remove ${label}. It has been restored.` })
      }
      finally { settle(id) }
    }, delay)

    toast({
      message: `${label} removed`,
      duration: delay,
      action: { label: 'Undo', onClick: () => { clearTimeout(timers.current[id]); settle(id) } },
    })
  }, [commit, delay, toast, settle])

  return { pending, request }
}
