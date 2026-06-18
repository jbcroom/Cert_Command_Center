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
  'cdmp': `You are a CDMP-certified data management expert with deep knowledge of the DAMA-DMBOK framework. You help candidates prepare for the CDMP Fundamentals exam by explaining data governance, data quality, metadata management, master data, and all 14 DMBOK knowledge areas. Reference specific DMBOK concepts and terminology as they appear on the CDMP exam.`,
  'dp-700': `You are an expert Microsoft Fabric Data Engineer with deep knowledge of the DP-700 exam. You help candidates prepare by explaining Fabric architecture, Lakehouse, pipelines, notebooks, semantic models, and real-time analytics. Always tie explanations back to what appears on the DP-700 exam.`,
  'databricks-genai': `You are a Databricks-certified Generative AI expert. You help candidates prepare for the Databricks Generative AI Engineer Associate exam covering LLM fundamentals, RAG architectures, MLflow, Mosaic AI, and productionizing GenAI on the Databricks platform.`,
}

const SECTION_PROMPTS = {
  ai_explanation: ({ certName, domainName, domainWeight, examFocus, keyConcepts, groundingContext }) => `
You are a study coach for the ${certName} certification.

Domain: ${domainName} (${domainWeight}% of the exam)
Official exam focus: ${examFocus}
Key concepts to cover: ${keyConcepts}

Here is the existing study material for this domain:
${groundingContext}

Write a study guide section for this domain. Cover each key concept in the list with a clear explanation of what it is, how it works, and what makes it distinct from related concepts. Write for someone who has some background in data but hasn't studied this specific certification yet.

Format as structured markdown with subheadings per concept. Be specific and precise — use the same terminology the exam uses. Do not pad or repeat yourself. Aim for 400–600 words.
`.trim(),

  common_pitfalls: ({ certName, domainName, groundingContext }) => `
You are a study coach for the ${certName} certification.

Domain: ${domainName}

Here is the practice question bank and flashcard set for this domain:
${groundingContext}

Based on these questions and cards, identify the 4–6 most common conceptual traps and wrong-answer patterns a learner might fall into on the real exam. For each pitfall: name it, explain why it's a trap, and state the correct understanding. Format as a numbered list. Be specific — reference actual concept pairs that get confused, not generic advice.
`.trim(),
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let certId, domainName, sectionType
  try {
    const body = await req.json()
    certId = body.certId
    domainName = body.domainName
    sectionType = body.sectionType
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!certId || !domainName || !sectionType) {
    return new Response(JSON.stringify({ error: 'certId, domainName, and sectionType are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!['ai_explanation', 'common_pitfalls'].includes(sectionType)) {
    return new Response(JSON.stringify({ error: 'sectionType must be ai_explanation or common_pitfalls' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  }

  // Fetch all context in parallel
  const domainParam = encodeURIComponent(domainName)
  const [certRes, staticRes, fcRes, mcqRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/certifications?select=name,exam_code,domains&id=eq.${certId}`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/study_guide_sections?select=section_type,content&cert_id=eq.${certId}&domain_name=eq.${domainParam}&section_type=in.(exam_focus,key_concepts)`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/flashcards?select=question,answer&cert_id=eq.${certId}&domain_name=eq.${domainParam}&limit=15`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/mock_exam_questions?select=question,options,correct_index,explanation&cert_id=eq.${certId}&domain_name=eq.${domainParam}&limit=10`, { headers }),
  ])

  const [[cert], staticSections, flashcards, mcqs] = await Promise.all([
    certRes.json(), staticRes.json(), fcRes.json(), mcqRes.json(),
  ])

  if (!cert) {
    return new Response(JSON.stringify({ error: `Cert not found: ${certId}` }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    })
  }

  const certName = cert.exam_code || cert.name
  const domainMeta = (cert.domains || []).find(d => d.name === domainName)
  const domainWeight = domainMeta?.weight ?? '?'
  const examFocus = staticSections.find(s => s.section_type === 'exam_focus')?.content ?? '(not seeded yet)'
  const keyConcepts = staticSections.find(s => s.section_type === 'key_concepts')?.content ?? '(not seeded yet)'

  const groundingContext = [
    flashcards.length > 0
      ? `FLASHCARDS FOR THIS DOMAIN:\n${flashcards.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
      : 'FLASHCARDS: (none for this domain)',
    mcqs.length > 0
      ? `PRACTICE QUESTIONS FOR THIS DOMAIN:\n${mcqs.map(q => `Q: ${q.question}\nCorrect answer: ${q.options[q.correct_index]}\nExplanation: ${q.explanation}`).join('\n\n')}`
      : 'PRACTICE QUESTIONS: (none for this domain)',
  ].join('\n\n')

  const systemPrompt = CERT_PERSONAS[certId] || CERT_PERSONAS['default'] || 'You are a helpful study coach.'
  const userPrompt = SECTION_PROMPTS[sectionType]({ certName, domainName, domainWeight, examFocus, keyConcepts, groundingContext })

  // Call Anthropic
  let anthropicRes
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to reach Anthropic API', detail: err.message }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text()
    return new Response(JSON.stringify({ error: 'Anthropic API error', detail }), {
      status: anthropicRes.status, headers: { 'Content-Type': 'application/json' }
    })
  }

  const aiData = await anthropicRes.json()
  const content = aiData.content[0].text
  logUsage(supabaseUrl, supabaseKey, 'guide_gen', certId, aiData.usage)

  // Upsert into study_guide_sections
  const upsertRes = await fetch(
    `${supabaseUrl}/rest/v1/study_guide_sections`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify({
        cert_id: certId,
        domain_name: domainName,
        section_type: sectionType,
        content,
        is_ai_generated: true,
        generated_at: new Date().toISOString(),
      })
    }
  )

  if (!upsertRes.ok) {
    const detail = await upsertRes.text()
    return new Response(JSON.stringify({ error: 'Failed to upsert section', detail }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    })
  }

  const [saved] = await upsertRes.json()

  return new Response(JSON.stringify({ content, id: saved?.id }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
