import { useState, useEffect } from 'react'
import { X, BookHeart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'

const RATING_LABELS = { 1: 'Weak', 2: 'Shaky', 3: 'OK', 4: 'Solid', 5: 'Strong' }
const RATING_COLORS = {
  1: 'border-danger text-danger bg-danger/10',
  2: 'border-warning text-warning bg-warning/10',
  3: 'border-accent-blue text-accent-blue bg-accent-blue/10',
  4: 'border-success text-success bg-success/10',
  5: 'border-success text-success bg-success/20',
}

function RatingPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-lg text-xs font-bold border-2 transition-colors ${
            value === n ? RATING_COLORS[n] : 'border-bg-elevated text-text-muted hover:border-text-muted'
          }`}
        >
          {n}
        </button>
      ))}
      {value && (
        <span className="self-center text-xs text-text-muted ml-1">{RATING_LABELS[value]}</span>
      )}
    </div>
  )
}

export default function ReflectionModal({ open, onClose, sitting, cert, onSaved }) {
  const toast = useToast()
  const [domainRatings, setDomainRatings] = useState({})
  const [whatWorked, setWhatWorked] = useState('')
  const [whatDidnt, setWhatDidnt] = useState('')
  const [retakeFocus, setRetakeFocus] = useState('')
  const [saving, setSaving] = useState(false)

  const domains = cert?.domains || []

  useEffect(() => {
    if (!open || !sitting) return
    setDomainRatings(sitting.reflection_domain_ratings || {})
    setWhatWorked(sitting.reflection_what_worked || '')
    setWhatDidnt(sitting.reflection_what_didnt || '')
    setRetakeFocus(sitting.reflection_retake_focus || '')
  }, [open, sitting])

  if (!open || !sitting || !cert) return null

  const isComplete = !!sitting.reflection_completed_at

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('cert_sittings')
      .update({
        reflection_domain_ratings: domainRatings,
        reflection_what_worked: whatWorked || null,
        reflection_what_didnt: whatDidnt || null,
        reflection_retake_focus: retakeFocus || null,
        reflection_completed_at: new Date().toISOString(),
      })
      .eq('id', sitting.id)

    setSaving(false)
    if (error) { toast.error(`Failed to save: ${error.message}`); return }
    toast.success('Reflection saved.')
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-bg-elevated flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookHeart size={16} className="text-accent-blue" />
            <h2 className="text-text-primary font-semibold">Post-Exam Reflection</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-6">
            <div>
              <p className="text-xs text-text-muted">
                {cert.exam_code || cert.name} · Attempt #{sitting.attempt_number} ·{' '}
                <span className={sitting.result === 'pass' ? 'text-success' : 'text-danger'}>
                  {sitting.result === 'pass' ? 'Pass ✓' : 'Fail ✗'}
                </span>
                {isComplete && <span className="ml-2 text-text-muted">(reflection already saved)</span>}
              </p>
            </div>

            {/* Domain ratings */}
            {domains.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-3">How did you feel about each domain? (1 = Weak, 5 = Strong)</p>
                <div className="space-y-3">
                  {domains.map(domain => (
                    <div key={domain} className="space-y-1">
                      <p className="text-xs text-text-muted">{domain}</p>
                      <RatingPicker
                        value={domainRatings[domain] || null}
                        onChange={v => setDomainRatings(r => ({ ...r, [domain]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What worked */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                What preparation worked well?
              </label>
              <textarea
                value={whatWorked}
                onChange={e => setWhatWorked(e.target.value)}
                rows={3}
                placeholder="e.g. Spaced repetition on flashcards, mock exams under timed conditions…"
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none placeholder-text-muted"
              />
            </div>

            {/* What didn't */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                What didn't work / what surprised you on the exam?
              </label>
              <textarea
                value={whatDidnt}
                onChange={e => setWhatDidnt(e.target.value)}
                rows={3}
                placeholder="e.g. Underestimated domain X, ran out of time, certain question styles were tricky…"
                className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none placeholder-text-muted"
              />
            </div>

            {/* Retake focus — only relevant for fails */}
            {sitting.result === 'fail' && (
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Retake focus — what will you do differently?
                </label>
                <textarea
                  value={retakeFocus}
                  onChange={e => setRetakeFocus(e.target.value)}
                  rows={3}
                  placeholder="e.g. Dedicate 2 more weeks to domain X, do 3 more full mocks, review official practice questions…"
                  className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none placeholder-text-muted"
                />
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-bg-elevated flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-bg-elevated transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : isComplete ? 'Update Reflection' : 'Save Reflection'}
          </button>
        </div>
      </div>
    </div>
  )
}
