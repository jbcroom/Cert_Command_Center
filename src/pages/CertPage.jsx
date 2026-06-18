import { useParams, Navigate } from 'react-router-dom'
import { useCertifications } from '../hooks/useCertifications'
import TopBar from '../components/layout/TopBar'
import ExamHub from '../components/exam/ExamHub'
import CourseworkHub from '../components/coursework/CourseworkHub'

export default function CertPage({ onLogSession, onEdit, onReschedule, onArchive, onRefresh }) {
  const { certId } = useParams()
  const { certifications, loading, refetch } = useCertifications({ includeArchived: true })

  const cert = certifications.find(c => c.id === certId)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-text-muted text-sm">Loading…</span>
      </div>
    )
  }

  if (!cert) return <Navigate to="/404" replace />
  if (cert.archived) return <Navigate to="/archived" replace />

  return (
    <>
      <TopBar
        cert={cert}
        onLogSession={() => onLogSession?.(cert)}
        onEdit={() => onEdit?.(cert)}
        onReschedule={() => onReschedule?.(cert)}
        onArchive={() => onArchive?.(cert)}
      />
      {cert.type === 'exam'
        ? <ExamHub cert={cert} onRefreshCert={refetch} />
        : <CourseworkHub cert={cert} onRefreshCert={refetch} onRefreshDashboard={onRefresh} />
      }
    </>
  )
}
