import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Pencil, Trash2 } from 'lucide-react'
import EditAttemptModal from '../shared/EditAttemptModal'
import ExportButton from '../shared/ExportButton'

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ScoreHistoryTab({ cert, attempts, onRefresh }) {
  const [editAttempt, setEditAttempt] = useState(null)

  const passPct = cert.passing_score && cert.score_max ? Math.round((cert.passing_score / cert.score_max) * 100) : null
  const targetPct = cert.personal_target_score && cert.score_max ? Math.round((cert.personal_target_score / cert.score_max) * 100) : null

  const chartData = [...attempts].reverse().map(a => ({
    date: fmt(a.attempt_date),
    score: a.score_pct,
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton certId={cert.id} />
      </div>

      {attempts.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-12">No mock exam attempts yet. Log your first attempt in the Mock Exam tab.</p>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-bg-elevated rounded-xl p-5">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242840" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} interval={typeof window !== 'undefined' && window.innerWidth < 768 ? 'preserveStartEnd' : 0} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ background: '#1A1D2E', border: '1px solid #242840', borderRadius: 8 }} labelStyle={{ color: '#F1F5F9' }} itemStyle={{ color: '#3B82F6' }} formatter={v => [`${v}%`, 'Score']} />
                {passPct != null && <ReferenceLine y={passPct} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Pass', fill: '#F59E0B', fontSize: 10 }} />}
                {targetPct != null && <ReferenceLine y={targetPct} stroke="#14B8A6" strokeDasharray="4 4" label={{ value: 'Target', fill: '#14B8A6', fontSize: 10 }} />}
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-elevated">
                  {['Date', 'Score', '%', 'Time', 'Notes', ''].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attempts.map(a => (
                  <tr key={a.id} className="border-b border-bg-elevated/50 hover:bg-bg-elevated/30 transition-colors">
                    <td className="py-2.5 px-3 text-text-muted text-xs">{fmt(a.attempt_date)}</td>
                    <td className="py-2.5 px-3 font-mono-data text-text-primary">{a.score} / {a.score_max}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-mono-data font-bold ${a.score_pct >= (targetPct || passPct || 70) ? 'text-success' : a.score_pct >= (passPct || 70) ? 'text-warning' : 'text-danger'}`}>
                        {a.score_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-text-muted text-xs font-mono-data">{a.time_taken_minutes ? `${a.time_taken_minutes}m` : '—'}</td>
                    <td className="py-2.5 px-3 text-text-muted text-xs max-w-xs truncate">{a.notes || '—'}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditAttempt(a)} className="h-9 w-9 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><Pencil size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {attempts.map(a => (
              <div key={a.id} className="rounded-lg border border-bg-elevated bg-bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xl font-bold font-mono-data ${a.score_pct >= (targetPct || passPct || 70) ? 'text-success' : a.score_pct >= (passPct || 70) ? 'text-warning' : 'text-danger'}`}>
                    {a.score_pct}%
                  </span>
                  <button onClick={() => setEditAttempt(a)} className="h-11 w-11 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                  <span>{fmt(a.attempt_date)}</span>
                  <span className="font-mono-data text-text-primary">{a.score} / {a.score_max}</span>
                  {a.time_taken_minutes && <span className="font-mono-data">{a.time_taken_minutes}m</span>}
                </div>
                {a.notes && <p className="text-xs text-text-muted">{a.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <EditAttemptModal open={!!editAttempt} attempt={editAttempt} cert={cert} onClose={() => setEditAttempt(null)} onSaved={onRefresh} />
    </div>
  )
}
