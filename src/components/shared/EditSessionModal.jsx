import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'
import ConfirmModal from './ConfirmModal'

const ACTIVITY_TYPES = ['flashcards', 'mock_exam', 'reading', 'video', 'practice', 'review', 'other']

export default function EditSessionModal({ open, onClose, session, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (session) setForm({ session_date: session.session_date, duration_minutes: session.duration_minutes, activity_type: session.activity_type, notes: session.notes || '' })
  }, [session])

  if (!open || !session) return null

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('study_sessions').update({
      session_date: form.session_date,
      duration_minutes: parseInt(form.duration_minutes),
      activity_type: form.activity_type,
      notes: form.notes || null,
    }).eq('id', session.id)
    setSaving(false)
    if (error) { toast.error(`Failed to save: ${error.message}`); return }
    toast.success('Session updated')
    onSaved?.(); onClose()
  }

  async function handleDelete() {
    const { error } = await supabase.from('study_sessions').delete().eq('id', session.id)
    if (error) { toast.error(`Failed to delete: ${error.message}`); return }
    toast.success('Session deleted')
    onSaved?.(); onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-text-primary font-semibold">Edit Session</h2>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Date</label>
                <input type="date" value={form.session_date || ''} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                  className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Duration (min)</label>
                <input type="number" min="1" value={form.duration_minutes || ''} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Activity Type</label>
              <select value={form.activity_type || ''} onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue">
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Notes</label>
              <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-xs text-danger hover:underline">Delete session</button>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-bg-elevated transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <ConfirmModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        title="Delete Session" message="Delete this study session? Your total study hours will be updated." confirmLabel="Delete" />
    </>
  )
}
