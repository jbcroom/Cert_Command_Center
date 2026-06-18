import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'

const today = () => new Date().toISOString().split('T')[0]

export default function LogSittingModal({ open, onClose, cert, nextAttemptNumber = 1, onLogged }) {
  const toast = useToast()
  const [form, setForm] = useState({ sitting_date: today(), result: 'pass', score: '', attempt_number: nextAttemptNumber, notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ sitting_date: today(), result: 'pass', score: '', attempt_number: nextAttemptNumber, notes: '' })
  }, [open, nextAttemptNumber])

  if (!open || !cert) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const { error: sittingError } = await supabase.from('cert_sittings').insert({
      cert_id: cert.id,
      sitting_date: form.sitting_date,
      result: form.result,
      score: form.score ? parseFloat(form.score) : null,
      score_max: cert.score_max || null,
      attempt_number: parseInt(form.attempt_number),
      notes: form.notes || null,
    })

    if (sittingError) { toast.error(`Failed to log sitting: ${sittingError.message}`); setSaving(false); return }

    const newStatus = form.result === 'pass' ? 'complete' : 'failed'
    await supabase.from('certifications').update({ status: newStatus }).eq('id', cert.id)

    setSaving(false)
    toast.success(form.result === 'pass' ? '🎉 Congratulations! Exam passed!' : 'Sitting recorded. You got this on the retake.')
    onLogged?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:flex md:items-center md:justify-center">
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl md:static md:rounded-xl bg-bg-surface border border-bg-elevated shadow-2xl w-full md:max-w-md md:mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-bg-elevated rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary font-semibold">Log Exam Sitting</h2>
          <button onClick={onClose} className="h-11 w-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><X size={18} /></button>
        </div>
        <p className="text-xs text-text-muted mb-4">{cert.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Sitting Date</label>
              <input type="date" value={form.sitting_date} onChange={e => setForm(f => ({ ...f, sitting_date: e.target.value }))}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Attempt #</label>
              <input type="number" min="1" value={form.attempt_number} onChange={e => setForm(f => ({ ...f, attempt_number: e.target.value }))}
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-2">Result</label>
            <div className="grid grid-cols-2 gap-2">
              {['pass', 'fail'].map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, result: r }))}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${form.result === r
                    ? r === 'pass' ? 'bg-success/20 border-success text-success' : 'bg-danger/20 border-danger text-danger'
                    : 'border-bg-elevated text-text-muted hover:border-text-muted'}`}>
                  {r === 'pass' ? 'Pass ✓' : 'Fail ✗'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Score (optional — some vendors don't disclose)</label>
            <input type="number" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
              placeholder={cert.score_max ? `out of ${cert.score_max}` : 'e.g. 750'}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted" />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Notes / reflections (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none" />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-lg text-sm text-text-muted hover:bg-bg-elevated transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Log Sitting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
