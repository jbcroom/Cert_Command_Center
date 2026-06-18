import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Clock, Pencil, Calendar, Archive, Trash2 } from 'lucide-react'

const STATUS_STYLES = {
  planned:     'bg-bg-elevated text-text-muted',
  in_progress: 'bg-accent-blue/20 text-accent-blue',
  complete:    'bg-accent-gold/20 text-accent-gold',
  failed:      'bg-danger/20 text-danger',
}

const STATUS_LABELS = {
  planned: 'Planned',
  in_progress: 'In Progress',
  complete: 'Complete',
  failed: 'Failed',
}

export default function TopBar({ cert, onLogSession, onEdit, onReschedule, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-bg-elevated bg-bg-surface flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {cert?.color && (
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: cert.color }}
          />
        )}
        <h1 className="text-text-primary font-bold text-lg truncate">
          {cert ? cert.name : 'Dashboard'}
        </h1>
        {cert?.status && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${STATUS_STYLES[cert.status]}`}>
            {STATUS_LABELS[cert.status]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {cert && (
          <button
            onClick={onLogSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
          >
            <Clock size={14} />
            Log Session
          </button>
        )}

        {cert && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-bg-elevated border border-bg-elevated rounded-lg shadow-xl z-50 py-1">
                <button
                  onClick={() => { setMenuOpen(false); onEdit?.() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-primary hover:bg-bg-surface transition-colors"
                >
                  <Pencil size={14} /> Edit Certification
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onReschedule?.() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-primary hover:bg-bg-surface transition-colors"
                >
                  <Calendar size={14} /> Reschedule
                </button>
                <div className="border-t border-bg-surface my-1" />
                <button
                  onClick={() => { setMenuOpen(false); onArchive?.() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
                >
                  <Archive size={14} /> Archive
                </button>
                {onDelete && (
                  <button
                    onClick={() => { setMenuOpen(false); onDelete?.() }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-bg-surface transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
