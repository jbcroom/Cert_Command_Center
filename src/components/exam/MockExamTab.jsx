import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'
import ScoreGauge from '../shared/ScoreGauge'

const today = () => new Date().toISOString().split('T')[0]

function ReadinessIndicator({ attempts, cert }) {
  if (attempts.length < 3) return null
  const last3 = attempts.slice(0, 3).map(a => a.score_pct || 0)
  const avg = last3.reduce((s, v) => s + v, 0) / 3
  const targetPct = cert.personal_target_score && cert.score_max
    ? (cert.personal_target_score / cert.score_max) * 100
    : cert.passing_score && cert.score_max
      ? (cert.passing_score / cert.score_max) * 100 + 10
      : 80
  const ready = avg >= targetPct
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${ready ? 'bg-success/10 text-success border border-success/20' : 'bg-bg-elevated text-text-muted'}`}>
      <span className={`w-2 h-2 rounded-full ${ready ? 'bg-success' : 'bg-text-muted'}`} />
      {ready ? `Ready to book — last 3 mock avg ${avg.toFixed(1)}% ≥ target ${targetPct.toFixed(0)}%` : `Not ready yet — last 3 avg ${avg.toFixed(1)}%, need ${targetPct.toFixed(0)}%`}
    </div>
  )
}

export default function MockExamTab({ cert, attempts, onLogged, onRefreshCert }) {
  const toast = useToast()
  const [form, setForm] = useState({ attempt_date: today(), score: '', score_max: cert.score_max || '', time_taken_minutes: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [targetEdit, setTargetEdit] = useState(false)
  const [targetVal, setTargetVal] = useState(cert.personal_target_score || '')
  const [savingTarget, setSavingTarget] = useState(false)

  const latest = attempts[0]

  async function handleLog(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('exam_attempts').insert({
      cert_id: cert.id,
      attempt_date: form.attempt_date,
      score: parseFloat(form.score),
      score_max: parseFloat(form.score_max),
      time_taken_minutes: form.time_taken_minutes ? parseInt(form.time_taken_minutes) : null,
      notes: form.notes || null,
    })
    setSaving(false)
    if (error) { toast.error(`Failed to log attempt: ${error.message}`); return }
    toast.success('Mock exam logged')
    setForm({ attempt_date: today(), score: '', score_max: cert.score_max || '', time_taken_minutes: '', notes: '' })
    onLogged?.()
  }

  async function saveTarget() {
    setSavingTarget(true)
    const { error } = await supabase.from('certifications')
      .update({ personal_target_score: parseFloat(targetVal) || null }).eq('id', cert.id)
    setSavingTarget(false)
    if (error) { toast.error('Failed to save target'); return }
    toast.success('Readiness target updated')
    setTargetEdit(false)
    onRefreshCert?.()
  }

  const input = 'w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted'

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Best Score', value: attempts.length ? `${Math.max(...attempts.map(a => a.score_pct || 0)).toFixed(1)}%` : '—' },
          { label: 'Total Attempts', value: attempts.length },
          { label: 'Days Since Last', value: attempts[0] ? Math.floor((new Date() - new Date(attempts[0].attempt_date)) / 86400000) + 'd' : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-bg-elevated rounded-lg p-4 text-center">
            <p className="text-2xl font-bold font-mono-data text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Score gauge for latest attempt */}
      {latest && (
        <div className="bg-bg-elevated rounded-xl p-5">
          <p className="text-xs text-text-muted mb-3">Last Mock Score</p>
          <ScoreGauge score={latest.score} scoreMax={latest.score_max} passingScore={cert.passing_score} personalTarget={cert.personal_target_score} />
        </div>
      )}

      {/* Readiness indicator */}
      <ReadinessIndicator attempts={attempts} cert={cert} />

      {/* Personal target */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-text-muted text-xs">My readiness target:</span>
        {targetEdit ? (
          <>
            <input type="number" value={targetVal} onChange={e => setTargetVal(e.target.value)}
              className="w-24 bg-bg-elevated border border-accent-teal rounded px-2 py-1 text-sm text-text-primary focus:outline-none" placeholder={cert.score_max} />
            <span className="text-xs text-text-muted">/ {cert.score_max}</span>
            <button onClick={saveTarget} disabled={savingTarget} className="text-xs text-accent-teal hover:underline">{savingTarget ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setTargetEdit(false)} className="text-xs text-text-muted hover:underline">Cancel</button>
          </>
        ) : (
          <>
            <span className="font-mono-data text-accent-teal">
              {cert.personal_target_score ? `${cert.personal_target_score} / ${cert.score_max}` : `${cert.passing_score ? Math.round(cert.passing_score * 1.1) : '—'} (default)`}
            </span>
            <button onClick={() => setTargetEdit(true)} className="text-xs text-text-muted hover:text-text-primary hover:underline">edit</button>
          </>
        )}
      </div>

      {/* Log form */}
      <div className="bg-bg-surface border border-bg-elevated rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Log Mock Exam</h3>
        <form onSubmit={handleLog} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Date</label>
              <input type="date" value={form.attempt_date} onChange={e => setForm(f => ({ ...f, attempt_date: e.target.value }))} className={input} required />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Time Taken (min, optional)</label>
              <input type="number" value={form.time_taken_minutes} onChange={e => setForm(f => ({ ...f, time_taken_minutes: e.target.value }))} className={input} placeholder="e.g. 120" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Score</label>
              <input type="number" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} className={input} placeholder={cert.score_max ? `0–${cert.score_max}` : 'Score'} required />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Score Max</label>
              <input type="number" value={form.score_max} onChange={e => setForm(f => ({ ...f, score_max: e.target.value }))} className={input} required />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={`${input} resize-none`} />
          </div>
          <button type="submit" disabled={saving} className="w-full py-2 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
            {saving ? 'Logging…' : 'Log Mock Exam'}
          </button>
        </form>
      </div>
    </div>
  )
}
