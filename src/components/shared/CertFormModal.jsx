import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'

const BLANK = {
  name: '', vendor: '', type: 'exam', exam_code: '', passing_score: '', score_max: '',
  target_date: '', year: new Date().getFullYear(), color: '#3B82F6', status: 'planned',
  cost: '', cost_paid: '', voucher_notes: '', exam_url: '', registered: false, registration_date: '',
  domains: [], modules: [],
}

export default function CertFormModal({ open, onClose, cert, onSaved }) {
  const toast = useToast()
  const isEdit = !!cert
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [typeWarning, setTypeWarning] = useState(false)

  useEffect(() => {
    if (open) {
      if (cert) {
        setForm({
          ...BLANK, ...cert,
          passing_score: cert.passing_score ?? '',
          score_max: cert.score_max ?? '',
          cost: cert.cost ?? '',
          cost_paid: cert.cost_paid ?? '',
          domains: cert.domains || [],
          modules: cert.modules || [],
        })
      } else {
        setForm(BLANK)
      }
      setTypeWarning(false)
    }
  }, [open, cert])

  if (!open) return null

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleTypeChange(newType) {
    if (isEdit && newType !== form.type) setTypeWarning(true)
    setField('type', newType)
  }

  // Domain helpers
  const domainTotal = form.domains.reduce((s, d) => s + (parseFloat(d.weight) || 0), 0)
  const domainsValid = form.type !== 'exam' || Math.abs(domainTotal - 100) < 0.01 || form.domains.length === 0

  function addDomain() { setField('domains', [...form.domains, { name: '', weight: '' }]) }
  function removeDomain(i) { setField('domains', form.domains.filter((_, idx) => idx !== i)) }
  function updateDomain(i, key, val) {
    const d = [...form.domains]; d[i] = { ...d[i], [key]: val }; setField('domains', d)
  }
  function autoBalance() {
    const zero = form.domains.filter(d => !parseFloat(d.weight))
    if (!zero.length) return
    const used = form.domains.reduce((s, d) => s + (parseFloat(d.weight) || 0), 0)
    const each = ((100 - used) / zero.length).toFixed(1)
    setField('domains', form.domains.map(d => parseFloat(d.weight) ? d : { ...d, weight: each }))
  }

  // Module helpers
  function addModule() { setField('modules', [...form.modules, '']) }
  function removeModule(i) { setField('modules', form.modules.filter((_, idx) => idx !== i)) }
  function updateModule(i, val) { const m = [...form.modules]; m[i] = val; setField('modules', m) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.type === 'exam' && form.domains.length > 0 && !domainsValid) {
      toast.error(`Domain weights must total 100%. Currently: ${domainTotal}%`)
      return
    }
    setSaving(true)

    const payload = {
      name: form.name, vendor: form.vendor, type: form.type,
      exam_code: form.exam_code || null,
      passing_score: form.passing_score !== '' ? parseFloat(form.passing_score) : null,
      score_max: form.score_max !== '' ? parseFloat(form.score_max) : null,
      target_date: form.target_date || null,
      year: parseInt(form.year) || new Date().getFullYear(),
      color: form.color || null,
      status: form.status,
      cost: form.cost !== '' ? parseFloat(form.cost) : null,
      cost_paid: form.cost_paid !== '' ? parseFloat(form.cost_paid) : null,
      voucher_notes: form.voucher_notes || null,
      exam_url: form.exam_url || null,
      registered: form.registered,
      registration_date: form.registration_date || null,
      domains: form.type === 'exam' ? form.domains : [],
      modules: form.type === 'coursework' ? form.modules.filter(Boolean) : [],
    }

    let error
    if (isEdit) {
      ({ error } = await supabase.from('certifications').update(payload).eq('id', cert.id))
    } else {
      const id = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      ;({ error } = await supabase.from('certifications').insert({ ...payload, id }))
      // Auto-create deliverables for coursework
      if (!error && form.type === 'coursework' && payload.modules.length) {
        const rows = payload.modules.map((title, i) => ({ cert_id: id, title, module_number: i + 1, status: 'not_started' }))
        await supabase.from('deliverables').insert(rows)
      }
    }

    setSaving(false)
    if (error) { toast.error(`Failed to save: ${error.message}`); return }
    toast.success(isEdit ? 'Certification updated' : 'Certification added')
    onSaved?.(); onClose()
  }

  const input = 'w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-elevated flex-shrink-0">
          <h2 className="text-text-primary font-semibold">{isEdit ? 'Edit Certification' : 'Add Certification'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {typeWarning && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
              Changing the track type will hide existing study data that doesn't apply to the new track type.
            </div>
          )}

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-text-muted mb-1.5">Name *</label>
              <input value={form.name} onChange={e => setField('name', e.target.value)} className={input} required placeholder="e.g. AWS Solutions Architect Professional" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Vendor *</label>
              <input value={form.vendor} onChange={e => setField('vendor', e.target.value)} className={input} required placeholder="e.g. Amazon Web Services" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Exam Code</label>
              <input value={form.exam_code} onChange={e => setField('exam_code', e.target.value)} className={input} placeholder="e.g. SAP-C02" />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-text-muted mb-2">Track Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {['exam', 'coursework'].map(t => (
                <button key={t} type="button" onClick={() => handleTypeChange(t)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? 'bg-accent-blue/20 border-accent-blue text-accent-blue' : 'border-bg-elevated text-text-muted hover:border-text-muted'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Dates & status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Target Date</label>
              <input type="date" value={form.target_date} onChange={e => setField('target_date', e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Year</label>
              <select value={form.year} onChange={e => setField('year', e.target.value)} className={input}>
                {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)} className={input}>
                {['planned', 'in_progress', 'complete', 'failed'].map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>

          {/* Exam-only fields */}
          {form.type === 'exam' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Passing Score</label>
                  <input type="number" value={form.passing_score} onChange={e => setField('passing_score', e.target.value)} className={input} placeholder="e.g. 700" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Score Max</label>
                  <input type="number" value={form.score_max} onChange={e => setField('score_max', e.target.value)} className={input} placeholder="e.g. 1000" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Exam Page URL</label>
                <input type="url" value={form.exam_url} onChange={e => setField('exam_url', e.target.value)} className={input} placeholder="https://..." />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="registered" checked={form.registered} onChange={e => setField('registered', e.target.checked)} className="rounded bg-bg-elevated border-bg-elevated" />
                <label htmlFor="registered" className="text-sm text-text-primary cursor-pointer">Exam booked / registered</label>
                {form.registered && (
                  <input type="date" value={form.registration_date} onChange={e => setField('registration_date', e.target.value)} className="ml-auto bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue" />
                )}
              </div>
            </>
          )}

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Budgeted Cost (USD)</label>
              <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setField('cost', e.target.value)} className={input} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Amount Paid (USD)</label>
              <input type="number" min="0" step="0.01" value={form.cost_paid} onChange={e => setField('cost_paid', e.target.value)} className={input} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Voucher / Discount Notes</label>
            <input value={form.voucher_notes} onChange={e => setField('voucher_notes', e.target.value)} className={input} placeholder="e.g. Free voucher from Microsoft — confirm expiry" />
          </div>

          {/* Color */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-muted">Vendor Color</label>
            <input type="color" value={form.color} onChange={e => setField('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
            <span className="text-xs font-mono-data text-text-muted">{form.color}</span>
          </div>

          {/* Domains (exam) */}
          {form.type === 'exam' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-text-muted">Domains</label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono-data ${domainsValid ? 'text-success' : 'text-danger'}`}>
                    Total: {domainTotal}%{!domainsValid && ' (must equal 100%)'}
                  </span>
                  {!domainsValid && (
                    <button type="button" onClick={autoBalance} className="text-xs text-accent-blue hover:underline">Auto-balance</button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {form.domains.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={d.name} onChange={e => updateDomain(i, 'name', e.target.value)} className={`${input} flex-1`} placeholder="Domain name" />
                    <input type="number" min="0" max="100" value={d.weight} onChange={e => updateDomain(i, 'weight', e.target.value)} className={`${input} w-20`} placeholder="%" />
                    <button type="button" onClick={() => removeDomain(i)} className="text-text-muted hover:text-danger transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addDomain} className="flex items-center gap-1 mt-2 text-xs text-accent-blue hover:underline">
                <Plus size={12} /> Add domain
              </button>
            </div>
          )}

          {/* Modules (coursework) */}
          {form.type === 'coursework' && (
            <div>
              <label className="block text-xs text-text-muted mb-2">Modules</label>
              <div className="space-y-2">
                {form.modules.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={m} onChange={e => updateModule(i, e.target.value)} className={`${input} flex-1`} placeholder={`Module ${i + 1}`} />
                    <button type="button" onClick={() => removeModule(i)} className="text-text-muted hover:text-danger transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addModule} className="flex items-center gap-1 mt-2 text-xs text-accent-blue hover:underline">
                <Plus size={12} /> Add module
              </button>
            </div>
          )}
        </form>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-bg-elevated flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-bg-elevated transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || (form.type === 'exam' && form.domains.length > 0 && !domainsValid)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Certification'}
          </button>
        </div>
      </div>
    </div>
  )
}
