import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'

export default function RescheduleDateModal({ open, onClose, cert, onSaved }) {
  const toast = useToast()
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setNewDate(cert?.target_date || ''); setReason('') }
  }, [open, cert])

  if (!open || !cert) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const { data, error: fetchErr } = await supabase
      .from('certifications').select('target_date, target_date_history').eq('id', cert.id).single()
    if (fetchErr) { toast.error('Failed to fetch cert data'); setSaving(false); return }

    const history = data.target_date_history || []
    if (data.target_date) {
      history.push({ date: data.target_date, changed_on: new Date().toISOString().split('T')[0], reason: reason || '' })
    }

    const { error } = await supabase.from('certifications')
      .update({ target_date: newDate, target_date_history: history }).eq('id', cert.id)

    setSaving(false)
    if (error) { toast.error(`Failed to reschedule: ${error.message}`); return }
    toast.success('Target date updated')
    onSaved?.(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary font-semibold">Reschedule Target Date</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
        </div>
        <p className="text-xs text-text-muted mb-1">{cert.name}</p>
        <p className="text-xs text-text-muted mb-4">Current: <span className="text-text-primary font-mono-data">{cert.target_date || '—'}</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">New Target Date</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Reason (optional)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Work conflict, Voucher delay"
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted" />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-bg-elevated transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Update Date'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
