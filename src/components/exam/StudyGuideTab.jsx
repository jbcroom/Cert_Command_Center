import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { fetchGuideSections } from '../../lib/studyGuide'
import DomainGuideSection from './DomainGuideSection'

export default function StudyGuideTab({ cert, initialDomain }) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDomain, setActiveDomain] = useState(initialDomain ?? null)

  const domains = cert.domains || []

  async function load() {
    setLoading(true)
    try {
      const data = await fetchGuideSections(cert.id)
      setSections(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [cert.id])

  useEffect(() => {
    if (!activeDomain && domains.length) setActiveDomain(domains[0].name)
  }, [domains, activeDomain])

  if (!domains.length) {
    return <p className="text-text-muted text-sm text-center py-12">No domains configured for this cert.</p>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-text-muted text-sm">Loading study guide…</span>
      </div>
    )
  }

  const domainSections = sections.filter(s => s.domain_name === activeDomain)
  const sectionCountByDomain = Object.fromEntries(
    domains.map(d => [d.name, sections.filter(s => s.domain_name === d.name).length])
  )

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Domain list sidebar */}
      <div className="w-52 flex-shrink-0 space-y-0.5">
        <p className="px-3 mb-2 text-xs font-semibold text-text-muted uppercase tracking-widest">Domains</p>
        {domains.map(domain => {
          const count = sectionCountByDomain[domain.name] || 0
          const hasContent = count > 0
          return (
            <button
              key={domain.name}
              onClick={() => setActiveDomain(domain.name)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                activeDomain === domain.name
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <span className="truncate">{domain.name}</span>
              <span className={`text-xs flex-shrink-0 ${activeDomain === domain.name ? 'text-accent-blue/60' : 'text-text-muted/50'}`}>
                {domain.weight}%
              </span>
            </button>
          )
        })}
      </div>

      {/* Domain content */}
      <div className="flex-1 min-w-0">
        {activeDomain && (
          <>
            <div className="flex items-center gap-2 mb-5">
              <BookOpen size={15} className="text-accent-blue flex-shrink-0" />
              <h2 className="text-base font-semibold text-text-primary">{activeDomain}</h2>
              <span className="text-xs text-text-muted">
                {domains.find(d => d.name === activeDomain)?.weight}% of exam
              </span>
            </div>

            {domainSections.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-center">
                <div className="space-y-2">
                  <p className="text-text-muted text-sm">No study guide content yet for this domain.</p>
                  <p className="text-text-muted text-xs">Seed Tier 1 content or generate AI sections to get started.</p>
                </div>
              </div>
            ) : (
              <DomainGuideSection
                cert={cert}
                domainName={activeDomain}
                sections={domainSections}
                onRefresh={load}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
