import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getRecentSessionIds } from '../../lib/examSampler'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function Signal({ label, status, detail, action }) {
  const icons = {
    go:      <CheckCircle size={16} className="text-success flex-shrink-0" />,
    caution: <AlertCircle size={16} className="text-warning flex-shrink-0" />,
    'not-yet': <XCircle size={16} className="text-danger flex-shrink-0" />,
    pending: <AlertCircle size={16} className="text-text-muted flex-shrink-0" />,
  }
  const colors = {
    go: 'border-success/20 bg-success/5',
    caution: 'border-warning/20 bg-warning/5',
    'not-yet': 'border-danger/20 bg-danger/5',
    pending: 'border-bg-elevated bg-bg-elevated/30',
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[status]}`}>
      {icons[status]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{detail}</p>
        {action && <p className="text-xs text-accent-blue mt-1">{action}</p>}
      </div>
    </div>
  )
}

export default function ReadinessTab({ cert, attempts, flashcards }) {
  const [signals, setSignals] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    compute()
  }, [cert.id, attempts.length, flashcards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function compute() {
    setLoading(true)
    try {
      const results = []

      // 1. Days remaining / time pressure
      const days = daysUntil(cert.target_date)
      if (days == null) {
        results.push({ label: 'Target date', status: 'pending', detail: 'No target date set — add one to enable time-pressure scoring.' })
      } else if (days < 0) {
        results.push({ label: 'Target date', status: 'caution', detail: `Target date was ${Math.abs(days)} day(s) ago. Update or reschedule?` })
      } else if (days <= 7) {
        results.push({ label: 'Time remaining', status: days >= 3 ? 'caution' : 'not-yet', detail: `${days} day(s) until target date.` })
      } else {
        results.push({ label: 'Time remaining', status: 'go', detail: `${days} days until target date — good preparation window.` })
      }

      // 2. Mock exam accuracy trend (last 5 completed sessions)
      const sessionIds = await getRecentSessionIds(cert.id, 5)
      if (sessionIds.length < 3) {
        results.push({
          label: 'Mock exam accuracy',
          status: 'pending',
          detail: `${sessionIds.length} of 3 required sessions completed. Complete more mock exams to unlock this signal.`,
        })
      } else {
        // Fetch per-session accuracy
        const { data: sessionRows } = await supabase
          .from('mock_exam_sessions')
          .select('id, completed_at')
          .in('id', sessionIds)
          .order('completed_at', { ascending: false })

        const sessionAccuracies = []
        for (const s of (sessionRows || [])) {
          const { data: resp } = await supabase
            .from('mock_exam_responses')
            .select('is_correct')
            .eq('session_id', s.id)
          if (!resp?.length) continue
          const acc = resp.filter(r => r.is_correct).length / resp.length * 100
          sessionAccuracies.push(acc)
        }

        if (sessionAccuracies.length < 3) {
          results.push({ label: 'Mock exam accuracy', status: 'pending', detail: 'Not enough completed session data.' })
        } else {
          const latest = sessionAccuracies[0]
          const targetPct = cert.personal_target_score && cert.score_max
            ? (cert.personal_target_score / cert.score_max) * 100
            : cert.passing_score && cert.score_max
              ? (cert.passing_score / cert.score_max) * 100
              : 70
          const trend = sessionAccuracies.length >= 2
            ? sessionAccuracies[0] - sessionAccuracies[sessionAccuracies.length - 1]
            : 0

          let status = 'not-yet'
          if (latest >= targetPct) status = 'go'
          else if (latest >= targetPct - 8) status = 'caution'

          results.push({
            label: 'Mock exam accuracy',
            status,
            detail: `Latest: ${latest.toFixed(1)}% · Target: ${targetPct.toFixed(0)}% · Trend: ${trend >= 0 ? '+' : ''}${trend.toFixed(1)}pp across ${sessionAccuracies.length} sessions`,
            action: status !== 'go' ? `${(targetPct - latest).toFixed(1)}pp gap to target — focus drill sessions on weak domains.` : null,
          })
        }
      }

      // 3. Flashcard mastery rate
      const totalCards = flashcards.length
      if (totalCards === 0) {
        results.push({ label: 'Flashcard mastery', status: 'pending', detail: 'No flashcards found. Add flashcards to track mastery.' })
      } else {
        const masteredCards = flashcards.filter(f => (f.interval_days || 1) >= 6).length
        const masteryPct = Math.round((masteredCards / totalCards) * 100)
        const status = masteryPct >= 80 ? 'go' : masteryPct >= 60 ? 'caution' : 'not-yet'
        results.push({
          label: 'Flashcard mastery',
          status,
          detail: `${masteredCards} of ${totalCards} cards at interval ≥ 6 days (${masteryPct}%). Go threshold: 80%.`,
          action: status !== 'go' ? `${totalCards - masteredCards} cards still need more review.` : null,
        })
      }

      // 4. Personal target gap (last 3 exam_attempts avg)
      const last3 = attempts.slice(0, 3)
      if (last3.length < 3) {
        results.push({ label: 'Score trend', status: 'pending', detail: `${last3.length} of 3 scored attempts needed.` })
      } else {
        const avg = last3.reduce((s, a) => s + (a.score_pct || 0), 0) / 3
        const targetPct = cert.personal_target_score && cert.score_max
          ? (cert.personal_target_score / cert.score_max) * 100
          : cert.passing_score && cert.score_max
            ? (cert.passing_score / cert.score_max) * 100
            : 70
        const status = avg >= targetPct ? 'go' : avg >= targetPct - 5 ? 'caution' : 'not-yet'
        results.push({
          label: 'Score trend (last 3 attempts)',
          status,
          detail: `Average: ${avg.toFixed(1)}% vs personal target ${targetPct.toFixed(0)}%`,
        })
      }

      // 5. Domain coverage — domains with <60% domain accuracy from mock sessions
      if (sessionIds.length >= 2) {
        const { data: responses } = await supabase
          .from('mock_exam_responses')
          .select('is_correct, question_id')
          .in('session_id', sessionIds)
        const { data: questions } = await supabase
          .from('mock_exam_questions')
          .select('id, domain_name')
          .eq('cert_id', cert.id)

        if (responses && questions) {
          const qDomain = Object.fromEntries(questions.map(q => [q.id, q.domain_name]))
          const domainStats = {}
          for (const r of responses) {
            const d = qDomain[r.question_id]
            if (!d) continue
            if (!domainStats[d]) domainStats[d] = { correct: 0, total: 0 }
            domainStats[d].total++
            if (r.is_correct) domainStats[d].correct++
          }
          const weakDomains = Object.entries(domainStats)
            .filter(([, s]) => s.total >= 3 && (s.correct / s.total) < 0.6)
            .map(([d]) => d)

          if (weakDomains.length === 0) {
            results.push({ label: 'Domain coverage', status: 'go', detail: 'No domains below 60% accuracy in recent sessions.' })
          } else {
            results.push({
              label: 'Domain coverage',
              status: 'not-yet',
              detail: `${weakDomains.length} domain(s) below 60%: ${weakDomains.join(', ')}`,
              action: 'Use Drill Weak Areas in Take Exam to focus on these domains.',
            })
          }
        }
      } else {
        results.push({ label: 'Domain coverage', status: 'pending', detail: 'Need at least 2 mock sessions to assess domain coverage.' })
      }

      setSignals(results)
    } catch {
      setSignals([])
    }
    setLoading(false)
  }

  const goCount = (signals || []).filter(s => s.status === 'go').length
  const noYetCount = (signals || []).filter(s => s.status === 'not-yet').length
  const cautionCount = (signals || []).filter(s => s.status === 'caution').length

  let verdict = null
  if (signals && signals.length) {
    if (noYetCount > 0) {
      verdict = { text: `Not yet — ${noYetCount} signal${noYetCount !== 1 ? 's' : ''} need attention`, color: 'text-danger bg-danger/10 border-danger/20' }
    } else if (cautionCount > 0) {
      verdict = { text: 'Almost there — addressing cautions before booking is recommended', color: 'text-warning bg-warning/10 border-warning/20' }
    } else {
      verdict = { text: "You're ready. Consider booking your exam.", color: 'text-success bg-success/10 border-success/20' }
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Exam Readiness</h3>
          <p className="text-xs text-text-muted mt-0.5">Go / No-Go assessment across all available signals</p>
        </div>
        <button onClick={compute} disabled={loading} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-40">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {verdict && (
        <div className={`px-4 py-3 rounded-lg border text-sm font-medium ${verdict.color}`}>
          {verdict.text}
        </div>
      )}

      {loading && !signals && (
        <p className="text-sm text-text-muted">Computing signals…</p>
      )}

      <div className="space-y-2">
        {(signals || []).map((s, i) => (
          <Signal key={i} {...s} />
        ))}
      </div>

      <p className="text-xs text-text-muted">
        Signals with "pending" status need more data (study sessions, mock exams, or a target date) before they can assess readiness.
      </p>
    </div>
  )
}
