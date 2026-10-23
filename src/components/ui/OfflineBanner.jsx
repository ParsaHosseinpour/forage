import { useOnlineStatus } from '../../hooks/useOnlineStatus'

/** A slim bar shown for as long as the connection is down. */
export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="status"
      className="px-5 py-2 text-center text-[14px] font-semibold"
      style={{ background: 'var(--carrot-tint)', color: 'var(--ink)', borderBottom: '1.5px solid var(--ink)' }}
    >
      You’re offline. You can look around, but nothing can be saved until you reconnect.
    </div>
  )
}
