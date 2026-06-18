import { useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'

function exportToCSV(rows, filename) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ExportButton({ certId }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function doExport(scope) {
    setOpen(false)
    setLoading(true)
    try {
      let certFilter = certId ? supabase.from('exam_attempts').select('*').eq('cert_id', certId) : supabase.from('exam_attempts').select('*')
      const [{ data: attempts }, { data: sessions }, { data: deliverables }] = await Promise.all([
        certId ? supabase.from('exam_attempts').select('*').eq('cert_id', certId) : scope === 'full'
          ? supabase.from('exam_attempts').select('*')
          : supabase.from('exam_attempts').select('*, certifications!inner(archived)').eq('certifications.archived', false),
        certId ? supabase.from('study_sessions').select('*').eq('cert_id', certId) : scope === 'full'
          ? supabase.from('study_sessions').select('*')
          : supabase.from('study_sessions').select('*, certifications!inner(archived)').eq('certifications.archived', false),
        certId ? supabase.from('deliverables').select('*').eq('cert_id', certId) : scope === 'full'
          ? supabase.from('deliverables').select('*')
          : supabase.from('deliverables').select('*, certifications!inner(archived)').eq('certifications.archived', false),
      ])
      const label = certId ? certId : scope
      const ts = new Date().toISOString().split('T')[0]
      if (attempts?.length) exportToCSV(attempts, `attempts-${label}-${ts}.csv`)
      if (sessions?.length) exportToCSV(sessions, `sessions-${label}-${ts}.csv`)
      if (deliverables?.length) exportToCSV(deliverables, `deliverables-${label}-${ts}.csv`)
      if (!attempts?.length && !sessions?.length && !deliverables?.length) toast.warning('No data to export')
      else toast.success('Export downloaded')
    } catch (e) {
      toast.error('Export failed')
    }
    setLoading(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-50">
        <Download size={14} />
        Export
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-bg-elevated border border-bg-surface rounded-lg shadow-xl z-50 py-1">
          {certId && <button onClick={() => doExport('cert')} className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-surface transition-colors">This cert</button>}
          <button onClick={() => doExport('active')} className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-surface transition-colors">All active certs</button>
          <button onClick={() => doExport('full')} className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-surface transition-colors">Full export (incl. archived)</button>
        </div>
      )}
    </div>
  )
}
