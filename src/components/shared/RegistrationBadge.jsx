import { ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'

export default function RegistrationBadge({ cert, onUpdated }) {
  const toast = useToast()
  if (cert.type !== 'exam') return null

  async function markRegistered() {
    const date = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('certifications')
      .update({ registered: true, registration_date: date }).eq('id', cert.id)
    if (error) { toast.error('Failed to update registration'); return }
    toast.success('Exam marked as booked')
    onUpdated?.()
  }

  if (cert.registered) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-accent-teal/20 text-accent-teal">
        Booked {cert.registration_date || ''}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-warning/20 text-warning">
        Not Booked
      </span>
      {cert.exam_url && (
        <a href={cert.exam_url} target="_blank" rel="noopener noreferrer"
          onClick={markRegistered}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
          Book Exam <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}
