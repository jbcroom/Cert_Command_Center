export const config = { runtime: 'edge' }

function logUsage(feature, certId, usage) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || !usage) return
  fetch(`${url}/rest/v1/api_usage_log`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ feature, cert_id: certId || null, input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0 }),
  }).catch(() => {})
}

const CERT_PERSONAS = {
  'cdmp': `You are a CDMP-certified data management expert with deep knowledge of the DAMA-DMBOK framework.`,
  'dp-700': `You are an expert Microsoft Fabric Data Engineer with deep knowledge of the DP-700 exam.`,
  'databricks-genai': `You are a Databricks-certified Generative AI expert preparing candidates for the Databricks Generative AI Engineer Associate exam.`,
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { certId, wrongAnswers } = body

  if (!certId || !wrongAnswers || wrongAnswers.length < 3) {
    return new Response(JSON.stringify({ insights: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const persona = CERT_PERSONAS[certId] ?? 'You are a certification exam expert.'

  const wrongSummary = wrongAnswers.slice(0, 10).map((w, i) =>
    `${i + 1}. [${w.domain}] ${w.question}\n   ✗ Selected: ${w.selectedAnswer}\n   ✓ Correct: ${w.correctAnswer}`
  ).join('\n\n')

  const prompt = `${persona}

A candidate just completed a mock exam and got the following ${wrongAnswers.length} questions wrong:

${wrongSummary}

In 3–5 concise bullet points, identify the most important patterns in their mistakes and give specific study advice. Focus on WHY they likely got these wrong (confused concepts, tricky phrasing, knowledge gaps) and WHAT to review. Be direct and practical. Do not repeat the questions back or pad with encouragement. Format as markdown bullet points only.`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ insights: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return new Response(JSON.stringify({ insights: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const insights = data.content?.[0]?.text ?? null
    logUsage('exam_debrief', certId, data.usage)

    return new Response(JSON.stringify({ insights }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ insights: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
