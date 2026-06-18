import { useState, useRef } from 'react'
import { Plus, Trash2, Pencil, X, Check, Upload, Sparkles, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'
import ConfirmModal from '../shared/ConfirmModal'

const BLANK = { domain_name: '', question: '', answer: '', difficulty: 'medium' }
const DIFFICULTIES = ['easy', 'medium', 'hard']
const DIFF_COLORS = { easy: 'text-success', medium: 'text-warning', hard: 'text-danger' }

function CardRow({ card, onEdit, onDelete }) {
  return (
    <tr className="border-b border-bg-elevated/50 hover:bg-bg-elevated/30 transition-colors">
      <td className="py-2.5 px-3 text-xs text-text-muted">{card.domain_name || '—'}</td>
      <td className="py-2.5 px-3 text-sm text-text-primary max-w-xs truncate">{card.question}</td>
      <td className="py-2.5 px-3">
        <span className={`text-xs font-medium ${DIFF_COLORS[card.difficulty]}`}>{card.difficulty}</span>
      </td>
      <td className="py-2.5 px-3">
        <span className={`text-xs px-2 py-0.5 rounded ${card.active ? 'bg-success/10 text-success' : 'bg-bg-elevated text-text-muted'}`}>
          {card.active ? 'Active' : 'Hidden'}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(card)} className="h-9 w-9 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><Pencil size={13} /></button>
          <button onClick={() => onDelete(card)} className="h-9 w-9 flex items-center justify-center rounded text-text-muted hover:text-danger hover:bg-bg-elevated transition-colors"><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  )
}

function CardForm({ certId, card, onSaved, onCancel }) {
  const toast = useToast()
  const [form, setForm] = useState(card ? { ...card } : { ...BLANK, cert_id: certId })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { cert_id: certId, domain_name: form.domain_name || null, question: form.question, answer: form.answer, difficulty: form.difficulty, active: form.active ?? true }
    const { error } = card
      ? await supabase.from('flashcards').update(payload).eq('id', card.id)
      : await supabase.from('flashcards').insert(payload)
    setSaving(false)
    if (error) { toast.error(`Failed to save: ${error.message}`); return }
    toast.success(card ? 'Flashcard updated' : 'Flashcard added')
    onSaved?.()
  }

  const input = 'w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted'

  return (
    <form onSubmit={handleSubmit} className="bg-bg-elevated rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Domain</label>
          <input value={form.domain_name || ''} onChange={e => setForm(f => ({ ...f, domain_name: e.target.value }))} className={input} placeholder="e.g. Data Governance" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Difficulty</label>
          <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} className={input}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Question *</label>
        <textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} rows={2} className={`${input} resize-none`} required />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Answer *</label>
        <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={2} className={`${input} resize-none`} required />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
          <input type="checkbox" checked={form.active ?? true} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
          Active
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 min-h-[44px] rounded text-xs text-text-muted hover:bg-bg-surface transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 min-h-[44px] rounded text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : card ? 'Update' : 'Add Card'}
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── AI Generate Panel ───────────────────────────────────────────────────────

function GeneratePanel({ cert, flashcards, onSaved, onClose }) {
  const toast = useToast()
  const [domain, setDomain] = useState('')
  const [quantity, setQuantity] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState(null) // [{question, answer}]
  const [saving, setSaving] = useState(false)

  const domains = (cert.domains || []).map(d => d.name)

  async function handleGenerate() {
    if (!domain) { toast.error('Select a domain first'); return }
    setGenerating(true)
    setPreview(null)
    try {
      const existingFronts = flashcards
        .filter(f => f.domain_name === domain)
        .map(f => f.question)
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certId: cert.id, domainName: domain, quantity, existingFronts }),
      })
      const data = await res.json()
      if (!res.ok || !data.cards) throw new Error(data.error || 'Generation failed')
      setPreview(data.cards)
    } catch (err) {
      toast.error(err.message)
    }
    setGenerating(false)
  }

  function updateCard(i, key, val) {
    setPreview(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c))
  }
  function removeCard(i) {
    setPreview(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!preview?.length) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const rows = preview.map(c => ({
      cert_id: cert.id,
      domain_name: domain,
      question: c.question,
      answer: c.answer,
      difficulty: 'medium',
      active: true,
      next_review_at: today,
    }))
    const { error } = await supabase.from('flashcards').insert(rows)
    setSaving(false)
    if (error) { toast.error(`Failed to save: ${error.message}`); return }
    toast.success(`${rows.length} flashcard${rows.length !== 1 ? 's' : ''} added`)
    onSaved?.()
  }

  const input = 'bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue'

  return (
    <div className="bg-bg-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent-teal" />
          <span className="text-sm font-semibold text-text-primary">Generate Flashcards</span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">Domain</label>
          <select value={domain} onChange={e => setDomain(e.target.value)} className={`w-full ${input}`}>
            <option value="">Select domain…</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="w-20">
          <label className="block text-xs text-text-muted mb-1">Count</label>
          <select value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={input}>
            {[3, 5, 8, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={handleGenerate} disabled={generating || !domain}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 disabled:opacity-40 transition-colors">
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {preview && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">{preview.length} cards generated — review and edit before saving</p>
          {preview.map((card, i) => (
            <div key={i} className="bg-bg-surface rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs text-text-muted mt-1 w-4 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 space-y-1.5">
                  <textarea
                    value={card.question}
                    onChange={e => updateCard(i, 'question', e.target.value)}
                    rows={2}
                    className="w-full bg-bg-elevated border border-bg-elevated rounded px-2 py-1.5 text-xs text-text-primary resize-none focus:outline-none focus:border-accent-blue"
                    placeholder="Question"
                  />
                  <textarea
                    value={card.answer}
                    onChange={e => updateCard(i, 'answer', e.target.value)}
                    rows={2}
                    className="w-full bg-bg-elevated border border-bg-elevated rounded px-2 py-1.5 text-xs text-text-muted resize-none focus:outline-none focus:border-accent-blue"
                    placeholder="Answer"
                  />
                </div>
                <button onClick={() => removeCard(i)} className="text-text-muted hover:text-danger flex-shrink-0 mt-1"><X size={12} /></button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setPreview(null)} className="px-3 py-1.5 min-h-[44px] rounded text-xs text-text-muted hover:bg-bg-surface transition-colors">Discard</button>
            <button onClick={handleSave} disabled={saving || !preview.length}
              className="px-3 py-1.5 min-h-[44px] rounded text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : `Add ${preview.length} card${preview.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CSV Import Panel ─────────────────────────────────────────────────────────

function CSVImportPanel({ cert, onSaved, onClose }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [rows, setRows] = useState(null) // parsed rows
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  const validDomains = new Set((cert.domains || []).map(d => d.name))

  function parseCSV(text) {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map((line, i) => {
      const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || []
      const row = {}
      headers.forEach((h, j) => { row[h] = (vals[j] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim() })
      row._line = i + 2
      return row
    }).filter(r => r.question || r.front) // skip truly empty rows
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result)
        const errs = []
        parsed.forEach((r, i) => {
          const q = r.question || r.front
          const a = r.answer || r.back
          if (!q) errs.push(`Row ${r._line}: missing question/front`)
          if (!a) errs.push(`Row ${r._line}: missing answer/back`)
          if (r.domain_name && !validDomains.has(r.domain_name))
            errs.push(`Row ${r._line}: unknown domain "${r.domain_name}"`)
        })
        setRows(parsed)
        setErrors(errs)
      } catch (err) {
        toast.error('Failed to parse CSV: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = '' // allow re-selecting same file
  }

  async function handleImport() {
    if (errors.length) { toast.error('Fix errors before importing'); return }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const inserts = rows.map(r => ({
      cert_id: cert.id,
      domain_name: r.domain_name || null,
      question: r.question || r.front,
      answer: r.answer || r.back,
      difficulty: ['easy', 'medium', 'hard'].includes(r.difficulty) ? r.difficulty : 'medium',
      active: true,
      next_review_at: today,
    }))
    const { error } = await supabase.from('flashcards').insert(inserts)
    setSaving(false)
    if (error) { toast.error(`Import failed: ${error.message}`); return }
    toast.success(`${inserts.length} flashcard${inserts.length !== 1 ? 's' : ''} imported`)
    onSaved?.()
  }

  function downloadTemplate() {
    const csv = 'question,answer,domain_name,difficulty\n"What is Direct Lake mode?","A storage mode that reads Delta Parquet files directly from OneLake without import or caching.","","medium"'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'flashcard-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-bg-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-accent-blue" />
          <span className="text-sm font-semibold text-text-primary">Import CSV</span>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
      </div>

      <p className="text-xs text-text-muted">
        Columns: <code className="text-accent-blue">question, answer, domain_name, difficulty</code> (domain_name must match a domain exactly)
        {' '}·{' '}
        <button onClick={downloadTemplate} className="text-accent-blue hover:underline">Download template</button>
      </p>

      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <button onClick={() => fileRef.current?.click()}
        className="w-full py-8 rounded-lg border-2 border-dashed border-bg-elevated text-text-muted hover:border-accent-blue/40 hover:text-text-primary text-sm transition-colors">
        {rows ? `${rows.length} rows parsed` : 'Click to select CSV file'}
      </button>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((e, i) => <p key={i} className="text-xs text-danger">{e}</p>)}
        </div>
      )}

      {rows && !errors.length && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {rows.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs bg-bg-surface rounded px-2 py-1.5">
              <span className="text-text-muted w-4 flex-shrink-0">{i + 1}</span>
              <span className="text-text-primary truncate flex-1">{r.question || r.front}</span>
              {r.domain_name && <span className="text-text-muted flex-shrink-0">{r.domain_name}</span>}
            </div>
          ))}
          {rows.length > 5 && <p className="text-xs text-text-muted px-2">…and {rows.length - 5} more</p>}
        </div>
      )}

      {rows && (
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setRows(null); setErrors([]) }} className="px-3 py-1.5 min-h-[44px] rounded text-xs text-text-muted hover:bg-bg-surface transition-colors">Clear</button>
          <button onClick={handleImport} disabled={saving || errors.length > 0 || !rows.length}
            className="px-3 py-1.5 min-h-[44px] rounded text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
            {saving ? 'Importing…' : `Import ${rows.length} cards`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FlashcardManagerTab({ cert, flashcards, onRefresh }) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [deleteCard, setDeleteCard] = useState(null)
  const [bulkJson, setBulkJson] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)

  async function handleDelete() {
    const { error } = await supabase.from('flashcards').delete().eq('id', deleteCard.id)
    if (error) { toast.error(`Failed to delete: ${error.message}`); return }
    toast.success('Flashcard deleted')
    onRefresh?.()
  }

  async function handleBulkImport() {
    let cards
    try { cards = JSON.parse(bulkJson) } catch { toast.error('Invalid JSON — check format'); return }
    if (!Array.isArray(cards)) { toast.error('JSON must be an array'); return }
    setImporting(true)
    const rows = cards.map(c => ({ cert_id: cert.id, domain_name: c.domain || c.domain_name || null, question: c.question, answer: c.answer, difficulty: c.difficulty || 'medium', active: true }))
    const { error } = await supabase.from('flashcards').insert(rows)
    setImporting(false)
    if (error) { toast.error(`Import failed: ${error.message}`); return }
    toast.success(`${rows.length} flashcard${rows.length !== 1 ? 's' : ''} imported`)
    setBulkJson(''); setBulkOpen(false); onRefresh?.()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{flashcards.length} card{flashcards.length !== 1 ? 's' : ''} total</span>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setGenerateOpen(o => !o); setCsvOpen(false); setBulkOpen(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-xs transition-colors ${generateOpen ? 'bg-accent-teal/10 text-accent-teal' : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'}`}>
            <Sparkles size={13} /> Generate
          </button>
          <button onClick={() => { setCsvOpen(o => !o); setGenerateOpen(false); setBulkOpen(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-xs transition-colors ${csvOpen ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'}`}>
            <FileText size={13} /> Import CSV
          </button>
          <button onClick={() => setBulkOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
            <Upload size={13} /> Bulk JSON
          </button>
          <button onClick={() => { setAdding(true); setEditCard(null) }} className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-sm bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors">
            <Plus size={14} /> Add Card
          </button>
        </div>
      </div>

      {generateOpen && (
        <GeneratePanel cert={cert} flashcards={flashcards}
          onSaved={() => { setGenerateOpen(false); onRefresh?.() }}
          onClose={() => setGenerateOpen(false)} />
      )}

      {csvOpen && (
        <CSVImportPanel cert={cert}
          onSaved={() => { setCsvOpen(false); onRefresh?.() }}
          onClose={() => setCsvOpen(false)} />
      )}

      {bulkOpen && (
        <div className="bg-bg-elevated rounded-xl p-4 space-y-3">
          <p className="text-xs text-text-muted">Paste a JSON array: <code className="text-accent-blue">[{"{"}"question":"…","answer":"…","domain":"…","difficulty":"medium"{"}"}]</code></p>
          <textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)} rows={4} className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 text-xs text-text-primary font-mono-data focus:outline-none focus:border-accent-blue resize-none" placeholder='[{"question": "...", "answer": "...", "domain": "...", "difficulty": "medium"}]' />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setBulkOpen(false)} className="px-3 py-1.5 min-h-[44px] rounded text-xs text-text-muted hover:bg-bg-surface transition-colors">Cancel</button>
            <button onClick={handleBulkImport} disabled={importing} className="px-3 py-1.5 min-h-[44px] rounded text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      )}

      {(adding || editCard) && (
        <CardForm
          certId={cert.id}
          card={editCard}
          onSaved={() => { setAdding(false); setEditCard(null); onRefresh?.() }}
          onCancel={() => { setAdding(false); setEditCard(null) }}
        />
      )}

      {flashcards.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-12">No flashcards yet. Add one above or use bulk import.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-elevated">
                  {['Domain', 'Question', 'Difficulty', 'Status', ''].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flashcards.map(card => (
                  <CardRow key={card.id} card={card} onEdit={c => { setEditCard(c); setAdding(false) }} onDelete={setDeleteCard} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {flashcards.map(card => (
              <div key={card.id} className="rounded-lg border border-bg-elevated bg-bg-surface p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-text-primary leading-snug flex-1 min-w-0">{card.question}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setEditCard(card); setAdding(false) }} className="h-11 w-11 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteCard(card)} className="h-11 w-11 flex items-center justify-center rounded text-text-muted hover:text-danger hover:bg-bg-elevated transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {card.domain_name && <span className="text-text-muted">{card.domain_name}</span>}
                  <span className={DIFF_COLORS[card.difficulty]}>{card.difficulty}</span>
                  <span className={`px-2 py-0.5 rounded ${card.active ? 'bg-success/10 text-success' : 'bg-bg-elevated text-text-muted'}`}>
                    {card.active ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmModal open={!!deleteCard} onClose={() => setDeleteCard(null)} onConfirm={handleDelete}
        title="Delete Flashcard" message={`Delete "${deleteCard?.question?.slice(0, 60)}…"? This cannot be undone.`} confirmLabel="Delete" />
    </div>
  )
}
