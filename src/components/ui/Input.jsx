const base = `
  w-full px-4 py-2.5 rounded-[10px] border-[1.5px] border-[var(--ink)]
  bg-[var(--surface)] text-[var(--ink)] text-base
  placeholder:text-[var(--ink-muted)]
  focus:outline-none focus:ring-[3px] focus:ring-[var(--saffron)]
  transition-shadow duration-100
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
