import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertTriangle } from 'lucide-react'

function daysRemaining(dateStr) {
  if (!dateStr) return Infinity
  return Math.max(1, Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)))
}

function urgencyScore(cert, lastMockPct, completionPct) {
  const days = daysRemaining(cert.target_date)
  if (cert.type === 'exam') {
    const targetPct = cert.personal_target_score && cert.score_max
      ? (cert.personal_target_score / cert.score_max) * 100
      : cert.passing_score && cert.score_max
        ? (cert.passing_score / cert.score_max) * 100 + 10
        : 80
    const scoreGap = Math.max(0, targetPct - (lastMockPct || 0))
    return (scoreGap + 1) / days
  }
  return (1 - (completionPct / 100)) / days
}

function needsVerification(cert) {
  if (!cert.last_verified_date) return true
  const days = Math.floor((new Date() - new Date(cert.last_verified_date)) / (1000 * 60 * 60 * 24))
  return days > 90
}

export default function NextUpCard({ certifications, attempts, deliverables }) {
  const navigate = useNavigate()

  const active = certifications.filter(
    c => !c.archived && ['planned', 'in_progress'].includes(c.status)
  )

  if (!active.length) {
    return (
      <div className="bg-bg-surface rounded-xl p-5 border border-bg-elevated">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">Next Up</h2>
        <p className="text-text-muted text-sm">No active certifications.</p>
      </div>
    )
  }

  // Score each cert
  const scored = active.map(cert => {
    let lastMockPct = 0
    let completionPct = 0

    if (cert.type === 'exam') {
      const certAttempts = attempts.filter(a => a.cert_id === cert.id)
      if (certAttempts.length) lastMockPct = certAttempts[0].score_pct || 0
    } else {
      const certDeliverables = deliverables.filter(d => d.cert_id === cert.id)
      const done = certDeliverables.filter(d => d.status === 'complete').length
      completionPct = certDeliverables.length ? (done / certDeliverables.length) * 100 : 0
    }

    return { cert, lastMockPct, completionPct, score: urgencyScore(cert, lastMockPct, completionPct) }
  })

  scored.sort((a, b) => b.score - a.score)
  const { cert, lastMockPct, completionPct } = scored[0]
  const days = daysRemaining(cert.target_date)
  const stale = needsVerification(cert)

  const targetPct = cert.personal_target_score && cert.score_max
    ? (cert.personal_target_score / cert.score_max) * 100
    : cert.passing_score && cert.score_max
      ? (cert.passing_score / cert.score_max) * 100 + 10
      : 80
  const gap = cert.type === 'exam' ? Math.max(0, targetPct - lastMockPct).toFixed(1) : null

  return (
    <div className="bg-bg-surface rounded-xl p-5 border border-bg-elevated flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Next Up</h2>

      {stale && (
        <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
          <AlertTriangle size={12} />
          Exam details may be outdated — verify before studying
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {cert.color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cert.color }} />}
            <p className="text-text-primary font-semibold text-sm">{cert.name}</p>
          </div>
          <p className="text-text-muted text-xs">{cert.vendor}</p>
        </div>
        <span className="text-2xl font-bold font-mono-data text-accent-blue flex-shrink-0">
          {days < Infinity ? `${days}d` : '—'}
        </span>
      </div>

      {cert.type === 'exam' ? (
        <div className="space-y-1 text-xs text-text-muted">
          <div className="flex justify-between">
            <span>Last mock score</span>
            <span className="font-mono-data text-text-primary">{lastMockPct ? `${lastMockPct}%` : 'No attempts'}</span>
          </div>
          {gap !== null && (
            <div className="flex justify-between">
              <span>Gap to target</span>
              <span className={`font-mono-data ${parseFloat(gap) > 0 ? 'text-warning' : 'text-success'}`}>
                {parseFloat(gap) > 0 ? `-${gap}%` : 'On target ✓'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Completion</span>
            <span className="font-mono-data text-text-primary">{completionPct.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-teal rounded-full transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(`/cert/${cert.id}`)}
        className="flex items-center justify-center gap-2 w-full py-2 mt-1 rounded-lg bg-accent-blue/10 text-accent-blue text-sm font-medium hover:bg-accent-blue/20 transition-colors"
      >
        Go Study <ArrowRight size={14} />
      </button>
    </div>
  )
}
