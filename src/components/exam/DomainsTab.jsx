import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../shared/ToastProvider'

const STARS = [1, 2, 3, 4, 5]
const CONF_COLOR = c => c >= 4 ? 'text-success' : c >= 3 ? 'text-warning' : 'text-danger'

export default function DomainsTab({ cert }) {
  const toast = useToast()
  const [ratings, setRatings] = useState({})
  const [hover, setHover] = useState({})

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('topic_confidence').select('*').eq('cert_id', cert.id)
      if (data) setRatings(Object.fromEntries(data.map(r => [r.domain_name, r.confidence])))
    }
    load()
  }, [cert.id])

  async function rate(domain, confidence) {
    setRatings(r => ({ ...r, [domain]: confidence }))
    const { error } = await supabase.from('topic_confidence')
      .upsert({ cert_id: cert.id, domain_name: domain, confidence, rated_at: new Date().toISOString() }, { onConflict: 'cert_id,domain_name' })
    if (error) toast.error('Failed to save rating')
  }

  const domains = cert.domains || []

  if (!domains.length) return <p className="text-text-muted text-sm text-center py-12">No domains configured for this cert.</p>

  const ratedDomains = domains.filter(d => ratings[d.name])
  const overallReadiness = ratedDomains.length
    ? ratedDomains.reduce((sum, d) => sum + (ratings[d.name] || 0) * (d.weight || 0), 0) / ratedDomains.reduce((s, d) => s + (d.weight || 0), 0)
    : null

  return (
    <div className="space-y-5">
      {overallReadiness !== null && (
        <div className="flex items-center gap-3 px-4 py-3 bg-bg-elevated rounded-xl">
          <span className="text-xs text-text-muted">Weighted Readiness Score</span>
          <span className={`font-mono-data font-bold text-lg ml-auto ${CONF_COLOR(overallReadiness)}`}>
            {overallReadiness.toFixed(1)} / 5
          </span>
        </div>
      )}

      <div className="space-y-2">
        {domains.map(domain => {
          const conf = ratings[domain.name] || 0
          const hov = hover[domain.name] || 0
          return (
            <div key={domain.name} className="flex items-center gap-4 px-4 py-3 bg-bg-elevated rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium truncate">{domain.name}</p>
                <p className="text-xs text-text-muted">{domain.weight}% of exam</p>
              </div>
              <div className="flex items-center gap-1">
                {STARS.map(s => (
                  <button key={s}
                    onClick={() => rate(domain.name, s)}
                    onMouseEnter={() => setHover(h => ({ ...h, [domain.name]: s }))}
                    onMouseLeave={() => setHover(h => ({ ...h, [domain.name]: 0 }))}
                    className={`text-xl transition-colors ${s <= (hov || conf) ? CONF_COLOR(hov || conf) : 'text-bg-surface'}`}>
                    ★
                  </button>
                ))}
                {conf > 0 && <span className={`ml-2 text-xs font-medium ${CONF_COLOR(conf)}`}>{conf}/5</span>}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-text-muted text-center">Click stars to rate your confidence in each domain. 1 = not started, 5 = exam-ready.</p>
    </div>
  )
}
