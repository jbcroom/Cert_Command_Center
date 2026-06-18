import { useCertifications } from '../hooks/useCertifications'
import { useStudySessions } from '../hooks/useStudySessions'
import { useExamAttempts } from '../hooks/useExamAttempts'
import { useDeliverables } from '../hooks/useDeliverables'
import TopBar from '../components/layout/TopBar'
import JourneyTimeline from '../components/dashboard/JourneyTimeline'
import StatsRow from '../components/dashboard/StatsRow'
import NextUpCard from '../components/dashboard/NextUpCard'
import StudyRecommendation from '../components/dashboard/StudyRecommendation'
import TodayPriorityPanel from '../components/dashboard/TodayPriorityPanel'
import BudgetCard from '../components/dashboard/BudgetCard'
import RecentActivity from '../components/dashboard/RecentActivity'

export default function Dashboard({ onLogSession, onAddCert }) {
  const { certifications, loading: certsLoading, error: certsError } = useCertifications()
  const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useStudySessions()
  const { attempts } = useExamAttempts()
  const { deliverables } = useDeliverables()

  if (certsError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-danger text-sm">Unable to load your data. Check your connection.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-bg-elevated text-sm text-text-primary hover:bg-bg-surface transition-colors">
          Retry
        </button>
      </div>
    )
  }

  const loading = certsLoading || sessionsLoading

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-text-muted text-sm">Loading…</span>
          </div>
        ) : (
          <>
            <StudyRecommendation
              certifications={certifications}
              attempts={attempts}
              sessions={sessions}
              deliverables={deliverables}
            />
            <StatsRow certifications={certifications} sessions={sessions} />
            <TodayPriorityPanel certifications={certifications} />
            <JourneyTimeline certifications={certifications} />
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-1">
                <NextUpCard certifications={certifications} attempts={attempts} deliverables={deliverables} />
              </div>
              <div className="col-span-2">
                <RecentActivity sessions={sessions} onRefresh={refetchSessions} />
              </div>
            </div>
            <BudgetCard certifications={certifications} />
          </>
        )}
      </main>
    </>
  )
}
