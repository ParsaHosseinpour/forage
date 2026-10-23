import { useSyncExternalStore } from 'react'
import { subscribeInstall, getInstallState, promptInstall } from '../lib/installPrompt'

/** 'available' | 'installed' | 'none', plus iOS detection (it has no install event). */
export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, () => 'none')
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  return { state, isIos: isIos && state !== 'installed', install: promptInstall }
}
