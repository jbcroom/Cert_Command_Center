import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const FILES = [
  { path: join(__dirname, '../../../dp700_mcq.json'),            certId: 'dp-700' },
  { path: join(__dirname, '../../../databricks_genai_mcq.json'), certId: 'databricks-genai' },
  { path: join(__dirname, '../../../cdmp_mcq.json'),             certId: 'cdmp' },
]

const EXPECTED = {
  'dp-700':           { total: 45, perDomain: { 'Implement and manage analytics solutions': 15, 'Ingest and transform data': 15, 'Monitor and optimize analytics solutions': 15 } },
  'databricks-genai': { total: 45, perDomain: { 'Design Applications': 6, 'Data Preparation': 6, 'Application Development': 14, 'Assembling and Deploying Applications': 10, 'Governance': 4, 'Evaluation and Monitoring': 5 } },
  'cdmp':             { total: 56, perDomain: Object.fromEntries(['Data Governance','Data Quality','Data Architecture','Data Modeling & Design','Data Storage & Operations','Data Security','Reference & Master Data','Data Warehousing & BI','Document & Content Management','Metadata Management','Data Integration & Interoperability','Data Management Process','Big Data & Data Science','DMBOK Framework'].map(d => [d, 4])) },
}

function validateRow(q, certId, idx) {
  const errors = []
  if (!q.cert_id)                                errors.push('missing cert_id')
  if (q.cert_id !== certId)                      errors.push(`cert_id mismatch: ${q.cert_id}`)
  if (!q.domain_name)                            errors.push('missing domain_name')
  if (!q.question)                               errors.push('missing question')
  if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`options must be array[4], got ${JSON.stringify(q.options?.length)}`)
  if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index > 3) errors.push(`correct_index out of range: ${q.correct_index}`)
  if (errors.length) throw new Error(`Row ${idx}: ${errors.join('; ')}`)
}

async function importFile({ path, certId }) {
  const rows = JSON.parse(readFileSync(path, 'utf8'))
  console.log(`\n── ${certId}: ${rows.length} rows from file`)

  // Pre-import validation
  rows.forEach((q, i) => validateRow(q, certId, i))
  console.log(`  ✅ Pre-import schema validation passed`)

  // Strip any id/created_at from source so Supabase generates them
  const clean = rows.map(({ id, created_at, ...rest }) => rest)

  const { data, error } = await supabase
    .from('mock_exam_questions')
    .insert(clean)
    .select('id, cert_id, domain_name')

  if (error) throw new Error(`Insert failed for ${certId}: ${error.message}`)
  console.log(`  ✅ Inserted ${data.length} rows`)
  return data
}

async function revalidate(certId, inserted) {
  const exp = EXPECTED[certId]
  const errors = []

  // Total count
  if (inserted.length !== exp.total) {
    errors.push(`total: expected ${exp.total}, got ${inserted.length}`)
  }

  // Per-domain counts
  const actual = {}
  for (const row of inserted) {
    actual[row.domain_name] = (actual[row.domain_name] || 0) + 1
  }
  for (const [domain, expCount] of Object.entries(exp.perDomain)) {
    const actCount = actual[domain] || 0
    if (actCount !== expCount) {
      errors.push(`domain "${domain}": expected ${expCount}, got ${actCount}`)
    }
  }
  // Flag any unexpected domain names that landed in the DB
  for (const domain of Object.keys(actual)) {
    if (!(domain in exp.perDomain)) {
      errors.push(`unexpected domain in DB: "${domain}"`)
    }
  }

  if (errors.length) {
    console.log(`  ❌ Post-import validation FAILED:`)
    errors.forEach(e => console.log(`     ${e}`))
    return false
  }
  console.log(`  ✅ Post-import validation passed — counts match expected`)
  return true
}

async function run() {
  console.log('\n🗄  MCQ Import\n')
  let allOk = true

  for (const file of FILES) {
    try {
      const inserted = await importFile(file)
      const ok = await revalidate(file.certId, inserted)
      if (!ok) allOk = false
    } catch (err) {
      console.error(`  ❌ ${file.certId}: ${err.message}`)
      allOk = false
    }
  }

  console.log('\n' + (allOk ? '✅ All imports succeeded' : '❌ Import finished with errors'))
  if (!allOk) process.exit(1)
}

run()
