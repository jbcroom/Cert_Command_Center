import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'
import ConfirmModal from './ConfirmModal'

export default function EditAttemptModal({ open, onClose, attempt, cert, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (attempt) setForm({
      attempt_date: attempt.attempt_date,
      score: attempt.score,
      score_max: attempt.score_max,
      time_taken_minutes: attempt.time_taken_minutes || '',
      notes: attempt.notes || '',
    })
  }, [attempt])

  if (!open || !attempt) return null

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('exam_attempts').update({
      attempt_date: form.attempt_date,
      score: parseFloat(form.score),
      score_max: parseFloat(form.score_max),
      time_taken_minutes: form.time_taken_minutes ? parseInt(form.time_taken_minutes) : null,
      notes: form.notes || null,
    }).eq('id', attempt.id)
    setSaving(false)
    if (error) { toast.error(`Failed to save: ${error.message}`); return }
    toast.success('Attempt updated')
    onSaved?.(); onClose()
  }

  async function handleDelete() {
    const { error } = await supabase.from('exam_attempts').delete().eq('id', attempt.id)
    if (error) { toast.error(`Failed to delete: ${error.message}`); return }
    toast.success('Attempt deleted')
    onSaved?.(); onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-text-primary font-semibold">Edit Mock Exam Attempt</h2>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Date</label>
              <input type="date" value={form.attempt_date || ''} onChange={e => setForm(f => ({ ...f, attempt_date: e.target.value }))}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Score</label>
                <input type="number" value={form.score || ''} onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                  className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Score Max</label>
                <input type="number" value={form.score_max || ''} onChange={e => setForm(f => ({ ...f, score_max: e.target.value }))}
                  className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Time Taken (minutes, optional)</label>
              <input type="number" value={form.time_taken_minutes || ''} onChange={e => setForm(f => ({ ...f, time_taken_minutes: e.target.value }))}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Notes</label>
              <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => setDeleteOpen(true)} className="text-xs text-danger hover:underline">Delete attempt</button>
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
        title="Delete Attempt" message="Delete this mock exam attempt? This will remove it from your score history and trend chart." confirmLabel="Delete" />
    </>
  )
}
