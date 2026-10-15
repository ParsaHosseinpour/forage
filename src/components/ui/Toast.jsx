import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  info:    <Info       size={16} />,
  success: <CheckCircle2 size={16} />,
  warning: <AlertTriangle size={16} />,
  error:   <AlertCircle size={16} />,
}

const STYLES = {
  info:    { bg: 'white',                  border: 'var(--border)',    color: 'var(--ink)',      icon: 'var(--brand)'     },
  success: { bg: 'var(--fresh-tint)', border: 'var(--fresh-soft)', color: 'var(--fresh)', icon: 'var(--fresh)' },
  warning: { bg: 'var(--carrot-tint)',     border: 'var(--carrot-soft)',          color: 'var(--carrot)',    icon: 'var(--carrot)'     },
  error:   { bg: 'var(--danger-tint)',               border: 'var(--danger-soft)',          color: 'var(--danger)', icon: 'var(--danger)'  },
}

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts(t => t.filter(toast => toast.id !== id))
  }, [])

  const toast = useCallback(({ message, type = 'info', duration = 5000, action }) => {
    const id = ++_id
    setToasts(t => [...t.slice(-3), { id, message, type, action }]) // max 4 toasts
    if (duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container — bottom-centre on mobile, bottom-right on desktop */}
      <div
        aria-live="polite"
        className="fixed z-50 flex flex-col gap-2 pointer-events-none bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6"
        style={{
          right:  '1.5rem',
          left:   '1.5rem',
          maxWidth: '420px',
          marginLeft: 'auto',
        }}
      >
        {toasts.map(({ id, message, type, action }) => {
          const s = STYLES[type] ?? STYLES.info
          return (
            <div
              key={id}
              role="alert"
              className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-[12px] border slide-up"
              style={{
                background:   s.bg,
                borderColor:  s.border,
                boxShadow:    'var(--shadow-md)',
              }}
            >
              {/* Icon */}
              <span className="flex-shrink-0 mt-0.5" style={{ color: s.icon }}>
                {ICONS[type]}
              </span>

              {/* Message */}
              <p className="flex-1 text-sm leading-snug" style={{ color: s.color }}>
                {message}
              </p>

              {/* Optional action button */}
              {action && (
                <button
                  onClick={() => { action.onClick(); dismiss(id) }}
                  className="flex-shrink-0 text-sm font-semibold underline underline-offset-2 px-1 py-0.5"
                  style={{ color: s.color }}
                >
                  {action.label}
                </button>
              )}

              {/* Dismiss */}
              <button
                onClick={() => dismiss(id)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: s.color }}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/** Call anywhere inside <ToastProvider> to fire a toast */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
