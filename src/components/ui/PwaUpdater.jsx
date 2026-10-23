import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from './Toast'

/**
 * Registers the service worker (production builds only) and tells people when
 * a new version is ready, instead of swapping code under them.
 */
export default function PwaUpdater() {
  const toast = useToast()
  const {
    needRefresh:  [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Look for a new version hourly while the app stays open.
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      toast({
        message: 'A new version of Forage is ready.',
        duration: 0,
        action: { label: 'Reload', onClick: () => updateServiceWorker(true) },
      })
    }
  }, [needRefresh, toast, updateServiceWorker])

  useEffect(() => {
    if (offlineReady) toast({ type: 'success', message: 'Forage can now open without a connection.', duration: 6000 })
  }, [offlineReady, toast])

  return null
}
