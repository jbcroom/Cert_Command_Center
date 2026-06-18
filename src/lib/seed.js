import { createClient } from '@supabase/supabase-js'
import { certRegistry, flashcardSeedData } from './certRegistry.js'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync } from 'fs'

// Load .env.local manually (Vite env vars aren't available in Node scripts)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const [key, ...rest] = line.split('=')
      return [key.trim(), rest.join('=').trim()]
    })
)

const supabase = createClient(
  env['VITE_SUPABASE_URL'],
  env['VITE_SUPABASE_ANON_KEY']
)

async function seed() {
  console.log('\n🌱 Starting seed...\n')
  const results = { success: [], failed: [] }

  for (const cert of certRegistry) {
    const { error } = await supabase
      .from('certifications')
      .upsert(cert, { onConflict: 'id' })

    if (error) {
      results.failed.push({ id: cert.id, error: error.message })
      console.error(`  ❌ ${cert.id}: ${error.message}`)
    } else {
      results.success.push(cert.id)
      console.log(`  ✅ ${cert.id}`)
    }
  }

  console.log('\n  Seeding flashcards...\n')
  for (const card of flashcardSeedData) {
    const { error } = await supabase
      .from('flashcards')
      .insert(card)

    if (error) {
      results.failed.push({ id: `flashcard:${card.cert_id}/${card.domain_name}`, error: error.message })
      console.error(`  ❌ flashcard ${card.cert_id}/${card.domain_name}: ${error.message}`)
    } else {
      console.log(`  ✅ flashcard: ${card.cert_id} / ${card.domain_name}`)
    }
  }

  console.log(`\n📊 Seed complete: ${results.success.length} certs succeeded, ${results.failed.length} failed`)
  if (results.failed.length > 0) {
    console.error('\n⚠️  Failed items:', results.failed)
    process.exit(1)
  }
}

seed()
