import { AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './ToastProvider'

function needsVerification(cert) {
  if (!cert.last_verified_date) return true
  const days = Math.floor((new Date() - new Date(cert.last_verified_date)) / (1000 * 60 * 60 * 24))
  return days > 90
}

export default function VerificationBanner({ cert, onVerified }) {
  const toast = useToast()
  if (!needsVerification(cert)) return null

  const daysSince = cert.last_verified_date
    ? Math.floor((new Date() - new Date(cert.last_verified_date)) / (1000 * 60 * 60 * 24))
    : null

  const verifyUrl = cert.exam_url ||
    `https://www.google.com/search?q=${encodeURIComponent(`${cert.vendor} ${cert.exam_code || cert.name} certification`)}`

  const isCoursework = cert.type === 'coursework'
  const neverVerifiedText = isCoursework
    ? 'Course details have never been verified — confirm cost, syllabus, and module count are current.'
    : 'Exam details have never been verified — confirm cost, domains, and passing score are current.'
  const staleText = isCoursework
    ? `Course details last verified ${daysSince} days ago — confirm they're still current.`
    : `Exam details last verified ${daysSince} days ago — confirm they're still current.`

  async function markVerified() {
    const { error } = await supabase.from('certifications')
      .update({ last_verified_date: new Date().toISOString().split('T')[0] }).eq('id', cert.id)
    if (error) { toast.error('Failed to mark verified'); return }
    toast.success(`${isCoursework ? 'Course' : 'Exam'} details marked as verified`)
    onVerified?.()
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle size={14} className="text-warning flex-shrink-0" />
        <p className="text-xs text-warning">
          {daysSince === null ? neverVerifiedText : staleText}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a href={verifyUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-warning hover:underline">
          Verify <ExternalLink size={11} />
        </a>
        <button onClick={markVerified}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-warning/20 text-warning hover:bg-warning/30 transition-colors">
          <CheckCircle size={11} /> Mark Verified
        </button>
      </div>
    </div>
  )
}
