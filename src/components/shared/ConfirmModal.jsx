import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', requireType }) {
  const [typed, setTyped] = useState('')

  useEffect(() => { if (!open) setTyped('') }, [open])

  if (!open) return null

  const canConfirm = requireType ? typed === requireType : true

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:flex md:items-center md:justify-center">
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl md:static md:rounded-xl bg-bg-surface border border-bg-elevated shadow-2xl w-full md:max-w-md md:mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-bg-elevated rounded-full mx-auto mb-4" />
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger flex-shrink-0" />
            <h2 className="text-text-primary font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="h-11 w-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-text-muted mb-4 leading-relaxed">{message}</p>

        {requireType && (
          <div className="mb-4">
            <label className="block text-xs text-text-muted mb-1.5">
              Type <span className="font-mono-data text-text-primary">{requireType}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-danger placeholder-text-muted"
              placeholder={requireType}
              autoFocus
            />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onClose} className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (canConfirm) { onConfirm(); onClose() } }}
            disabled={!canConfirm}
            className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
