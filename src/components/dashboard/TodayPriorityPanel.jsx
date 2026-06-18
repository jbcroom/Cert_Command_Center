import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Target, BookOpen, Layers, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getRecentSessionIds, getDomainAccuracy } from '../../lib/examSampler'

function daysUntil(dateStr) {
  if (!dateStr) return Infinity
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function timePressure(days) {
  if (days <= 30) return 2.0
  if (days <= 60) return 1.5
  return 1.0
}

function confidenceLabel(score) {
  if (score < 0.45) return { label: 'Low', color: 'text-danger' }
  if (score < 0.65) return { label: 'Medium', color: 'text-warning' }
  return { label: 'High', color: 'text-success' }
}

async function computePriorities(activeCerts) {
  if (!activeCerts.length) return []

  // Batch-fetch domain accuracy, flashcard due counts, and study guide existence in parallel
  const accuracyBycert = {}
  const dueByDomain = {}
  const guideDomains = new Set()

  await Promise.all([
    // Domain accuracy per cert
    ...activeCerts.map(async cert => {
      accuracyBycert[cert.id] = await getDomainAccuracy(cert.id)
    }),
    // Flashcards due today per cert+domain
    (async () => {
      const certIds = activeCerts.map(c => c.id)
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('flashcards')
        .select('cert_id, domain_name')
        .in('cert_id', certIds)
        .lte('next_review_at', today)
      for (const row of (data || [])) {
        const key = `${row.cert_id}::${row.domain_name}`
        dueByDomain[key] = (dueByDomain[key] || 0) + 1
      }
    })(),
    // Study guide sections that exist
    (async () => {
      const certIds = activeCerts.map(c => c.id)
      const { data } = await supabase
        .from('study_guide_sections')
        .select('cert_id, domain_name')
        .in('cert_id', certIds)
      for (const row of (data || [])) {
        guideDomains.add(`${row.cert_id}::${row.domain_name}`)
      }
    })(),
  ])

  const scored = []

  for (const cert of activeCerts) {
    const days = daysUntil(cert.target_date)
    const pressure = timePressure(days)
    const domainStats = accuracyBycert[cert.id] || {}
    const domains = cert.domains || []

    for (const domain of domains) {
      const stats = domainStats[domain.name]
      const accuracy = stats && stats.total > 0 ? stats.correct / stats.total : 0.5
      const confidenceGap = 1 - accuracy

      const domainWeight = (domain.weight || 0) / 100
      const key = `${cert.id}::${domain.name}`
      const srBoost = (dueByDomain[key] || 0) > 0 ? 1.3 : 1.0
      const guideBoost = guideDomains.has(key) ? 1.1 : 1.0

      const score = domainWeight * confidenceGap * pressure * srBoost * guideBoost

      scored.push({
        certId: cert.id,
        certName: cert.name,
        examCode: cert.exam_code,
        domain: domain.name,
        accuracy,
        days,
        dueCards: dueByDomain[key] || 0,
        hasGuide: guideDomains.has(key),
        score,
      })
    }
  }

  // Sort by score descending, return top 3 unique (cert, domain) pairs
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 3)
}

export default function TodayPriorityPanel({ certifications }) {
  const [priorities, setPriorities] = useState(null)

  const activeCerts = certifications.filter(
    c => !c.archived && c.type === 'exam' && !['complete', 'failed'].includes(c.status) && c.target_date
  )

  useEffect(() => {
    if (!activeCerts.length) { setPriorities([]); return }
    computePriorities(activeCerts).then(setPriorities)
  }, [certifications]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeCerts.length) return null
  if (priorities === null) return null // loading — no skeleton flash

  if (!priorities.length) return null

  return (
    <div className="bg-bg-surface border border-bg-elevated rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Target size={15} className="text-accent-teal" />
        <h2 className="text-sm font-semibold text-text-primary">Study Now</h2>
        <span className="text-xs text-text-muted">Top priority domains across your active exams</span>
      </div>

      <div className="space-y-3">
        {priorities.map((p, i) => {
          const conf = confidenceLabel(p.accuracy)
          const daysLabel = p.days === Infinity ? '—' : `${p.days}d`
          return (
            <div key={`${p.certId}-${p.domain}`} className="flex items-start gap-4 p-3 rounded-lg bg-bg-elevated">
              <span className="text-xs font-mono-data text-text-muted mt-0.5 w-4 flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-text-muted">{p.examCode || p.certName}</span>
                  <span className="text-xs text-text-muted">·</span>
                  <span className="text-sm font-medium text-text-primary truncate">{p.domain}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                  <span>Confidence: <span className={conf.color}>{conf.label}</span> ({Math.round(p.accuracy * 100)}%)</span>
                  {p.days !== Infinity && <span>{daysLabel} to exam</span>}
                  {p.dueCards > 0 && (
                    <span className="flex items-center gap-1 text-accent-teal">
                      <Layers size={10} />
                      {p.dueCards} card{p.dueCards !== 1 ? 's' : ''} due
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.hasGuide && (
                  <Link
                    to={`/cert/${p.certId}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-bg-surface text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                  >
                    <BookOpen size={11} />
                    Guide
                  </Link>
                )}
                <Link
                  to={`/cert/${p.certId}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 transition-colors"
                >
                  <TrendingUp size={11} />
                  Drill
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-text-muted">
        Confidence estimates improve after your first few mock exams — domains without data default to 50%.
      </p>
    </div>
  )
}
