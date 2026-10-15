const base = `
  w-full px-3.5 py-2.5 rounded-[10px] border border-[var(--border)]
  bg-[var(--surface)] text-[var(--ink)] text-base sm:text-[15px]
  placeholder:text-[var(--ink-muted)]
  focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]
  transition-colors duration-150
`

export function Input({ className = '', ...props }) {
  return (
    <input className={`${base} ${className}`} {...props} />
  )
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`${base} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Label({ children, className = '', ...props }) {
  return (
    <label
      className={`block text-sm font-semibold mb-1.5 ${className}`}
      style={{ color: 'var(--ink)' }}
      {...props}
    >
      {children}
    </label>
  )
}
