import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getDomainAccuracy, getCompletedSessionCount } from '../../lib/examSampler'

function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-sm font-semibold text-text-primary mt-5 mb-2">{line.slice(3)}</h3>
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} className="flex gap-2 text-xs text-text-muted leading-relaxed">
          <span className="text-accent-blue flex-shrink-0 mt-0.5">•</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>') }} />
        </div>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-1" />
    return (
      <p key={i} className="text-xs text-text-muted leading-relaxed"
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>') }} />
    )
  })
}

export default function StudyPlanTab({ cert }) {
  const [plan, setPlan] = useState(null)
  const [planMeta, setPlanMeta] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadExisting = useCallback(async () => {
    const { data } = await supabase
      .from('study_plans')
      .select('*')
      .eq('cert_id', cert.id)
      .eq('is_current', true)
      .maybeSingle()
    setPlan(data?.content || null)
    setPlanMeta(data || null)
    setLoading(false)
  }, [cert.id])

  useEffect(() => { loadExisting() }, [loadExisting])

  async function generate() {
    setGenerating(true)
    try {
      // Assemble snapshot data
      const [domainAccuracy, flashcardsRes, sessionsRes] = await Promise.all([
        getDomainAccuracy(cert.id).catch(() => ({})),
        supabase
          .from('flashcards')
          .select('id', { count: 'exact', head: true })
          .eq('cert_id', cert.id)
          .eq('active', true)
          .lte('next_review_at', new Date().toISOString().split('T')[0]),
        supabase
          .from('mock_exam_sessions')
          .select('id')
          .eq('cert_id', cert.id)
          .eq('completed', true)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const flashcardsDue = flashcardsRes.count || 0

      // Get scores for recent sessions
      let mockScores = []
      if (sessionsRes.data?.length) {
        const sessionIds = sessionsRes.data.map(s => s.id)
        const { data: responses } = await supabase
          .from('mock_exam_responses')
          .select('session_id, is_correct')
          .in('session_id', sessionIds)
        if (responses) {
          const bySession = {}
          responses.forEach(r => {
            if (!bySession[r.session_id]) bySession[r.session_id] = { correct: 0, total: 0 }
            bySession[r.session_id].total++
            if (r.is_correct) bySession[r.session_id].correct++
          })
          mockScores = sessionIds.map(id => {
            const s = bySession[id]
            return s ? s.correct / s.total : null
          }).filter(Boolean)
        }
      }

      const daysUntilExam = cert.target_date
        ? Math.ceil((new Date(cert.target_date) - Date.now()) / 86400000)
        : null

      const res = await fetch('/api/generate-study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certId: cert.id,
          daysUntilExam,
          domainAccuracy,
          flashcardsDue,
          mockScores,
          targetScore: cert.target_score || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setPlan(data.content)
        await loadExisting()
      }
    } finally {
      setGenerating(false)
    }
  }

  const generatedAt = planMeta?.created_at
    ? new Date(planMeta.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">AI Study Plan</h3>
          {generatedAt && (
            <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
              <Clock size={11} /> Generated {generatedAt}
            </p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {generating ? 'Generating…' : plan ? 'Regenerate' : 'Generate Plan'}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted text-center py-12">Loading…</p>
      ) : !plan ? (
        <div className="text-center py-16 space-y-3">
          <Sparkles size={28} className="mx-auto text-text-muted" />
          <p className="text-sm text-text-muted">No study plan yet.</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Click "Generate Plan" to create a personalized study plan based on your mock exam accuracy,
            flashcard due dates, and days remaining until your exam.
          </p>
        </div>
      ) : (
        <div className="bg-bg-surface border border-bg-elevated rounded-xl p-5 space-y-1">
          {renderMarkdown(plan)}
        </div>
      )}
    </div>
  )
}
