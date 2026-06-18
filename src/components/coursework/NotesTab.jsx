import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'

export default function NotesTab({ cert, onRefresh }) {
  const toast = useToast()
  const [notes, setNotes] = useState(cert.notes || '')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const timer = useRef(null)

  useEffect(() => { setNotes(cert.notes || '') }, [cert.notes])

  function handleChange(val) {
    setNotes(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => autoSave(val), 1500)
  }

  async function autoSave(val) {
    setSaving(true)
    const { error } = await supabase.from('certifications').update({ notes: val || null }).eq('id', cert.id)
    setSaving(false)
    if (error) { toast.error('Failed to save notes'); return }
    setLastSaved(new Date())
    onRefresh?.()
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={notes}
          onChange={e => handleChange(e.target.value)}
          rows={14}
          placeholder="Course notes, key takeaways, resources, reminders… Auto-saves as you type."
          className="w-full bg-bg-elevated border border-bg-elevated rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none placeholder-text-muted leading-relaxed"
        />
        <span className="absolute bottom-3 right-3 text-xs text-text-muted">
          {saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </span>
      </div>
    </div>
  )
}
