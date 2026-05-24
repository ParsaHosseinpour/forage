export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  const base = `
    inline-flex items-center justify-center gap-2 font-medium
    rounded-xl border transition-all duration-150 cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed select-none
  `

  const variants = {
    primary: `
      bg-[var(--green)] text-white border-[var(--green)]
      hover:bg-[#2e5040] active:scale-[.98]
    `,
    secondary: `
      bg-white text-[var(--ink)] border-[var(--border)]
      hover:border-[var(--green)] hover:text-[var(--green)] active:scale-[.98]
    `,
    ghost: `
      bg-transparent text-[var(--ink-muted)] border-transparent
      hover:text-[var(--ink)] hover:bg-[var(--cream-dark)] active:scale-[.98]
    `,
    danger: `
      bg-transparent text-[var(--red-soft)] border-transparent
      hover:bg-red-50 active:scale-[.98]
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
