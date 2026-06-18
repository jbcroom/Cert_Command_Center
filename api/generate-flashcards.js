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
  'cdmp': `You are a CDMP-certified data management expert with deep knowledge of the DAMA-DMBOK framework. Generate flashcards that test candidates on the CDMP Fundamentals exam, covering data governance, data quality, metadata management, master data, and all 14 DMBOK knowledge areas.`,
  'dp-700': `You are an expert Microsoft Fabric Data Engineer with deep knowledge of the DP-700 exam. Generate flashcards that test candidates on Fabric architecture, Lakehouse, pipelines, notebooks, semantic models, and real-time analytics.`,
  'databricks-genai': `You are a Databricks-certified Generative AI expert. Generate flashcards for the Databricks Generative AI Engineer Associate exam covering LLM fundamentals, RAG architectures, MLflow, Mosaic AI, and productionizing GenAI on the Databricks platform.`,
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body
  try { body = await req.json() } catch { return new Response('Invalid JSON', { status: 400 }) }

  const { certId, domainName, quantity = 5, existingFronts = [], studyGuideContent = null } = body
  if (!certId || !domainName) return new Response('Missing certId or domainName', { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 })

  const persona = CERT_PERSONAS[certId] ?? `You are a certification study expert for ${certId}.`

  const existingSection = existingFronts.length
    ? `\n\nExisting flashcards for this domain (do not duplicate these):\n${existingFronts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
    : ''

  const guideSection = studyGuideContent
    ? `\n\nStudy guide content for this domain to base cards on:\n${studyGuideContent}`
    : ''

  const prompt = `${persona}

Domain: ${domainName}${existingSection}${guideSection}

Generate ${quantity} new flashcard pairs for this domain. Each card should:
- Test one specific, discrete concept
- Have a clear, unambiguous question or prompt (front)
- Have a concise, complete answer (back)
- Not duplicate any existing card listed above
- Use precise exam terminology

Return ONLY a JSON array with no extra text: [{"question": "...", "answer": "..."}, ...]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), { status: 502 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''
    const usage = data.usage ?? {}

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return new Response(JSON.stringify({ error: 'Invalid response format', raw: text }), { status: 502 })

    const cards = JSON.parse(match[0])
    logUsage('flashcard_gen', certId, usage)
    return new Response(JSON.stringify({ cards, usage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
