import Button from './Button'

/**
 * Shown where a page would otherwise claim "nothing here yet" while the real
 * reason is that nothing could be loaded.
 */
export default function OfflineNotice({ what, onRetry }) {
  return (
    <div className="py-10" role="status">
      <h2 className="text-3xl mb-2">You’re offline</h2>
      <p className="text-[16px] mb-5 max-w-md" style={{ color: 'var(--ink-muted)' }}>
        Your {what} can’t load until you’re back online.
      </p>
      <Button variant="secondary" onClick={onRetry ?? (() => window.location.reload())}>Try again</Button>
    </div>
  )
}
