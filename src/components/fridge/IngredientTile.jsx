import { IngredientArt } from '../ui/Produce'

/**
 * One ingredient as a compact tile: illustration, name, quantity.
 * Tapping opens the edit sheet, so there are no hover-only controls.
 */
export default function IngredientTile({ item, onOpen }) {
  const qty = [item.quantity, item.unit].filter(Boolean).join(' ')

  return (
    <button
      onClick={() => onOpen(item)}
      aria-label={`${item.name}${qty ? `, ${qty}` : ''}. Edit or remove.`}
      className="flex flex-col items-center text-center gap-1 sm:gap-1.5 px-1 sm:px-2 pt-2.5 sm:pt-3.5 pb-2 sm:pb-3 rounded-[10px] sm:rounded-[12px] border-[1.5px] bg-[var(--surface)] transition-colors duration-100 hover:bg-[var(--saffron-tint)] active:translate-y-px"
      style={{ borderColor: 'var(--ink)' }}
    >
      <IngredientArt name={item.name} size={44} className="!w-9 !h-9 sm:!w-11 sm:!h-11" />
      <span className="w-full text-[12px] sm:text-[14px] font-bold leading-tight line-clamp-2 hyphens-auto">{item.name}</span>
      <span className="text-[11.5px] sm:text-[12.5px] tabular-nums min-h-[1.1em]" style={{ color: 'var(--ink-muted)' }}>{qty}</span>
    </button>
  )
}
