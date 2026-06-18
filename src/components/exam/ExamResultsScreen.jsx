import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, BookOpen, Sparkles } from 'lucide-react'
import ExamQuestionCard from './ExamQuestionCard'

const CDMP_TIERS = [
  { label: 'Associate', pct: 60, color: '#14B8A6' },
  { label: 'Practitioner', pct: 70, color: '#3B82F6' },
  { label: 'Master', pct: 80, color: '#F59E0B' },
]

function ScoreBar({ pct, isCdmp }) {
  const color = pct >= 80 ? '#10B981' : pct >= 70 ? '#3B82F6' : pct >= 60 ? '#F59E0B' : '#EF4444'

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <span className="text-5xl font-bold font-mono-data" style={{ color }}>{pct}%</span>
        {isCdmp && (
          <div className="text-right text-xs text-text-muted space-y-1">
            {CDMP_TIERS.map(t => (
              <div key={t.label} className="flex items-center gap-2 justify-end">
                <span style={{ color: t.color }}>{t.label}</span>
                <span className={pct >= t.pct ? 'text-success' : 'text-text-muted'}>{pct >= t.pct ? '✓' : `needs ${t.pct}%`}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative h-3 bg-bg-elevated rounded-full overflow-visible">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        {isCdmp
          ? CDMP_TIERS.map(t => (
              <div key={t.label} className="absolute top-[-5px] h-[calc(100%+10px)] w-0.5" style={{ left: `${t.pct}%`, backgroundColor: t.color }} title={`${t.label}: ${t.pct}%`} />
            ))
          : null
        }
      </div>

      {isCdmp && (
        <div className="flex gap-4 text-[11px]">
          {CDMP_TIERS.map(t => (
            <div key={t.label} className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: t.color }} />
              <span className="text-text-muted">{t.label} ({t.pct}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DomainBreakdown({ domainScores }) {
  const domains = Object.entries(domainScores).sort((a, b) => a[1].pct - b[1].pct)
  if (!domains.length) return null

  return (
    <div className="space-y-2">
      {domains.map(([domain, { correct, total, pct }]) => (
        <div key={domain} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted truncate pr-4">{domain}</span>
            <span className={`font-mono-data font-medium flex-shrink-0 ${pct >= 70 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger'}`}>
              {correct}/{total} ({pct}%)
            </span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function StudyInsights({ questions, responses, certId }) {
  const [insights, setInsights] = useState(null) // null=loading, ''=failed/skipped, string=ready
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const wrongResponses = responses.filter(r => !r.is_correct)
    if (wrongResponses.length < 3) { setInsights(''); return }

    const qMap = Object.fromEntries(questions.map(q => [q.id, q]))
    const wrongAnswers = wrongResponses.map(r => {
      const q = qMap[r.question_id]
      if (!q) return null
      return {
        domain: q.domain_name,
        question: q.question,
        correctAnswer: q.options?.[q.correct_index] ?? '—',
        selectedAnswer: r.selected_index != null ? (q.options?.[r.selected_index] ?? '—') : 'No answer',
      }
    }).filter(Boolean)

    fetch('/api/exam-debrief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certId, wrongAnswers }),
    })
      .then(res => res.json())
      .then(data => setInsights(data.insights || ''))
      .catch(() => setInsights(''))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (insights === '') return null // failed, skipped, or not enough wrong

  return (
    <div className="bg-bg-surface border border-accent-teal/30 rounded-xl p-5 space-y-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-accent-teal" />
          <span className="text-sm font-semibold text-text-primary">Study Insights</span>
          <span className="text-xs text-text-muted">AI-generated</span>
        </div>
        {open ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
      </button>

      {open && (
        insights === null
          ? (
            <div className="flex items-center gap-2 text-xs text-text-muted py-1">
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyzing your answers…
            </div>
          )
          : (
            <div className="text-sm text-text-muted space-y-1 prose-sm prose-invert max-w-none">
              {insights.split('\n').filter(Boolean).map((line, i) => (
                <p key={i} className={line.startsWith('•') || line.startsWith('-') || line.startsWith('*') ? 'pl-1' : ''}>
                  {line.replace(/^[•\-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              ))}
            </div>
          )
      )}
    </div>
  )
}

export default function ExamResultsScreen({ questions, responses, isPartialBank, certId, onRetake, onDone, onGoToGuide }) {
  const [showReview, setShowReview] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(0)

  // Compute overall score
  const total = questions.length
  const correct = responses.filter(r => r.is_correct).length
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const isCdmp = certId === 'cdmp'

  // Per-domain breakdown
  const domainScores = {}
  for (const q of questions) {
    const r = responses.find(r => r.question_id === q.id)
    if (!domainScores[q.domain_name]) domainScores[q.domain_name] = { correct: 0, total: 0 }
    domainScores[q.domain_name].total++
    if (r?.is_correct) domainScores[q.domain_name].correct++
  }
  for (const d of Object.values(domainScores)) {
    d.pct = Math.round((d.correct / d.total) * 100)
  }

  // For review mode: map question id → response
  const responseMap = Object.fromEntries(responses.map(r => [r.question_id, r]))
  const reviewQ = questions[reviewIdx]
  const reviewR = reviewQ ? responseMap[reviewQ.id] : null

  // selectedIndex in the shuffled array — need to find it from selected original index
  // ExamQuestionCard re-derives the same shuffle from the question id, so we pass
  // the originalIndex via a shim that ExamQuestionCard resolves internally.
  // We store selected_index (original) in the response; pass it as a prop that the card
  // can use to highlight the right button after it re-shuffles.
  // Since ExamQuestionCard exposes shuffledIndex-based selection, we compute it here.
  function getShuffledSelectedIndex(q, originalIdx) {
    if (originalIdx == null) return null
    // Re-derive same shuffle (same seed = question id)
    const arr = q.options.map((_, i) => i)
    let h = [...q.id].reduce((acc, c) => Math.imul(31, acc) + c.charCodeAt(0) | 0, 0)
    const a = arr.map((oi, i) => ({ oi, i }))
    for (let i = a.length - 1; i > 0; i--) {
      h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
      h ^= h >>> 16
      const j = Math.abs(h) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a.findIndex(x => x.oi === originalIdx)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-surface border border-bg-elevated rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Exam Complete</h2>
            <p className="text-xs text-text-muted mt-0.5">{correct} correct out of {total} questions</p>
            {isPartialBank && (
              <p className="text-xs text-warning mt-1">Partial mock — question bank smaller than full exam length</p>
            )}
          </div>
          {pct >= 70
            ? <CheckCircle size={28} className="text-success flex-shrink-0" />
            : <XCircle size={28} className="text-danger flex-shrink-0" />
          }
        </div>

        <ScoreBar pct={pct} isCdmp={isCdmp} />
      </div>

      {/* AI Study Insights (async, silent fail) */}
      <StudyInsights questions={questions} responses={responses} certId={certId} />

      {/* Domain breakdown */}
      <div className="bg-bg-surface border border-bg-elevated rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Domain Breakdown</h3>
        <DomainBreakdown domainScores={domainScores} />
      </div>

      {/* Review toggle */}
      <div className="bg-bg-surface border border-bg-elevated rounded-xl p-5 space-y-4">
        <button
          onClick={() => { setShowReview(v => !v); setReviewIdx(0) }}
          className="flex items-center justify-between w-full text-sm font-semibold text-text-primary"
        >
          <span>Review Questions</span>
          {showReview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showReview && reviewQ && (
          <div className="space-y-4 pt-2 border-t border-bg-elevated">
            <div className="flex items-center gap-1.5 text-xs">
              {responses.map((_, i) => {
                const q = questions[i]
                const r = responseMap[q?.id]
                return (
                  <button
                    key={i}
                    onClick={() => setReviewIdx(i)}
                    className={`w-6 h-6 rounded text-[10px] font-mono-data flex items-center justify-center transition-colors ${
                      i === reviewIdx ? 'ring-1 ring-accent-blue' : ''
                    } ${r?.is_correct ? 'bg-success/20 text-success' : r?.selected_index == null ? 'bg-bg-elevated text-text-muted' : 'bg-danger/20 text-danger'}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>

            <ExamQuestionCard
              question={reviewQ}
              questionNumber={reviewIdx + 1}
              totalQuestions={total}
              selectedIndex={getShuffledSelectedIndex(reviewQ, reviewR?.selected_index)}
              onSelect={() => {}}
              showResult
            />

            {onGoToGuide && reviewR && !reviewR.is_correct && (
              <button
                onClick={() => onGoToGuide(reviewQ.domain_name)}
                className="flex items-center gap-1.5 text-xs text-accent-blue hover:underline"
              >
                <BookOpen size={12} />
                Review {reviewQ.domain_name} in Study Guide →
              </button>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setReviewIdx(i => Math.max(0, i - 1))}
                disabled={reviewIdx === 0}
                className="px-4 py-2 text-sm rounded-lg bg-bg-elevated text-text-primary disabled:opacity-30 hover:bg-bg-elevated/80 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => setReviewIdx(i => Math.min(total - 1, i + 1))}
                disabled={reviewIdx === total - 1}
                className="px-4 py-2 text-sm rounded-lg bg-bg-elevated text-text-primary disabled:opacity-30 hover:bg-bg-elevated/80 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onRetake} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-bg-elevated text-text-primary hover:bg-bg-elevated/80 transition-colors">
          Take Another
        </button>
        <button onClick={onDone} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 transition-colors">
          Done
        </button>
      </div>
    </div>
  )
}
