import { Heart } from 'lucide-react'

export default function SaveButton({ saved, onClick, size = 'md', className = '' }) {
  const dim = size === 'sm' ? 16 : size === 'lg' ? 22 : 18
  const box = size === 'sm' ? 36 : size === 'lg' ? 44 : 38

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={saved ? 'Remove from saved' : 'Save recipe'}
      aria-pressed={saved}
      className={`flex items-center justify-center rounded-full border-2 transition-colors duration-100 ${className}`}
      style={{
        width:       box,
        height:      box,
        background:  '#fff',
        borderColor: 'var(--ink)',
        color:       saved ? 'var(--tomato)' : 'var(--ink)',
      }}
    >
      <Heart size={dim} fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
    </button>
  )
}
