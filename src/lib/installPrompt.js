/**
 * Captures the browser's "install this app" event. Browsers fire it early in
 * page load, well before the Profile page exists, so it is stored here at
 * startup and read later.
 */
let deferred = null
let installed = false
const listeners = new Set()
const notify = () => listeners.forEach(l => l())

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

if (typeof window !== 'undefined') {
  installed = isStandalone()
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify() })
  window.addEventListener('appinstalled', () => { installed = true; deferred = null; notify() })
}

export const subscribeInstall = (l) => { listeners.add(l); return () => listeners.delete(l) }
export const getInstallState = () => (installed ? 'installed' : deferred ? 'available' : 'none')

export async function promptInstall() {
  if (!deferred) return 'unavailable'
  deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  notify()
  return outcome
}
