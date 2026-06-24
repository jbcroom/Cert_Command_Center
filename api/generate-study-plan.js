export const config = { runtime: 'edge' }

function logUsage(supabaseUrl, supabaseKey, feature, certId, usage) {
  if (!supabaseUrl || !supabaseKey || !usage) return
  fetch(`${supabaseUrl}/rest/v1/api_usage_log`, {
    method: 'POST',
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ feature, cert_id: certId || null, input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0 }),
  }).catch(() => {})
}

const CERT_PERSONAS = {
  'cdmp': 'You are a CDMP-certified data management coach helping a candidate pass the CDMP Fundamentals exam.',
  'dp-700': 'You are an expert Microsoft Fabric Data Engineer coaching a candidate for the DP-700 exam.',
  'databricks-genai': 'You are a Databricks-certified Generative AI expert coaching a candidate for the Databricks Generative AI Engineer Associate exam.',
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body
  try { body = await req.json() } catch { return new Response('Invalid JSON', { status: 400 }) }

  const { certId, daysUntilExam, domainAccuracy, flashcardsDue, mockScores, targetScore } = body
  if (!certId) return new Response('Missing certId', { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 })

  const persona = CERT_PERSONAS[certId] ?? `You are a certification exam coach for ${certId}.`

  const domainSummary = domainAccuracy && Object.keys(domainAccuracy).length > 0
    ? Object.entries(domainAccuracy)
        .sort(([, a], [, b]) => (a.correct / Math.max(a.total, 1)) - (b.correct / Math.max(b.total, 1)))
        .map(([domain, s]) => {
          const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null
          return `- ${domain}: ${pct !== null ? `${pct}% (${s.correct}/${s.total} mock questions)` : 'no data yet'}`
        }).join('\n')
    : 'No mock exam data available yet.'

  const recentScores = mockScores?.length > 0
    ? mockScores.slice(-5).map((s, i) => `Exam ${i + 1}: ${Math.round(s * 100)}%`).join(', ')
    : 'No mock exams completed yet.'

  const prompt = `${persona}

Candidate snapshot:
- Days until exam: ${daysUntilExam ?? 'unknown'}
- Target score: ${targetScore ? `${targetScore}%` : 'not specified'}
- Recent mock exam scores: ${recentScores}
- Flashcards due for review today: ${flashcardsDue ?? 0}

Domain accuracy from mock exams (lowest = most urgent):
${domainSummary}

Create a personalized study plan. Structure it as:

## Current Assessment
2-3 sentences on where the candidate stands based on the data.

## Priority Domains
Rank the top 3 domains to focus on and explain WHY each is a priority based on the accuracy data.

## Weekly Schedule (${Math.min(daysUntilExam ?? 30, 30)}-day plan)
Break the remaining study time into focused weekly blocks. For each week specify:
- Primary domain focus
- Recommended daily study time
- Specific activities (flashcards, mock exam, guide review)

## Mock Exam Strategy
When to take mocks and what score to hit before feeling ready.

## Final Week Checklist
5-7 concrete actions for the last 7 days before the exam.

Be specific and actionable. Base recommendations on the actual accuracy data provided. Do not pad with generic advice.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), { status: 502 })
    }

    const data = await response.json()
    const content = data.content?.[0]?.text ?? ''
    logUsage(supabaseUrl, supabaseKey, 'study_plan', certId, data.usage)

    // Save to study_plans table
    if (supabaseUrl && supabaseKey) {
      const inputSnapshot = { domainAccuracy, flashcardsDue, mockScores, daysUntilExam, targetScore }
      const today = new Date().toISOString().split('T')[0]

      // Fire-and-forget: mark old plans not current, then insert new one
      fetch(`${supabaseUrl}/rest/v1/study_plans?cert_id=eq.${certId}`, {
        method: 'PATCH',
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_current: false }),
      }).then(() => fetch(`${supabaseUrl}/rest/v1/study_plans`, {
        method: 'POST',
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ cert_id: certId, content, input_snapshot: inputSnapshot, valid_from: today, is_current: true }),
      })).catch(() => {})
    }

    return new Response(JSON.stringify({ content }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
