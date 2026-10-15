import { Heart } from 'lucide-react'

export default function SaveButton({ saved, onClick, size = 'md', className = '' }) {
  const dim = size === 'sm' ? 15 : size === 'lg' ? 22 : 18
  const box = size === 'sm' ? 30 : size === 'lg' ? 40 : 34

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={saved ? 'Remove from saved' : 'Save recipe'}
      aria-pressed={saved}
      className={`flex items-center justify-center rounded-[10px] border transition-colors duration-150 ${className}`}
      style={{
        width:       box,
        height:      box,
        background:  saved ? 'var(--brand-tint)' : 'var(--surface)',
        borderColor: saved ? 'var(--brand-soft)' : 'var(--border)',
        color:       saved ? 'var(--brand)'      : 'var(--ink-muted)',
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
