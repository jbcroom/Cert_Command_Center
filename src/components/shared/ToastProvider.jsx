import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

let nextId = 0

const ICONS = {
  success: <CheckCircle size={15} className="text-success flex-shrink-0" />,
  error:   <AlertCircle size={15} className="text-danger flex-shrink-0" />,
  warning: <AlertTriangle size={15} className="text-warning flex-shrink-0" />,
}

const BORDERS = {
  success: 'border-success/30',
  error:   'border-danger/30',
  warning: 'border-warning/30',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const addToast = useCallback((type, message) => {
    const id = ++nextId
    setToasts(t => [...t.slice(-2), { id, type, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const toast = {
    success: (msg) => addToast('success', msg),
    error:   (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 bg-bg-elevated border rounded-lg shadow-xl pointer-events-auto max-w-sm text-sm text-text-primary animate-fade-in ${BORDERS[t.type]}`}
          >
            {ICONS[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-text-muted hover:text-text-primary transition-colors">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
