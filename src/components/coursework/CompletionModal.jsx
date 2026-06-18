import { useState } from 'react'
import { X, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'

const today = () => new Date().toISOString().split('T')[0]

export default function CompletionModal({ open, onClose, cert, onCompleted }) {
  const toast = useToast()
  const [completedAt, setCompletedAt] = useState(today())
  const [finalGrade, setFinalGrade] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open || !cert) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('certifications').update({
      status: 'complete',
      completed_at: completedAt,
      final_grade: finalGrade || null,
    }).eq('id', cert.id)
    setSaving(false)
    if (error) { toast.error(`Failed to mark complete: ${error.message}`); return }
    toast.success('Course marked complete — well done!')
    onCompleted?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-accent-gold" />
            <h2 className="text-text-primary font-semibold">Mark Course Complete</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
        </div>

        <p className="text-xs text-text-muted mb-5">{cert.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Completion Date</label>
            <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" required />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Final Grade (optional)</label>
            <input value={finalGrade} onChange={e => setFinalGrade(e.target.value)}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted"
              placeholder="e.g. Pass, Distinction, A, 92%" />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-bg-elevated transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-gold text-bg-primary hover:bg-accent-gold/80 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Mark Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
