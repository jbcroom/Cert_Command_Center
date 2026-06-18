import { useState } from 'react'
import { Plus, BookHeart } from 'lucide-react'
import LogSittingModal from '../shared/LogSittingModal'
import ReflectionModal from './ReflectionModal'

function fmt(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function SittingsTab({ cert, sittings, onRefresh }) {
  const [logOpen, setLogOpen] = useState(false)
  const [reflectSitting, setReflectSitting] = useState(null)
  const nextAttempt = sittings.length + 1

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setLogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors">
          <Plus size={14} /> Log Sitting
        </button>
      </div>

      {sittings.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-12">No real exam sittings recorded yet.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-elevated">
                  {['Date', 'Attempt #', 'Result', 'Score', 'Notes', ''].map((h, i) => (
                    <th key={i} className="text-left py-2 px-3 text-xs text-text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sittings.map(s => (
                  <tr key={s.id} className="border-b border-bg-elevated/50 hover:bg-bg-elevated/30 transition-colors">
                    <td className="py-2.5 px-3 text-text-muted text-xs">{fmt(s.sitting_date)}</td>
                    <td className="py-2.5 px-3 font-mono-data text-text-muted text-xs">#{s.attempt_number}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.result === 'pass' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                        {s.result === 'pass' ? 'Pass ✓' : 'Fail ✗'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono-data text-text-primary text-xs">
                      {s.score != null ? `${s.score}${s.score_max ? ` / ${s.score_max}` : ''}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted text-xs max-w-xs truncate">{s.notes || '—'}</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => setReflectSitting(s)}
                        title={s.reflection_completed_at ? 'Edit reflection' : 'Add reflection'}
                        className={`flex items-center gap-1 text-xs px-2 py-1 min-h-[44px] rounded transition-colors ${
                          s.reflection_completed_at
                            ? 'text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20'
                            : 'text-text-muted hover:text-accent-blue hover:bg-bg-elevated'
                        }`}
                      >
                        <BookHeart size={12} />
                        {s.reflection_completed_at ? 'Reflected' : 'Reflect'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {sittings.map(s => (
              <div key={s.id} className="rounded-lg border border-bg-elevated bg-bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.result === 'pass' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    {s.result === 'pass' ? 'Pass ✓' : 'Fail ✗'}
                  </span>
                  <button
                    onClick={() => setReflectSitting(s)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 min-h-[44px] rounded transition-colors ${
                      s.reflection_completed_at
                        ? 'text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20'
                        : 'text-text-muted hover:text-accent-blue hover:bg-bg-elevated'
                    }`}
                  >
                    <BookHeart size={12} />
                    {s.reflection_completed_at ? 'Reflected' : 'Reflect'}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>{fmt(s.sitting_date)}</span>
                  <span className="font-mono-data">Attempt #{s.attempt_number}</span>
                  {s.score != null && (
                    <span className="font-mono-data text-text-primary">{s.score}{s.score_max ? ` / ${s.score_max}` : ''}</span>
                  )}
                </div>
                {s.notes && <p className="text-xs text-text-muted">{s.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <LogSittingModal open={logOpen} cert={cert} nextAttemptNumber={nextAttempt} onClose={() => setLogOpen(false)} onLogged={() => { setLogOpen(false); onRefresh?.() }} />
      <ReflectionModal
        open={!!reflectSitting}
        sitting={reflectSitting}
        cert={cert}
        onClose={() => setReflectSitting(null)}
        onSaved={() => { setReflectSitting(null); onRefresh?.() }}
      />
    </div>
  )
}
