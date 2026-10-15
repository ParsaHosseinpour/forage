export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  const base = `
    inline-flex items-center justify-center gap-2 font-semibold
    rounded-[10px] border transition-colors duration-150 cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed select-none
    active:translate-y-px
  `

  const variants = {
    primary: `
      bg-[var(--brand)] text-white border-[var(--brand)]
      hover:bg-[var(--brand-hover)] hover:border-[var(--brand-hover)]
    `,
    accent: `
      bg-[var(--saffron)] text-[var(--ink)] border-[var(--saffron)]
      hover:brightness-95
    `,
    secondary: `
      bg-[var(--surface)] text-[var(--ink)] border-[var(--border)]
      hover:border-[var(--brand)] hover:text-[var(--brand)]
    `,
    ghost: `
      bg-transparent text-[var(--ink-muted)] border-transparent
      hover:text-[var(--ink)] hover:bg-[var(--bg-sunk)]
    `,
    danger: `
      bg-transparent text-[var(--danger)] border-transparent
      hover:bg-[var(--danger-tint)]
    `,
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
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
