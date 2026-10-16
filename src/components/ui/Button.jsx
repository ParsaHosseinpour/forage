/**
 * Buttons look printed and pressable: an ink outline and a hard 3px shadow
 * that the button sinks into when pressed.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  const base = `
    inline-flex items-center justify-center gap-2 font-bold
    rounded-full cursor-pointer select-none
    transition-[transform,box-shadow,background-color] duration-100
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const solid = 'border-2 border-[var(--ink)] shadow-[0_3px_0_var(--ink)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--ink)] disabled:shadow-none disabled:translate-y-[2px]'

  const variants = {
    primary:   `${solid} bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]`,
    accent:    `${solid} bg-[var(--saffron)] text-[var(--ink)] hover:brightness-95`,
    secondary: `${solid} bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--bg-sunk)]`,
    ghost:     'border-2 border-transparent bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-sunk)]',
    danger:    'border-2 border-transparent bg-transparent text-[var(--danger)] hover:bg-[var(--danger-tint)]',
  }

  const sizes = {
    sm: 'px-3.5 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-[15px]',
    lg: 'px-7 py-3 text-base',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <span className="spinner" /> : children}
    </button>
  )
}
