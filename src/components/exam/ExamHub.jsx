import { useState } from 'react'
import { useExamAttempts } from '../../hooks/useExamAttempts'
import { useFlashcards } from '../../hooks/useFlashcards'
import { useCertSittings } from '../../hooks/useCertSittings'
import VerificationBanner from '../shared/VerificationBanner'
import RegistrationBadge from '../shared/RegistrationBadge'
import MockExamTab from './MockExamTab'
import TakeExamTab from './TakeExamTab'
import ScoreHistoryTab from './ScoreHistoryTab'
import SittingsTab from './SittingsTab'
import FlashcardsTab from './FlashcardsTab'
import FlashcardManagerTab from './FlashcardManagerTab'
import DomainsTab from './DomainsTab'
import ResourcesTab from './ResourcesTab'
import NotesTab from './NotesTab'
import AIQATab from './AIQATab'
import StudyGuideTab from './StudyGuideTab'
import ExamDayChecklist from './ExamDayChecklist'
import ReadinessTab from './ReadinessTab'
import StudyPlanTab from './StudyPlanTab'

// Study → Exam left-to-right: learn the domain → study material → practice → test → track
const TABS = [
  { id: 'domains',   label: 'Domains' },
  { id: 'guide',     label: 'Study Guide' },
  { id: 'flash',     label: 'Flashcards' },
  { id: 'manage',    label: 'Manage Cards' },
  { id: 'ai',        label: 'AI Q&A' },
  { id: 'resources', label: 'Resources' },
  { id: 'notes',     label: 'Notes' },
  { id: 'plan',      label: 'Study Plan' },
  { id: 'take',      label: 'Take Exam' },
  { id: 'mock',      label: 'Mock Exam' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'history',   label: 'Score History' },
  { id: 'sittings',  label: 'Sittings' },
]

function ResultBanner({ sittings, cert }) {
  if (!sittings.length) return null
  const latest = sittings[0]
  const passed = latest.result === 'pass'
  const retakeCount = sittings.length

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${passed ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'}`}>
      <div className="flex items-center gap-3">
        <span className={`text-lg ${passed ? '' : ''}`}>{passed ? '🎉' : '💪'}</span>
        <div>
          <p className={`text-sm font-semibold ${passed ? 'text-success' : 'text-danger'}`}>
            {passed ? 'Exam Passed!' : 'Exam Not Passed — Keep Going'}
          </p>
          <p className="text-xs text-text-muted">
            {new Date(latest.sitting_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {latest.score != null && ` · ${latest.score}${cert.passing_score ? ` / ${cert.score_max}` : ''}`}
            {retakeCount > 1 && ` · Attempt #${retakeCount}`}
          </p>
        </div>
      </div>
      {passed && <span className="text-accent-gold font-bold text-lg">★</span>}
    </div>
  )
}

export default function ExamHub({ cert, onRefreshCert }) {
  const [activeTab, setActiveTab] = useState('domains')
  const [guideInitDomain, setGuideInitDomain] = useState(null)
  const { attempts, refetch: refetchAttempts } = useExamAttempts(cert.id)
  const { flashcards, refetch: refetchFlashcards } = useFlashcards(cert.id)
  const { sittings, refetch: refetchSittings } = useCertSittings(cert.id)

  function refresh() { refetchAttempts(); onRefreshCert?.() }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4 pb-24 md:pb-6">
      {/* Banners */}
      <VerificationBanner cert={cert} onVerified={onRefreshCert} />
      <div className="flex items-center gap-3">
        <RegistrationBadge cert={cert} onUpdated={onRefreshCert} />
      </div>
      <ResultBanner sittings={sittings} cert={cert} />
      {cert.registered && <ExamDayChecklist cert={cert} onRefreshCert={onRefreshCert} />}

      {/* Tab nav */}
      <div className="-mx-4 md:-mx-6 px-4 md:px-6 flex items-center gap-1 border-b border-bg-elevated overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'mock'      && <MockExamTab cert={cert} attempts={attempts} onLogged={refresh} onRefreshCert={onRefreshCert} />}
        {activeTab === 'take'      && <TakeExamTab cert={cert} onAttemptLogged={refetchAttempts} onGoToGuide={domain => { setGuideInitDomain(domain); setActiveTab('guide') }} />}
        {activeTab === 'history'   && <ScoreHistoryTab cert={cert} attempts={attempts} onRefresh={refetchAttempts} />}
        {activeTab === 'sittings'  && <SittingsTab cert={cert} sittings={sittings} onRefresh={() => { refetchSittings(); onRefreshCert?.() }} />}
        {activeTab === 'flash'     && <FlashcardsTab flashcards={flashcards} />}
        {activeTab === 'manage'    && <FlashcardManagerTab cert={cert} flashcards={flashcards} onRefresh={refetchFlashcards} />}
        {activeTab === 'domains'   && <DomainsTab cert={cert} />}
        {activeTab === 'resources' && <ResourcesTab cert={cert} onRefresh={onRefreshCert} />}
        {activeTab === 'notes'     && <NotesTab cert={cert} onRefresh={onRefreshCert} />}
        {activeTab === 'ai'        && <AIQATab cert={cert} />}
        {activeTab === 'guide'     && <StudyGuideTab cert={cert} initialDomain={guideInitDomain} />}
        {activeTab === 'readiness' && <ReadinessTab cert={cert} attempts={attempts} flashcards={flashcards} />}
        {activeTab === 'plan'      && <StudyPlanTab cert={cert} />}
      </div>
    </div>
  )
}
