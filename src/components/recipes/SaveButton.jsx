import { Heart } from 'lucide-react'

export default function SaveButton({ saved, onClick, size = 'md', className = '' }) {
  const dim = size === 'sm' ? 15 : size === 'lg' ? 22 : 18

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={saved ? 'Remove from saved' : 'Save recipe'}
      className={`flex items-center justify-center rounded-full border transition-all duration-200 active:scale-90 ${className}`}
      style={{
        width:       size === 'sm' ? 28 : size === 'lg' ? 40 : 34,
        height:      size === 'sm' ? 28 : size === 'lg' ? 40 : 34,
        background:  saved ? '#FEE2E2'              : 'white',
        borderColor: saved ? '#FCA5A5'              : 'var(--border)',
        color:       saved ? 'var(--red-soft)'      : 'var(--ink-muted)',
        transform:   saved ? 'scale(1.08)'          : 'scale(1)',
      }}
    >
      <Heart
        size={dim}
        fill={saved ? 'currentColor' : 'none'}
        strokeWidth={saved ? 0 : 1.75}
      />
    </button>
  )
}
