import { useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'
import ProgressRing from '../shared/ProgressRing'

const STATUSES = ['not_started', 'in_progress', 'submitted', 'complete']
const STATUS_LABELS = { not_started: 'Not Started', in_progress: 'In Progress', submitted: 'Submitted', complete: 'Complete' }
const STATUS_COLORS = {
  not_started: 'bg-bg-elevated text-text-muted',
  in_progress: 'bg-accent-blue/20 text-accent-blue',
  submitted:   'bg-accent-gold/20 text-accent-gold',
  complete:    'bg-success/20 text-success',
}

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null }

export default function DeliverablesTab({ cert, deliverables, onRefresh, onAllComplete }) {
  const toast = useToast()
  const [updating, setUpdating] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  async function markAllComplete() {
    const incomplete = deliverables.filter(d => d.status !== 'complete')
    if (!incomplete.length) return
    setMarkingAll(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('deliverables')
      .update({ status: 'complete', completed_at: now })
      .in('id', incomplete.map(d => d.id))
    setMarkingAll(false)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    toast.success(`Marked ${incomplete.length} item${incomplete.length !== 1 ? 's' : ''} complete`)
    onRefresh?.()
    onAllComplete?.()
  }

  const complete = deliverables.filter(d => d.status === 'complete').length
  const pct = deliverables.length ? Math.round((complete / deliverables.length) * 100) : 0

  async function updateStatus(d, status) {
    setUpdating(d.id)
    const updates = { status }
    if (status === 'complete') updates.completed_at = new Date().toISOString()
    else updates.completed_at = null
    const { error } = await supabase.from('deliverables').update(updates).eq('id', d.id)
    setUpdating(null)
    if (error) { toast.error(`Failed to update: ${error.message}`); return }
    // Check optimistically if this was the last incomplete item
    const allNowComplete = deliverables.every(item => item.id === d.id ? status === 'complete' : item.status === 'complete')
    onRefresh?.()
    if (allNowComplete) onAllComplete?.()
  }

  return (
    <div className="space-y-5">
      {/* Completion summary */}
      <div className="flex items-center gap-5 px-5 py-4 bg-bg-elevated rounded-xl">
        <ProgressRing pct={pct} size={64} stroke={5} label={`${pct}%`} />
        <div className="flex-1">
          <p className="text-text-primary font-semibold">{complete} of {deliverables.length} complete</p>
          <p className="text-xs text-text-muted mt-0.5">{deliverables.length - complete} remaining</p>
        </div>
        {complete < deliverables.length && deliverables.length > 0 && (
          <button
            onClick={markAllComplete}
            disabled={markingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            <CheckCheck size={13} />
            {markingAll ? 'Marking…' : 'Mark all complete'}
          </button>
        )}
      </div>

      {deliverables.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-12">No deliverables found. Modules auto-populate when the course is set up.</p>
      ) : (
        <div className="space-y-2">
          {deliverables.map((d, i) => (
            <div key={d.id} className={`bg-bg-elevated rounded-xl p-4 transition-all ${d.status === 'complete' ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => updateStatus(d, d.status === 'complete' ? 'not_started' : 'complete')}
                  disabled={updating === d.id}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    d.status === 'complete' ? 'bg-success border-success text-white' : 'border-bg-surface hover:border-success'
                  }`}
                >
                  {d.status === 'complete' && <span className="text-xs">✓</span>}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-text-muted font-mono-data">M{d.module_number || i + 1}</span>
                    <p className={`text-sm font-medium ${d.status === 'complete' ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                      {d.title}
                    </p>
                    {d.due_date && (
                      <span className="text-[10px] text-text-muted border border-bg-surface px-1.5 py-0.5 rounded">
                        Due {fmt(d.due_date)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={d.status}
                      onChange={e => updateStatus(d, e.target.value)}
                      disabled={updating === d.id}
                      className={`text-xs px-2 py-1 rounded-md border-0 focus:outline-none focus:ring-1 focus:ring-accent-blue cursor-pointer ${STATUS_COLORS[d.status]}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                    {d.grade && (
                      <span className="text-xs font-mono-data text-accent-gold border border-accent-gold/30 px-2 py-0.5 rounded">
                        {d.grade}
                      </span>
                    )}
                    {d.completed_at && (
                      <span className="text-[10px] text-text-muted">Completed {fmt(d.completed_at)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
