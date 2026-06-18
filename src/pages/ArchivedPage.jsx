import { useState } from 'react'
import { ArchiveRestore, Trash2, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCertifications, getCertYear } from '../hooks/useCertifications'
import { useToast } from '../components/shared/ToastProvider'
import StatusBadge from '../components/shared/StatusBadge'
import ConfirmModal from '../components/shared/ConfirmModal'
import TopBar from '../components/layout/TopBar'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ArchivedPage({ onRestore }) {
  const toast = useToast()
  const { certifications, loading, refetch } = useCertifications({ includeArchived: true })
  const archived = certifications.filter(c => c.archived)

  const [restoring, setRestoring] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [summaries, setSummaries] = useState({})
  const [expanded, setExpanded] = useState({})

  async function handleRestore(cert) {
    setRestoring(cert.id)
    const { error } = await supabase.from('certifications').update({ archived: false }).eq('id', cert.id)
    setRestoring(null)
    if (error) { toast.error(`Failed to restore: ${error.message}`); return }
    toast.success(`${cert.name} restored`)
    refetch(); onRestore?.()
  }

  async function loadSummary(cert) {
    if (summaries[cert.id]) { setExpanded(e => ({ ...e, [cert.id]: !e[cert.id] })); return }
    const [{ count: attempts }, { count: sessions }, { count: flashcards }, { count: deliverables }] = await Promise.all([
      supabase.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('cert_id', cert.id),
      supabase.from('study_sessions').select('*', { count: 'exact', head: true }).eq('cert_id', cert.id),
      supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('cert_id', cert.id),
      supabase.from('deliverables').select('*', { count: 'exact', head: true }).eq('cert_id', cert.id),
    ])
    setSummaries(s => ({ ...s, [cert.id]: { attempts: attempts || 0, sessions: sessions || 0, flashcards: flashcards || 0, deliverables: deliverables || 0 } }))
    setExpanded(e => ({ ...e, [cert.id]: true }))
  }

  async function handleDelete() {
    const cert = deleteTarget
    const { error } = await supabase.from('certifications').delete().eq('id', cert.id)
    if (error) { toast.error(`Failed to delete: ${error.message}`); return }
    toast.success(`${cert.name} permanently deleted`)
    refetch(); onRestore?.()
  }

  // Group archived by year
  const grouped = archived.reduce((acc, cert) => {
    const year = getCertYear(cert)
    if (!acc[year]) acc[year] = []
    acc[year].push(cert)
    return acc
  }, {})
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a)

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Archived Certifications</h1>
            <p className="text-sm text-text-muted mt-1">
              {archived.length} archived cert{archived.length !== 1 ? 's' : ''}. All data is preserved. Restore anytime or permanently delete from here.
            </p>
          </div>

          {loading ? (
            <p className="text-text-muted text-sm">Loading…</p>
          ) : archived.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-muted">No archived certifications.</p>
            </div>
          ) : (
            years.map(year => (
              <div key={year}>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">{year}</p>
                <div className="space-y-3">
                  {grouped[year].map(cert => {
                    const summary = summaries[cert.id]
                    const isExpanded = expanded[cert.id]
                    const dataPoints = summary
                      ? [
                          summary.sessions && `${summary.sessions} session${summary.sessions !== 1 ? 's' : ''}`,
                          summary.attempts && `${summary.attempts} mock attempt${summary.attempts !== 1 ? 's' : ''}`,
                          summary.flashcards && `${summary.flashcards} flashcard${summary.flashcards !== 1 ? 's' : ''}`,
                          summary.deliverables && `${summary.deliverables} deliverable${summary.deliverables !== 1 ? 's' : ''}`,
                        ].filter(Boolean)
                      : []

                    return (
                      <div key={cert.id} className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
                        <div className="flex items-center gap-4 p-4">
                          {cert.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cert.color }} />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-text-primary">{cert.name}</p>
                              <StatusBadge status={cert.status} />
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
                              {cert.vendor} · Target: {fmt(cert.target_date)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => loadSummary(cert)}
                              className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                              title="View data summary"
                            >
                              <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleRestore(cert)}
                              disabled={restoring === cert.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 disabled:opacity-50 transition-colors"
                            >
                              <ArchiveRestore size={13} />
                              {restoring === cert.id ? 'Restoring…' : 'Restore'}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(cert)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </div>

                        {isExpanded && summary && (
                          <div className="px-4 pb-4 pt-0 border-t border-bg-elevated">
                            <p className="text-xs text-text-muted mt-3 mb-2 font-medium">Retained data:</p>
                            {dataPoints.length ? (
                              <div className="flex flex-wrap gap-2">
                                {dataPoints.map(d => (
                                  <span key={d} className="text-xs bg-bg-elevated text-text-muted px-2.5 py-1 rounded-full">{d}</span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-text-muted">No study data recorded.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Permanently Delete Certification"
        message={`This will permanently delete all mock exam attempts, study sessions, flashcards, and deliverables for "${deleteTarget?.name}". This cannot be undone.`}
        confirmLabel="Delete Forever"
        requireType={deleteTarget?.exam_code || deleteTarget?.name}
      />
    </>
  )
}
