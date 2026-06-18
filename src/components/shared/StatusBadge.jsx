const STYLES = {
  planned:     'bg-bg-elevated text-text-muted',
  in_progress: 'bg-accent-blue/20 text-accent-blue',
  complete:    'bg-accent-gold/20 text-accent-gold',
  failed:      'bg-danger/20 text-danger',
  archived:    'bg-bg-elevated text-text-muted line-through',
}

const LABELS = {
  planned:     'Planned',
  in_progress: 'In Progress',
  complete:    'Complete',
  failed:      'Failed',
  archived:    'Archived',
}

export default function StatusBadge({ status, className = '' }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STYLES[status] || STYLES.planned} ${className}`}>
      {LABELS[status] || status}
    </span>
  )
}
