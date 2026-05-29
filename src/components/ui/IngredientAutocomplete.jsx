import { useState, useRef, useEffect } from 'react'
import { getSuggestions } from '../../lib/ingredientSuggestions'

export default function IngredientAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'e.g. Cherry tomatoes',
  id,
  autoFocus,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [activeIdx, setActiveIdx]     = useState(-1)
  const [open, setOpen]               = useState(false)
  const wrapRef = useRef(null)

  // Update suggestions whenever value changes
  useEffect(() => {
    const hits = getSuggestions(value, 6)
    // Only show dropdown if the typed value isn't an exact match
    const exactMatch = hits.length === 1 && hits[0].toLowerCase() === value.toLowerCase()
    setSuggestions(hits)
    setActiveIdx(-1)
    setOpen(hits.length > 0 && value.length >= 2 && !exactMatch)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (name) => {
    onSelect?.(name)
    onChange?.({ target: { value: name } })
    setOpen(false)
    setActiveIdx(-1)
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      select(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const base = `
    w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)]
    bg-white text-[var(--ink)] text-sm
    placeholder:text-[var(--ink-muted)]
    focus:outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green-mid)]
    transition-all duration-150
  `

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        className={base}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-activedescendant={activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined}
        role="combobox"
      />

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border overflow-hidden"
          style={{
            background:  'white',
            borderColor: 'var(--border)',
            boxShadow:   'var(--shadow-md)',
          }}
        >
          {suggestions.map((s, i) => {
            const q = value.toLowerCase()
            const sl = s.toLowerCase()
            const matchIdx = sl.indexOf(q)

            return (
              <li
                key={s}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); select(s) }}
                onMouseEnter={() => setActiveIdx(i)}
                className="flex items-center px-3.5 py-2.5 text-sm cursor-pointer transition-colors"
                style={{
                  background: i === activeIdx ? 'var(--green-light)' : 'transparent',
                  color:      'var(--ink)',
                }}
              >
                {/* Highlight the matching substring */}
                {matchIdx >= 0 ? (
                  <>
                    {s.slice(0, matchIdx)}
                    <strong style={{ color: 'var(--green)' }}>
                      {s.slice(matchIdx, matchIdx + q.length)}
                    </strong>
                    {s.slice(matchIdx + q.length)}
                  </>
                ) : s}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
