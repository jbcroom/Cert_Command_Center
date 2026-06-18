import { useState, useEffect, useReducer, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { sampleExamQuestions, sampleDrillQuestions, getDomainAccuracy, getRecentSessionIds, getCompletedSessionCount } from '../../lib/examSampler'
import { useToast } from '../shared/ToastProvider'
import ExamQuestionCard from './ExamQuestionCard'
import ExamTimer from './ExamTimer'
import ExamResultsScreen from './ExamResultsScreen'

// ─── reducer ────────────────────────────────────────────────────────────────

const initialState = {
  phase: 'config',     // 'config' | 'exam' | 'results'
  questions: [],
  isPartialBank: false,
  sessionId: null,
  isPractice: false,
  timeLimitSeconds: 0,
  currentIdx: 0,
  // answers[questionId] = { shuffledIndex, originalIndex }
  answers: {},
  startedAt: null,
  // per-question elapsed time (seconds)
  questionStartedAt: null,
  timeSpent: {},       // questionId → seconds
  responses: [],       // final batch after submit
}

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        phase: 'exam',
        questions: action.questions,
        isPartialBank: action.isPartialBank,
        sessionId: action.sessionId,
        isPractice: action.isPractice,
        timeLimitSeconds: action.timeLimitSeconds,
        currentIdx: 0,
        answers: {},
        startedAt: Date.now(),
        questionStartedAt: Date.now(),
        timeSpent: {},
      }
    case 'SELECT': {
      const qId = state.questions[state.currentIdx]?.id
      return {
        ...state,
        answers: { ...state.answers, [qId]: { shuffledIndex: action.shuffledIndex, originalIndex: action.originalIndex } },
      }
    }
    case 'NAVIGATE': {
      const now = Date.now()
      const qId = state.questions[state.currentIdx]?.id
      const elapsed = Math.round((now - state.questionStartedAt) / 1000)
      return {
        ...state,
        currentIdx: action.idx,
        questionStartedAt: now,
        timeSpent: { ...state.timeSpent, [qId]: (state.timeSpent[qId] || 0) + elapsed },
      }
    }
    case 'RESULTS':
      return { ...state, phase: 'results', responses: action.responses }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ─── Config screen ───────────────────────────────────────────────────────────

function DrillPreview({ domainStats, drillWeights }) {
  if (!drillWeights) return null
  const entries = Object.entries(drillWeights)
    .sort(([, a], [, b]) => b - a)
    .map(([domain, weight]) => {
      const stats = domainStats?.[domain]
      const accuracy = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null
      return { domain, weight, accuracy }
    })

  return (
    <div className="bg-bg-elevated rounded-lg p-3 space-y-2">
      <p className="text-xs font-medium text-text-muted">Domain focus (weighted by weak areas)</p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {entries.map(({ domain, weight, accuracy }) => (
          <div key={domain} className="flex items-center justify-between text-xs gap-2">
            <span className="text-text-muted truncate">{domain}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono-data text-text-primary">
                {accuracy != null ? `${accuracy}%` : 'no data'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                weight > 0.15 ? 'bg-danger/20 text-danger' :
                weight > 0.07 ? 'bg-warning/20 text-warning' :
                'bg-bg-surface text-text-muted'
              }`}>
                {weight > 0.15 ? 'High' : weight > 0.07 ? 'Med' : 'Low'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfigScreen({ cert, config, onStart }) {
  const [isPractice, setIsPractice] = useState(false)
  const [examType, setExamType] = useState('full') // 'full' | 'drill'
  const [loading, setLoading] = useState(false)
  const [sessionCount, setSessionCount] = useState(null)
  const [drillPreview, setDrillPreview] = useState(null) // { domainStats, drillWeights }
  const [drillPreviewLoading, setDrillPreviewLoading] = useState(false)
  const toast = useToast()

  const mins = Math.round((config?.time_limit_seconds || 0) / 60)

  useEffect(() => {
    getCompletedSessionCount(cert.id).then(setSessionCount)
  }, [cert.id])

  async function handleSelectDrill() {
    if (sessionCount < 2) return
    setExamType('drill')
    if (drillPreview) return
    setDrillPreviewLoading(true)
    try {
      const domainStats = await getDomainAccuracy(cert.id)
      // Compute weights client-side for preview (same formula as sampler)
      const byDomain = {}
      for (const domain of Object.keys(domainStats)) byDomain[domain] = true
      // Also include domains with no data (fall back to 0.5 accuracy)
      const allDomains = cert.domains?.map(d => d.name) ?? Object.keys(domainStats)
      const rawWeights = {}
      for (const domain of allDomains) {
        const stats = domainStats[domain]
        const accuracy = stats && stats.total > 0 ? stats.correct / stats.total : 0.5
        const gap = 1 - accuracy
        rawWeights[domain] = gap * gap
      }
      const totalW = Object.values(rawWeights).reduce((s, w) => s + w, 0)
      const drillWeights = totalW > 0
        ? Object.fromEntries(allDomains.map(d => [d, rawWeights[d] / totalW]))
        : Object.fromEntries(allDomains.map(d => [d, 1 / allDomains.length]))
      setDrillPreview({ domainStats, drillWeights })
    } catch {
      // preview failure is non-fatal
    }
    setDrillPreviewLoading(false)
  }

  async function handleStart() {
    setLoading(true)
    try {
      let questions, isPartialBank

      if (examType === 'drill') {
        const result = await sampleDrillQuestions(cert.id, config.question_count)
        questions = result.questions
        isPartialBank = result.isPartialBank
      } else {
        const recentIds = await getRecentSessionIds(cert.id)
        const result = await sampleExamQuestions(cert.id, config.question_count, recentIds)
        questions = result.questions
        isPartialBank = result.isPartialBank
      }

      if (!questions.length) {
        toast.error('No questions found for this exam. Check the question bank.')
        setLoading(false)
        return
      }

      const { data: session, error } = await supabase
        .from('mock_exam_sessions')
        .insert({
          cert_id: cert.id,
          question_ids: questions.map(q => q.id),
          time_limit_seconds: config.time_limit_seconds,
          is_practice_mode: isPractice,
          status: 'in_progress',
        })
        .select('id')
        .single()

      if (error) { toast.error(`Failed to start session: ${error.message}`); setLoading(false); return }

      onStart({ questions, isPartialBank, sessionId: session.id, isPractice, timeLimitSeconds: config.time_limit_seconds })
    } catch (err) {
      toast.error(`Failed to start exam: ${err.message}`)
    }
    setLoading(false)
  }

  const drillDisabled = sessionCount !== null && sessionCount < 2

  return (
    <div className="space-y-6 max-w-lg">
      <div className="bg-bg-surface border border-bg-elevated rounded-xl p-6 space-y-5">
        <h3 className="text-base font-semibold text-text-primary">Mock Exam</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-bg-elevated">
            <span className="text-text-muted">Questions</span>
            <span className="font-mono-data text-text-primary">{config?.question_count ?? '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-bg-elevated">
            <span className="text-text-muted">Time limit</span>
            <span className="font-mono-data text-text-primary">{mins} min</span>
          </div>
          <div className="flex justify-between py-2 border-b border-bg-elevated">
            <span className="text-text-muted">Passing score</span>
            <span className="font-mono-data text-text-primary">
              {cert.passing_score != null
                ? `${Math.round((cert.passing_score / cert.score_max) * 100)}%`
                : '—'}
            </span>
          </div>
        </div>

        {/* Exam type */}
        <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-text-primary">Exam type</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExamType('full')}
              className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors ${
                examType === 'full'
                  ? 'border-accent-blue bg-accent-blue/10'
                  : 'border-bg-elevated hover:border-accent-blue/40'
              }`}
            >
              <span className={`text-sm font-medium ${examType === 'full' ? 'text-accent-blue' : 'text-text-primary'}`}>Full Mock</span>
              <span className="text-xs text-text-muted mt-0.5">Stratified by domain weight</span>
            </button>
            <div className="relative">
              <button
                onClick={handleSelectDrill}
                disabled={drillDisabled}
                className={`w-full flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors disabled:opacity-40 ${
                  examType === 'drill'
                    ? 'border-accent-teal bg-accent-teal/10'
                    : 'border-bg-elevated hover:border-accent-teal/40'
                }`}
              >
                <span className={`text-sm font-medium ${examType === 'drill' ? 'text-accent-teal' : 'text-text-primary'}`}>Drill Weak Areas</span>
                <span className="text-xs text-text-muted mt-0.5">
                  {drillDisabled ? `Need ${2 - sessionCount} more session${sessionCount === 1 ? '' : 's'}` : 'More Qs from low-accuracy domains'}
                </span>
              </button>
            </div>
          </div>
          {examType === 'drill' && (
            drillPreviewLoading
              ? <p className="text-xs text-text-muted text-center py-1">Loading domain data…</p>
              : <DrillPreview domainStats={drillPreview?.domainStats} drillWeights={drillPreview?.drillWeights} />
          )}
        </div>

        {/* Timer toggle */}
        <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-text-primary">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: false, label: `Timed (${mins} min)`, sub: 'Simulates real exam conditions' },
              { value: true,  label: 'Practice',             sub: 'No timer — work at your pace' },
            ].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setIsPractice(opt.value)}
                className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors ${
                  isPractice === opt.value
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-bg-elevated hover:border-accent-blue/40'
                }`}
              >
                <span className={`text-sm font-medium ${isPractice === opt.value ? 'text-accent-blue' : 'text-text-primary'}`}>{opt.label}</span>
                <span className="text-xs text-text-muted mt-0.5">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={loading || !config}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Preparing exam…' : examType === 'drill' ? 'Start Drill' : 'Start Exam'}
        </button>
      </div>
    </div>
  )
}

// ─── Active exam screen ──────────────────────────────────────────────────────

function ExamScreen({ state, dispatch, onSubmit }) {
  const { questions, currentIdx, answers, isPractice, timeLimitSeconds } = state
  const question = questions[currentIdx]
  const answer = answers[question?.id]
  const answeredCount = Object.keys(answers).length

  // Record time on unmount / question change is handled by NAVIGATE action
  const handleNavigate = useCallback((idx) => {
    dispatch({ type: 'NAVIGATE', idx })
  }, [dispatch])

  function handleExpire() {
    onSubmit(true)
  }

  if (!question) return null

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-bg-primary -mx-4 px-4 md:mx-0 md:px-0 md:static py-2 md:py-0 border-b border-bg-elevated md:border-0 flex items-center justify-between">
        <span className="text-xs text-text-muted">{answeredCount} / {questions.length} answered</span>
        <div className="flex items-center gap-3">
          {!isPractice && (
            <ExamTimer totalSeconds={timeLimitSeconds} onExpire={handleExpire} />
          )}
          <button
            onClick={() => onSubmit(false)}
            className="px-3 py-1.5 text-xs rounded-lg bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="bg-bg-surface border border-bg-elevated rounded-xl p-6">
        <ExamQuestionCard
          question={question}
          questionNumber={currentIdx + 1}
          totalQuestions={questions.length}
          selectedIndex={answer?.shuffledIndex ?? null}
          onSelect={(si, oi) => dispatch({ type: 'SELECT', shuffledIndex: si, originalIndex: oi })}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => handleNavigate(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="px-5 py-2 text-sm rounded-lg bg-bg-elevated text-text-primary disabled:opacity-30 hover:bg-bg-elevated/80 transition-colors"
        >
          ← Back
        </button>

        {/* Question dots (up to 20 visible) */}
        <div className="flex gap-1 flex-wrap justify-center max-w-sm">
          {questions.slice(0, 20).map((q, i) => (
            <button
              key={q.id}
              onClick={() => handleNavigate(i)}
              className={`w-5 h-5 rounded text-[9px] font-mono-data transition-colors ${
                i === currentIdx ? 'bg-accent-blue text-white' :
                answers[q.id] != null ? 'bg-accent-teal/30 text-accent-teal' :
                'bg-bg-elevated text-text-muted hover:bg-bg-elevated/60'
              }`}
            >
              {i + 1}
            </button>
          ))}
          {questions.length > 20 && (
            <span className="text-xs text-text-muted self-center">+{questions.length - 20} more</span>
          )}
        </div>

        <button
          onClick={() => currentIdx < questions.length - 1 ? handleNavigate(currentIdx + 1) : onSubmit(false)}
          className={`px-5 py-2 text-sm rounded-lg transition-colors ${
            currentIdx === questions.length - 1
              ? 'bg-accent-blue text-white hover:bg-accent-blue/80'
              : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
          }`}
        >
          {currentIdx === questions.length - 1 ? 'Submit →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TakeExamTab({ cert, onAttemptLogged, onGoToGuide }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [config, setConfig] = useState(null)
  const toast = useToast()

  useEffect(() => {
    supabase.from('mock_exam_configs').select('*').eq('cert_id', cert.id).single()
      .then(({ data }) => setConfig(data))
  }, [cert.id])

  // Abandon session on tab unload if still in progress
  useEffect(() => {
    if (state.phase !== 'exam') return
    function handleUnload() {
      if (state.sessionId) {
        navigator.sendBeacon('/api/abandon-session', JSON.stringify({ sessionId: state.sessionId }))
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [state.phase, state.sessionId])

  function handleStart({ questions, isPartialBank, sessionId, isPractice, timeLimitSeconds }) {
    dispatch({ type: 'START', questions, isPartialBank, sessionId, isPractice, timeLimitSeconds })
  }

  async function handleSubmit(timedOut = false) {
    const { questions, answers, sessionId, startedAt, timeSpent, currentIdx } = state

    // Flush time for the current question
    const currentQId = questions[currentIdx]?.id
    const finalTimeSpent = {
      ...timeSpent,
      [currentQId]: (timeSpent[currentQId] || 0) + Math.round((Date.now() - state.questionStartedAt) / 1000),
    }

    const totalSeconds = Math.round((Date.now() - startedAt) / 1000)
    const correct = questions.filter(q => answers[q.id]?.originalIndex === q.correct_index).length
    const total = questions.length
    const scorePct = Math.round((correct / total) * 100)

    // Build per-domain breakdown
    const domainScores = {}
    for (const q of questions) {
      if (!domainScores[q.domain_name]) domainScores[q.domain_name] = { correct: 0, total: 0 }
      domainScores[q.domain_name].total++
      if (answers[q.id]?.originalIndex === q.correct_index) domainScores[q.domain_name].correct++
    }
    const domainScoresPct = Object.fromEntries(
      Object.entries(domainScores).map(([d, { correct, total }]) => [d, Math.round((correct / total) * 100)])
    )

    // Batch-insert responses
    const responseRows = questions.map(q => ({
      session_id: sessionId,
      question_id: q.id,
      selected_index: answers[q.id]?.originalIndex ?? null,
      is_correct: answers[q.id] != null ? answers[q.id].originalIndex === q.correct_index : false,
      time_spent_seconds: finalTimeSpent[q.id] ?? null,
    }))

    const { error: respErr } = await supabase.from('mock_exam_responses').insert(responseRows)
    if (respErr) { toast.error(`Failed to save responses: ${respErr.message}`); return }

    // Mark session complete
    await supabase.from('mock_exam_sessions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', sessionId)

    // Scale score to cert's own score_max so ScoreGauge pass markers render correctly
    const certScoreMax = cert.score_max || 100
    const scaledScore = Math.round((scorePct / 100) * certScoreMax)

    // Write to exam_attempts so Score History + readiness views pick this up automatically
    const { error: attemptErr } = await supabase.from('exam_attempts').insert({
      cert_id: cert.id,
      attempt_date: new Date().toISOString().split('T')[0],
      score: scaledScore,
      score_max: certScoreMax,
      time_taken_minutes: Math.round(totalSeconds / 60) || null,
      domain_scores: domainScoresPct,
      notes: `Taken in-app via Mock Exam Engine${timedOut ? ' (time expired)' : ''}`,
    })
    if (attemptErr) toast.error(`Score saved but failed to write to history: ${attemptErr.message}`)
    else toast.success(`Exam complete — ${scorePct}% (${correct}/${total})`)

    // Dispatch results before notifying parent so the results screen renders
    // before any parent re-render resets the active tab
    dispatch({ type: 'RESULTS', responses: responseRows })
    if (!attemptErr) onAttemptLogged?.()
  }

  function handleRetake() {
    dispatch({ type: 'RESET' })
  }

  function handleDone() {
    dispatch({ type: 'RESET' })
  }

  function handleGoToGuide(domainName) {
    dispatch({ type: 'RESET' })
    onGoToGuide?.(domainName)
  }

  if (state.phase === 'config') {
    return <ConfigScreen cert={cert} config={config} onStart={handleStart} />
  }

  if (state.phase === 'exam') {
    return <ExamScreen state={state} dispatch={dispatch} onSubmit={handleSubmit} />
  }

  return (
    <ExamResultsScreen
      questions={state.questions}
      responses={state.responses}
      isPartialBank={state.isPartialBank}
      certId={cert.id}
      onRetake={handleRetake}
      onDone={handleDone}
      onGoToGuide={handleGoToGuide}
    />
  )
}
