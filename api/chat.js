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

const CERT_PROMPTS = {
  'dp-700': `You are an expert Microsoft Fabric Data Engineer with deep knowledge of the DP-700 exam.
You help candidates prepare by explaining concepts clearly, providing practice questions,
and giving detailed explanations of Fabric architecture, Lakehouse, pipelines, notebooks,
semantic models, and real-time analytics. Always tie explanations back to what appears on the DP-700 exam.`,

  'cdmp': `You are a CDMP-certified data management expert with deep knowledge of the DAMA-DMBOK framework.
You help candidates prepare for the CDMP Fundamentals exam by explaining data governance,
data quality, metadata management, master data, and all 14 DMBOK knowledge areas.
Reference specific DMBOK chapters and concepts as they appear on the CDMP exam.`,

  'databricks-genai': `You are a Databricks-certified Generative AI expert. You help candidates prepare
for the Databricks Generative AI Engineer Associate exam covering LLM fundamentals,
RAG architectures, MLflow, Mosaic AI, and productionizing GenAI on the Databricks platform.`,

  'aws-genai': `You are an AWS-certified cloud architect specializing in Generative AI services.
You help candidates understand Amazon Bedrock, SageMaker JumpStart, RAG patterns on AWS,
and AI/ML best practices as tested on AWS GenAI certification exams.`,

  'aws-sap-renewal': `You are an AWS Solutions Architect Professional with expert-level knowledge
of the SAP-C02 exam. You help candidates with advanced AWS architecture patterns,
cost optimization, security, networking, and migration strategies.`,

  'databricks-de-renewal': `You are a Databricks-certified Data Engineering expert. You help candidates
prepare for the Databricks Data Engineering Associate renewal exam covering Delta Lake,
Spark, workflows, Unity Catalog, and production data pipelines on the Databricks platform.`,

  'default': `You are an expert tutor helping a professional prepare for their certification exam.
Answer questions clearly, provide examples, and help identify knowledge gaps.`
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let certId, messages
  try {
    const body = await req.json()
    certId = body.certId
    messages = body.messages
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!messages || !Array.isArray(messages)) {
    return new Response('messages must be an array', { status: 400 })
  }

  const systemPrompt = CERT_PROMPTS[certId] || CERT_PROMPTS['default']

  let response
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages
      })
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to reach Anthropic API', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!response.ok) {
    const errorText = await response.text()
    return new Response(
      JSON.stringify({ error: 'Anthropic API error', detail: errorText }),
      { status: response.status, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const data = await response.json()
  logUsage('chat', certId, data.usage)
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
}
