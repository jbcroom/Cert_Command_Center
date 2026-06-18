// One-shot import script — run with:
//   node --env-file=.env.local src/lib/importTier1Seed.js
//
// Reads cdmp_tier1_seed.json and upserts all rows into study_guide_sections.
// Safe to re-run — uses merge-duplicates resolution.

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const seed = JSON.parse(readFileSync(join(__dirname, 'cdmp_tier1_seed.json'), 'utf8'))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
}

console.log(`\nImporting ${seed.length} Tier 1 sections for CDMP…\n`)

const res = await fetch(`${SUPABASE_URL}/rest/v1/study_guide_sections`, {
  method: 'POST',
  headers,
  body: JSON.stringify(seed),
})

if (!res.ok) {
  console.error('Import failed:', res.status, await res.text())
  process.exit(1)
}

const saved = await res.json()
console.log(`Inserted/updated: ${saved.length} rows`)

// Verify counts by domain
const verifyRes = await fetch(
  `${SUPABASE_URL}/rest/v1/study_guide_sections?select=domain_name,section_type,is_ai_generated&cert_id=eq.cdmp&order=domain_name,section_type`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
)
const rows = await verifyRes.json()

const byDomain = {}
rows.forEach(r => {
  if (!byDomain[r.domain_name]) byDomain[r.domain_name] = []
  byDomain[r.domain_name].push(r.section_type)
})

console.log(`\nVerification — sections in DB for cdmp:`)
Object.entries(byDomain).forEach(([domain, types]) => {
  console.log(`  ${domain}: ${types.join(', ')}`)
})
console.log(`\nTotal rows: ${rows.length}`)

const expected = 14 * 3  // 14 domains × 3 static + 1 AI we generated earlier
const staticRows = rows.filter(r => !r.is_ai_generated).length
const aiRows = rows.filter(r => r.is_ai_generated).length
console.log(`Static (Tier 1): ${staticRows}  |  AI-generated: ${aiRows}`)

if (staticRows === 42) {
  console.log('\n✓ All 42 Tier 1 sections confirmed in DB')
} else {
  console.error(`\n✗ Expected 42 static rows, got ${staticRows}`)
  process.exit(1)
}
