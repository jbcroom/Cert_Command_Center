import { useState, useEffect } from 'react'
import { X, Archive } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'

export default function ArchiveModal({ open, onClose, cert, onArchived }) {
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !cert) return
    async function loadSummary() {
      const [{ count: attempts }, { count: sessions }, { count: flashcards }, { count: deliverables }] = await Promise.all([
        supabase.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('cert_id', cert.id),
        supabase.from('study_sessions').select('*', { count: 'exact', head: true }).eq('cert_id', cert.id),
        supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('cert_id', cert.id),
        supabase.from('deliverables').select('*', { count: 'exact', head: true }).eq('cert_id', cert.id),
      ])
      setSummary({ attempts: attempts || 0, sessions: sessions || 0, flashcards: flashcards || 0, deliverables: deliverables || 0 })
    }
    loadSummary()
  }, [open, cert])

  if (!open || !cert) return null

  async function handleArchive() {
    setSaving(true)
    const { error } = await supabase.from('certifications').update({ archived: true }).eq('id', cert.id)
    setSaving(false)
    if (error) { toast.error(`Failed to archive: ${error.message}`); return }
    toast.success(`${cert.name} archived`)
    onArchived?.(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:flex md:items-center md:justify-center">
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl md:static md:rounded-xl bg-bg-surface border border-bg-elevated shadow-2xl w-full md:max-w-md md:mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="md:hidden w-10 h-1 bg-bg-elevated rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-text-muted" />
            <h2 className="text-text-primary font-semibold">Archive Certification</h2>
          </div>
          <button onClick={onClose} className="h-11 w-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><X size={18} /></button>
        </div>

        <p className="text-sm text-text-primary font-medium mb-1">{cert.name}</p>
        <p className="text-xs text-text-muted mb-4">
          Archiving hides this cert from active views and the dashboard. All data is preserved and can be restored anytime.
        </p>

        {summary && (
          <div className="bg-bg-elevated rounded-lg p-3 mb-4 text-xs text-text-muted space-y-1">
            <p className="text-text-primary font-medium mb-1.5">Data that will be retained:</p>
            {summary.sessions > 0 && <p>• {summary.sessions} study session{summary.sessions !== 1 ? 's' : ''}</p>}
            {summary.attempts > 0 && <p>• {summary.attempts} mock exam attempt{summary.attempts !== 1 ? 's' : ''}</p>}
            {summary.flashcards > 0 && <p>• {summary.flashcards} flashcard{summary.flashcards !== 1 ? 's' : ''}</p>}
            {summary.deliverables > 0 && <p>• {summary.deliverables} deliverable{summary.deliverables !== 1 ? 's' : ''}</p>}
            {!summary.sessions && !summary.attempts && !summary.flashcards && !summary.deliverables && <p>No study data recorded yet.</p>}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onClose} className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-lg text-sm text-text-muted hover:bg-bg-elevated transition-colors">Cancel</button>
          <button onClick={handleArchive} disabled={saving} className="px-4 py-2 min-h-[44px] w-full sm:w-auto rounded-lg text-sm font-medium bg-bg-elevated text-text-primary hover:bg-bg-surface border border-bg-elevated disabled:opacity-50 transition-colors">
            {saving ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  )
}
