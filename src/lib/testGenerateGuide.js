// One-shot test script — run with:
//   node --env-file=.env.local src/lib/testGenerateGuide.js
//
// Tests generateGuideSection logic against one CDMP domain.
// Does NOT import src modules (import.meta.env not available in Node).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

const TEST_CERT_ID = 'cdmp'
const TEST_DOMAIN = 'Data Governance'
const TEST_SECTION = 'ai_explanation'

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders })
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`)
  return res.json()
}

async function run() {
  console.log(`\n--- generateGuideSection test ---`)
  console.log(`Cert: ${TEST_CERT_ID}  Domain: "${TEST_DOMAIN}"  Section: ${TEST_SECTION}\n`)

  // 1. Cert metadata
  const [cert] = await sbGet(`certifications?select=name,exam_code,domains&id=eq.${TEST_CERT_ID}`)
  if (!cert) throw new Error('Cert not found')
  const certName = cert.exam_code || cert.name
  const domainMeta = (cert.domains || []).find(d => d.name === TEST_DOMAIN)
  const domainWeight = domainMeta?.weight ?? '?'
  console.log(`Cert name: ${certName}  Domain weight: ${domainWeight}%`)

  // 2. Static Tier 1 sections (exam_focus, key_concepts)
  const staticSections = await sbGet(
    `study_guide_sections?select=section_type,content&cert_id=eq.${TEST_CERT_ID}&domain_name=eq.${encodeURIComponent(TEST_DOMAIN)}&section_type=in.(exam_focus,key_concepts)`
  )
  const examFocus = staticSections.find(s => s.section_type === 'exam_focus')?.content ?? '(not seeded yet)'
  const keyConcepts = staticSections.find(s => s.section_type === 'key_concepts')?.content ?? '(not seeded yet)'
  console.log(`Static sections found: ${staticSections.map(s => s.section_type).join(', ') || 'none'}`)

  // 3. Flashcards
  const flashcards = await sbGet(
    `flashcards?select=question,answer&cert_id=eq.${TEST_CERT_ID}&domain_name=eq.${encodeURIComponent(TEST_DOMAIN)}`
  )
  console.log(`Flashcards: ${flashcards.length}`)

  // 4. MCQs
  const mcqs = await sbGet(
    `mock_exam_questions?select=question,options,correct_index,explanation&cert_id=eq.${TEST_CERT_ID}&domain_name=eq.${encodeURIComponent(TEST_DOMAIN)}`
  )
  console.log(`MCQs: ${mcqs.length}`)

  const groundingContext = [
    flashcards.length > 0
      ? `FLASHCARDS FOR THIS DOMAIN:\n${flashcards.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
      : 'FLASHCARDS: (none)',
    mcqs.length > 0
      ? `PRACTICE QUESTIONS FOR THIS DOMAIN:\n${mcqs.map(q => `Q: ${q.question}\nCorrect answer: ${q.options[q.correct_index]}\nExplanation: ${q.explanation}`).join('\n\n')}`
      : 'PRACTICE QUESTIONS: (none)',
  ].join('\n\n')

  // 5. Build prompt
  const systemPrompt = `You are a CDMP-certified data management expert with deep knowledge of the DAMA-DMBOK framework. You help candidates prepare for the CDMP Fundamentals exam by explaining data governance, data quality, metadata management, master data, and all 14 DMBOK knowledge areas. Reference specific DMBOK concepts and terminology as they appear on the CDMP exam.`

  const userPrompt = `You are a study coach for the ${certName} certification.

Domain: ${TEST_DOMAIN} (${domainWeight}% of the exam)
Official exam focus: ${examFocus}
Key concepts to cover: ${keyConcepts}

Here is the existing study material for this domain:
${groundingContext}

Write a study guide section for this domain. Cover each key concept in the list with a clear explanation of what it is, how it works, and what makes it distinct from related concepts. Write for someone who has some background in data but hasn't studied this specific certification yet.

Format as structured markdown with subheadings per concept. Be specific and precise — use the same terminology the exam uses. Do not pad or repeat yourself. Aim for 400–600 words.`

  console.log(`\nCalling Anthropic API…`)

  // 6. Call Anthropic
  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!aiRes.ok) throw new Error(`Anthropic error ${aiRes.status}: ${await aiRes.text()}`)
  const aiData = await aiRes.json()
  const content = aiData.content[0].text

  console.log(`\n--- Generated content (${content.length} chars) ---\n`)
  console.log(content)

  // 7. Upsert to Supabase
  console.log(`\n--- Upserting to study_guide_sections ---`)
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/study_guide_sections`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      cert_id: TEST_CERT_ID,
      domain_name: TEST_DOMAIN,
      section_type: TEST_SECTION,
      content,
      is_ai_generated: true,
      generated_at: new Date().toISOString(),
    }),
  })

  if (!upsertRes.ok) throw new Error(`Upsert error ${upsertRes.status}: ${await upsertRes.text()}`)
  const [saved] = await upsertRes.json()
  console.log(`Saved row id: ${saved?.id}`)

  // 8. Verify read-back
  const verify = await sbGet(
    `study_guide_sections?select=id,section_type,is_ai_generated,generated_at&cert_id=eq.${TEST_CERT_ID}&domain_name=eq.${encodeURIComponent(TEST_DOMAIN)}`
  )
  console.log(`\nAll sections now in DB for "${TEST_DOMAIN}":`)
  verify.forEach(r => console.log(`  ${r.section_type} | ai=${r.is_ai_generated} | generated_at=${r.generated_at ?? 'null'} | id=${r.id}`))
  console.log('\n✓ Test complete')
}

run().catch(err => { console.error('FAILED:', err.message); process.exit(1) })
