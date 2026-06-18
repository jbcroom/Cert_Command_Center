import { Trophy, BookOpen, Clock, CalendarClock, Flame, Target } from 'lucide-react'
import { useStudyStats } from '../../hooks/useStudyStats'

function StatCard({ icon: Icon, label, value, sub, color = 'text-text-primary' }) {
  return (
    <div className="bg-bg-surface rounded-xl p-5 border border-bg-elevated flex items-center gap-4">
      <div className="p-2 rounded-lg bg-bg-elevated flex-shrink-0">
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold font-mono-data text-text-primary leading-none">{value}</p>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function WeeklyCard({ hoursThisWeek, weeklyTarget, onUpdateTarget }) {
  const pct = weeklyTarget > 0 ? Math.min(hoursThisWeek / weeklyTarget, 1) : 0
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <div className="bg-bg-surface rounded-xl p-5 border border-bg-elevated flex items-center gap-4">
      <div className="relative w-9 h-9 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-bg-elevated" />
          <circle
            cx="18" cy="18" r={r} fill="none" strokeWidth="3.5"
            stroke="var(--accent-teal, #14B8A6)"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold font-mono-data text-text-primary">
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold font-mono-data text-text-primary leading-none">
          {hoursThisWeek.toFixed(1)}<span className="text-sm font-normal text-text-muted">h</span>
        </p>
        <p className="text-xs text-text-muted mt-0.5">of {weeklyTarget}h goal this week</p>
      </div>
    </div>
  )
}

function daysUntilNearest(certs) {
  const active = certs.filter(
    c => !c.archived && c.type === 'exam' && !['complete', 'failed'].includes(c.status) && c.target_date
  )
  if (!active.length) return '—'
  const days = active
    .map(c => Math.ceil((new Date(c.target_date) - new Date()) / (1000 * 60 * 60 * 24)))
    .filter(d => d >= 0)
    .sort((a, b) => a - b)
  return days.length ? `${days[0]}d` : '—'
}

export default function StatsRow({ certifications, sessions }) {
  const { streakDays, hoursThisWeek, weeklyTarget } = useStudyStats()

  const complete = certifications.filter(c => !c.archived && c.status === 'complete').length
  const studying = certifications.filter(c => !c.archived && c.status === 'in_progress').length
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  const totalHours = (totalMinutes / 60).toFixed(1)
  const nextExam = daysUntilNearest(certifications)

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-3 grid grid-cols-3 gap-4">
        <StatCard icon={Flame}         label="Day streak"         value={streakDays}   color={streakDays > 0 ? 'text-warning' : 'text-text-muted'} />
        <StatCard icon={Trophy}        label="Certs complete"     value={complete}     color="text-accent-gold" />
        <StatCard icon={CalendarClock} label="Next exam in"       value={nextExam}     color="text-warning" />
      </div>
      <div className="col-span-3 grid grid-cols-3 gap-4">
        <WeeklyCard hoursThisWeek={hoursThisWeek} weeklyTarget={weeklyTarget} />
        <StatCard icon={BookOpen}      label="Currently studying" value={studying}     color="text-accent-blue" />
        <StatCard icon={Clock}         label="Total study hours"  value={totalHours}   color="text-accent-teal" />
      </div>
    </div>
  )
}
