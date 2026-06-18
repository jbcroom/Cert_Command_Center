import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateNextReview } from '../lib/spacedRep'
import { useCertifications } from '../hooks/useCertifications'

// ─── Queue screen ─────────────────────────────────────────────────────────────

function QueueScreen({ certifications, onStart }) {
  const [dueCounts, setDueCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('flashcards')
        .select('cert_id, next_review_at')
        .eq('active', true)
        .lte('next_review_at', today)
      if (data) {
        const counts = {}
        data.forEach(r => { counts[r.cert_id] = (counts[r.cert_id] || 0) + 1 })
        setDueCounts(counts)
      }
      setLoading(false)
    }
    load()
  }, [])

  const certsWithCards = certifications.filter(c => !c.archived)
  const totalDue = Object.values(dueCounts).reduce((s, n) => s + n, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-text-muted text-sm">Loading review queue…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Flashcard Review</h2>
        <p className="text-sm text-text-muted mt-0.5">
          {totalDue > 0 ? `${totalDue} card${totalDue === 1 ? '' : 's'} due today across all certs` : 'No cards due today — you\'re all caught up.'}
        </p>
      </div>

      <div className="space-y-2">
        {certsWithCards.map(cert => {
          const due = dueCounts[cert.id] || 0
          const flashcardCount = cert.flashcard_count ?? null
          return (
            <div key={cert.id} className="flex items-center justify-between px-4 py-3 bg-bg-surface border border-bg-elevated rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                {cert.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cert.color }} />}
                <div>
                  <p className="text-sm font-medium text-text-primary">{cert.exam_code || cert.name}</p>
                  {due === 0 && (
                    <p className="text-xs text-text-muted">No cards due</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {due > 0 && (
                  <span className="text-xs font-bold font-mono-data text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full">
                    {due} due
                  </span>
                )}
                <button
                  onClick={() => onStart(cert)}
                  disabled={due === 0}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Review
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Review session ────────────────────────────────────────────────────────────

const BUTTONS = [
  { label: 'Again',  quality: 1, className: 'bg-danger/20 text-danger hover:bg-danger/30 border border-danger/30' },
  { label: 'Hard',   quality: 3, className: 'bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30' },
  { label: 'Good',   quality: 4, className: 'bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 border border-accent-blue/30' },
  { label: 'Easy',   quality: 5, className: 'bg-success/20 text-success hover:bg-success/30 border border-success/30' },
]

function ReviewSession({ cert, onDone }) {
  const [queue, setQueue] = useState(null)      // null = loading
  const [againPile, setAgainPile] = useState([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([])    // { quality } per card answered

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('flashcards')
        .select('id, question, answer, ease_factor, interval_days, review_count, next_review_at')
        .eq('cert_id', cert.id)
        .eq('active', true)
        .lte('next_review_at', today)
        .order('next_review_at', { ascending: true })
      setQueue(data || [])
    }
    load()
  }, [cert.id])

  if (queue === null) {
    return <div className="flex items-center justify-center py-16"><span className="text-text-muted text-sm">Loading…</span></div>
  }

  const fullQueue = [...queue, ...againPile]

  if (idx >= fullQueue.length) {
    const correct = results.filter(r => r.quality >= 3).length
    const again = results.filter(r => r.quality < 3).length
    const nextDates = results.map(r => r.nextReviewAt).filter(Boolean)
    const soonest = nextDates.length ? nextDates.sort()[0] : null
    return <ReviewComplete cert={cert} total={results.length} correct={correct} again={again} nextReviewAt={soonest} onDone={onDone} />
  }

  const card = fullQueue[idx]

  async function respond(quality) {
    const { newInterval, newEaseFactor, newReviewCount, nextReviewAt } = calculateNextReview(
      quality,
      card.interval_days,
      card.ease_factor,
      card.review_count
    )

    await supabase.from('flashcards').update({
      ease_factor: newEaseFactor,
      interval_days: newInterval,
      next_review_at: nextReviewAt,
      review_count: newReviewCount,
      last_reviewed_at: new Date().toISOString(),
    }).eq('id', card.id)

    setResults(r => [...r, { quality, nextReviewAt }])

    if (quality < 3) {
      // Re-queue for this session
      setAgainPile(p => [...p, { ...card, ease_factor: newEaseFactor, interval_days: newInterval, review_count: newReviewCount }])
    }

    setFlipped(false)
    setIdx(i => i + 1)
  }

  const progress = idx / fullQueue.length

  return (
    <div className="space-y-5 max-w-xl">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-text-muted">
          <span>{cert.exam_code || cert.name}</span>
          <span>{idx} / {fullQueue.length}</span>
        </div>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div className="h-full bg-accent-blue rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Card */}
      <div
        className="bg-bg-surface border border-bg-elevated rounded-xl p-6 min-h-[200px] flex flex-col cursor-pointer select-none"
        onClick={() => !flipped && setFlipped(true)}
      >
        <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
          {flipped ? 'Answer' : 'Question — tap to flip'}
        </p>
        <p className="text-text-primary text-base leading-relaxed flex-1">
          {flipped ? card.answer : card.question}
        </p>
        {!flipped && (
          <p className="text-xs text-text-muted mt-4 text-center">tap anywhere to reveal</p>
        )}
      </div>

      {/* Response buttons */}
      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {BUTTONS.map(({ label, quality, className }) => (
            <button
              key={label}
              onClick={() => respond(quality)}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${className}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {BUTTONS.map(({ label }) => (
            <div key={label} className="py-2.5 rounded-lg text-sm font-semibold text-center bg-bg-elevated/40 text-text-muted/30 select-none">
              {label}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted text-center">Again re-queues the card for this session</p>
    </div>
  )
}

// ─── Complete screen ───────────────────────────────────────────────────────────

function ReviewComplete({ cert, total, correct, again, nextReviewAt, onDone }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const nextDate = nextReviewAt
    ? new Date(nextReviewAt + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="space-y-5 max-w-xl">
      <div className="bg-bg-surface border border-bg-elevated rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-success flex-shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-text-primary">Session complete</h2>
            <p className="text-xs text-text-muted">{cert.exam_code || cert.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-elevated rounded-lg px-3 py-2.5 text-center">
            <p className="text-lg font-bold font-mono-data text-text-primary">{total}</p>
            <p className="text-xs text-text-muted">reviewed</p>
          </div>
          <div className="bg-bg-elevated rounded-lg px-3 py-2.5 text-center">
            <p className="text-lg font-bold font-mono-data text-success">{correct}</p>
            <p className="text-xs text-text-muted">recalled</p>
          </div>
          <div className="bg-bg-elevated rounded-lg px-3 py-2.5 text-center">
            <p className="text-lg font-bold font-mono-data text-danger">{again}</p>
            <p className="text-xs text-text-muted">again</p>
          </div>
        </div>
        {nextDate && (
          <p className="text-xs text-text-muted text-center">Next review due: <span className="text-text-primary">{nextDate}</span></p>
        )}
      </div>
      <button
        onClick={onDone}
        className="w-full py-2.5 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 transition-colors"
      >
        Done
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FlashcardReviewPage() {
  const navigate = useNavigate()
  const { certifications } = useCertifications()
  const [activeCert, setActiveCert] = useState(null)

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-bg-elevated bg-bg-surface flex-shrink-0">
        <button
          onClick={() => { if (activeCert) setActiveCert(null); else navigate('/') }}
          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-text-primary font-bold text-lg">
          {activeCert ? `${activeCert.exam_code || activeCert.name} — Review` : 'Flashcard Review'}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {activeCert ? (
          <ReviewSession cert={activeCert} onDone={() => setActiveCert(null)} />
        ) : (
          <QueueScreen certifications={certifications} onStart={setActiveCert} />
        )}
      </main>
    </div>
  )
}
