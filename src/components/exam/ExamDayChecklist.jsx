import { useState, useEffect } from 'react'
import { CheckSquare, Square, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'

const DEFAULT_ITEMS = [
  'Booking confirmation email received and saved',
  'Voucher or discount code applied and confirmed',
  'Valid photo ID ready (matches registration name exactly)',
  'Exam portal login tested — credentials working',
  'Proctoring software installed and tested (if online exam)',
  'Exam location confirmed / travel time checked (if in-person)',
  'Calendar reminder set for exam day',
  'Weak domains reviewed one final time',
]

function genId() { return Math.random().toString(36).slice(2) }

export default function ExamDayChecklist({ cert, onRefreshCert }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [newText, setNewText] = useState('')

  useEffect(() => {
    const existing = cert.exam_day_checklist || []
    if (existing.length === 0) {
      // Auto-populate defaults
      const defaults = DEFAULT_ITEMS.map(text => ({ id: genId(), text, checked: false }))
      setItems(defaults)
      persist(defaults)
    } else {
      setItems(existing)
    }
  }, [cert.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(newItems) {
    setSaving(true)
    const { error } = await supabase
      .from('certifications')
      .update({ exam_day_checklist: newItems })
      .eq('id', cert.id)
    setSaving(false)
    if (error) toast.error('Failed to save checklist')
    else onRefreshCert?.()
  }

  function toggle(id) {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
    setItems(updated)
    persist(updated)
  }

  function removeItem(id) {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    persist(updated)
  }

  function addItem() {
    if (!newText.trim()) return
    const updated = [...items, { id: genId(), text: newText.trim(), checked: false }]
    setItems(updated)
    setNewText('')
    persist(updated)
  }

  async function resetToDefaults() {
    const defaults = DEFAULT_ITEMS.map(text => ({ id: genId(), text, checked: false }))
    setItems(defaults)
    await persist(defaults)
    toast.success('Checklist reset to defaults')
  }

  const checkedCount = items.filter(i => i.checked).length
  const total = items.length
  const allDone = total > 0 && checkedCount === total

  return (
    <div className={`rounded-xl border overflow-hidden ${allDone ? 'border-success/30 bg-success/5' : 'border-bg-elevated bg-bg-surface'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <CheckSquare size={16} className={allDone ? 'text-success' : 'text-accent-blue'} />
          <span className="text-sm font-semibold text-text-primary">Exam Day</span>
          {allDone
            ? <span className="text-xs text-success font-medium">You're ready. Good luck! 🎯</span>
            : <span className="text-xs text-text-muted">{checkedCount} of {total} items checked</span>
          }
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-text-muted">saving…</span>}
          {open ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-bg-elevated px-5 pb-4 space-y-2 pt-3">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-3 group">
              <button
                onClick={() => toggle(item.id)}
                className="flex-shrink-0 mt-0.5 text-text-muted hover:text-accent-blue transition-colors"
              >
                {item.checked
                  ? <CheckSquare size={16} className="text-success" />
                  : <Square size={16} />
                }
              </button>
              <span className={`flex-1 text-sm ${item.checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                {item.text}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-text-muted hover:text-danger transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Add item */}
          <div className="flex items-center gap-2 pt-2">
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Add item…"
              className="flex-1 bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
            />
            <button
              onClick={addItem}
              disabled={!newText.trim()}
              className="p-1.5 rounded-lg bg-bg-elevated text-text-muted hover:text-accent-blue disabled:opacity-30 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            onClick={resetToDefaults}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  )
}
