import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw } from 'lucide-react'
import EmptyState from '../shared/EmptyState'

const RATINGS = [
  { label: 'Got It', color: 'text-success border-success/30 hover:bg-success/10' },
  { label: 'Almost',  color: 'text-warning border-warning/30 hover:bg-warning/10' },
  { label: 'Review',  color: 'text-danger border-danger/30 hover:bg-danger/10' },
]

export default function FlashcardsTab({ flashcards }) {
  const active = flashcards.filter(c => c.active)
  const domains = [...new Set(active.map(c => c.domain_name).filter(Boolean))]

  const [domain, setDomain] = useState('all')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [order, setOrder] = useState(null) // null = original, array = shuffled

  const filtered = useMemo(() => {
    const base = domain === 'all' ? active : active.filter(c => c.domain_name === domain)
    return order ? order.filter(c => base.includes(c)) : base
  }, [active, domain, order])

  const card = filtered[index]

  function shuffle() {
    const shuffled = [...filtered].sort(() => Math.random() - 0.5)
    setOrder(shuffled)
    setIndex(0)
    setFlipped(false)
  }
  function reset() { setOrder(null); setIndex(0); setFlipped(false) }
  function prev() { setIndex(i => Math.max(0, i - 1)); setFlipped(false) }
  function next() { setIndex(i => Math.min(filtered.length - 1, i + 1)); setFlipped(false) }

  if (!active.length) return <EmptyState title="No flashcards yet" description="Add flashcards in the Manage Flashcards tab." />

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <select value={domain} onChange={e => { setDomain(e.target.value); setIndex(0); setFlipped(false) }}
          className="bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue">
          <option value="all">All domains</option>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-xs text-text-muted ml-auto">{index + 1} / {filtered.length}</span>
        <button onClick={shuffle} className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><Shuffle size={15} /></button>
        <button onClick={reset} className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><RotateCcw size={15} /></button>
      </div>

      {/* Card */}
      {card && (
        <div
          onClick={() => setFlipped(f => !f)}
          className="cursor-pointer select-none bg-bg-surface border border-bg-elevated rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center gap-4 hover:border-accent-blue/30 transition-all"
        >
          <span className="text-[10px] text-text-muted uppercase tracking-widest">{flipped ? 'Answer' : 'Question'}</span>
          <p className="text-text-primary text-center text-base leading-relaxed font-medium">
            {flipped ? card.answer : card.question}
          </p>
          {card.domain_name && !flipped && (
            <span className="text-[10px] text-text-muted border border-bg-elevated px-2 py-0.5 rounded">{card.domain_name}</span>
          )}
          {!flipped && <p className="text-xs text-text-muted mt-2">Tap to reveal answer</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={prev} disabled={index === 0} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-30 transition-colors">
          <ChevronLeft size={16} /> Prev
        </button>

        {flipped && (
          <div className="flex items-center gap-2">
            {RATINGS.map(r => (
              <button key={r.label} onClick={next}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border bg-transparent transition-colors ${r.color}`}>
                {r.label}
              </button>
            ))}
          </div>
        )}

        <button onClick={next} disabled={index === filtered.length - 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-30 transition-colors">
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
