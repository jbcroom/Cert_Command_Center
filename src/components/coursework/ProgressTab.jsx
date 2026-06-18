import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

const STATUS_COLORS = {
  not_started: '#242840',
  in_progress: '#3B82F6',
  submitted:   '#F59E0B',
  complete:    '#10B981',
}

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted:   'Submitted',
  complete:    'Complete',
}

function fmt(d) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
}

function daysUntil(d) {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function ProgressTab({ cert, deliverables, sessions }) {
  const complete = deliverables.filter(d => d.status === 'complete').length
  const pct = deliverables.length ? Math.round((complete / deliverables.length) * 100) : 0
  const totalMinutes = sessions.filter(s => s.cert_id === cert.id).reduce((s, x) => s + (x.duration_minutes || 0), 0)
  const days = daysUntil(cert.target_date)

  // Chart data — one bar per deliverable
  const chartData = deliverables.map((d, i) => ({
    name: `M${d.module_number || i + 1}`,
    value: d.status === 'complete' ? 100 : d.status === 'submitted' ? 75 : d.status === 'in_progress' ? 40 : 0,
    status: d.status,
    title: d.title,
  }))

  // Status breakdown
  const breakdown = Object.entries(STATUS_LABELS).map(([status, label]) => ({
    status, label,
    count: deliverables.filter(d => d.status === status).length,
  })).filter(x => x.count > 0)

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completion', value: `${pct}%`, color: 'text-accent-teal' },
          { label: 'Study Hours', value: `${(totalMinutes / 60).toFixed(1)}h`, color: 'text-accent-blue' },
          { label: 'Days Left', value: days != null ? `${days}d` : '—', color: days != null && days <= 14 ? 'text-warning' : 'text-text-primary' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg-elevated rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold font-mono-data ${color}`}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-bg-elevated rounded-xl p-5">
          <p className="text-xs text-text-muted mb-4">Module Completion</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1A1D2E', border: '1px solid #242840', borderRadius: 8 }}
                formatter={(v, _, { payload }) => [STATUS_LABELS[payload.status], payload.title]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={STATUS_COLORS[d.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Milestone markers */}
      {cert.target_date && (
        <div className="bg-bg-elevated rounded-xl p-4 space-y-3">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-widest">Milestones</p>
          <div className="space-y-2">
            {cert.created_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted text-xs">Start</span>
                <span className="font-mono-data text-xs text-text-primary">{fmt(cert.created_at)}</span>
              </div>
            )}
            {cert.target_date && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted text-xs">Target Completion</span>
                <span className={`font-mono-data text-xs ${days != null && days <= 14 ? 'text-warning' : 'text-text-primary'}`}>{fmt(cert.target_date)}</span>
              </div>
            )}
            {cert.completed_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted text-xs">Completed</span>
                <span className="font-mono-data text-xs text-success">{fmt(cert.completed_at)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="flex items-center gap-4 flex-wrap">
        {breakdown.map(({ status, label, count }) => (
          <div key={status} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[status] }} />
            <span className="text-xs text-text-muted">{label}: <span className="text-text-primary font-mono-data">{count}</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}
