import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getCertYear } from '../../hooks/useCertifications'

function fmt(n) {
  if (n == null) return '—'
  return `$${Number(n).toLocaleString()}`
}

function PaymentBadge({ cost, costPaid, status }) {
  if (status === 'complete' || status === 'failed') {
    return <span className="text-[10px] text-text-muted border border-bg-elevated px-1.5 py-0.5 rounded flex-shrink-0">sunk cost</span>
  }
  if (cost == null && costPaid == null) return null
  const budget = cost || 0
  const paid = costPaid || 0
  if (budget === 0 && paid === 0) return null
  if (paid >= budget && budget > 0) {
    return <span className="text-[10px] text-success border border-success/30 px-1.5 py-0.5 rounded flex-shrink-0">paid</span>
  }
  if (paid > 0) {
    return <span className="text-[10px] text-warning border border-warning/30 px-1.5 py-0.5 rounded flex-shrink-0">partial</span>
  }
  return <span className="text-[10px] text-text-muted border border-bg-elevated px-1.5 py-0.5 rounded flex-shrink-0">unpaid</span>
}

function YearGroup({ year, certs }) {
  const [open, setOpen] = useState(false)
  const budgeted = certs.reduce((s, c) => s + (c.cost || 0), 0)
  const paid = certs.reduce((s, c) => s + (c.cost_paid || 0), 0)
  const remaining = budgeted - paid

  // Separate exam vs coursework
  const examCerts = certs.filter(c => !c.type || c.type === 'exam')
  const courseworkCerts = certs.filter(c => c.type === 'coursework')

  function renderCertRow(cert) {
    const certPaid = cert.cost_paid || 0
    const certBudget = cert.cost || 0
    return (
      <div key={cert.id} className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {cert.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cert.color }} />}
          <span className="text-xs text-text-primary truncate">{cert.exam_code || cert.name}</span>
          {cert.voucher_notes && certBudget === 0 && (
            <span className="text-[10px] text-accent-gold border border-accent-gold/30 px-1.5 py-0.5 rounded flex-shrink-0" title={cert.voucher_notes}>
              voucher
            </span>
          )}
          <PaymentBadge cost={cert.cost} costPaid={cert.cost_paid} status={cert.status} />
        </div>
        <div className="flex items-center gap-4 text-xs font-mono-data flex-shrink-0">
          <span className="text-text-muted">{fmt(certBudget)}</span>
          <span className="text-accent-teal">{fmt(certPaid)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-bg-elevated rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 py-3 bg-bg-elevated/50 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-sm font-semibold text-text-primary">{year}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono-data">
          <span className="text-text-muted">Budget: <span className="text-text-primary">{fmt(budgeted)}</span></span>
          <span className="text-accent-teal">Paid: {fmt(paid)}</span>
          <span className={remaining < 0 ? 'text-danger' : remaining === 0 ? 'text-success' : 'text-text-muted'}>
            Left: {fmt(remaining)}
          </span>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-bg-elevated">
          {examCerts.length > 0 && courseworkCerts.length > 0 && (
            <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Exams</p>
          )}
          {examCerts.map(renderCertRow)}
          {courseworkCerts.length > 0 && (
            <>
              <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Coursework</p>
              {courseworkCerts.map(renderCertRow)}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function BudgetCard({ certifications }) {
  const certs = certifications.filter(c => !c.archived && (c.cost != null || c.cost_paid != null))

  const grouped = certs.reduce((acc, cert) => {
    const year = getCertYear(cert)
    if (!acc[year]) acc[year] = []
    acc[year].push(cert)
    return acc
  }, {})

  const years = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  const totalBudget = certs.reduce((s, c) => s + (c.cost || 0), 0)
  const totalPaid = certs.reduce((s, c) => s + (c.cost_paid || 0), 0)
  const totalRemaining = totalBudget - totalPaid

  // Estimated total to complete: paid so far + unpaid cost on non-passed certs
  const toComplete = certs
    .filter(c => !['complete', 'failed'].includes(c.status))
    .reduce((s, c) => s + Math.max(0, (c.cost || 0) - (c.cost_paid || 0)), 0)

  return (
    <div className="bg-bg-surface rounded-xl p-5 border border-bg-elevated">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Budget</h2>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-bg-elevated rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Budgeted</p>
          <p className="text-sm font-bold font-mono-data text-text-primary">{fmt(totalBudget)}</p>
        </div>
        <div className="bg-bg-elevated rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Spent</p>
          <p className="text-sm font-bold font-mono-data text-accent-teal">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-bg-elevated rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Still owed</p>
          <p className={`text-sm font-bold font-mono-data ${toComplete > 0 ? 'text-warning' : 'text-success'}`}>
            {fmt(toComplete)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {years.map(year => (
          <YearGroup key={year} year={year} certs={grouped[year]} />
        ))}
        {!years.length && (
          <p className="text-text-muted text-sm">No budget data yet.</p>
        )}
      </div>
    </div>
  )
}
