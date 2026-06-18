import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useDeliverables } from '../../hooks/useDeliverables'
import { useStudySessions } from '../../hooks/useStudySessions'
import VerificationBanner from '../shared/VerificationBanner'
import DeliverablesTab from './DeliverablesTab'
import ProgressTab from './ProgressTab'
import ResourcesTab from '../exam/ResourcesTab'
import NotesTab from './NotesTab'
import CompletionModal from './CompletionModal'

const TABS = [
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'progress',     label: 'Progress' },
  { id: 'resources',    label: 'Resources' },
  { id: 'notes',        label: 'Notes' },
]

function ResultBanner({ cert }) {
  if (!cert.completed_at) return null
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-success/10 border border-success/20 rounded-lg">
      <span className="text-xl">🎓</span>
      <div>
        <p className="text-sm font-semibold text-success">Course Complete!</p>
        <p className="text-xs text-text-muted">
          Completed {new Date(cert.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {cert.final_grade && ` · ${cert.final_grade}`}
        </p>
      </div>
      <span className="ml-auto text-accent-gold font-bold text-lg">★</span>
    </div>
  )
}

export default function CourseworkHub({ cert, onRefreshCert, onRefreshDashboard }) {
  const [activeTab, setActiveTab] = useState('deliverables')
  const [completionOpen, setCompletionOpen] = useState(false)
  const { deliverables, loading: deliverablesLoading, refetch: refetchDeliverables } = useDeliverables(cert.id)
  const { sessions } = useStudySessions(cert.id)

  // Auto-populate deliverables on first visit if modules exist but no deliverables yet.
  // Use a ref so this only fires once per mount — avoids re-running when deliverables
  // briefly becomes [] during a refetch (which would create duplicates).
  const autoPopulatedRef = useRef(false)
  useEffect(() => {
    if (autoPopulatedRef.current) return
    if (deliverablesLoading) return
    const modules = cert.modules || []
    if (!modules.length || deliverables.length > 0) { autoPopulatedRef.current = true; return }
    autoPopulatedRef.current = true
    const rows = modules.map((title, i) => ({
      cert_id: cert.id, title, module_number: i + 1, status: 'not_started'
    }))
    supabase.from('deliverables').insert(rows).then(() => refetchDeliverables())
  }, [deliverablesLoading, deliverables.length, cert.id, cert.modules, refetchDeliverables])

  function handleAllComplete() {
    if (cert.status !== 'complete') setCompletionOpen(true)
  }

  // Called after CompletionModal saves — cert.status is now 'complete' in DB
  function handleCompleted() { onRefreshCert?.(); onRefreshDashboard?.() }

  // Called on every deliverable mutation — does NOT touch dashboard refresh
  // so CertPage doesn't remount and the CompletionModal stays alive
  function refresh() { refetchDeliverables(); onRefreshCert?.() }

  // Deduplicate by module_number in case prior bug left duplicate rows in DB
  const seen = new Set()
  const uniqueDeliverables = deliverables.filter(d => {
    const key = d.module_number ?? d.title
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {/* Banners */}
      <VerificationBanner cert={cert} onVerified={onRefreshCert} />
      <ResultBanner cert={cert} />

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-bg-elevated">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'deliverables' && (
          <DeliverablesTab cert={cert} deliverables={uniqueDeliverables} onRefresh={refresh} onAllComplete={handleAllComplete} />
        )}
        {activeTab === 'progress' && (
          <ProgressTab cert={cert} deliverables={uniqueDeliverables} sessions={sessions} />
        )}
        {activeTab === 'resources' && (
          <ResourcesTab cert={cert} onRefresh={onRefreshCert} />
        )}
        {activeTab === 'notes' && (
          <NotesTab cert={cert} onRefresh={onRefreshCert} />
        )}
      </div>

      <CompletionModal
        open={completionOpen}
        cert={cert}
        onClose={() => setCompletionOpen(false)}
        onCompleted={handleCompleted}
      />
    </div>
  )
}
