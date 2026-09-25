const base = `
  w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)]
  bg-white text-[var(--ink)] text-sm
  placeholder:text-[var(--ink-muted)]
  focus:outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green-mid)]
  transition-all duration-150
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
      className={`block text-[13px] font-medium mb-1.5 ${className}`}
      style={{ color: 'var(--ink-muted)' }}
      {...props}
    >
      {children}
    </label>
  )
}
