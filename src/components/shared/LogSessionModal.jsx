import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'

const ACTIVITY_TYPES = ['flashcards', 'mock_exam', 'reading', 'video', 'practice', 'review', 'other']

const today = () => new Date().toISOString().split('T')[0]

export default function LogSessionModal({ open, onClose, cert, onLogged }) {
  const toast = useToast()
  const [form, setForm] = useState({ session_date: today(), duration_minutes: '', activity_type: 'reading', notes: '' })
  const [retakeCtx, setRetakeCtx] = useState(null)
  const [saving, setSaving] = useState(false)

  const isCompleteOrArchived = cert && (cert.status === 'complete' || cert.archived)

  useEffect(() => {
    if (open) {
      setForm({ session_date: today(), duration_minutes: '', activity_type: 'reading', notes: '' })
      setRetakeCtx(null)
    }
  }, [open])

  if (!open || !cert) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (isCompleteOrArchived && !retakeCtx) return

    setSaving(true)
    const notes = retakeCtx ? `[${retakeCtx}] ${form.notes}`.trim() : form.notes

    const { error } = await supabase.from('study_sessions').insert({
      cert_id: cert.id,
      session_date: form.session_date,
      duration_minutes: parseInt(form.duration_minutes),
      activity_type: form.activity_type,
      notes: notes || null,
    })

    setSaving(false)
    if (error) {
      toast.error(`Failed to log session: ${error.message}`)
      return
    }
    toast.success(`${form.duration_minutes} minutes logged`)
    onLogged?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:flex md:items-center md:justify-center">
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl md:static md:rounded-xl bg-bg-surface border border-bg-elevated shadow-2xl w-full md:max-w-md md:mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-bg-elevated rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary font-semibold">Log Study Session</h2>
          <button onClick={onClose} className="h-11 w-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><X size={18} /></button>
        </div>

        <p className="text-xs text-text-muted mb-4">{cert.name}</p>

        {isCompleteOrArchived && !retakeCtx && (
          <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-xs text-warning flex items-center gap-1.5 mb-3">
              <AlertTriangle size={12} />
              This certification is marked as {cert.archived ? 'archived' : 'complete'}. Why are you studying?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setRetakeCtx('Retake prep')} className="flex-1 py-1.5 min-h-[44px] rounded text-xs bg-bg-elevated text-text-primary hover:bg-bg-surface transition-colors">Retake prep</button>
              <button onClick={() => setRetakeCtx('Review / reference')} className="flex-1 py-1.5 min-h-[44px] rounded text-xs bg-bg-elevated text-text-primary hover:bg-bg-surface transition-colors">Review / reference</button>
              <button onClick={onClose} className="flex-1 py-1.5 min-h-[44px] rounded text-xs text-text-muted hover:text-text-primary transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {(!isCompleteOrArchived || retakeCtx) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Date</label>
                <input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                  className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Duration (minutes)</label>
                <input type="number" min="1" max="600" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" placeholder="60" required />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Activity Type</label>
              <select value={form.activity_type} onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue">
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none placeholder-text-muted"
                placeholder="What did you cover?" />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Log Session'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
