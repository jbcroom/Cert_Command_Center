import { useNavigate } from 'react-router-dom'

const STATUS_RING = {
  planned:     'border-text-muted/40',
  in_progress: 'border-accent-blue shadow-[0_0_8px_2px_rgba(59,130,246,0.4)]',
  complete:    'border-accent-gold bg-accent-gold/10',
  failed:      'border-danger',
}

const STATUS_DOT = {
  planned:     'bg-text-muted/40',
  in_progress: 'bg-accent-blue animate-pulse',
  complete:    'bg-accent-gold',
  failed:      'bg-danger',
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function JourneyTimeline({ certifications }) {
  const navigate = useNavigate()
  const certs = certifications.filter(c => !c.archived)

  if (!certs.length) return null

  return (
    <div className="bg-bg-surface rounded-xl p-5 border border-bg-elevated">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
        Certification Journey
      </h2>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-0 min-w-max">
          {certs.map((cert, i) => {
            const days = daysUntil(cert.target_date)
            const isLast = i === certs.length - 1
            return (
              <div key={cert.id} className="flex items-center">
                {/* Node */}
                <button
                  onClick={() => cert.status !== 'complete' && navigate(`/cert/${cert.id}`)}
                  className="flex flex-col items-center gap-2 group"
                  style={{ minWidth: 80 }}
                  title={cert.name}
                >
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-105 ${STATUS_RING[cert.status]}`}
                  >
                    <span className="text-xs font-bold text-text-primary leading-none text-center px-1">
                      {cert.exam_code?.replace(/[^A-Z0-9-]/g, '') || cert.name.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className={`w-1.5 h-1.5 rounded-full mx-auto mb-1 ${STATUS_DOT[cert.status]}`} />
                    {days !== null && cert.status !== 'complete' && (
                      <span className="text-[10px] text-text-muted font-mono-data">
                        {days > 0 ? `${days}d` : days === 0 ? 'Today' : 'Past'}
                      </span>
                    )}
                    {cert.status === 'complete' && (
                      <span className="text-[10px] text-accent-gold">✓</span>
                    )}
                  </div>
                </button>
                {/* Connector rail */}
                {!isLast && (
                  <div className="w-8 h-px bg-bg-elevated flex-shrink-0 mx-1" />
                )}
              </div>
            )
          })}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-bg-elevated">
        {[
          { status: 'planned', label: 'Planned' },
          { status: 'in_progress', label: 'In Progress' },
          { status: 'complete', label: 'Complete' },
          { status: 'failed', label: 'Failed' },
        ].map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
            <span className="text-[10px] text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
