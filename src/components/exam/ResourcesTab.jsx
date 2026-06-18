import { useState } from 'react'
import { Plus, ExternalLink, Pencil, Trash2, X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'
import ConfirmModal from '../shared/ConfirmModal'

const TYPES = ['official', 'course', 'practice', 'book', 'video', 'other']
const TYPE_COLORS = {
  official: 'bg-accent-gold/20 text-accent-gold',
  course:   'bg-accent-blue/20 text-accent-blue',
  practice: 'bg-accent-teal/20 text-accent-teal',
  book:     'bg-purple-500/20 text-purple-400',
  video:    'bg-pink-500/20 text-pink-400',
  other:    'bg-bg-elevated text-text-muted',
}

const BLANK = { title: '', url: '', type: 'official' }

export default function ResourcesTab({ cert, onRefresh }) {
  const toast = useToast()
  const resources = cert.resources || []
  const [adding, setAdding] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [deleteIdx, setDeleteIdx] = useState(null)

  async function save(updatedResources) {
    const { error } = await supabase.from('certifications').update({ resources: updatedResources }).eq('id', cert.id)
    if (error) { toast.error(`Failed to save: ${error.message}`); return false }
    onRefresh?.()
    return true
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (await save([...resources, form])) { setForm(BLANK); setAdding(false); toast.success('Resource added') }
  }

  async function handleEdit(e) {
    e.preventDefault()
    const updated = resources.map((r, i) => i === editIdx ? form : r)
    if (await save(updated)) { setEditIdx(null); toast.success('Resource updated') }
  }

  async function handleDelete() {
    const updated = resources.filter((_, i) => i !== deleteIdx)
    if (await save(updated)) toast.success('Resource removed')
  }

  function startEdit(i) { setForm({ ...resources[i] }); setEditIdx(i); setAdding(false) }

  const input = 'w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted'

  function ResourceForm({ onSubmit, onCancel }) {
    return (
      <form onSubmit={onSubmit} className="bg-bg-elevated rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-text-muted mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={input} required placeholder="e.g. DP-700 Study Guide" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-text-muted mb-1">URL *</label>
            <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className={input} required placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={input}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded text-xs text-text-muted hover:bg-bg-surface transition-colors">Cancel</button>
          <button type="submit" className="px-3 py-1.5 rounded text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/80 transition-colors">Save</button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setAdding(true); setEditIdx(null); setForm(BLANK) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors">
          <Plus size={14} /> Add Resource
        </button>
      </div>

      {adding && <ResourceForm onSubmit={handleAdd} onCancel={() => setAdding(false)} />}

      {!resources.length && !adding && (
        <p className="text-text-muted text-sm text-center py-12">No resources yet. Add links to study guides, courses, and practice assessments.</p>
      )}

      <div className="space-y-2">
        {resources.map((r, i) => (
          <div key={i}>
            {editIdx === i ? (
              <ResourceForm onSubmit={handleEdit} onCancel={() => setEditIdx(null)} />
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-bg-elevated rounded-xl group">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${TYPE_COLORS[r.type] || TYPE_COLORS.other}`}>{r.type}</span>
                <span className="flex-1 text-sm text-text-primary truncate">{r.title}</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 transition-colors">
                    Open <ExternalLink size={11} />
                  </a>
                  <button onClick={() => startEdit(i)} className="text-text-muted hover:text-text-primary transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => setDeleteIdx(i)} className="text-text-muted hover:text-danger transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal open={deleteIdx !== null} onClose={() => setDeleteIdx(null)} onConfirm={handleDelete}
        title="Remove Resource" message={`Remove "${resources[deleteIdx]?.title}"?`} confirmLabel="Remove" />
    </div>
  )
}
