import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Lets the browser/phone Back button close an in-page overlay (e.g. an open
 * recipe) instead of leaving the page. Opening pushes one history entry;
 * Back pops it and calls `close`; closing in-app pops it too.
 */
export function useBackToClose(open, close) {
  const navigate = useNavigate()
  const location = useLocation()
  const pushed = useRef(false)

  useEffect(() => {
    if (open && !pushed.current) {
      pushed.current = true
      navigate(location.pathname, { state: { overlay: true } })
    } else if (!open && pushed.current) {
      pushed.current = false
      if (location.state?.overlay) navigate(-1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && pushed.current && !location.state?.overlay) {
      pushed.current = false
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])
}
