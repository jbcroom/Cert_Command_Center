import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Database, Shield, BookOpen, BrainCircuit, Mail, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import { useToast } from '../components/shared/ToastProvider'

function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-bg-surface border border-bg-elevated rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Card 5: Database Overview ───────────────────────────────────────────────

function DatabaseCard() {
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(null)

  const tables = [
    { label: 'Certifications (active)', table: 'certifications', filter: q => q.eq('archived', false) },
    { label: 'Flashcards', table: 'flashcards' },
    { label: 'Study sessions', table: 'study_sessions' },
    { label: 'Mock exam attempts', table: 'exam_attempts' },
    { label: 'Mock exam responses', table: 'mock_exam_responses' },
    { label: 'Mock exam questions', table: 'mock_exam_questions' },
    { label: 'Study guide sections', table: 'study_guide_sections' },
    { label: 'Flashcard review queue (due)', table: 'flashcards', filter: q => q.lte('next_review_at', new Date().toISOString().split('T')[0]) },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    const results = {}
    await Promise.all(
      tables.map(async ({ label, table, filter }) => {
        let query = supabase.from(table).select('id', { count: 'exact', head: true })
        if (filter) query = filter(query)
        const { count } = await query
        results[label] = count ?? '—'
      })
    )
    setCounts(results)
    setRefreshedAt(new Date())
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return (
    <Card icon={Database} title="Database Overview">
      <div className="space-y-1.5">
        {tables.map(({ label }) => (
          <div key={label} className="flex items-center justify-between text-sm py-1 border-b border-bg-elevated last:border-0">
            <span className="text-text-muted">{label}</span>
            <span className="font-mono-data text-text-primary">{counts ? counts[label] : '—'}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        {refreshedAt && (
          <p className="text-xs text-text-muted">Last refreshed {refreshedAt.toLocaleTimeString()}</p>
        )}
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-40">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </Card>
  )
}

// ─── Card 3: Content Freshness ────────────────────────────────────────────────

const STALENESS_DAYS = {
  'databricks-genai': 90,
  'dp-700': 180,
  'cdmp': 180,
}
const DEFAULT_STALENESS = 180

function ContentFreshnessCard() {
  const [certs, setCerts] = useState(null)

  useEffect(() => {
    supabase
      .from('certifications')
      .select('id, name, exam_code, last_verified_date, exam_url')
      .eq('archived', false)
      .eq('type', 'exam')
      .then(({ data }) => setCerts(data || []))
  }, [])

  async function markVerified(certId) {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('certifications').update({ last_verified_date: today }).eq('id', certId)
    const { data } = await supabase.from('certifications').select('id, name, exam_code, last_verified_date, exam_url').eq('archived', false).eq('type', 'exam')
    setCerts(data || [])
  }

  if (!certs) return <Card icon={Shield} title="Content Freshness"><p className="text-xs text-text-muted">Loading…</p></Card>

  return (
    <Card icon={Shield} title="Content Freshness">
      <div className="space-y-2">
        {certs.map(cert => {
          const threshold = STALENESS_DAYS[cert.id] || DEFAULT_STALENESS
          const lastDate = cert.last_verified_date ? new Date(cert.last_verified_date) : null
          const daysSince = lastDate ? Math.floor((Date.now() - lastDate) / 86400000) : Infinity
          const stale = daysSince > threshold
          return (
            <div key={cert.id} className="flex items-center gap-3 py-2 border-b border-bg-elevated last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{cert.exam_code || cert.name}</p>
                <p className="text-xs text-text-muted">
                  {lastDate ? `Verified ${lastDate.toLocaleDateString()}` : 'Never verified'}
                  {' · '}{threshold}d cadence
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${stale ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                {stale ? 'Due' : 'Current'}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {cert.exam_url && (
                  <a href={cert.exam_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-accent-blue hover:underline">Source ↗</a>
                )}
                <button onClick={() => markVerified(cert.id)}
                  className="text-xs text-text-muted hover:text-text-primary hover:underline transition-colors">
                  Mark verified
                </button>
              </div>
            </div>
          )
        })}
        {!certs.length && <p className="text-xs text-text-muted">No active exam certs found.</p>}
      </div>
    </Card>
  )
}

// ─── Card 4: Study Guide Freshness ───────────────────────────────────────────

function StudyGuideFreshnessCard() {
  const [sections, setSections] = useState(null)

  const loadSections = useCallback(async () => {
    const { data } = await supabase
      .from('study_guide_sections')
      .select('cert_id, domain_name, section_type, generated_at, is_ai_generated')
      .eq('is_ai_generated', true)
      .order('generated_at', { ascending: true })
    setSections(data || [])
  }, [])

  useEffect(() => { loadSections() }, [loadSections])

  async function regenerate(certId, domainName, sectionType) {
    try {
      await fetch('/api/generate-guide-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certId, domainName, sectionType }),
      })
      await loadSections()
    } catch { /* silent */ }
  }

  if (!sections) return <Card icon={BookOpen} title="Study Guide Freshness"><p className="text-xs text-text-muted">Loading…</p></Card>

  const STALE_DAYS = { 'databricks-genai': 90, 'dp-700': 180, 'cdmp': 365 }

  return (
    <Card icon={BookOpen} title="Study Guide Freshness">
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {sections.map(s => {
          const threshold = STALE_DAYS[s.cert_id] || 180
          const genDate = s.generated_at ? new Date(s.generated_at) : null
          const daysSince = genDate ? Math.floor((Date.now() - genDate) / 86400000) : Infinity
          const stale = daysSince > threshold
          return (
            <div key={`${s.cert_id}-${s.domain_name}-${s.section_type}`}
              className="flex items-center gap-3 py-1.5 border-b border-bg-elevated last:border-0 text-xs">
              <div className="flex-1 min-w-0">
                <span className="text-text-muted">{s.cert_id}</span>
                <span className="text-text-muted mx-1">·</span>
                <span className="text-text-primary">{s.domain_name}</span>
                <span className="text-text-muted mx-1">·</span>
                <span className="text-text-muted">{s.section_type}</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded ${stale ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                {stale ? 'Stale' : 'OK'}
              </span>
              <button onClick={() => regenerate(s.cert_id, s.domain_name, s.section_type)}
                className="text-text-muted hover:text-accent-blue transition-colors">
                <RefreshCw size={11} />
              </button>
            </div>
          )
        })}
        {!sections.length && <p className="text-xs text-text-muted">No AI-generated sections yet.</p>}
      </div>
    </Card>
  )
}

// ─── Card 1: AI & Cost ───────────────────────────────────────────────────────

const FEATURE_LABELS = {
  chat: 'AI Chat',
  exam_debrief: 'Exam Debrief',
  guide_gen: 'Study Guide Gen',
  flashcard_gen: 'Flashcard Gen',
}

// claude-sonnet-4-6 pricing per million tokens (as of mid-2025)
const INPUT_COST_PER_M = 3.0
const OUTPUT_COST_PER_M = 15.0

function formatCost(n) {
  if (n < 0.01) return '<$0.01'
  return `$${n.toFixed(2)}`
}

function AICostCard() {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('api_usage_log')
      .select('feature, input_tokens, output_tokens, created_at')
      .order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const summary = rows
    ? Object.entries(
        rows.reduce((acc, r) => {
          const f = r.feature
          if (!acc[f]) acc[f] = { calls: 0, input: 0, output: 0 }
          acc[f].calls++
          acc[f].input += r.input_tokens || 0
          acc[f].output += r.output_tokens || 0
          return acc
        }, {})
      ).map(([feature, s]) => ({
        feature,
        label: FEATURE_LABELS[feature] || feature,
        calls: s.calls,
        inputTokens: s.input,
        outputTokens: s.output,
        cost: (s.input / 1_000_000) * INPUT_COST_PER_M + (s.output / 1_000_000) * OUTPUT_COST_PER_M,
      })).sort((a, b) => b.cost - a.cost)
    : null

  const totalCost = summary?.reduce((s, r) => s + r.cost, 0) ?? 0
  const totalCalls = rows?.length ?? 0

  return (
    <Card icon={BrainCircuit} title="AI & Cost">
      {!rows ? (
        <p className="text-xs text-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-text-muted">No AI calls logged yet. Usage appears here after the first AI feature call.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {summary.map(r => (
              <div key={r.feature} className="flex items-center justify-between text-xs py-1 border-b border-bg-elevated last:border-0">
                <div className="flex-1">
                  <span className="text-text-primary">{r.label}</span>
                  <span className="text-text-muted ml-2">{r.calls} call{r.calls !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-right space-x-4 flex-shrink-0">
                  <span className="font-mono-data text-text-muted">{(r.inputTokens + r.outputTokens).toLocaleString()} tok</span>
                  <span className="font-mono-data text-text-primary">{formatCost(r.cost)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-bg-elevated text-xs font-semibold">
            <span className="text-text-muted">Total ({totalCalls} calls)</span>
            <span className="font-mono-data text-text-primary">{formatCost(totalCost)}</span>
          </div>
          <p className="text-[10px] text-text-muted">Estimated cost at claude-sonnet-4-6 pricing ($3/$15 per M tokens)</p>
        </>
      )}
      <div className="flex justify-end pt-1">
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-40">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </Card>
  )
}

// ─── Card 2: Weekly Digest Settings ──────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function DigestSettingsCard() {
  const toast = useToast()
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ digest_enabled: false, digest_email: '', digest_day_of_week: 1, digest_hour: 8 })

  useEffect(() => {
    supabase.from('user_preferences').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) {
        setPrefs(data)
        setForm({
          digest_enabled: data.digest_enabled ?? false,
          digest_email: data.digest_email ?? '',
          digest_day_of_week: data.digest_day_of_week ?? 1,
          digest_hour: data.digest_hour ?? 8,
        })
      }
    })
  }, [])

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ id: 1, ...form }, { onConflict: 'id' })
    setSaving(false)
    if (error) toast.error('Failed to save')
    else toast.success('Digest settings saved')
  }

  async function sendTest() {
    if (!form.digest_email) { toast.error('Enter an email address first'); return }
    setSending(true)
    const res = await fetch('/api/send-digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.digest_email, testMode: true }),
    })
    setSending(false)
    if (res.ok) toast.success(`Test digest sent to ${form.digest_email}`)
    else {
      const d = await res.json().catch(() => ({}))
      const detail = d.detail ? ` — ${typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)}` : ''
      console.error('[send-digest]', d)
      toast.error((d.error || 'Send failed') + detail)
    }
  }

  return (
    <Card icon={Mail} title="Weekly Email Digest">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Enable weekly digest</span>
          <button
            onClick={() => setForm(f => ({ ...f, digest_enabled: !f.digest_enabled }))}
            className={`w-9 h-5 rounded-full transition-colors relative ${form.digest_enabled ? 'bg-accent-blue' : 'bg-bg-elevated'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.digest_enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">Recipient email</label>
          <input
            type="email"
            value={form.digest_email}
            onChange={e => setForm(f => ({ ...f, digest_email: e.target.value }))}
            placeholder="you@example.com"
            className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Day of week</label>
            <select
              value={form.digest_day_of_week}
              onChange={e => setForm(f => ({ ...f, digest_day_of_week: Number(e.target.value) }))}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            >
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Hour (24h)</label>
            <select
              value={form.digest_hour}
              onChange={e => setForm(f => ({ ...f, digest_hour: Number(e.target.value) }))}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[10px] text-text-muted">
          Automated sending requires a Vercel cron job pointed at /api/send-digest. Use "Send test" to verify the email template.
          Requires <code className="bg-bg-elevated px-1 rounded">RESEND_API_KEY</code> in Vercel environment variables.
        </p>

        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <button onClick={sendTest} disabled={sending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-50 transition-colors">
            <Send size={11} />
            {sending ? 'Sending…' : 'Send test'}
          </button>
        </div>
      </div>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SystemScreen() {
  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        <div>
          <h1 className="text-lg font-bold text-text-primary">System</h1>
          <p className="text-xs text-text-muted mt-0.5">App health, content freshness, and database overview</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <DatabaseCard />
          <AICostCard />
          <ContentFreshnessCard />
          <DigestSettingsCard />
          <div className="col-span-2">
            <StudyGuideFreshnessCard />
          </div>
        </div>
      </main>
    </>
  )
}
