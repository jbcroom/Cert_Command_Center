import { Lightbulb } from 'lucide-react'

function daysUntil(dateStr) {
  if (!dateStr) return Infinity
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
}

export default function StudyRecommendation({ certifications, attempts, sessions, deliverables }) {
  const active = certifications.filter(
    c => !c.archived && ['planned', 'in_progress'].includes(c.status)
  )

  let recommendation = null

  // Priority 1: exam within 30 days and below personal target
  for (const cert of active) {
    if (cert.type !== 'exam' || !cert.target_date) continue
    const days = daysUntil(cert.target_date)
    if (days > 30) continue
    const certAttempts = attempts.filter(a => a.cert_id === cert.id)
    const lastScore = certAttempts[0]?.score_pct || 0
    const targetPct = cert.personal_target_score && cert.score_max
      ? (cert.personal_target_score / cert.score_max) * 100
      : cert.passing_score && cert.score_max
        ? (cert.passing_score / cert.score_max) * 100 + 10
        : 80
    if (lastScore < targetPct) {
      recommendation = {
        priority: 'high',
        text: `${cert.exam_code || cert.name} is ${days} day${days !== 1 ? 's' : ''} away. Last mock: ${lastScore}% — ${(targetPct - lastScore).toFixed(1)}% below your target. Study now.`,
        cert,
      }
      break
    }
  }

  // Priority 2: exam within 60 days and no session in 3 days
  if (!recommendation) {
    for (const cert of active) {
      if (cert.type !== 'exam' || !cert.target_date) continue
      const days = daysUntil(cert.target_date)
      if (days > 60) continue
      const certSessions = sessions.filter(s => s.cert_id === cert.id)
      const lastSession = certSessions[0]?.session_date
      const since = daysSince(lastSession)
      if (since >= 3) {
        recommendation = {
          priority: 'medium',
          text: `You haven't studied ${cert.exam_code || cert.name} in ${since === Infinity ? 'a while' : `${since} day${since !== 1 ? 's' : ''}`}. ${days} days until exam.`,
          cert,
        }
        break
      }
    }
  }

  // Priority 3: coursework deliverable due in 14 days
  if (!recommendation) {
    for (const cert of active) {
      if (cert.type !== 'coursework') continue
      const certDeliverables = deliverables.filter(
        d => d.cert_id === cert.id && d.status === 'not_started' && d.due_date
      )
      for (const d of certDeliverables) {
        const days = daysUntil(d.due_date)
        if (days <= 14) {
          recommendation = {
            priority: 'medium',
            text: `Deliverable due: "${d.title}" for ${cert.name} is due in ${days} day${days !== 1 ? 's' : ''}.`,
            cert,
          }
          break
        }
      }
      if (recommendation) break
    }
  }

  // Default: on track
  if (!recommendation) {
    recommendation = {
      priority: 'low',
      text: "You're on track across all certifications. Keep it up.",
      cert: null,
    }
  }

  const borderColor = recommendation.priority === 'high'
    ? 'border-warning/30 bg-warning/5'
    : recommendation.priority === 'medium'
      ? 'border-accent-blue/30 bg-accent-blue/5'
      : 'border-success/30 bg-success/5'

  const iconColor = recommendation.priority === 'high'
    ? 'text-warning'
    : recommendation.priority === 'medium'
      ? 'text-accent-blue'
      : 'text-success'

  return (
    <div className={`rounded-xl p-5 border flex gap-3 ${borderColor}`}>
      <Lightbulb size={16} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5">
          Study Coach
        </h2>
        <p className="text-sm text-text-primary leading-relaxed">{recommendation.text}</p>
      </div>
    </div>
  )
}
