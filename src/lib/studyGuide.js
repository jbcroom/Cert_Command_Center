import { supabase } from './supabase'

// Fetch all sections for a cert, grouped by domain_name
export async function fetchGuideSections(certId) {
  const { data, error } = await supabase
    .from('study_guide_sections')
    .select('*')
    .eq('cert_id', certId)
    .order('domain_name')
  if (error) throw error
  return data ?? []
}

// Fetch all sections for one specific domain
export async function fetchDomainSections(certId, domainName) {
  const { data, error } = await supabase
    .from('study_guide_sections')
    .select('*')
    .eq('cert_id', certId)
    .eq('domain_name', domainName)
  if (error) throw error
  return data ?? []
}

// Call the edge function to generate (and upsert) one AI section.
// Returns { content, id } on success, throws on error.
export async function generateGuideSection(certId, domainName, sectionType) {
  const res = await fetch('/api/generate-guide-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ certId, domainName, sectionType }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

// Staleness threshold in days per cert — matches content-refresh-checklist cadence
const STALENESS_DAYS = {
  'databricks-genai': 90,
  'dp-700': 180,
  'cdmp': 365,
}

export function isSectionStale(section) {
  if (!section.is_ai_generated || !section.generated_at) return false
  const threshold = STALENESS_DAYS[section.cert_id] ?? 180
  const age = (Date.now() - new Date(section.generated_at).getTime()) / (1000 * 60 * 60 * 24)
  return age > threshold
}
