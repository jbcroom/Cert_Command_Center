import { useState, useRef } from 'react'
import { Flame, Target } from 'lucide-react'
import { useStudyStats } from '../../hooks/useStudyStats'

function WeeklyProgressRing({ hours, target, onUpdateTarget }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const pct = target > 0 ? Math.min(hours / target, 1) : 0
  const r = 18
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  function startEdit() {
    setDraft(String(target))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const val = parseFloat(draft)
    if (!isNaN(val) && val > 0) onUpdateTarget(val)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg viewBox="0 0 44 44" className="w-10 h-10 -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-bg-elevated" />
          <circle
            cx="22" cy="22" r={r} fill="none" strokeWidth="4"
            stroke="var(--accent-teal, #14B8A6)"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono-data text-text-primary">
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div>
        <p className="text-sm font-bold font-mono-data text-text-primary">
          {hours.toFixed(1)}<span className="text-xs text-text-muted font-normal"> hr</span>
        </p>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
              className="w-10 bg-bg-elevated text-text-primary text-xs rounded px-1 py-0.5 focus:outline-none border border-accent-blue"
              type="number" min="1"
            />
            <span className="text-xs text-text-muted">hr goal</span>
          </div>
        ) : (
          <button onClick={startEdit} className="text-xs text-text-muted hover:text-text-primary transition-colors">
            of {target}h goal
          </button>
        )}
      </div>
    </div>
  )
}

export default function StudyStatsBar({ onRefresh }) {
  const { streakDays, hoursThisWeek, weeklyTarget, loading, updateWeeklyTarget } = useStudyStats()

  if (loading) return null

  return (
    <div className="flex items-center gap-6">
      {/* Streak */}
      <div className="flex items-center gap-2">
        <Flame size={16} className={streakDays > 0 ? 'text-warning' : 'text-text-muted'} />
        <span className="text-sm font-bold font-mono-data text-text-primary">{streakDays}</span>
        <span className="text-xs text-text-muted">{streakDays === 1 ? 'day streak' : 'day streak'}</span>
      </div>

      <div className="w-px h-5 bg-bg-elevated" />

      {/* Weekly ring */}
      <WeeklyProgressRing
        hours={hoursThisWeek}
        target={weeklyTarget}
        onUpdateTarget={updateWeeklyTarget}
      />
    </div>
  )
}
