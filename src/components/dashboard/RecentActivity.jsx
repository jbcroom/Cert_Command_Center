import { useState } from 'react'
import { Clock, Pencil } from 'lucide-react'
import EditSessionModal from '../shared/EditSessionModal'

const ACTIVITY_LABELS = {
  flashcards: 'Flashcards',
  mock_exam: 'Mock Exam',
  reading: 'Reading',
  video: 'Video',
  practice: 'Practice',
  review: 'Review',
  other: 'Other',
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RecentActivity({ sessions, onRefresh }) {
  const [editSession, setEditSession] = useState(null)
  const recent = sessions.slice(0, 5)

  return (
    <div className="bg-bg-surface rounded-xl p-5 border border-bg-elevated">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
        Recent Activity
      </h2>
      {!recent.length ? (
        <p className="text-text-muted text-sm">No study sessions logged yet.</p>
      ) : (
        <div className="space-y-2">
          {recent.map(session => {
            const certName = session.certifications?.exam_code || session.certifications?.name || '—'
            return (
              <div
                key={session.id}
                className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-bg-elevated/50 hover:bg-bg-elevated transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Clock size={13} className="text-text-muted flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-text-primary font-medium truncate">{certName}</p>
                    <p className="text-[11px] text-text-muted">
                      {ACTIVITY_LABELS[session.activity_type] || 'Study'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  <span className="font-mono-data text-accent-teal">{session.duration_minutes}m</span>
                  <span className="text-text-muted">{formatDate(session.session_date)}</span>
                  <button
                    onClick={() => setEditSession(session)}
                    className="p-1 rounded text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
                    title="Edit session"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EditSessionModal
        open={!!editSession}
        session={editSession}
        onClose={() => setEditSession(null)}
        onSaved={() => { setEditSession(null); onRefresh?.() }}
      />
    </div>
  )
}
