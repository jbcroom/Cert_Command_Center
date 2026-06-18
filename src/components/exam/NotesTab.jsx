import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'

function fmt(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function NotesTab({ cert, onRefresh }) {
  const toast = useToast()
  const [notes, setNotes] = useState(cert.notes || '')
  const [saving, setSaving] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => { setNotes(cert.notes || '') }, [cert.notes])

  function handleChange(val) {
    setNotes(val)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(val), 1500)
  }

  async function autoSave(val) {
    setSaving(true)
    const { error } = await supabase.from('certifications').update({ notes: val || null }).eq('id', cert.id)
    setSaving(false)
    if (error) toast.error('Failed to save notes')
    else onRefresh?.()
  }

  const changelog = cert.changelog || []
  const scheduleHistory = cert.target_date_history || []

  return (
    <div className="space-y-5">
      <div className="relative">
        <textarea
          value={notes}
          onChange={e => handleChange(e.target.value)}
          rows={12}
          placeholder="Add your prep notes here. Auto-saves after you stop typing."
          className="w-full bg-bg-elevated border border-bg-elevated rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none placeholder-text-muted leading-relaxed"
        />
        {saving && <span className="absolute bottom-3 right-3 text-xs text-text-muted">Saving…</span>}
      </div>

      {/* Schedule history */}
      {scheduleHistory.length > 0 && (
        <div className="border border-bg-elevated rounded-xl overflow-hidden">
          <button onClick={() => setScheduleOpen(o => !o)}
            className="flex items-center gap-2 w-full px-4 py-3 text-xs text-text-muted hover:bg-bg-elevated transition-colors">
            {scheduleOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Schedule History ({scheduleHistory.length})
          </button>
          {scheduleOpen && (
            <div className="border-t border-bg-elevated divide-y divide-bg-elevated">
              {[...scheduleHistory].reverse().map((h, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="text-text-muted">{fmt(h.changed_on)}</span>
                  <span className="text-text-primary font-mono-data">{h.date}</span>
                  {h.reason && <span className="text-text-muted italic flex-1 text-right truncate">{h.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Change log */}
      {changelog.length > 0 && (
        <div className="border border-bg-elevated rounded-xl overflow-hidden">
          <button onClick={() => setChangelogOpen(o => !o)}
            className="flex items-center gap-2 w-full px-4 py-3 text-xs text-text-muted hover:bg-bg-elevated transition-colors">
            {changelogOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Change History ({changelog.length})
          </button>
          {changelogOpen && (
            <div className="border-t border-bg-elevated divide-y divide-bg-elevated">
              {[...changelog].reverse().map((c, i) => (
                <div key={i} className="px-4 py-2.5 text-xs space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">{fmt(c.date)}</span>
                    <span className="font-mono-data text-accent-blue">{c.field}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="line-through">{c.old_value}</span>
                    <span>→</span>
                    <span className="text-text-primary">{c.new_value}</span>
                  </div>
                  {c.note && <p className="text-text-muted italic">{c.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
