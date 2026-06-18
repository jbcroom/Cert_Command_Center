import { supabase } from './supabase.js'

/**
 * Draw a stratified random sample of questions for one exam session.
 *
 * Returns { questions, isPartialBank } where:
 *   questions      — ordered array of mock_exam_questions rows to present
 *   isPartialBank  — true when the cert's total bank is smaller than targetN,
 *                    so the UI can show a "partial mock" notice
 *
 * Respects recent-session deprioritisation: questions used in the last 2
 * completed sessions for this cert are shuffled to the back of each domain
 * pool before drawing, so they only appear when there's no alternative.
 */
export async function sampleExamQuestions(certId, targetN, recentSessionIds = []) {
  // 1. Fetch all questions for this cert
  const { data: allQuestions, error } = await supabase
    .from('mock_exam_questions')
    .select('*')
    .eq('cert_id', certId)
  if (error) throw new Error(`Failed to fetch questions: ${error.message}`)

  // 2. Fetch recently-used question IDs for deprioritisation
  let recentIds = new Set()
  if (recentSessionIds.length > 0) {
    const { data: responses } = await supabase
      .from('mock_exam_responses')
      .select('question_id')
      .in('session_id', recentSessionIds)
    if (responses) responses.forEach(r => recentIds.add(r.question_id))
  }

  // 3. Fetch domain weights from certifications table
  const { data: cert } = await supabase
    .from('certifications')
    .select('domains')
    .eq('id', certId)
    .single()
  const domainWeights = cert?.domains ?? []

  // 4. Group questions by domain, deprioritising recently-seen ones
  const byDomain = {}
  for (const q of allQuestions) {
    if (!byDomain[q.domain_name]) byDomain[q.domain_name] = { fresh: [], recent: [] }
    if (recentIds.has(q.id)) {
      byDomain[q.domain_name].recent.push(q)
    } else {
      byDomain[q.domain_name].fresh.push(q)
    }
  }

  const totalAvailable = allQuestions.length
  const isPartialBank = totalAvailable < targetN
  const drawN = isPartialBank ? totalAvailable : targetN

  // 5. Compute per-domain target counts proportional to weights
  //    Fall back to equal split if no weight data exists
  let domainTargets = computeDomainTargets(domainWeights, byDomain, drawN)

  // 6. Draw questions domain by domain; redistribute shortfalls
  const drawn = []
  const drawnIds = new Set()
  const shortfalls = {}

  for (const [domain, target] of Object.entries(domainTargets)) {
    const pool = byDomain[domain] ?? { fresh: [], recent: [] }
    const available = [...shuffle(pool.fresh), ...shuffle(pool.recent)]
    const take = Math.min(target, available.length)
    const picked = available.slice(0, take)
    drawn.push(...picked)
    picked.forEach(q => drawnIds.add(q.id))
    if (take < target) shortfalls[domain] = target - take
  }

  // Redistribute shortfalls to domains with surplus, never re-drawing an already-drawn question
  if (Object.keys(shortfalls).length > 0) {
    const totalShortfall = Object.values(shortfalls).reduce((a, b) => a + b, 0)
    const surplusDomains = Object.entries(domainTargets)
      .filter(([d]) => !(d in shortfalls))
      .map(([d]) => d)

    let remaining = totalShortfall
    for (const domain of surplusDomains) {
      if (remaining <= 0) break
      const pool = byDomain[domain] ?? { fresh: [], recent: [] }
      const available = [...shuffle(pool.fresh), ...shuffle(pool.recent)]
        .filter(q => !drawnIds.has(q.id))
      const extra = available.slice(0, remaining)
      drawn.push(...extra)
      extra.forEach(q => drawnIds.add(q.id))
      remaining -= extra.length
    }
  }

  // 7. Final shuffle so domain grouping isn't visible to the user
  return { questions: shuffle(drawn), isPartialBank }
}

/**
 * Fetch the 2 most recent completed session IDs for a cert,
 * used to populate recentSessionIds above.
 */
export async function getRecentSessionIds(certId, count = 2) {
  const { data } = await supabase
    .from('mock_exam_sessions')
    .select('id')
    .eq('cert_id', certId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(count)
  return data?.map(s => s.id) ?? []
}

/**
 * Count completed mock exam sessions for a cert — used to gate drill mode.
 */
export async function getCompletedSessionCount(certId) {
  const { count } = await supabase
    .from('mock_exam_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('cert_id', certId)
    .eq('status', 'completed')
  return count ?? 0
}

/**
 * Per-domain accuracy from all completed sessions for a cert.
 * Returns { [domainName]: { correct, total } }
 */
export async function getDomainAccuracy(certId) {
  const allSessionIds = await getRecentSessionIds(certId, 999)
  if (!allSessionIds.length) return {}

  const [{ data: responses }, { data: questions }] = await Promise.all([
    supabase.from('mock_exam_responses').select('is_correct, question_id').in('session_id', allSessionIds),
    supabase.from('mock_exam_questions').select('id, domain_name').eq('cert_id', certId),
  ])

  const qDomain = Object.fromEntries((questions || []).map(q => [q.id, q.domain_name]))
  const stats = {}
  for (const r of (responses || [])) {
    const domain = qDomain[r.question_id]
    if (!domain) continue
    if (!stats[domain]) stats[domain] = { correct: 0, total: 0 }
    stats[domain].total++
    if (r.is_correct) stats[domain].correct++
  }
  return stats
}

/**
 * Stratified sample weighted by inverse accuracy squared.
 * Domains with lower historical accuracy get proportionally more questions.
 * Returns { questions, isPartialBank, drillWeights, domainStats }
 */
export async function sampleDrillQuestions(certId, targetN) {
  const [{ data: allQuestions, error }, domainStats] = await Promise.all([
    supabase.from('mock_exam_questions').select('*').eq('cert_id', certId),
    getDomainAccuracy(certId),
  ])
  if (error) throw new Error(`Failed to fetch questions: ${error.message}`)

  const byDomain = {}
  for (const q of allQuestions) {
    if (!byDomain[q.domain_name]) byDomain[q.domain_name] = []
    byDomain[q.domain_name].push(q)
  }

  const domains = Object.keys(byDomain)

  // Weight = accuracy_gap² = (1 - accuracy)²; fallback to 0.5 accuracy if unseen domain
  const rawWeights = {}
  for (const domain of domains) {
    const stats = domainStats[domain]
    const accuracy = stats && stats.total > 0 ? stats.correct / stats.total : 0.5
    const gap = 1 - accuracy
    rawWeights[domain] = gap * gap
  }

  const totalWeight = Object.values(rawWeights).reduce((s, w) => s + w, 0)
  const drillWeights = totalWeight > 0
    ? Object.fromEntries(domains.map(d => [d, rawWeights[d] / totalWeight]))
    : Object.fromEntries(domains.map(d => [d, 1 / domains.length]))

  const totalAvailable = allQuestions.length
  const isPartialBank = totalAvailable < targetN
  const drawN = isPartialBank ? totalAvailable : targetN

  // Largest-remainder allocation by drill weight
  const rawCounts = domains.map(d => ({ name: d, raw: drillWeights[d] * drawN }))
  const floored = rawCounts.map(d => ({ name: d.name, count: Math.floor(d.raw), frac: d.raw % 1 }))
  const rem = drawN - floored.reduce((s, d) => s + d.count, 0)
  floored.sort((a, b) => b.frac - a.frac)
  for (let i = 0; i < rem; i++) floored[i].count++
  const domainTargets = Object.fromEntries(floored.map(d => [d.name, d.count]))

  const drawn = []
  const drawnIds = new Set()
  const shortfalls = {}

  for (const [domain, target] of Object.entries(domainTargets)) {
    const pool = shuffle(byDomain[domain] || [])
    const take = Math.min(target, pool.length)
    const picked = pool.slice(0, take)
    drawn.push(...picked)
    picked.forEach(q => drawnIds.add(q.id))
    if (take < target) shortfalls[domain] = target - take
  }

  if (Object.keys(shortfalls).length > 0) {
    const totalShortfall = Object.values(shortfalls).reduce((a, b) => a + b, 0)
    const surplusDomains = domains.filter(d => !(d in shortfalls))
    let remaining = totalShortfall
    for (const domain of surplusDomains) {
      if (remaining <= 0) break
      const extra = shuffle(byDomain[domain] || [])
        .filter(q => !drawnIds.has(q.id))
        .slice(0, remaining)
      drawn.push(...extra)
      extra.forEach(q => drawnIds.add(q.id))
      remaining -= extra.length
    }
  }

  return { questions: shuffle(drawn), isPartialBank, drillWeights, domainStats }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function computeDomainTargets(domainWeights, byDomain, drawN) {
  const allDomains = Object.keys(byDomain)

  if (!domainWeights.length) {
    // No weight data — split evenly
    const base = Math.floor(drawN / allDomains.length)
    const remainder = drawN % allDomains.length
    return Object.fromEntries(
      allDomains.map((d, i) => [d, base + (i < remainder ? 1 : 0)])
    )
  }

  // Only consider domains that actually have questions in the bank
  const weightedDomains = domainWeights.filter(d => byDomain[d.name])
  const totalWeight = weightedDomains.reduce((s, d) => s + d.weight, 0)

  const rawCounts = weightedDomains.map(d => ({
    name: d.name,
    raw: (d.weight / totalWeight) * drawN,
  }))

  // Floor each, then award remainders largest-fractional-part first
  const floored = rawCounts.map(d => ({ name: d.name, count: Math.floor(d.raw), frac: d.raw % 1 }))
  const remainder = drawN - floored.reduce((s, d) => s + d.count, 0)
  floored.sort((a, b) => b.frac - a.frac)
  for (let i = 0; i < remainder; i++) floored[i].count++

  return Object.fromEntries(floored.map(d => [d.name, d.count]))
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
